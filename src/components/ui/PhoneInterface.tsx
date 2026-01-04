'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './PhoneInterface.module.css';
import VoiceInput from './VoiceInput';

// Define Message type locally or import if available
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface PhoneInterfaceProps {
    isOpen: boolean;
    onClose: () => void;
    visionContext?: string;
    onLastMessageChange?: (message: string) => void;
    messages: Message[];
    sendMessage: (content: string, role: 'user' | 'assistant', visionContext?: string) => Promise<void>;
    user: any;
    loading: boolean;
    onDesignAction?: (prompt: string, attachedImage?: string | null) => void;
}

export default function PhoneInterface({
    isOpen,
    onClose,
    visionContext,
    onLastMessageChange,
    messages,
    sendMessage,
    user,
    loading,
    onDesignAction
}: PhoneInterfaceProps) {
    const [inputValue, setInputValue] = useState('');
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setAttachedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const clearAttachedImage = () => {
        setAttachedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const content = inputValue;
        setInputValue('');

        // Check for design keywords before sending
        const designKeywords = ['design', 'create', 'generate', 'make', 'draw', 'artwork', 'poster', 'image', 'picture'];
        const hasDesignIntent = designKeywords.some(kw => content.toLowerCase().includes(kw));

        if (hasDesignIntent && onDesignAction) {
            // Trigger design action directly if we detect intent
            onDesignAction(content, attachedImage);
            clearAttachedImage();
            return;
        }

        await sendMessage(content, 'user', visionContext);
        clearAttachedImage();
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
                    {/* Attached Image Preview */}
                    {attachedImage && (
                        <div className={styles.attachedPreview}>
                            <img src={attachedImage} alt="Attached" className={styles.previewImage} />
                            <button className={styles.removeAttachment} onClick={clearAttachedImage}>✕</button>
                        </div>
                    )}

                    <div className={styles.inputWrapper}>
                        {/* Image Upload Button */}
                        <button
                            className={styles.attachBtn}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!user}
                            title="Attach Image"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />

                        <VoiceInput
                            onTranscript={(text) => setInputValue(prev => prev + text)}
                            disabled={!user}
                        />
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder={user ? "Type or speak..." : "Login to chat..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={!user}
                        />
                        <button className={styles.sendBtn} onClick={handleSend} disabled={!user}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
