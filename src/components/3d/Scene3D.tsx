'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { mixamoVRMRigMap } from '@/lib/mixamoVRMRigMap';
import styles from './Scene3D.module.css';

interface Scene3DProps {
  modelPath?: string;
  onVRMLoaded?: (vrm: VRM) => void;
}

// Animation list
const IDLE_ANIMATION = '/animations/Happy Idle.fbx';
const RANDOM_ANIMATIONS = [
  '/animations/Breathing Idle.fbx',
  '/animations/Look Around.fbx',
  '/animations/Thinking.fbx',
  '/animations/Bored.fbx',
  '/animations/Yawn.fbx',
  '/animations/Relieved Sigh.fbx',
  '/animations/Whatever Gesture.fbx',
  '/animations/Bashful.fbx',
];

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(1, 6, 2);
    mainLight.castShadow = true;
    scene.add(mainLight);
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

    // Animation state
    const clock = new THREE.Clock();
    let animationId: number;
    let mixer: THREE.AnimationMixer | null = null;
    let currentAction: THREE.AnimationAction | null = null;
    let idleAction: THREE.AnimationAction | null = null;
    let animationSwitchTimeout: NodeJS.Timeout | null = null;

    const fbxLoader = new FBXLoader();

    // Proper Mixamo to VRM animation loader
    const loadMixamoAnimation = async (url: string, vrm: VRM): Promise<THREE.AnimationClip | null> => {
      try {
        const asset = await fbxLoader.loadAsync(url);
        const clip = asset.animations[0];
        if (!clip) {
          console.warn('No animation found in', url);
          return null;
        }

        const tracks: THREE.KeyframeTrack[] = [];
        const restRotationInverse = new THREE.Quaternion();
        const parentRestWorldRotation = new THREE.Quaternion();
        const _quatA = new THREE.Quaternion();

        // Get hips height for position scaling
        const motionHipsNode = asset.getObjectByName('mixamorigHips');
        const vrmHipsNode = vrm.humanoid?.getNormalizedBoneNode('hips');

        let hipsPositionScale = 0.01; // Default fallback
        if (motionHipsNode && vrmHipsNode) {
          const motionHipsHeight = motionHipsNode.position.y;
          // For VRM 1.0, use the actual bone position
          const vrmHipsHeight = vrmHipsNode.position.y || 1.0;
          if (motionHipsHeight > 0) {
            hipsPositionScale = vrmHipsHeight / motionHipsHeight;
          }
        }

        clip.tracks.forEach((track) => {
          const trackSplitted = track.name.split('.');
          const mixamoRigName = trackSplitted[0];
          const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
          if (!vrmBoneName) return;

          const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName as any)?.name;
          const mixamoRigNode = asset.getObjectByName(mixamoRigName);
          if (!vrmNodeName || !mixamoRigNode) return;

          const propertyName = trackSplitted[1];

          // Get rest rotation
          mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
          if (mixamoRigNode.parent) {
            mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);
          }

          if (track instanceof THREE.QuaternionKeyframeTrack) {
            // Transform quaternion values
            const values = [...track.values];
            for (let i = 0; i < values.length; i += 4) {
              _quatA.fromArray(values, i);
              _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
              _quatA.toArray(values, i);
            }

            tracks.push(
              new THREE.QuaternionKeyframeTrack(
                `${vrmNodeName}.${propertyName}`,
                track.times,
                values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v))
              )
            );
          } else if (track instanceof THREE.VectorKeyframeTrack && mixamoRigName === 'mixamorigHips') {
            // Only apply position to hips with scaling
            const values = track.values.map((v, i) =>
              (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale
            );
            tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, values));
          }
        });

        return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
      } catch (err) {
        console.error('Error loading animation:', url, err);
        return null;
      }
    };

    // Play random animation then return to idle
    const playRandomAnimation = async (vrm: VRM) => {
      if (!mixer || !idleAction) return;

      const randomUrl = RANDOM_ANIMATIONS[Math.floor(Math.random() * RANDOM_ANIMATIONS.length)];
      console.log('Playing random animation:', randomUrl);

      const clip = await loadMixamoAnimation(randomUrl, vrm);
      if (clip && mixer) {
        const randomAction = mixer.clipAction(clip);
        randomAction.setLoop(THREE.LoopOnce, 1);
        randomAction.clampWhenFinished = true;

        // Crossfade
        randomAction.reset();
        randomAction.play();
        if (currentAction) {
          currentAction.crossFadeTo(randomAction, 0.5, true);
        }
        currentAction = randomAction;

        // When animation ends, return to idle
        const onFinished = (e: THREE.Event) => {
          if ((e as any).action === randomAction) {
            mixer?.removeEventListener('finished', onFinished);
            if (idleAction) {
              idleAction.reset();
              idleAction.play();
              randomAction.crossFadeTo(idleAction, 0.5, true);
              currentAction = idleAction;
            }
            scheduleNextAnimation(vrm);
          }
        };
        mixer.addEventListener('finished', onFinished);
      } else {
        scheduleNextAnimation(vrm);
      }
    };

    const scheduleNextAnimation = (vrm: VRM) => {
      const delay = 8000 + Math.random() * 7000;
      animationSwitchTimeout = setTimeout(() => playRandomAnimation(vrm), delay);
    };

    // Load VRM
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser, {
      autoUpdateHumanBones: true,
    }));

    loader.load(
      modelPath,
      async (gltf) => {
        try {
          const vrm = gltf.userData.vrm as VRM;
          if (!vrm) {
            console.error('VRM data not found');
            setIsLoading(false);
            return;
          }

          vrm.scene.rotation.y = Math.PI;
          scene.add(vrm.scene);
          vrmRef.current = vrm;
          mixer = new THREE.AnimationMixer(vrm.scene);

          // Load idle animation
          const idleClip = await loadMixamoAnimation(IDLE_ANIMATION, vrm);
          if (idleClip && mixer) {
            idleAction = mixer.clipAction(idleClip);
            idleAction.play();
            currentAction = idleAction;
            console.log('Idle animation loaded and playing');
          }

          scheduleNextAnimation(vrm);
          setIsLoading(false);
          onVRMLoaded?.(vrm);
        } catch (err) {
          console.error('Error processing VRM:', err);
          setIsLoading(false);
        }
      },
      (progress) => {
        if (progress.total > 0) {
          setLoadProgress((progress.loaded / progress.total) * 100);
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

    // Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (animationSwitchTimeout) clearTimeout(animationSwitchTimeout);
      renderer.dispose();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      {isLoading && (
        <div className={styles.loader}>
          <div className={styles.loaderContent}>
            <div className={styles.topHat} />
            <h2 className={styles.loadingText}>TAKE YOUR TIME</h2>
            <div className={styles.subText}>LOADING FLIZA... {Math.round(loadProgress)}%</div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${loadProgress}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
