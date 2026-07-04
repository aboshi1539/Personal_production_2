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
          
          // Flattened target (2D canvas shape)
          // We map 3D grid into a 2D flat plane (e.g. 16x32)
          // Or we just flatten the Z axis. Flattening Z is easier to visualize as a canvas.
          const flatTargetX = targetX * 1.5;
          const flatTargetY = targetY * 1.5;
          const flatTargetZ = 0;

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
            flatTargetX, flatTargetY, flatTargetZ,
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
    if (phase < 3 && meshRef.current) {
      // Rotate the whole cluster gently
      const rotY = Math.min(time * 0.8, Math.PI * 2);
      meshRef.current.rotation.y = rotY;
      meshRef.current.rotation.x = rotY * 0.3;
    }

    cubesData.forEach((data, i) => {
      let progress = 0;
      let pos = new THREE.Vector3();
      let scale = 1;
      
      if (phase === 0) {
        // Phase 0: Fly in (0 to ~2 seconds)
        const localTime = Math.max(0, time - data.delay);
        progress = Math.min(localTime / 1.5, 1);
        const ease = easeOutCubic(progress);
        
        pos.x = THREE.MathUtils.lerp(data.startX, data.targetX, ease);
        pos.y = THREE.MathUtils.lerp(data.startY, data.targetY, ease);
        pos.z = THREE.MathUtils.lerp(data.startZ, data.targetZ, ease);
        
        // Spin individual cubes while flying
        dummy.position.copy(pos);
        dummy.quaternion.setFromAxisAngle(data.rotAxis, time * data.rotSpeed * (1 - ease));
      } else if (phase === 1) {
        // Phase 1: Flattening (after 2.5 seconds)
        const phaseTime = time - 2.5; 
        progress = Math.min(Math.max(phaseTime / 1.5, 0), 1);
        const ease = easeInOutCubic(progress);

        pos.x = THREE.MathUtils.lerp(data.targetX, data.flatTargetX, ease);
        pos.y = THREE.MathUtils.lerp(data.targetY, data.flatTargetY, ease);
        pos.z = THREE.MathUtils.lerp(data.targetZ, data.flatTargetZ, ease);

        // Scale flat
        scale = THREE.MathUtils.lerp(1, 0.1, ease);
        
        dummy.position.copy(pos);
        // Gradually align rotation to 0
        dummy.rotation.set(0, 0, 0); 
        dummy.scale.set(1, 1, scale);
      } else if (phase >= 2) {
        // Phase 2: Fade out/fly forward
        const phaseTime = time - 4.2;
        progress = Math.min(Math.max(phaseTime / 0.8, 0), 1);
        const ease = easeOutCubic(progress);
        
        pos.x = data.flatTargetX;
        pos.y = data.flatTargetY;
        pos.z = THREE.MathUtils.lerp(data.flatTargetZ, 20, ease); // Fly towards camera
        
        dummy.position.copy(pos);
        dummy.scale.set(1, 1, Math.max(0.001, 0.1 - ease * 0.1));
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
      <meshStandardMaterial color="#ff7b00" roughness={0.3} metalness={0.6} />
    </instancedMesh>
  );
}

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Sequence timing
    const t1 = setTimeout(() => setPhase(1), 2500); // Start flatten
    const t2 = setTimeout(() => setPhase(2), 4200); // Start logo transition
    const t3 = setTimeout(() => setPhase(3), 5000); // Hide 3D, show Logo fully
    const t4 = setTimeout(() => setPhase(4), 6500); // Fade out logo
    const t5 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 7000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase < 5 && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            zIndex: 9999, background: '#f8fafc', overflow: 'hidden' 
          }}
        >
          <AnimatePresence>
            {phase < 3 && (
              <motion.div 
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              >
                <Canvas camera={{ position: [0, 0, 25], fov: 45 }}>
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[10, 10, 10]} intensity={1.5} />
                  <directionalLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
                  <CubesAnimation phase={phase} />
                </Canvas>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase >= 2 && phase < 4 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ 
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '120%' }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ 
                      position: 'absolute', 
                      height: '70px', 
                      background: '#ff7b00', 
                      transform: 'skewX(-20deg)',
                      zIndex: 0
                    }}
                  />
                  <h1 style={{ 
                    fontFamily: '"Orbitron", sans-serif', 
                    fontSize: '6rem', 
                    fontWeight: 900, 
                    color: '#ffffff', 
                    margin: 0, 
                    zIndex: 1,
                    textShadow: '2px 2px 8px rgba(0,0,0,0.3)',
                    letterSpacing: '4px'
                  }}>
                    Canvas³
                  </h1>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
