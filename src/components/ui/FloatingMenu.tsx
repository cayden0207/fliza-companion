'use client';

import styles from './FloatingMenu.module.css';

interface FloatingMenuProps {
    onChatToggle?: () => void;
}

export default function FloatingMenu({ onChatToggle }: FloatingMenuProps) {
    const menuItems = [
        { icon: '📱', label: 'Chat', color: 'blue', isTrigger: true, onClick: onChatToggle },
        { icon: '🎁', label: 'Gift', color: 'pink' },
        { icon: '📖', label: 'Story', color: 'blue' },
        { icon: '🏆', label: 'Feats', color: 'gold' },
        { icon: '⚙️', label: 'Menu', color: 'gray' },
    ];

    return (
        <div className={styles.menuContainer}>
            {menuItems.map((item, index) => (
                <button
                    key={index}
                    className={styles.menuBtn}
                    title={item.label}
                    onClick={item.onClick}
                >
                    <div className={styles.shapeWrapper}>
                        <span className={styles.btnIcon}>{item.icon}</span>
                    </div>
                    {!item.isTrigger && <span className={styles.btnLabel}>{item.label}</span>}
                </button>
            ))}
        </div>
    );
}
