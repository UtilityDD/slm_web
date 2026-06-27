import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Shared voice/audio engine for Suraksha Sathi modes.
 *
 * Resolution order for spoken guidance:
 *   1. High quality pre-recorded file under /audio/safety/<file>.wav
 *   2. Browser SpeechSynthesis (TTS) fallback when no file / file fails
 *
 * Designed to work fully offline: cached audio files are served by the service
 * worker, and TTS is a device-local capability that needs no network.
 */
export default function useSafetyVoice(language = 'bn') {
    const [voices, setVoices] = useState([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef(null);

    if (audioRef.current === null && typeof Audio !== 'undefined') {
        audioRef.current = new Audio();
    }

    // Load voices on mount (and when the browser populates them asynchronously)
    useEffect(() => {
        if (!('speechSynthesis' in window)) return undefined;
        const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        return undefined;
    }, []);

    const stopAllAudio = useCallback(() => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            try { audioRef.current.load(); } catch (e) { /* noop */ }
            audioRef.current.currentTime = 0;
        }
        setIsSpeaking(false);
    }, []);

    // Stop audio on unmount
    useEffect(() => () => stopAllAudio(), [stopAllAudio]);

    const playAudio = useCallback((text, audioFile = null) => {
        stopAllAudio();

        const speakWithTTS = () => {
            if (!window.speechSynthesis || !text) return;
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(String(text).trim());

            if (language === 'bn') {
                // Priority: Neural Female > Neural Male > Google > Native
                const bnVoice = voices.find(v => /google.*(bangla|bengali).*neural.*female/i.test(v.name)) ||
                               voices.find(v => /google.*(bangla|bengali).*neural/i.test(v.name)) ||
                               voices.find(v => /microsoft.*(bangla|bengali).*online/i.test(v.name)) ||
                               voices.find(v => /google.*(bangla|bengali)/i.test(v.name)) ||
                               voices.find(v => v.lang && v.lang.startsWith('bn'));
                if (bnVoice) utterance.voice = bnVoice;
                utterance.lang = 'bn-IN';
                utterance.rate = 0.92;
            } else {
                const enVoice = voices.find(v => /google.*english.*neural.*female/i.test(v.name)) ||
                               voices.find(v => /google.*english.*neural/i.test(v.name)) ||
                               voices.find(v => /microsoft.*english.*online/i.test(v.name)) ||
                               voices.find(v => v.lang && v.lang.startsWith('en-US'));
                if (enVoice) utterance.voice = enVoice;
                utterance.lang = 'en-US';
                utterance.rate = 0.95;
            }

            utterance.pitch = 1.0;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            window.speechSynthesis.speak(utterance);
        };

        // Priority 1: Try high quality pre-recorded audio file
        if (audioFile && audioRef.current) {
            const audioPath = `/audio/safety/${audioFile.replace('.mp3', '.wav')}`;
            const testAudio = new Audio(audioPath);

            testAudio.addEventListener('canplaythrough', () => {
                audioRef.current.src = audioPath;
                audioRef.current.onplay = () => setIsSpeaking(true);
                audioRef.current.onended = () => setIsSpeaking(false);
                audioRef.current.play().catch(() => speakWithTTS());
            }, { once: true });

            testAudio.addEventListener('error', () => speakWithTTS(), { once: true });
            return;
        }

        // Priority 2: TTS fallback (no audio file provided)
        speakWithTTS();
    }, [language, voices, stopAllAudio]);

    const playAlertSound = useCallback(() => {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(880, context.currentTime);
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.2);
        } catch (e) {
            // AudioContext unavailable; ignore.
        }
    }, []);

    return { voices, isSpeaking, playAudio, stopAllAudio, playAlertSound };
}
