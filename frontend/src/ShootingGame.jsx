import { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Text, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Crosshair } from 'lucide-react';
import { io } from 'socket.io-client';
import './index.css';

const socket = io('http://localhost:3001');

// プレイヤーのエイム（照準）を計算しサーバーに送る
function PlayerAim({ myId, players }) {
  const { camera, mouse } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  
  useFrame(() => {
    if (!myId || !players[myId]) return;
    
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 20); // z=-20の平面
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    
    if (target) {
      // サーバーにエイム位置を送信
      socket.emit('shooterAim', { aimX: target.x, aimY: target.y, aimZ: target.z });
    }
  });
  
  return null;
}

// 各プレイヤーの銃とレーザーの描画
function Lasers({ players }) {
  return (
    <>
      {Object.entries(players).map(([id, p]) => {
        if (!p) return null;
        // 銃の開始位置（カメラより少し前）
        const start = new THREE.Vector3(p.x, p.y, p.z - 1); 
        const end = new THREE.Vector3(p.aimX, p.aimY, p.aimZ);
        
        return (
          <group key={id}>
            {/* レーザー光線 */}
            <Line points={[start, end]} color={p.color} lineWidth={4} transparent opacity={0.7} />
            {/* 照準ポイント */}
            <mesh position={end}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshBasicMaterial color={p.color} transparent opacity={0.8} />
            </mesh>
            {/* 銃本体のダミーブロック */}
            <mesh position={start}>
              <boxGeometry args={[0.5, 0.5, 1.5]} />
              <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.5} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// 的の描画
function Targets({ targets, onHit }) {
  return (
    <>
      {targets.map(t => (
        <mesh 
          key={t.id} 
          position={[t.x, t.y, t.z]} 
          onPointerDown={(e) => {
             e.stopPropagation();
             onHit(t.id);
          }}
          onPointerOver={(e) => {
             e.stopPropagation();
             e.object.material.emissiveIntensity = 0.5;
          }}
          onPointerOut={(e) => {
             e.object.material.emissiveIntensity = 0.1;
          }}
        >
          <icosahedronGeometry args={[1.5, 1]} />
          <meshStandardMaterial color="#fff" emissive="#ff7b00" emissiveIntensity={0.1} roughness={0.2} metalness={0.5} />
        </mesh>
      ))}
    </>
  );
}

export default function ShootingGame() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState({ status: 'waiting', players: {}, targets: [] });
  const [myRole, setMyRole] = useState('');
  const [myId, setMyId] = useState('');
  
  useEffect(() => {
    socket.connect();
    
    const onConnect = () => {
      setMyId(socket.id);
      socket.emit('joinShooter');
    };
    
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();
    
    socket.on('assignedRole', (role) => setMyRole(role));
    socket.on('shooterState', (state) => setGameState(state));
    
    // カーソルを照準に変更
    document.body.style.cursor = 'crosshair';
    
    return () => {
      document.body.style.cursor = 'default';
      socket.off('connect');
      socket.off('assignedRole');
      socket.off('shooterState');
      socket.disconnect();
    };
  }, []);

  const handleHit = (id) => {
    if (gameState.status === 'playing' && myRole === 'player') {
      socket.emit('shooterHit', { targetId: id });
    }
  };

  const scores = Object.values(gameState.players).map(p => ({ color: p.color, score: p.score }));

  return (
    <div className="app-container" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
        <button className="start-button" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }}>
          <HomeIcon size={20} /> ホーム
        </button>
      </div>

      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, display: 'flex', gap: '1rem' }}>
         {scores.map((s, i) => (
           <div key={i} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.9)', border: `2px solid ${s.color}`, borderRadius: '8px', color: s.color, fontWeight: 'bold', fontSize: '1.2rem' }}>
             Score: {s.score}
           </div>
         ))}
      </div>
      
      {gameState.status === 'waiting' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
          background: 'rgba(255,255,255,0.95)',
          padding: '2rem',
          borderRadius: '16px',
          border: '2px solid var(--glass-border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          color: 'var(--text-main)'
        }}>
          <h2>マッチング待機中...</h2>
          <p>他のプレイヤーが参加するのを待っています。</p>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 10, 5]} intensity={1} />
        
        {gameState.status === 'playing' && (
          <>
            <PlayerAim myId={myId} players={gameState.players} />
            <Lasers players={gameState.players} />
            <Targets targets={gameState.targets} onHit={handleHit} />
          </>
        )}
        
        {/* 背景のグリッドや空間装飾 */}
        <group position={[0, -10, -20]}>
          <gridHelper args={[100, 20, '#ff7b00', '#cccccc']} />
        </group>
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
