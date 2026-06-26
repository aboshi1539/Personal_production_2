import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { MousePointer2, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const socket = io('http://localhost:3001');

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 15;

function Game() {
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting, waiting, playing
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const canvasRef = useRef(null);
  const gameStateRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    socket.connect();
    socket.emit('joinTennis');
    
    socket.on('connect', () => {
      setStatus('waiting');
    });

    socket.on('assignedRole', (assignedRole) => {
      setRole(assignedRole);
    });

    socket.on('gameStart', () => {
      setStatus('playing');
    });

    socket.on('gameState', (state) => {
      gameStateRef.current = state;
      setScore({ p1: state.player1.score, p2: state.player2.score });
    });

    socket.on('playerDisconnected', () => {
      setStatus('waiting');
      setScore({ p1: 0, p2: 0 });
    });

    return () => {
      socket.off('connect');
      socket.off('assignedRole');
      socket.off('gameStart');
      socket.off('gameState');
      socket.off('playerDisconnected');
      socket.disconnect();
    };
  }, []);

  // Render loop
  useEffect(() => {
    if (status !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const state = gameStateRef.current;
      if (!state) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Draw center net (dashed line)
      ctx.beginPath();
      ctx.setLineDash([10, 15]);
      ctx.moveTo(GAME_WIDTH / 2, 0);
      ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Draw paddles
      // Player 1 (Left) - Cyan glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(0, state.player1.y, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Player 2 (Right) - Red glow
      ctx.shadowColor = '#ff003c';
      ctx.fillStyle = '#ff003c';
      ctx.fillRect(GAME_WIDTH - PADDLE_WIDTH, state.player2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw ball - White with cyan glow
      ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status]);

  // Handle mouse move for paddle control
  const handleMouseMove = (e) => {
    if (status !== 'playing' || role === 'spectator') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    
    // Calculate Y position relative to canvas
    let y = (e.clientY - rect.top) * scaleY;
    
    // Center paddle on mouse
    y -= PADDLE_HEIGHT / 2;

    socket.emit('tennisMove', { y });
  };

  const getRoleText = () => {
    if (role === 'player1') return 'プレイヤー1 (左)';
    if (role === 'player2') return 'プレイヤー2 (右)';
    return '観戦者';
  };

  return (
    <div className="app-container">
      <button className="back-button" onClick={() => navigate('/')}>
        <ArrowLeft size={20} style={{ marginRight: '8px' }} />
        ホームに戻る
      </button>
      <h1 className="title">Neon Tennis</h1>

      {status === 'connecting' && (
        <div className="glass-panel">
          <div className="status-text loading-dots">サーバーに接続中</div>
        </div>
      )}

      {status === 'waiting' && (
        <div className="glass-panel">
          <Users size={48} className="highlight" />
          <div className="status-text">
            あなたは <span className="highlight">{getRoleText()}</span> です
          </div>
          <div className="status-text loading-dots" style={{ fontSize: '1.2rem', marginTop: '1rem', color: 'rgba(224, 230, 237, 0.7)' }}>
            対戦相手を待っています
          </div>
        </div>
      )}

      {status === 'playing' && (
        <div className="game-container">
          <div className="score-board">
            <div className="score-p1">{score.p1}</div>
            <div className="score-p2">{score.p2}</div>
          </div>
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              width={GAME_WIDTH}
              height={GAME_HEIGHT}
              onMouseMove={handleMouseMove}
            />
          </div>
          <div className="controls-hint">
            <MousePointer2 size={20} className="highlight" />
            <span>マウスを上下に動かしてパドルを操作します</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;
