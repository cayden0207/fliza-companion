'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './ProfileCard.module.css';

interface ProfileCardProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
}

export default function ProfileCard({ isOpen, onClose, userId }: ProfileCardProps) {
    const [username, setUsername] = useState('Joker');
    const [avatarUrl, setAvatarUrl] = useState('https://api.dicebear.com/9.x/avataaars/svg?seed=Joker');
    const [loading, setLoading] = useState(false);

    // Fetch Profile
    useEffect(() => {
        if (isOpen && userId) {
            const fetchProfile = async () => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (data) {
                    setUsername(data.username || 'Joker');
                    setAvatarUrl(data.avatar_url || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Joker');
                }
            };
            fetchProfile();
        }
    }, [isOpen, userId]);

    // Save Profile
    const handleSave = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    username,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            onClose();
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Failed to update Callling Card!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.cardOverlay} onClick={onClose}>
            <div className={styles.cardContainer} onClick={e => e.stopPropagation()}>
                {/* Left: Avatar */}
                <div className={styles.leftSection}>
                    <div className={styles.avatarContainer}>
                        <img src={avatarUrl} alt="Avatar" className={styles.avatar} />
                    </div>
                </div>

                {/* Right: Info */}
                <div className={styles.rightSection}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>CONFIDANT DATA</h2>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>CODE NAME</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Enter Code Name"
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>AVATAR URL</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={avatarUrl}
                            onChange={e => setAvatarUrl(e.target.value)}
                            style={{ fontSize: '14px', fontFamily: 'monospace' }}
                        />
                    </div>

                    <div className={styles.statsRow}>
                        <div className={styles.statBadge}>
                            <span>ARCANA</span>
                            <span className={styles.statValue}>FOOL</span>
                        </div>
                        <div className={styles.statBadge}>
                            <span>RANK</span>
                            <span className={styles.statValue}>1</span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button className={`${styles.btn} ${styles.btnClose}`} onClick={onClose}>
                            CLOSE
                        </button>
                        <button
                            className={`${styles.btn} ${styles.btnSave}`}
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? 'SAVING...' : 'SAVE'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
