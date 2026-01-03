'use client';

import { useState, useCallback, useEffect } from 'react';
import { VRM } from '@pixiv/three-vrm';
import Scene3D from '@/components/3d/Scene3D';
import FloatingMenu from '@/components/ui/FloatingMenu';
import PhoneInterface from '@/components/ui/PhoneInterface';
import DateDisplay from '@/components/ui/DateDisplay';
import CameraView from '@/components/ui/CameraView';
import VoiceInput from '@/components/ui/VoiceInput'; // Import VoiceInput
import { useChatHistory } from '@/hooks/useChatHistory'; // Import hook
import styles from './page.module.css';

import ProfileCard from '@/components/ui/ProfileCard';
import { supabase } from '@/lib/supabase/client';

export default function Home() {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isArMode, setIsArMode] = useState(false); // AR Mode state
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment'); // Camera facing mode
  const [visionContext, setVisionContext] = useState<string>('');

  // Lifted Chat State (This manages user and messages)
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
      setIsCameraActive(true); // Force camera on for AR
    } else {
      setIsCameraActive(false); // Turn off camera when AR is off
    }
  }, [isArMode]);

  // Handle new chat messages for AR bubble (Now watching messages directly)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      setSpeechText(lastMsg.content);
      // Auto-hide after 10 seconds
      setTimeout(() => setSpeechText(null), 10000);
    }
  }, [messages]);

  return (
    <main
      className={`${styles.container} ${isArMode ? styles.transparent : ''}`}
      style={isArMode ? { background: 'transparent' } : undefined}
    >
      {/* 3D Scene - Always visible, but background is now transparent in AR */}
      <div className={styles.sceneLayer}>
        <Scene3D
          onVRMLoaded={handleVRMLoaded}
          speechText={isArMode ? speechText : null}
          isArActive={isArMode}
        />
      </div>

      {/* Background Music */}
      <audio src="/bgm.mp3" loop autoPlay />

      {/* Camera View - Floating or Fullscreen AR */}
      <CameraView
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
            alignItems: 'center', // Align horizontally
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
              onTranscript={(text) => sendMessage(text, 'user', visionContext)}
            // disabled={!user} // Creating guest mode, so we allow it!
            />

            {/* Login Hint (re-positioned or hidden to avoid clutter) */}
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
      </div>
    </main>
  );
}

