import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

const CUBE_COUNT = 512; // 8x8x8 = 512
const GRID_SIZE = 8;
const SPACING = 1.1;

// Easing functions
function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function CubesAnimation({ phase }) {
  const meshRef = useRef();

  // Create initial data for cubes
  const cubesData = useMemo(() => {
    const data = [];
    const offset = (GRID_SIZE - 1) * SPACING / 2;

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let z = 0; z < GRID_SIZE; z++) {
          // Target position (grid)
          const targetX = x * SPACING - offset;
          const targetY = y * SPACING - offset;
          const targetZ = z * SPACING - offset;

          // Initial random start position (scattered far away)
          const startX = (Math.random() - 0.5) * 60;
          const startY = (Math.random() - 0.5) * 60;
          const startZ = (Math.random() - 0.5) * 60;

          // Random rotation axis and speed
          const rotAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
          const rotSpeed = Math.random() * 5 + 2;

          // Delay for fly-in
          const delay = Math.random() * 1.2; 
          
          data.push({
            startX, startY, startZ,
            targetX, targetY, targetZ,
            rotAxis, rotSpeed, delay
          });
        }
      }
    }
    return data;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const clock = useRef(new THREE.Clock());

  useFrame((state) => {
    const time = clock.current.getElapsedTime();
    
    // Group Rotation
    if (meshRef.current) {
      if (time < 2.5) {
        // Rotate while assembling, perfectly settling to 0 at exactly 2.5s
        const progress = time / 2.5;
        const ease = easeOutCubic(progress);
        meshRef.current.rotation.y = (1 - ease) * -Math.PI;
        meshRef.current.rotation.x = (1 - ease) * -Math.PI * 0.5;
      } else {
        // Stay completely fixed and flat facing the camera during the squash and spread
        meshRef.current.rotation.y = 0;
        meshRef.current.rotation.x = 0;
      }
    }

    cubesData.forEach((data, i) => {
      let progress = 0;
      let pos = new THREE.Vector3();
      
      if (time < 2.5) {
        // Phase 0: Fly in (0 to 2.5 seconds)
        const localTime = Math.max(0, time - data.delay);
        progress = Math.min(localTime / 1.5, 1);
        const ease = easeOutCubic(progress);
        
        pos.x = THREE.MathUtils.lerp(data.startX, data.targetX, ease);
        pos.y = THREE.MathUtils.lerp(data.startY, data.targetY, ease);
        pos.z = THREE.MathUtils.lerp(data.startZ, data.targetZ, ease);
        
        dummy.position.copy(pos);
        dummy.quaternion.setFromAxisAngle(data.rotAxis, time * data.rotSpeed * (1 - ease));
        dummy.scale.set(1, 1, 1);
      } else {
        // Phase 1+: Flattening and Stretching
        const phaseTime = time - 2.5; 
        
        // Step 1: Squash Z-axis to 0 and flatten cubes (2.5s to 3.2s)
        const squashProgress = Math.min(Math.max(phaseTime / 0.7, 0), 1);
        const easeSquash = easeInOutCubic(squashProgress);

        // Step 2: Stretch horizontally (3.2s to 4.0s)
        const stretchProgress = Math.min(Math.max((phaseTime - 0.7) / 0.8, 0), 1);
        const easeStretch = easeInOutCubic(stretchProgress);

        const stretchMultiplier = THREE.MathUtils.lerp(1, 4, easeStretch);

        pos.x = data.targetX * stretchMultiplier;
        pos.y = data.targetY;
        pos.z = THREE.MathUtils.lerp(data.targetZ, 0, easeSquash);

        // Scale: X stretches. Y closes gaps (1.15). Z squashes to 0.1.
        // We start with 1.15 to close gaps from the start of the squash, and stretch X from there
        const baseScaleXY = THREE.MathUtils.lerp(1, 1.15, easeSquash);
        const scaleX = baseScaleXY * stretchMultiplier;
        const scaleY = baseScaleXY;
        const scaleZ = THREE.MathUtils.lerp(1, 0.1, easeSquash);
        
        dummy.position.copy(pos);
        // Cubes are already rotationally aligned from Phase 0, keep them flat
        dummy.rotation.set(0, 0, 0); 
        dummy.scale.set(scaleX, scaleY, scaleZ);
      }

      dummy.updateMatrix();
      if (meshRef.current) {
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
    });
    
    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, CUBE_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ff7b00" roughness={0.2} metalness={0.1} emissive="#ff7b00" emissiveIntensity={0.2} />
    </instancedMesh>
  );
}

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Sequence timing
    const t1 = setTimeout(() => setPhase(1), 2500); // Start flatten
    const t2 = setTimeout(() => setPhase(2), 4000); // Start logo fade in
    const t3 = setTimeout(() => setPhase(3), 6000); // Start entire screen fade out
    const t4 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 8000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            zIndex: 9999, background: '#f8fafc', overflow: 'hidden' 
          }}
        >
          {/* 3D Background */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <Canvas camera={{ position: [0, 0, 30], fov: 45 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[10, 10, 10]} intensity={1.5} />
              <directionalLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
              <CubesAnimation phase={phase} />
            </Canvas>
          </div>

          {/* Logo overlay */}
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                style={{ 
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                <h1 style={{ 
                  fontFamily: '"Orbitron", sans-serif', 
                  fontSize: '6rem', 
                  fontWeight: 900, 
                  color: '#ffffff', 
                  margin: 0, 
                  textShadow: '0px 4px 16px rgba(0,0,0,0.4)',
                  letterSpacing: '4px'
                }}>
                  Canvas³
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
