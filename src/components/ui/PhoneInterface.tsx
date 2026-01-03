'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './PhoneInterface.module.css';
import { useChatHistory } from '@/hooks/useChatHistory';

interface PhoneInterfaceProps {
    isOpen: boolean;
    onClose: () => void;
    isLoggedIn?: boolean; // Optional now, hook handles user check
    onLoginRequired?: () => void;
}

export default function PhoneInterface({
    isOpen,
    onClose,
}: PhoneInterfaceProps) {
    const { messages, sendMessage, user, loading } = useChatHistory();
    const [inputValue, setInputValue] = useState(''); // Keep local input state
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const content = inputValue;
        setInputValue(''); // Clear immediately for UX

        await sendMessage(content, 'user');
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
                    {!user ? (
                        <div className={styles.emptyState}>
                            <p style={{ color: '#fff', textAlign: 'center', marginTop: '50px', fontFamily: 'Anton' }}>
                                PLEASE LOGIN TO CHAT
                            </p>
                        </div>
                    ) : (
                        <div className={styles.messagesList}>
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`${styles.messageRow} ${msg.role === 'user' ? styles.rowUser : styles.rowAi}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className={styles.chatAvatar}>
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🐰</div>
                                        </div>
                                    )}

                                    <div className={styles.bubbleWrapper}>
                                        <div className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                                            {msg.content}
                                        </div>
                                        <div className={styles.timestamp}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />

                            {/* Typing Indicator */}
                            {loading && (
                                <div className={`${styles.messageRow} ${styles.rowAi}`}>
                                    <div className={styles.chatAvatar}>
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🐰</div>
                                    </div>
                                    <div className={styles.bubbleWrapper}>
                                        <div className={`${styles.bubble} ${styles.aiBubble}`}>
                                            <div className={styles.typingIndicator}>
                                                <div className={styles.typingDot} />
                                                <div className={styles.typingDot} />
                                                <div className={styles.typingDot} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className={styles.inputArea}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder={user ? "Type a message..." : "Login to chat..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={!user}
                        />
                        <button className={styles.sendBtn} onClick={handleSend} disabled={!user}>
                            SEND
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
