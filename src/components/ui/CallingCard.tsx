'use client';

import React from 'react';
import styles from './CallingCard.module.css';

interface CallingCardProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

export default function CallingCard({
    isOpen,
    onClose,
    title = "TAKE YOUR HEART",
    message = "This feature is currently under construction by the Phantom Thieves!"
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

                    <div className={styles.message}>
                        {message}
                    </div>

                    <button className={styles.closeBtn} onClick={onClose}>
                        ACKNOWLEDGE
                    </button>
                </div>
            </div>
        </div>
    );
}
