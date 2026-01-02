'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './PhoneInterface.module.css';

interface PhoneInterfaceProps {
    isOpen: boolean;
    onClose: () => void;
    isLoggedIn: boolean;
    onLoginRequired: () => void;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: number;
}

export default function PhoneInterface({
    isOpen,
    onClose,
    isLoggedIn,
    onLoginRequired
}: PhoneInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hey! I'm Fliza. What's on your mind? ✨", sender: 'ai', timestamp: Date.now() }
    ]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        // Optimistic add
        const newMsg: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: 'user',
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, newMsg]);
        setInputValue('');

        // Simulate AI typing/reply
        setTimeout(() => {
            const reply: Message = {
                id: (Date.now() + 1).toString(),
                text: "That sounds interesting! Tell me more based on the game world context.",
                sender: 'ai',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, reply]);
        }, 1000);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.phoneOverlay}>
            <div className={styles.phoneContainer}>
                {/* SNS Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <span className={styles.snsLabel}>SNS</span>
                        <div className={styles.contactName}>FLIZA</div>
                        <button className={styles.closeBtn} onClick={onClose}>X</button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className={styles.chatArea}>
                    <div className={styles.messagesList}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`${styles.messageRow} ${msg.sender === 'user' ? styles.rowUser : styles.rowAi}`}
                            >
                                {msg.sender === 'ai' && (
                                    <div className={styles.chatAvatar}>
                                        {/* Placeholder for avatar image if we had one, or just emoji */}
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🐰</div>
                                    </div>
                                )}

                                <div className={styles.bubbleWrapper}>
                                    <div className={`${styles.bubble} ${msg.sender === 'user' ? styles.userBubble : styles.aiBubble}`}>
                                        {msg.text}
                                    </div>
                                    <div className={styles.timestamp}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className={styles.inputArea}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Type a message..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button className={styles.sendBtn} onClick={handleSend}>
                            SEND
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
