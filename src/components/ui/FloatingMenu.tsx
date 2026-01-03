'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import LoginModal from '@/components/auth/LoginModal';
import styles from './FloatingMenu.module.css';
import CallingCard from './CallingCard';
import { User } from '@supabase/supabase-js';

interface FloatingMenuProps {
    onChatToggle?: () => void;
    onProfileToggle?: () => void;
    onCameraToggle?: () => void;
    isCameraActive?: boolean;
    onArToggle?: () => void;
    isArActive?: boolean;
}

// Allow ReactNode for icon
type MenuItem = {
    icon: React.ReactNode;
    label: string;
    color: string;
    isTrigger?: boolean;
    onClick?: () => void;
};

export default function FloatingMenu({
    onChatToggle,
    onProfileToggle,
    onCameraToggle,
    isCameraActive,
    onArToggle,
    isArActive
}: FloatingMenuProps) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Calling Card State
    const [callingCardState, setCallingCardState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
    }>({
        isOpen: false,
        title: '',
        message: ''
    });

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
            if (onProfileToggle) onProfileToggle();
        } else {
            setShowLoginModal(true);
        }
    };

    const showFeatureConstruction = (featureName: string) => {
        setCallingCardState({
            isOpen: true,
            title: "NOTICE",
            message: `The "${featureName}" feature is currently being crafted in the Metaverse.`
        });
    };

    const menuItems = [
        { icon: '📱', label: 'Chat', color: 'blue', isTrigger: true, onClick: onChatToggle },
        {
            icon: isCameraActive ? '🔴' : '📷',
            label: isCameraActive ? 'Vision ON' : 'Vision',
            color: isCameraActive ? 'red' : 'purple',
            onClick: onCameraToggle
        },
        {
            icon: <span style={{ fontFamily: 'Anton', fontSize: '1.5em', letterSpacing: '-1px' }}>AR</span>,
            label: isArActive ? 'AR ON' : 'AR',
            color: isArActive ? 'green' : 'orange',
            onClick: onArToggle
        },
        {
            icon: '📖',
            label: 'Story',
            color: 'blue',
            onClick: () => showFeatureConstruction('Story Mode')
        },
        {
            icon: '🏆',
            label: 'Feats',
            color: 'gold',
            onClick: () => showFeatureConstruction('Feats & Achievements')
        },
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
                        key={`${index}-${item.label}`}
                        className={styles.menuBtn}
                        title={item.label}
                        onClick={item.onClick}
                        style={{ borderColor: item.color }}
                    >
                        <div className={styles.shapeWrapper}>
                            {/* Check if icon is string (emoji) or element */}
                            {typeof item.icon === 'string' ? (
                                <span className={styles.btnIcon}>{item.icon}</span>
                            ) : (
                                <div className={styles.customIcon}>{item.icon}</div>
                            )}
                        </div>
                        {!item.isTrigger && <span className={styles.btnLabel}>{item.label}</span>}
                    </button>
                ))}
            </div>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />

            <CallingCard
                isOpen={callingCardState.isOpen}
                onClose={() => setCallingCardState(prev => ({ ...prev, isOpen: false }))}
                title={callingCardState.title}
                message={callingCardState.message}
            />
        </>
    );
}
