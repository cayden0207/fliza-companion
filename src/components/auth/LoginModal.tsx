'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './LoginModal.module.css';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess?: () => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setError('Check your email for confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (onLoginSuccess) onLoginSuccess();
                onClose();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modalContainer}>
                {/* Decoration: Top Tape */}
                <div className={styles.tapeTop}>TAKE YOUR HEART</div>

                <div className={styles.content}>
                    <h2 className={styles.title}>
                        {isSignUp ? 'BECOME A THIEF' : 'CONFESS IDENTITY'}
                    </h2>

                    <form onSubmit={handleAuth} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label>CODENAME (EMAIL)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label>SECRET (PASSWORD)</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className={styles.input}
                            />
                        </div>

                        {error && <div className={styles.errorMsg}>{error}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            className={styles.submitBtn}
                        >
                            {loading ? 'PROCESSING...' : (isSignUp ? 'SEND CALLING CARD' : 'INFILTRATE')}
                        </button>
                    </form>

                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className={styles.switchModeBtn}
                    >
                        {isSignUp ? 'ALREADY A MEMBER? LOGIN' : 'NEW TO THE METAVERSE? SIGN UP'}
                    </button>
                </div>

                <button onClick={onClose} className={styles.closeBtn}>X</button>
            </div>
        </div>
    );
}
