'use client';

import { useState, useCallback, useEffect } from 'react';
import { VRM } from '@pixiv/three-vrm';
import Scene3D from '@/components/3d/Scene3D';
import FloatingMenu from '@/components/ui/FloatingMenu';
import PhoneInterface from '@/components/ui/PhoneInterface';
import DateDisplay from '@/components/ui/DateDisplay';
import CameraView from '@/components/ui/CameraView';
import styles from './page.module.css';

import ProfileCard from '@/components/ui/ProfileCard';
import { supabase } from '@/lib/supabase/client';

export default function Home() {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Auth listener to keep user state in sync for ProfileCard
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Memoize callback to prevent re-renders
  const handleVRMLoaded = useCallback((loadedVRM: VRM) => {
    setVrm(loadedVRM);
    console.log('VRM loaded successfully!');
  }, []);

  // Handle vision analysis (optional: show in chat or notification)
  const handleVisionAnalysis = useCallback((analysis: string) => {
    console.log('Fliza Vision:', analysis);
    // Could add to chat or show as floating notification
  }, []);

  return (
    <div className={styles.container}>
      {/* 3D Scene - Always visible */}
      <Scene3D onVRMLoaded={handleVRMLoaded} />

      {/* Background Music */}
      <audio src="/bgm.mp3" loop autoPlay />

      {/* Camera View - Floating when active */}
      <CameraView
        isEnabled={isCameraActive}
        onToggle={() => setIsCameraActive(!isCameraActive)}
        onAnalysis={handleVisionAnalysis}
      />

      {/* UI Layer */}
      <div className={styles.uiLayer}>
        {/* Top Header Area */}
        <header className={styles.headerArea}>
          <DateDisplay />
          <FloatingMenu
            onChatToggle={() => setIsPhoneOpen(!isPhoneOpen)}
            onProfileToggle={() => setIsProfileOpen(true)}
            onCameraToggle={() => setIsCameraActive(!isCameraActive)}
            isCameraActive={isCameraActive}
          />
        </header>

        {/* Phone / Chat Overlay */}
        <PhoneInterface
          isOpen={isPhoneOpen}
          onClose={() => setIsPhoneOpen(false)}
        />

        {/* Profile Card Overlay */}
        <ProfileCard
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          userId={user?.id}
        />
      </div>
    </div>
  );
}

