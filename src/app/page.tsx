'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { VRM } from '@pixiv/three-vrm';
import Scene3D from '@/components/3d/Scene3D';
import FloatingMenu from '@/components/ui/FloatingMenu';
import PhoneInterface from '@/components/ui/PhoneInterface';
import DateDisplay from '@/components/ui/DateDisplay';
import CameraView, { CameraViewHandle } from '@/components/ui/CameraView';
import VoiceInput from '@/components/ui/VoiceInput';
import CallingCard from '@/components/ui/CallingCard';
import { useChatHistory } from '@/hooks/useChatHistory';
import styles from './page.module.css';

import ProfileCard from '@/components/ui/ProfileCard';
import { supabase } from '@/lib/supabase/client';

export default function Home() {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isArMode, setIsArMode] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [visionContext, setVisionContext] = useState<string>('');

  // Design Agent State
  const [designCardOpen, setDesignCardOpen] = useState(false);
  const [designLoading, setDesignLoading] = useState(false);
  const [designResult, setDesignResult] = useState<{ image: string | null; message: string }>({ image: null, message: '' });

  // CameraView ref for capturing frames
  const cameraRef = useRef<CameraViewHandle>(null);

  // Lifted Chat State
  const { messages, sendMessage, user, loading } = useChatHistory();

  // Memoize callback to prevent re-renders
  const handleVRMLoaded = useCallback((loadedVRM: VRM) => {
    setVrm(loadedVRM);
    console.log('VRM loaded successfully!');
  }, []);

  const [speechText, setSpeechText] = useState<string | null>(null);

  // Handle vision analysis
  const handleVisionAnalysis = useCallback((analysis: string) => {
    console.log('Fliza Vision:', analysis);
    setVisionContext(analysis);
  }, []);

  // Handle AR Toggle
  const toggleArMode = useCallback(() => {
    const nextState = !isArMode;
    setIsArMode(nextState);
    if (nextState) {
      setIsCameraActive(true);
    } else {
      setIsCameraActive(false);
    }
  }, [isArMode]);

  // Handle Design Action (triggered when chat detects design intent)
  const handleDesignAction = useCallback(async (prompt: string, attachedImage?: string | null) => {
    setDesignCardOpen(true);
    setDesignLoading(true);
    setDesignResult({ image: null, message: '' });

    // Get image: either from attachment or capture from camera
    let imageToUse = attachedImage;
    if (!imageToUse && cameraRef.current && isCameraActive) {
      imageToUse = cameraRef.current.captureCurrentFrame();
    }

    if (!imageToUse) {
      setDesignLoading(false);
      setDesignResult({ image: null, message: "I need an image to create a design! Please turn on the camera or attach a photo." });
      return;
    }

    try {
      const res = await fetch('/api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageToUse, prompt })
      });

      const data = await res.json();

      if (data.success && data.image) {
        setDesignResult({ image: data.image, message: data.text || "Here's your custom design! 🎨" });
      } else {
        setDesignResult({ image: null, message: data.error || "Design generation failed. Try again!" });
      }
    } catch (error: any) {
      console.error('Design error:', error);
      setDesignResult({ image: null, message: "Something went wrong during design creation." });
    } finally {
      setDesignLoading(false);
    }
  }, [isCameraActive]);

  // Extended sendMessage that checks for design intent from API response
  const handleSendMessage = useCallback(async (content: string, role: 'user' | 'assistant' = 'user', visionCtx?: string, attachedImage?: string) => {
    // Send to chat API first
    const result = await sendMessage(content, role, visionCtx);

    // Check if the API returned a TRIGGER_DESIGN action
    if (result?.action === 'TRIGGER_DESIGN') {
      console.log('[Home] Triggering design action from API response');
      handleDesignAction(result.designPrompt || content, result.attachedImage || attachedImage || null);
    }
  }, [sendMessage, handleDesignAction]);

  // Handle new chat messages for AR bubble
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      setSpeechText(lastMsg.content);
      setTimeout(() => setSpeechText(null), 10000);
    }
  }, [messages]);

  return (
    <main
      className={`${styles.container} ${isArMode ? styles.transparent : ''}`}
      style={isArMode ? { background: 'transparent' } : undefined}
    >
      {/* 3D Scene */}
      <div className={styles.sceneLayer}>
        <Scene3D
          onVRMLoaded={handleVRMLoaded}
          speechText={isArMode ? speechText : null}
          isArActive={isArMode}
        />
      </div>

      {/* Background Music */}
      <audio src="/bgm.mp3" loop autoPlay />

      {/* Camera View with ref */}
      <CameraView
        ref={cameraRef}
        isEnabled={isCameraActive}
        onToggle={() => setIsCameraActive(!isCameraActive)}
        onAnalysis={handleVisionAnalysis}
        mode={isArMode ? 'fullscreen' : 'box'}
        facingMode={facingMode}
      />

      {/* UI Layer */}
      <div className={styles.uiLayer}>
        {/* Top Header Area */}
        <header className={styles.headerArea}>
          <DateDisplay />
          <FloatingMenu
            onChatToggle={() => setIsPhoneOpen(!isPhoneOpen)}
            onProfileToggle={() => setIsProfileOpen(true)}
            onCameraToggle={() => {
              setIsCameraActive(!isCameraActive);
              if (isCameraActive && isArMode) setIsArMode(false);
            }}
            isCameraActive={isCameraActive}
            onArToggle={toggleArMode}
            isArActive={isArMode}
          />
        </header>

        {/* Phone / Chat Overlay */}
        <PhoneInterface
          isOpen={isPhoneOpen}
          onClose={() => setIsPhoneOpen(false)}
          visionContext={visionContext}
          messages={messages}
          sendMessage={sendMessage}
          user={user}
          loading={loading}
          onDesignAction={handleDesignAction}
        />

        {/* AR Quick Voice Trigger (Only in AR Mode) */}
        {isArMode && (
          <div style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <button
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#000',
                border: '2px solid #d4141d',
                color: '#fff',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                transition: 'transform 0.1s',
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </button>

            <VoiceInput
              onTranscript={(text) => handleSendMessage(text, 'user', visionContext)}
            />

            {!user && <span style={{
              position: 'absolute',
              bottom: '-30px',
              width: 'max-content',
              color: 'white',
              background: 'black',
              padding: '2px 5px',
              fontSize: '12px'
            }}>Login to Speak</span>}
          </div>
        )}

        {/* Profile Card Overlay */}
        <ProfileCard
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          userId={user?.id}
        />

        {/* Design Result Calling Card */}
        <CallingCard
          isOpen={designCardOpen}
          onClose={() => setDesignCardOpen(false)}
          title="PHANTOM DESIGN"
          message={designResult.message}
          image={designResult.image}
          isLoading={designLoading}
        />
      </div>
    </main>
  );
}
