'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './VoiceInput.module.css';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    disabled?: boolean;
}

// Extend Window interface for Web Speech API
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);

    // Refs to keep track of latest state inside event handlers
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef(''); // crucial for onend to see latest text
    const intentionallyStoppedRef = useRef(false); // Track if user clicked stop
    const onTranscriptRef = useRef(onTranscript); // Ref for callback to avoid useEffect re-runs

    // Keep callback ref up to date
    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    useEffect(() => {
        // Sync ref with state for use in other places if needed, 
        // but mainly we update ref in onresult first
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        // Check for Web Speech API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('[VoiceInput] Web Speech API not supported in this browser');
            setIsSupported(false);
            return;
        }
        console.log('[VoiceInput] Web Speech API is supported');

        // Initialize speech recognition
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Attempt to keep open
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log('[VoiceInput] Recognition started');
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            const currentText = interimTranscript || finalTranscript;
            console.log('[VoiceInput] Transcript:', currentText);

            // Update both state (for UI) and ref (for handlers)
            setTranscript(currentText);
            transcriptRef.current = currentText;
        };

        recognition.onerror = (event: any) => {
            console.error('[VoiceInput] Recognition error:', event.error, event);
            if (event.error === 'aborted') return; // Ignore manual stop
            if (event.error === 'not-allowed') {
                alert('麦克风权限被拒绝！请在浏览器设置中允许麦克风访问。');
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            console.log('[VoiceInput] Recognition ended, intentionallyStopped:', intentionallyStoppedRef.current);
            // If user did NOT click stop, we try to restart (Keep-Alive)
            if (!intentionallyStoppedRef.current) {
                console.log('[VoiceInput] Restarting recognition...');
                try {
                    recognition.start();
                } catch (e) {
                    console.error("[VoiceInput] Failed to restart:", e);
                    setIsListening(false);
                }
                return;
            }

            // Normal stop logic
            setIsListening(false);

            // Critical fix: Check the REF, not the state
            const textToSend = transcriptRef.current;
            if (textToSend && textToSend.trim().length > 0) {
                console.log('[VoiceInput] Sending transcript:', textToSend);
                onTranscriptRef.current(textToSend); // Use ref to avoid stale closure
            }

            setTranscript('');
            transcriptRef.current = '';
        };

        recognitionRef.current = recognition;

        // Cleanup function for component unmount
        return () => {
            intentionallyStoppedRef.current = true; // Ensure we don't restart after unmount
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []); // Empty dependency - recognition should only init once

    const toggleListening = useCallback(() => {
        console.log('[VoiceInput] Toggle clicked, current isListening:', isListening, 'disabled:', disabled);
        if (!recognitionRef.current || disabled) {
            console.warn('[VoiceInput] Cannot toggle - recognition not ready or disabled');
            return;
        }

        if (isListening) {
            // Manual stop
            console.log('[VoiceInput] Stopping recognition...');
            intentionallyStoppedRef.current = true;
            recognitionRef.current.stop();
            // The onend handler will trigger and send the message
        } else {
            // Start
            console.log('[VoiceInput] Starting recognition...');
            intentionallyStoppedRef.current = false;
            setTranscript('');
            transcriptRef.current = '';
            try {
                recognitionRef.current.start();
                setIsListening(true);
                console.log('[VoiceInput] Recognition start called');
            } catch (e) {
                console.error("[VoiceInput] Failed to start recognition:", e);
                setIsListening(false);
            }
        }
    }, [isListening, disabled]);

    if (!isSupported) {
        return (
            <button
                className={`${styles.voiceBtn} ${styles.unsupported}`}
                title="语音输入不支持"
                disabled
            >
                🎤
            </button>
        );
    }

    return (
        <div className={styles.container}>
            <button
                className={`${styles.voiceBtn} ${isListening ? styles.listening : ''}`}
                onClick={toggleListening}
                disabled={disabled}
                title={isListening ? '点击停止' : '点击说话'}
            >
                <span className={styles.icon}>🎤</span>
                {isListening && <span className={styles.pulse} />}
            </button>

            {transcript && (
                <div className={styles.transcriptBubble}>
                    {transcript}...
                </div>
            )}
        </div>
    );
}
