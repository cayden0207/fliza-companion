'use client';

import { useState, useEffect } from 'react';
import styles from './DateDisplay.module.css';

export default function DateDisplay() {
    const [date, setDate] = useState<Date | null>(null);

    useEffect(() => {
        setDate(new Date());
        const timer = setInterval(() => setDate(new Date()), 60000); // 1 min update
        return () => clearInterval(timer);
    }, []);

    if (!date) return null; // Or return a skeleton

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = date.getHours();

    // Day/Night Logic (6:00 - 18:00 is Day)
    const isNight = hour < 6 || hour >= 18;

    // SVG Icons - Black & White Style
    const SunIcon = (
        <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" fill="none" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
    );

    const MoonIcon = (
        <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="none" />
        </svg>
    );

    return (
        <div className={styles.container}>
            {/* Date Numbers */}
            <div className={styles.dateRow}>
                <span className={styles.month}>{month}</span>
                <span className={styles.slash}>/</span>
                <span className={styles.day}>{day}</span>
            </div>

            {/* Day of Week + Weather */}
            <div className={styles.infoRow}>
                <div className={styles.dayOfWeekBg}>
                    <span className={styles.dayOfWeekText}>{dayOfWeek}</span>
                </div>
                <div className={styles.weatherIcon}>
                    {isNight ? MoonIcon : SunIcon}
                </div>
            </div>

            {/* Visual Decors from P5 */}
            <div className={styles.decorationRed}></div>
            <div className={styles.decorationBlack}></div>
        </div>
    );
}
