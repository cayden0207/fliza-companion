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
    const intentionallyStoppedRef = useRef(false); // Tack if user clicked stop

    useEffect(() => {
        // Sync ref with state for use in other places if needed, 
        // but mainly we update ref in onresult first
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        // Check for Web Speech API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        // Initialize speech recognition
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Attempt to keep open
        recognition.interimResults = true;
        recognition.lang = 'en-US';

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

            // Update both state (for UI) and ref (for handlers)
            setTranscript(currentText);
            transcriptRef.current = currentText;
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'aborted') return; // Ignore manual stop
            console.error('Speech recognition error:', event.error);
            // Don't separate logic here, let onend handle cleanup
        };

        recognition.onend = () => {
            // If user did NOT click stop, we try to restart (Keep-Alive)
            if (!intentionallyStoppedRef.current) {
                console.log('Recognition ended unexpectedly. Restarting...');
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Failed to restart:", e);
                    setIsListening(false);
                }
                return;
            }

            // Normal stop logic
            setIsListening(false);

            // Critical fix: Check the REF, not the state
            const textToSend = transcriptRef.current;
            if (textToSend && textToSend.trim().length > 0) {
                console.log('Voice end, sending:', textToSend);
                onTranscript(textToSend);
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
    }, [onTranscript]);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current || disabled) return;

        if (isListening) {
            // Manual stop
            intentionallyStoppedRef.current = true;
            recognitionRef.current.stop();
            // The onend handler will trigger and send the message
        } else {
            // Start
            intentionallyStoppedRef.current = false;
            setTranscript('');
            transcriptRef.current = '';
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Failed to start recognition:", e);
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
