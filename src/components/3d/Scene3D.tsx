'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import styles from './Scene3D.module.css';

interface Scene3DProps {
  modelPath?: string;
  onVRMLoaded?: (vrm: VRM) => void;
}

export default function Scene3D({
  modelPath = '/models/Fliza Return.vrm',
  onVRMLoaded
}: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const vrmRef = useRef<VRM | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initRef.current || !containerRef.current) return;
    initRef.current = true;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 1.3, 2.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Use LinearToneMapping for better anime/VRM color reproduction (prevents washed out colors)
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 5;
    controls.maxPolarAngle = Math.PI / 1.8;
    controls.minPolarAngle = Math.PI / 4;
    controls.enablePan = false;
    controls.update();

    // Lighting
    // Lighting
    // 1. Ambient Light - Basic brightness
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // 2. Main Light (Directional) - Sunlight/Key light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(1, 6, 2);
    mainLight.castShadow = true; // Enable shadows if needed
    scene.add(mainLight);

    // 3. Fill Light - Backlight/Environment reflection
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Floor shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeometry = new THREE.PlaneGeometry(1.5, 1.5);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.01;
    scene.add(shadowMesh);

    // Clock for animation
    const clock = new THREE.Clock();
    let animationId: number;
    let mixer: THREE.AnimationMixer | null = null;

    // Load VRM
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser, {
      autoUpdateHumanBones: true,
    }));

    loader.load(
      modelPath,
      (gltf) => {
        try {
          const vrm = gltf.userData.vrm as VRM;

          if (!vrm) {
            console.error('VRM data not found in gltf');
            setIsLoading(false);
            return;
          }

          // Rotate VRM to face camera
          vrm.scene.rotation.y = Math.PI;
          scene.add(vrm.scene);
          vrmRef.current = vrm;
          mixer = new THREE.AnimationMixer(vrm.scene);

          setIsLoading(false);
          onVRMLoaded?.(vrm);
        } catch (err) {
          console.error('Error processing VRM:', err);
          setIsLoading(false);
        }
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = (progress.loaded / progress.total) * 100;
          setLoadProgress(percent);
        }
      },
      (error) => {
        console.error('Error loading VRM:', error);
        setIsLoading(false);
      }
    );

    // Animation loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();

      if (vrmRef.current) {
        vrmRef.current.update(deltaTime);
      }

      if (mixer) {
        mixer.update(deltaTime);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      // Don't reset initRef to allow remounting without issues
    };
  }, []); // Empty dependency array - only run once

  return (
    <div className={styles.container} ref={containerRef}>
      {isLoading && (
        <div className={styles.loader}>
          <div className={styles.loaderContent}>
            <div className={styles.spinner} />
            <p>Loading Fliza...</p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
