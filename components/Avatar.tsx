
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarState, DisplayContent } from '../types.ts';

interface AvatarProps {
  state: AvatarState;
  audioLevel: number;
  displayContent: DisplayContent | null;
}

const Avatar: React.FC<AvatarProps> = ({ state, audioLevel, displayContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const coreRef = useRef<THREE.Group | null>(null);
  const sunCoreRef = useRef<THREE.Mesh | null>(null);
  const listeningCoreRef = useRef<THREE.Mesh | null>(null);
  const receptionFieldRef = useRef<THREE.Mesh | null>(null);
  const flarePointsRef = useRef<THREE.Points | null>(null);
  const ringsRef = useRef<THREE.Group | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const dataStreamsRef = useRef<THREE.Group | null>(null);
  const starFieldRef = useRef<THREE.Points | null>(null);
  
  const stateRef = useRef(state);
  const audioLevelRef = useRef(audioLevel);
  const displayRef = useRef(displayContent);
  
  const weights = useRef({
    listening: 0,
    thinking: 0,
    speaking: 0,
    idle: 1
  });

  useEffect(() => {
    stateRef.current = state;
    audioLevelRef.current = audioLevel;
    displayRef.current = displayContent;
  }, [state, audioLevel, displayContent]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 8); 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.4; 
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const grid = new THREE.GridHelper(100, 80, 0x00f2ff, 0x001122);
    grid.position.y = -6;
    grid.material.transparent = true;
    grid.material.opacity = 0.2;
    scene.add(grid);
    gridRef.current = grid;

    const starCount = 3000;
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i<starCount; i++) {
      starPos[i*3] = (Math.random() - 0.5) * 100;
      starPos[i*3+1] = (Math.random() - 0.5) * 100;
      starPos[i*3+2] = (Math.random() - 0.5) * 100 - 20;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.05, color: 0xffffff, transparent: true, opacity: 0.4 });
    const stars = new THREE.Points(starGeom, starMat);
    scene.add(stars);
    starFieldRef.current = stars;

    const dataStreams = new THREE.Group();
    const shardGeom = new THREE.BoxGeometry(0.01, 3, 0.01);
    for (let i = 0; i < 60; i++) {
      const shardMat = new THREE.MeshBasicMaterial({ 
        color: i % 3 === 0 ? 0x00f2ff : 0xFFD700, 
        transparent: true, 
        opacity: Math.random() * 0.25 
      });
      const shard = new THREE.Mesh(shardGeom, shardMat);
      shard.position.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 40 - 15
      );
      dataStreams.add(shard);
    }
    scene.add(dataStreams);
    dataStreamsRef.current = dataStreams;

    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const sunLight = new THREE.PointLight(0xffaa00, 400, 60);
    sunLight.position.set(0, 0, 4);
    scene.add(sunLight);

    const coreGroup = new THREE.Group();
    coreGroup.scale.setScalar(0.11); 
    coreRef.current = coreGroup;
    scene.add(coreGroup);

    const sunGeom = new THREE.SphereGeometry(1.0, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sunCore = new THREE.Mesh(sunGeom, sunMat);
    sunCoreRef.current = sunCore;
    coreGroup.add(sunCore);

    const listenGeom = new THREE.IcosahedronGeometry(1.3, 6);
    const listenMat = new THREE.MeshBasicMaterial({ 
      color: 0x00f2ff, 
      transparent: true, 
      opacity: 0,
      wireframe: true 
    });
    const listeningCore = new THREE.Mesh(listenGeom, listenMat);
    listeningCoreRef.current = listeningCore;
    coreGroup.add(listeningCore);

    const recGeom = new THREE.SphereGeometry(2.5, 32, 32);
    const recMat = new THREE.MeshBasicMaterial({ 
      color: 0x00f2ff, 
      transparent: true, 
      opacity: 0, 
      side: THREE.BackSide, 
      blending: THREE.AdditiveBlending 
    });
    const receptionField = new THREE.Mesh(recGeom, recMat);
    receptionFieldRef.current = receptionField;
    coreGroup.add(receptionField);

    const flareCount = 5000;
    const flarePos = new Float32Array(flareCount * 3);
    const flareColors = new Float32Array(flareCount * 3);
    const goldColor = new THREE.Color('#FFD700');
    const amberColor = new THREE.Color('#FF4500');

    for (let i = 0; i < flareCount; i++) {
      const radius = 1.0 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      flarePos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      flarePos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      flarePos[i * 3 + 2] = radius * Math.cos(phi);
      const c = goldColor.clone().lerp(amberColor, Math.random());
      flareColors[i * 3] = c.r;
      flareColors[i * 3 + 1] = c.g;
      flareColors[i * 3 + 2] = c.b;
    }
    const flareGeom = new THREE.BufferGeometry();
    flareGeom.setAttribute('position', new THREE.BufferAttribute(flarePos, 3));
    flareGeom.setAttribute('color', new THREE.BufferAttribute(flareColors, 3));
    const flareMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const flarePoints = new THREE.Points(flareGeom, flareMat);
    flarePointsRef.current = flarePoints;
    coreGroup.add(flarePoints);

    const ringsGroup = new THREE.Group();
    ringsRef.current = ringsGroup;
    coreGroup.add(ringsGroup);
    for (let i = 0; i < 4; i++) {
      const ringGeom = new THREE.TorusGeometry(2.0 + i * 0.5, 0.015, 6, 90);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00f2ff : 0xFFD700,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      ringsGroup.add(ring);
    }

    setLoading(false);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.016;

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        const curState = stateRef.current;
        
        weights.current.listening = THREE.MathUtils.lerp(weights.current.listening, curState === AvatarState.LISTENING ? 1 : 0, 0.1);
        weights.current.thinking = THREE.MathUtils.lerp(weights.current.thinking, curState === AvatarState.THINKING ? 1 : 0, 0.06);
        weights.current.speaking = THREE.MathUtils.lerp(weights.current.speaking, curState === AvatarState.SPEAKING ? 1 : 0, 0.15);
        weights.current.idle = THREE.MathUtils.lerp(weights.current.idle, curState === AvatarState.IDLE ? 1 : 0, 0.06);

        // Movement is now handled by the App.tsx flex container transition
        const targetCamZ = 8;

        if (gridRef.current) gridRef.current.position.z = (time * 1.5) % 1;
        if (dataStreamsRef.current) {
          dataStreamsRef.current.children.forEach((shard, i) => {
            shard.position.y -= 0.04 * (1 + (i % 4) * 0.2);
            if (shard.position.y < -15) shard.position.y = 15;
          });
        }
        if (starFieldRef.current) starFieldRef.current.rotation.y += 0.0005;

        if (coreRef.current) {
          coreRef.current.position.y = Math.sin(time * 0.4) * 0.08;

          const baseScale = 0.11;
          const talkZoom = baseScale * (1.0 + (weights.current.speaking * 0.1 * audioLevelRef.current));
          coreRef.current.scale.setScalar(THREE.MathUtils.lerp(coreRef.current.scale.x, talkZoom, 0.2));
          
          coreRef.current.rotation.y += 0.02 + (weights.current.thinking * 0.1);

          if (sunCoreRef.current) {
            const p = 1.0 + Math.sin(time * 15) * 0.05 + (audioLevelRef.current * 1.5);
            sunCoreRef.current.scale.setScalar(p);
            (sunCoreRef.current.material as any).color.setHSL(0.1, 1, 0.6 + (audioLevelRef.current * 2));
            sunCoreRef.current.visible = weights.current.listening < 0.9;
          }

          if (listeningCoreRef.current) {
            listeningCoreRef.current.rotation.y -= 0.05;
            (listeningCoreRef.current.material as any).opacity = weights.current.listening * (0.35 + Math.sin(time * 6) * 0.2);
            listeningCoreRef.current.scale.setScalar(1.0 + Math.sin(time * 3) * 0.1);
          }

          if (receptionFieldRef.current) {
            receptionFieldRef.current.scale.setScalar(1.0 + Math.sin(time * 2) * 0.05);
            (receptionFieldRef.current.material as any).opacity = weights.current.listening * 0.08;
          }

          if (flarePointsRef.current) {
            flarePointsRef.current.rotation.z += 0.04;
            flarePointsRef.current.scale.setScalar(1.0 + (audioLevelRef.current * 1.2));
          }

          if (ringsRef.current) {
            ringsRef.current.children.forEach((r, i) => {
              const ringSpeed = (i + 1) * (i % 2 === 0 ? 0.04 : -0.04);
              r.rotation.x += ringSpeed;
              r.rotation.y += ringSpeed * 0.5;
              (r as any).material.opacity = 0.4 + (audioLevelRef.current * 0.6);
            });
          }
        }

        cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetCamZ, 0.04);
        cameraRef.current.lookAt(new THREE.Vector3(0, 0.5, 0));

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      rendererRef.current?.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div ref={containerRef} className="w-full h-full z-10" />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-50">
           <div className="relative flex items-center justify-center">
             <div className="w-40 h-40 border-[2px] border-cyan-500/10 rounded-full animate-ping" />
             <div className="absolute w-20 h-20 border-[1px] border-cyan-500/30 rounded-full animate-spin" />
             <div className="absolute w-4 h-4 bg-cyan-500 rounded-full shadow-[0_0_80px_#00f2ff]" />
           </div>
           <p className="mt-20 text-[10px] font-black uppercase tracking-[2em] text-cyan-500 animate-pulse">Establishing Mark 2 Interface</p>
        </div>
      )}
    </div>
  );
};

export default Avatar;
