import { useState, useEffect, useCallback, useRef } from 'react';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

let webSessionCounter = 0;
let nativeChunks = [];
let nativeChunkIndex = 0;
let nativePaused = false;
let nativePlaybackToken = 0;
let nativeStatus = 'idle';
let nativeActiveSpeechId = null;

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
    const [usePremium, setUsePremium] = useState(true); // Default to premium for pro experience
    
    // Final Premium TTS URL from deployed function
    const PREMIUM_TTS_URL = "https://wkunyvomogeazjwtenck.supabase.co/functions/v1/edge-tts";

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
            // Removed digit conversion - Bengali voices read Bengali digits better
        }

        return cleaned
            .replace(/\n/g, ' ')
            .trim();
    };

    const splitIntoChunks = (text) => {
        if (!text) return [];

        // Split by Bengali danda and common punctuation while preserving boundaries.
        // Added (?<=...) to split AFTER the punctuation, and added handling for punctuation WITHOUT spaces.
        const sentences = text
            .split(/(?<=[।.,!?])\s*/)
            .map(s => s.trim())
            .filter(Boolean);

        const maxLen = 160; // Reduced chunk size for better stability on mobile
        const chunks = [];

        sentences.forEach((sentence) => {
            if (sentence.length <= maxLen) {
                chunks.push(sentence);
                return;
            }

            // Fallback split for very long sentences
            const parts = sentence.split(/([,;])\s*/);
            let current = '';
            parts.forEach((p) => {
                const next = current ? `${current}${p}` : p;
                if (next.length > maxLen) {
                    if (current) chunks.push(current);
                    current = p;
                } else {
                    current = next;
                }
            });
            if (current) chunks.push(current);
        });

        return chunks;
    };

    const pickBestWebVoice = (voices) => {
        if (!voices || voices.length === 0) return null;

        if (language === 'bn') {
            // Priority: Neural Female > Neural Male > Google > Native
            return (
                voices.find(v => /google.*(bangla|bengali).*neural.*female/i.test(v.name)) ||
                voices.find(v => /google.*(bangla|bengali).*neural/i.test(v.name)) ||
                voices.find(v => /microsoft.*(bangla|bengali).*online/i.test(v.name)) ||
                voices.find(v => /google.*(bangla|bengali)/i.test(v.name)) ||
                voices.find(v => /(bangla|bengali|বাংলা).*google/i.test(v.name)) ||
                voices.find(v => /(bangla|bengali|বাংলা)/i.test(v.name)) ||
                voices.find(v => /^bn(-|_)bd/i.test(v.lang)) ||
                voices.find(v => /^bn(-|_)in/i.test(v.lang)) ||
                null
            );
        }

        return voices.find(v => /google.*english.*neural.*female/i.test(v.name)) || 
               voices.find(v => /microsoft.*english.*online/i.test(v.name)) ||
               voices.find(v => /google.*english/i.test(v.name)) || 
               voices.find(v => /^en(-|_)us/i.test(v.lang)) || null;
    };

    const stop = useCallback(async () => {
        stopSignal.current = true; // Signal native loop to break
        webSessionCounter += 1; // Invalidate active web session callbacks
        nativePlaybackToken += 1;
        nativeChunks = [];
        nativeChunkIndex = 0;
        nativePaused = false;
        nativeStatus = 'idle';
        nativeActiveSpeechId = null;
        if (!isSupported) return;

        try {
            if (isNative) {
                await TextToSpeech.stop();
            } else {
                window.speechSynthesis.cancel();
            }
            
            // Handle Premium Audio stop
            if (currentUtterance.current instanceof Audio) {
                currentUtterance.current.pause();
                currentUtterance.current.src = "";
                currentUtterance.current = null;
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
        
        try {
            if (isNative) {
                // Native pause/resume is emulated by stopping current chunk and resuming from saved index.
                nativePaused = true;
                nativeStatus = 'paused';
                stopSignal.current = true;
                await TextToSpeech.stop();
            } else if (currentUtterance.current instanceof Audio) {
                // Premium Audio pause
                currentUtterance.current.pause();
            } else {
                // Web Speech API pause
                window.speechSynthesis.pause();
            }
            setIsPaused(true);
        } catch (err) {
            console.warn("Pause failed:", err);
        }
    }, [isSupported, isNative]);

    const resume = useCallback(async () => {
        if (!isSupported) return;

        if (currentUtterance.current instanceof Audio) {
            // Premium Audio resume
            try {
                await currentUtterance.current.play();
                setIsPaused(false);
            } catch (err) {
                console.warn("Audio resume failed:", err);
            }
            return;
        }

        if (!isNative) {
            window.speechSynthesis.resume();
            setIsPaused(false);
            return;
        }

        if (!nativePaused || nativeChunkIndex >= nativeChunks.length) return;

        // Ensure we resume from the beginning of the current chunk/line.
        nativeChunkIndex = Math.max(0, Math.min(nativeChunkIndex, nativeChunks.length - 1));

        stopSignal.current = false;
        nativePaused = false;
        nativeStatus = 'playing';
        const myToken = ++nativePlaybackToken;
        setIsPaused(false);
        setIsPlaying(true);

        // Reset native engine state before resuming to avoid silent no-op resumes.
        try {
            await TextToSpeech.stop();
        } catch (err) {
            console.warn('Native resume pre-stop failed:', err);
        }

        // Some native engines need a tiny settle delay after stop before next speak.
        await new Promise((resolve) => setTimeout(resolve, 180));

        while (!stopSignal.current && !nativePaused && nativeChunkIndex < nativeChunks.length && myToken === nativePlaybackToken) {
            const chunk = nativeChunks[nativeChunkIndex];
            try {
                await TextToSpeech.speak({
                    text: chunk,
                    lang: language === 'bn' ? 'bn-IN' : 'en-US',
                    rate: language === 'bn' ? 0.88 : 0.95, // Slower for Bengali clarity on mobile
                    pitch: 1.0,
                    volume: 1.0,
                    category: 'ambient',
                });
                nativeChunkIndex += 1;
            } catch (speakErr) {
                if (stopSignal.current || nativePaused || myToken !== nativePlaybackToken) {
                    break;
                }
                console.warn('Native resume chunk failed', speakErr);

                // Retry current chunk once with a slightly longer settle delay.
                try {
                    await TextToSpeech.stop();
                } catch (stopErr) {
                    console.warn('Native resume retry pre-stop failed:', stopErr);
                }

                try {
                    await new Promise((resolve) => setTimeout(resolve, 220));
                    await TextToSpeech.speak({
                        text: chunk,
                        lang: language === 'bn' ? 'bn-IN' : 'en-US',
                        rate: language === 'bn' ? 0.88 : 0.95,
                        pitch: 1.0,
                        volume: 1.0,
                        category: 'ambient',
                    });
                    nativeChunkIndex += 1;
                } catch (retryErr) {
                    console.warn('Native resume retry failed', retryErr);

                    // Keep the same chunk index so next tap retries this exact line.
                    nativePaused = true;
                    nativeStatus = 'paused';
                    stopSignal.current = true;
                    setIsPlaying(false);
                    setIsPaused(true);
                    return;
                }
            }
        }

        if (!stopSignal.current && !nativePaused && nativeChunkIndex >= nativeChunks.length && myToken === nativePlaybackToken) {
            setIsPlaying(false);
            setIsPaused(false);
            setActiveId(null);
            nativeChunks = [];
            nativeChunkIndex = 0;
            nativeStatus = 'idle';
            nativeActiveSpeechId = null;
        }
    }, [isSupported, isNative]);

    const speak = useCallback(async (text, id = null) => {
        if (!text || !isSupported) return;

        // Native guard: if same content is already active, treat subsequent taps as toggle, not restart.
        if (isNative && id && nativeActiveSpeechId === id) {
            if (nativeStatus === 'playing') {
                await pause();
                return;
            }
            if (nativeStatus === 'paused') {
                await resume();
                return;
            }
        }

        try {
            // Priority 0: Premium Neural TTS (Microsoft Edge Proxy)
            if (usePremium && PREMIUM_TTS_URL && !PREMIUM_TTS_URL.includes('your-project-ref')) {
                try {
                    const cleaned = cleanText(text);
                    if (!cleaned) return;

                    setActiveId(id);
                    setIsPlaying(true);
                    setIsPaused(false);

                    console.log("Attempting Premium Neural TTS for:", cleaned);
                    
                    // Get Supabase credentials
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                    const response = await fetch(PREMIUM_TTS_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseAnonKey}`
                        },
                        body: JSON.stringify({
                            text: cleaned,
                            lang: language === 'bn' ? 'bn-IN' : 'en-US',
                            voice: language === 'bn' ? 'bn-IN-TanishaaNeural' : 'en-US-JennyNeural'
                        })
                    });

                    if (response.ok) {
                        console.log("Premium TTS Success!");
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        
                        if (currentUtterance.current instanceof Audio) {
                            currentUtterance.current.pause();
                            currentUtterance.current.src = "";
                        }

                        const audio = new Audio(url);
                        currentUtterance.current = audio;
                        
                        audio.onended = () => {
                            setIsPlaying(false);
                            setActiveId(null);
                            URL.revokeObjectURL(url);
                        };

                        audio.onerror = (e) => {
                            console.error("Audio playback error:", e);
                            setIsPlaying(false);
                            setActiveId(null);
                        };

                        await audio.play();
                        return;
                    } else {
                        const errorData = await response.text();
                        console.warn("Premium TTS response not OK:", response.status, errorData);
                    }
                } catch (e) {
                    console.error("Premium TTS Critical Failure:", e);
                }
            }

            // Stop any previous speech
            await stop();
            stopSignal.current = false; // Reset signal

            setActiveId(id);
            setIsPlaying(true);
            setIsPaused(false);

            const cleaned = cleanText(text);
            if (!cleaned) {
                setIsPlaying(false);
                setActiveId(null);
                nativeStatus = 'idle';
                nativeActiveSpeechId = null;
                return;
            }

            if (isNative) {
                // --- Native Chunking Logic ---
                // Keep progress so pause/resume can continue from current chunk.
                nativeChunks = splitIntoChunks(cleaned);
                nativeChunkIndex = 0;
                nativePaused = false;
                nativeStatus = 'playing';
                nativeActiveSpeechId = id;
                const myToken = ++nativePlaybackToken;

                if (nativeChunks.length === 0) {
                    setIsPlaying(false);
                    setActiveId(null);
                    nativeStatus = 'idle';
                    nativeActiveSpeechId = null;
                    return;
                }

                while (!stopSignal.current && !nativePaused && nativeChunkIndex < nativeChunks.length && myToken === nativePlaybackToken) {
                    const chunk = nativeChunks[nativeChunkIndex];

                    try {
                        await TextToSpeech.speak({
                            text: chunk,
                            lang: language === 'bn' ? 'bn-IN' : 'en-US',
                            rate: language === 'bn' ? 0.88 : 0.95,
                            pitch: 1.0,
                            volume: 1.0,
                            category: 'ambient',
                        });
                        nativeChunkIndex += 1;
                    } catch (speakErr) {
                        // pause/stop interruption is expected and should not be treated as hard failure
                        if (stopSignal.current || nativePaused || myToken !== nativePlaybackToken) break;
                        console.warn("Chunk speak failed", speakErr);
                        nativeChunkIndex += 1;
                    }
                }

                // Only reset if we finished naturally (not paused/stopped manually)
                if (!stopSignal.current && !nativePaused && nativeChunkIndex >= nativeChunks.length && myToken === nativePlaybackToken) {
                    setIsPlaying(false);
                    setIsPaused(false);
                    setActiveId(null);
                    nativeChunks = [];
                    nativeChunkIndex = 0;
                    nativeStatus = 'idle';
                    nativeActiveSpeechId = null;
                }
            } else {
                // --- Web Implementation with chunk queue (more stable for long chapter text) ---
                const chunks = splitIntoChunks(cleaned);
                if (chunks.length === 0) {
                    setIsPlaying(false);
                    setActiveId(null);
                    return;
                }

                // Some browsers load voices lazily; one short wait improves first-run reliability.
                let voices = window.speechSynthesis.getVoices();
                if (!voices || voices.length === 0) {
                    await new Promise((resolve) => setTimeout(resolve, 150));
                    voices = window.speechSynthesis.getVoices();
                }
                const selectedVoice = pickBestWebVoice(voices);
                let chunkIndex = 0;
                const mySession = ++webSessionCounter;
                const langFallbacks = language === 'bn' ? ['bn-BD', 'bn-IN', 'hi-IN', 'en-IN'] : ['en-US'];

                const speakNextChunk = (retryCount = 0) => {
                    if (mySession !== webSessionCounter) return;

                    if (stopSignal.current) {
                        setIsPlaying(false);
                        setIsPaused(false);
                        setActiveId(null);
                        currentUtterance.current = null;
                        return;
                    }

                    if (chunkIndex >= chunks.length) {
                        setIsPlaying(false);
                        setIsPaused(false);
                        setActiveId(null);
                        currentUtterance.current = null;
                        return;
                    }

                    const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
                    currentUtterance.current = utterance;
                    let started = false;

                    utterance.lang = selectedVoice?.lang || langFallbacks[Math.min(retryCount, langFallbacks.length - 1)] || (language === 'bn' ? 'bn-BD' : 'en-US');
                    utterance.rate = language === 'bn' ? 0.86 : 0.95;
                    utterance.pitch = 1.0;
                    utterance.volume = 1.0;
                    // On retry, do not force voice binding; let engine choose best available fallback.
                    if (selectedVoice && retryCount === 0) utterance.voice = selectedVoice;

                    const startWatchdog = setTimeout(() => {
                        if (mySession !== webSessionCounter || stopSignal.current) return;
                        if (!started) {
                            // No start event means engine likely failed silently; retry/fallback.
                            // Increased timeout to 1200ms as Bengali voices often take longer to warm up.
                            if (retryCount < 3) {
                                speakNextChunk(retryCount + 1);
                            } else {
                                chunkIndex += 1;
                                speakNextChunk(0);
                            }
                        }
                    }, 1200);

                    utterance.onstart = () => {
                        if (mySession !== webSessionCounter) return;
                        started = true;
                        setIsPaused(false);
                        clearTimeout(startWatchdog);
                    };
                    utterance.onpause = () => {
                        if (mySession !== webSessionCounter) return;
                        setIsPaused(true);
                    };
                    utterance.onresume = () => {
                        if (mySession !== webSessionCounter) return;
                        setIsPaused(false);
                    };
                    utterance.onend = () => {
                        if (mySession !== webSessionCounter) return;
                        clearTimeout(startWatchdog);
                        chunkIndex += 1;
                        
                        // Human-like pause between sentences (350ms)
                        // Optimized for tighter conversational flow
                        if (chunkIndex < chunks.length) {
                            setTimeout(() => speakNextChunk(), 350);
                        } else {
                            speakNextChunk();
                        }
                    };
                    utterance.onerror = (e) => {
                        if (mySession !== webSessionCounter) return;
                        clearTimeout(startWatchdog);
                        console.error('Web TTS Error:', e);
                        const errorType = e?.error || '';

                        // On web, 'interrupted' often occurs transiently; retry same chunk once.
                        if (errorType === 'interrupted' && !stopSignal.current && retryCount < 3) {
                            setTimeout(() => speakNextChunk(retryCount + 1), 140);
                            return;
                        }

                        // Skip failed chunk and continue; this prevents full-stop on one bad chunk.
                        chunkIndex += 1;
                        if (chunkIndex < chunks.length) {
                            speakNextChunk(0);
                            return;
                        }

                        setIsPlaying(false);
                        setIsPaused(false);
                        setActiveId(null);
                        currentUtterance.current = null;
                    };

                    window.speechSynthesis.speak(utterance);
                };

                // Cancel only when needed; aggressive cancel can trigger immediate interruption on desktop.
                if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                    window.speechSynthesis.cancel();
                }
                // Small delay after cancel helps desktop browsers avoid immediate interruption.
                setTimeout(() => {
                    if (mySession === webSessionCounter && !stopSignal.current) {
                        speakNextChunk();
                    }
                }, 80);
            }

        } catch (err) {
            console.error("TTS Speak failed:", err);
            setIsPlaying(false);
            setActiveId(null);
            if (isNative) {
                nativeStatus = 'idle';
                nativeActiveSpeechId = null;
            }
        }
    }, [language, isSupported, isNative, stop, pause, resume]);

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
