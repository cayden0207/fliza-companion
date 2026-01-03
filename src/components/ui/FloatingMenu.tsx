'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import LoginModal from '@/components/auth/LoginModal';
import styles from './FloatingMenu.module.css';
import { User } from '@supabase/supabase-js';

interface FloatingMenuProps {
    onChatToggle?: () => void;
    onProfileToggle?: () => void;
    onCameraToggle?: () => void;
    isCameraActive?: boolean;
}

export default function FloatingMenu({ onChatToggle, onProfileToggle, onCameraToggle, isCameraActive }: FloatingMenuProps) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsLoggedIn(!!session);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleAuthClick = () => {
        if (isLoggedIn) {
            // If logged in, open Profile Card instead of logging out immediately
            // Or maybe a logout button inside profile?
            // For P5 style, let's make the last button "Profile" if logged in.
            if (onProfileToggle) onProfileToggle();
        } else {
            setShowLoginModal(true);
        }
    };

    const menuItems = [
        { icon: '📱', label: 'Chat', color: 'blue', isTrigger: true, onClick: onChatToggle },
        {
            icon: isCameraActive ? '🔴' : '👁️',
            label: isCameraActive ? 'Vision ON' : 'Vision',
            color: isCameraActive ? 'red' : 'purple',
            onClick: onCameraToggle
        },
        { icon: '📖', label: 'Story', color: 'blue' },
        { icon: '🏆', label: 'Feats', color: 'gold' },
        {
            icon: isLoggedIn ? '🎭' : '⚙️',
            label: isLoggedIn ? 'Profile' : 'Login',
            color: 'gray',
            onClick: handleAuthClick
        },
    ];

    return (
        <>
            <div className={styles.menuContainer}>
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        className={styles.menuBtn}
                        title={item.label}
                        onClick={item.onClick}
                        style={{ borderColor: item.color }}
                    >
                        <div className={styles.shapeWrapper}>
                            <span className={styles.btnIcon}>{item.icon}</span>
                        </div>
                        {!item.isTrigger && <span className={styles.btnLabel}>{item.label}</span>}
                    </button>
                ))}
            </div>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />
        </>
    );
}
