'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './CameraView.module.css';

interface CameraViewProps {
    onAnalysis?: (analysis: string) => void;
    isEnabled: boolean;
    onToggle: () => void;
    mode?: 'box' | 'fullscreen';
    facingMode?: 'user' | 'environment';
}

export interface CameraViewHandle {
    captureCurrentFrame: () => string | null;
}

const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(({
    onAnalysis,
    isEnabled,
    onToggle,
    mode = 'box',
    facingMode = 'user'
}, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const prevFrameRef = useRef<Uint8ClampedArray | null>(null);

    // Config
    const SCENE_CHANGE_THRESHOLD = 0.15; // 15% pixel change required to trigger analysis

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastAnalysis, setLastAnalysis] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [countdown, setCountdown] = useState(5);

    // Expose captureCurrentFrame to parent via ref
    useImperativeHandle(ref, () => ({
        captureCurrentFrame: (): string | null => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) return null;

            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.drawImage(video, 0, 0);

            return canvas.toDataURL('image/jpeg', 0.8);
        }
    }));

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
    }, [isEnabled, facingMode]); // Restart when mode changes

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
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
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

        // 1. Scene Change Detection
        // Draw small version for comparison
        const smallWidth = 32;
        const smallHeight = 24;

        // Create temp canvas if comparing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = smallWidth;
        tempCanvas.height = smallHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCtx.drawImage(video, 0, 0, smallWidth, smallHeight);
        const currentFrameData = tempCtx.getImageData(0, 0, smallWidth, smallHeight).data;

        if (prevFrameRef.current) {
            let diff = 0;
            const totalPixels = currentFrameData.length / 4;

            for (let i = 0; i < currentFrameData.length; i += 4) {
                const rDiff = Math.abs(currentFrameData[i] - prevFrameRef.current[i]);
                const gDiff = Math.abs(currentFrameData[i + 1] - prevFrameRef.current[i + 1]);
                const bDiff = Math.abs(currentFrameData[i + 2] - prevFrameRef.current[i + 2]);

                if ((rDiff + gDiff + bDiff) / 3 > 30) { // Significant color change
                    diff++;
                }
            }

            const changePercent = diff / totalPixels;

            if (changePercent < SCENE_CHANGE_THRESHOLD) {
                // Not enough change, skip analysis
                setCountdown(5); // Reset countdown without analyzing
                return;
            }
        }

        // Update previous frame
        prevFrameRef.current = currentFrameData;

        // 2. Perform Analysis (Full Resolution)
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
        <div className={`${styles.container} ${mode === 'fullscreen' ? styles.fullscreen : ''}`}>
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
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
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

            {error && (
                <div className={styles.error}>{error}</div>
            )}
        </div>
    );
});

CameraView.displayName = 'CameraView';

export default CameraView;
