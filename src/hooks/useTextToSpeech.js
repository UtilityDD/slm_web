import { useState, useEffect, useCallback, useRef } from 'react';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

/**
 * Custom hook for Text-to-Speech functionality with enhanced platform safety
 * Uses @capacitor-community/text-to-speech for Native Android/iOS (with chunking)
 * Uses window.speechSynthesis for Web
 * @param {string} language - 'bn' or 'en'
 */
export const useTextToSpeech = (language = 'bn') => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [availableVoices, setAvailableVoices] = useState([]); // Web Only

    // Check Platform
    const isNative = Capacitor.isNativePlatform();
    const isWebSupported = typeof window !== 'undefined' && !!window.speechSynthesis;
    const isSupported = isNative || isWebSupported;

    // Control Refs
    const currentUtterance = useRef(null); // Web: prevent GC
    const stopSignal = useRef(false);      // Native: Loop interruption

    // Initialize Web Voices (Only if on Web)
    useEffect(() => {
        if (isNative || !isWebSupported) return;

        const loadVoices = () => {
            try {
                const voices = window.speechSynthesis.getVoices();
                setAvailableVoices(voices || []);
            } catch (err) {
                console.warn("Error loading voices:", err);
            }
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, [isNative, isWebSupported]);

    // Clean text by removing special tags
    const cleanText = (text) => {
        if (!text || typeof text !== 'string') return '';
        let cleaned = text
            .replace(/\[\[.*?\]\]/g, '')
            .replace(/\(\(.*?\)\)/g, '')
            .replace(/\(.*?\)/g, '');

        if (language === 'bn') {
            cleaned = cleaned.replace(/%/g, ' শতাংশ');
            cleaned = cleaned.replace(/১০০ শতাংশ/g, 'একশো শতাংশ');
            cleaned = cleaned.replace(/৫০ শতাংশ/g, 'পঞ্চাশ শতাংশ');
            cleaned = cleaned.replace(/ISI/gi, 'আই এস আই');
            cleaned = cleaned.replace(/PPE/gi, 'পি পি ই');

            const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
            bnDigits.forEach((digit, i) => {
                const regex = new RegExp(digit, 'g');
                cleaned = cleaned.replace(regex, i.toString());
            });
        }

        return cleaned
            .replace(/\n/g, ' ')
            .trim();
    };

    const stop = useCallback(async () => {
        stopSignal.current = true; // Signal native loop to break
        if (!isSupported) return;

        try {
            if (isNative) {
                await TextToSpeech.stop();
            } else {
                window.speechSynthesis.cancel();
            }
        } catch (err) {
            console.warn("TTS Stop failed:", err);
        }

        setIsPlaying(false);
        setIsPaused(false);
        setActiveId(null);
    }, [isSupported, isNative]);

    const pause = useCallback(async () => {
        if (!isSupported) return;
        if (!isNative) {
            window.speechSynthesis.pause();
            setIsPaused(true);
        } else {
            // Native interface often lacks pause, so we stop.
            stopSignal.current = true;
            await TextToSpeech.stop();
            setIsPaused(false);
            setIsPlaying(false);
            setActiveId(null);
        }
    }, [isSupported, isNative]);

    const resume = useCallback(async () => {
        if (!isSupported) return;
        if (!isNative) {
            window.speechSynthesis.resume();
            setIsPaused(false);
        }
        // Native resume is complex with chunking (requires tracking index), 
        // for now we treat it as stop/start in UI usually.
    }, [isSupported, isNative]);

    const speak = useCallback(async (text, id = null) => {
        if (!text || !isSupported) return;

        try {
            // Stop any previous speech
            await stop();
            stopSignal.current = false; // Reset signal

            setActiveId(id);
            setIsPlaying(true);

            const cleaned = cleanText(text);
            if (!cleaned) return;

            if (isNative) {
                // --- Native Chunking Logic ---
                // Split by common sentence delimiters, keeping the delimiter
                // This creates a smoother flow than sending one massive block
                const sentences = cleaned.match(/[^।\.!\?]+[।\.!\?]+/g) || [cleaned];

                for (const chunk of sentences) {
                    if (stopSignal.current) break; // Check interrupt

                    try {
                        await TextToSpeech.speak({
                            text: chunk.trim(),
                            lang: language === 'bn' ? 'bn-IN' : 'en-US',
                            rate: 1.0,
                            pitch: 1.0,
                            volume: 1.0,
                            category: 'ambient',
                        });
                    } catch (speakErr) {
                        // If stopped, we might get an error, just ignore and break
                        if (stopSignal.current) break;
                        console.warn("Chunk speak failed", speakErr);
                    }
                }

                // Only reset if we finished naturally (not stopped manually)
                if (!stopSignal.current) {
                    setIsPlaying(false);
                    setActiveId(null);
                }
            } else {
                // --- Web Implementation (Fallback) ---
                const utterance = new SpeechSynthesisUtterance(cleaned);
                currentUtterance.current = utterance;

                utterance.lang = language === 'bn' ? 'bn-IN' : 'en-US';
                utterance.rate = 0.95;

                const voices = window.speechSynthesis.getVoices();
                let selectedVoice = null;
                if (language === 'bn') {
                    selectedVoice = voices.find(v => v.lang.includes('bn'));
                } else {
                    selectedVoice = voices.find(v => v.lang.includes('en'));
                }
                if (selectedVoice) utterance.voice = selectedVoice;

                utterance.onend = () => {
                    setIsPlaying(false);
                    setActiveId(null);
                    currentUtterance.current = null;
                };

                utterance.onerror = (e) => {
                    console.error("Web TTS Error:", e);
                    setIsPlaying(false);
                    currentUtterance.current = null;
                };

                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
                window.speechSynthesis.speak(utterance);
            }

        } catch (err) {
            console.error("TTS Speak failed:", err);
            setIsPlaying(false);
            setActiveId(null);
        }
    }, [language, isSupported, isNative, stop]);

    // Cleanup
    useEffect(() => {
        return () => {
            stop();
        };
    }, []);

    return {
        speak,
        stop,
        pause,
        resume,
        isPlaying,
        isPaused,
        activeId,
        voices: availableVoices,
        isSupported
    };
};
