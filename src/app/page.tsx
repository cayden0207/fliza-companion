'use client';

import { useState, useCallback } from 'react';
import { VRM } from '@pixiv/three-vrm';
import Scene3D from '@/components/3d/Scene3D';
import FloatingMenu from '@/components/ui/FloatingMenu';
import PhoneInterface from '@/components/ui/PhoneInterface';
import DateDisplay from '@/components/ui/DateDisplay';
import styles from './page.module.css';

export default function Home() {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);

  // Memoize callback to prevent re-renders
  const handleVRMLoaded = useCallback((loadedVRM: VRM) => {
    setVrm(loadedVRM);
    console.log('VRM loaded successfully!');
  }, []);

  const handleLoginRequired = useCallback(() => {
    // TODO: Open login modal
    console.log('Login required');
  }, []);

  return (
    <div className={styles.container}>
      {/* 3D Scene - Always visible */}
      <Scene3D onVRMLoaded={handleVRMLoaded} />

      {/* UI Layer */}
      <div className={styles.uiLayer}>
        {/* Top Header Area */}
        <header className={styles.headerArea}>
          <DateDisplay />
          <FloatingMenu onChatToggle={() => setIsPhoneOpen(!isPhoneOpen)} />
        </header>

        {/* Phone / Chat Overlay */}
        <PhoneInterface
          isOpen={isPhoneOpen}
          onClose={() => setIsPhoneOpen(false)}
          isLoggedIn={isLoggedIn}
          onLoginRequired={handleLoginRequired}
        />
      </div>
    </div>
  );
}
