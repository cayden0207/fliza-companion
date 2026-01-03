'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CameraView.module.css';

interface CameraViewProps {
    onAnalysis?: (analysis: string) => void;
    isEnabled: boolean;
    onToggle: () => void;
}

export default function CameraView({ onAnalysis, isEnabled, onToggle }: CameraViewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastAnalysis, setLastAnalysis] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [countdown, setCountdown] = useState(5);

    // Start/Stop camera
    useEffect(() => {
        if (isEnabled) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isEnabled]);

    // Auto-analyze every 5 seconds
    useEffect(() => {
        if (!isEnabled) return;

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    captureAndAnalyze();
                    return 5;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isEnabled]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
            setError('');
        } catch (err: any) {
            console.error('Camera error:', err);
            setError('Camera access denied');
            onToggle(); // Turn off if can't access
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Draw current frame to canvas
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0);

        // Convert to base64
        const base64Image = canvas.toDataURL('image/jpeg', 0.7);

        setIsAnalyzing(true);

        try {
            const res = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image })
            });

            if (!res.ok) throw new Error('Vision API failed');

            const data = await res.json();
            setLastAnalysis(data.analysis);
            onAnalysis?.(data.analysis);
        } catch (err: any) {
            console.error('Analysis error:', err);
            setLastAnalysis('Scan interrupted... 🔧');
        } finally {
            setIsAnalyzing(false);
        }
    }, [isAnalyzing, onAnalysis]);

    if (!isEnabled) {
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.recordingDot} />
                <span className={styles.title}>SCANNING</span>
                <button className={styles.closeBtn} onClick={onToggle}>✕</button>
            </div>

            <div className={styles.videoWrapper}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={styles.video}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {isAnalyzing && (
                    <div className={styles.scanOverlay}>
                        <div className={styles.scanLine} />
                    </div>
                )}

                <div className={styles.countdown}>
                    {isAnalyzing ? '🔍' : countdown}
                </div>
            </div>

            {lastAnalysis && (
                <div className={styles.analysisBox}>
                    <span className={styles.analysisText}>{lastAnalysis}</span>
                </div>
            )}

            {error && (
                <div className={styles.error}>{error}</div>
            )}
        </div>
    );
}
