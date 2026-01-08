import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for Text-to-Speech functionality
 * @param {string} language - 'bn' or 'en'
 */
export const useTextToSpeech = (language = 'bn') => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [availableVoices, setAvailableVoices] = useState([]);
    const speechRef = useRef(null);

    // Initialize voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    // Clean text by removing special tags [[...]] and ((...))
    const cleanText = (text) => {
        if (!text) return '';
        let cleaned = text
            .replace(/\[\[.*?\]\]/g, '') // Remove inline images
            .replace(/\(\(.*?\)\)/g, '') // Remove blinking eye modal content
            .replace(/\(.*?\)/g, '');    // Remove text in standard brackets

        // Improve percentage and number reading specifically for Bengali
        if (language === 'bn') {
            cleaned = cleaned.replace(/%/g, ' শতাংশ');

            // Map common values and acronyms to words for perfect pronunciation
            cleaned = cleaned.replace(/১০০ শতাংশ/g, 'একশো শতাংশ');
            cleaned = cleaned.replace(/৫০ শতাংশ/g, 'পঞ্চাশ শতাংশ');
            cleaned = cleaned.replace(/ISI/gi, 'আই এস আই');
            cleaned = cleaned.replace(/PPE/gi, 'পি পি ই');

            // Convert Bengali numerals to English digits 
            // Most TTS engines recognize "100" as "একশো" better than "১০০" (which they read digit-by-digit)
            const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
            bnDigits.forEach((digit, i) => {
                const regex = new RegExp(digit, 'g');
                cleaned = cleaned.replace(regex, i.toString());
            });
        }

        return cleaned
            .replace(/\n/g, ' ') // Replace newlines with spaces for smoother reading
            .trim();
    };

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        setActiveId(null);
    }, []);

    const pause = useCallback(() => {
        window.speechSynthesis.pause();
        setIsPaused(true);
    }, []);

    const resume = useCallback(() => {
        window.speechSynthesis.resume();
        setIsPaused(false);
    }, []);

    const speak = useCallback((text, id = null) => {
        if (!text) return;

        // Cancel any current speech
        window.speechSynthesis.cancel();
        setActiveId(id);

        const cleaned = cleanText(text);
        if (!cleaned) return;

        // Split text into smaller chunks (sentences or small paragraphs)
        // Some browsers have limits on utterance length
        const chunks = cleaned.split(/[।\.!\?]\s+/).filter(Boolean);

        // Voice Selection Logic
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;

        if (language === 'bn') {
            // Find Bengali voices
            selectedVoice = voices.find(v => v.lang.startsWith('bn-') && v.name.includes('Google')) ||
                voices.find(v => v.lang.startsWith('bn-'));
        } else {
            // Find English voices
            selectedVoice = voices.find(v => v.lang.startsWith('en-') && v.name.includes('Google')) ||
                voices.find(v => v.lang.startsWith('en-'));
        }

        // Queue each chunk
        chunks.forEach((chunk, index) => {
            const utterance = new SpeechSynthesisUtterance(chunk + (language === 'bn' ? "।" : "."));

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.lang = language === 'bn' ? 'bn-IN' : 'en-US';
            utterance.rate = 0.95; // Balanced speed
            utterance.pitch = 1.0;

            if (index === 0) {
                utterance.onstart = () => setIsPlaying(true);
            }

            if (index === chunks.length - 1) {
                utterance.onend = () => {
                    setIsPlaying(false);
                    setActiveId(null);
                };
            }

            utterance.onerror = () => {
                if (index === chunks.length - 1) {
                    setIsPlaying(false);
                    setIsPaused(false);
                    setActiveId(null);
                }
            };

            window.speechSynthesis.speak(utterance);
        });
    }, [language]);

    // Optional: Auto-stop when component unmounts
    useEffect(() => {
        return () => window.speechSynthesis.cancel();
    }, []);

    return {
        speak,
        pause,
        resume,
        stop,
        isPlaying,
        isPaused,
        activeId,
        voices: availableVoices
    };
};
