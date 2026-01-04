'use client';

import React from 'react';
import styles from './CallingCard.module.css';

interface CallingCardProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
    image?: string | null; // Base64 or URL of generated image
    isLoading?: boolean;
}

export default function CallingCard({
    isOpen,
    onClose,
    title = "TAKE YOUR HEART",
    message = "This feature is currently under construction by the Phantom Thieves!",
    image,
    isLoading = false
}: CallingCardProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.card} onClick={e => e.stopPropagation()}>
                <div className={styles.content}>
                    <div className={styles.logo}>🎩</div>

                    <div className={styles.title}>
                        {title}
                    </div>

                    {isLoading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner} />
                            <span>Creating your design... 🎨</span>
                        </div>
                    ) : (
                        <>
                            {image && (
                                <div className={styles.imageWrapper}>
                                    <img src={image} alt="Generated Design" className={styles.generatedImage} />
                                </div>
                            )}

                            <div className={styles.message}>
                                {message}
                            </div>
                        </>
                    )}

                    <button className={styles.closeBtn} onClick={onClose}>
                        {isLoading ? 'CANCEL' : 'ACKNOWLEDGE'}
                    </button>
                </div>
            </div>
        </div>
    );
}
