import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const socket = io('http://localhost:3001');

function Othello() {
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [gameState, setGameState] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    socket.connect();
    socket.emit('joinOthello');

    socket.on('assignedRole', (r) => setRole(r));
    socket.on('othelloState', (state) => {
      setGameState(state);
      setStatus(state.status);
    });
    socket.on('playerDisconnected', () => {
      setStatus('waiting');
    });

    return () => {
      socket.off('assignedRole');
      socket.off('othelloState');
      socket.off('playerDisconnected');
      socket.disconnect();
    };
  }, []);

  const handleCellClick = (r, c) => {
    if (status === 'playing' && gameState.turn === role) {
      socket.emit('othelloMove', { r, c });
    }
  };

  return (
    <div className="app-container">
      <button className="back-button" onClick={() => navigate('/')}>
        <ArrowLeft size={20} style={{ marginRight: '8px' }} />
        ホームに戻る
      </button>
      <h1 className="title" style={{ fontSize: '3rem', color: '#ff003c', textShadow: '0 0 10px rgba(255, 0, 60, 0.5)' }}>Neon Othello</h1>

      {status === 'connecting' && <div className="glass-panel"><div className="status-text loading-dots">接続中</div></div>}
      
      {status === 'waiting' && (
        <div className="glass-panel">
          <Users size={48} style={{ color: '#ff003c' }} />
          <div className="status-text">あなたは <span style={{ color: '#ff003c' }}>{role === 'black' ? '黒' : role === 'white' ? '白' : '観戦者'}</span> です</div>
          <div className="status-text loading-dots">対戦相手を待っています</div>
        </div>
      )}

      {(status === 'playing' || status === 'finished') && gameState && (
        <div className="glass-panel">
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '1.5rem' }}>
            <div style={{ color: gameState.turn === 'black' ? '#ff003c' : '#555', textShadow: gameState.turn === 'black' ? '0 0 10px #ff003c' : 'none' }}>黒: {role === 'black' ? '(あなた)' : ''}</div>
            <div style={{ color: gameState.turn === 'white' ? '#00f3ff' : '#555', textShadow: gameState.turn === 'white' ? '0 0 10px #00f3ff' : 'none' }}>白: {role === 'white' ? '(あなた)' : ''}</div>
          </div>
          
          {status === 'finished' && (
            <div style={{ fontSize: '2rem', color: '#ffff00', textShadow: '0 0 10px #ffff00', marginBottom: '1rem' }}>
              ゲーム終了！ {gameState.winner === 'black' ? '黒の勝ち' : gameState.winner === 'white' ? '白の勝ち' : '引き分け'}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 40px)', gap: '4px', background: 'var(--glass-border)', padding: '4px', borderRadius: '8px' }}>
            {gameState.board.map((row, r) => 
              row.map((cell, c) => (
                <div 
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  style={{
                    width: '40px', height: '40px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                    boxShadow: 'inset 0 0 5px rgba(255,255,255,0.1)'
                  }}
                >
                  {cell && (
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: cell === 'black' ? '#ff003c' : '#00f3ff',
                      boxShadow: `0 0 10px ${cell === 'black' ? '#ff003c' : '#00f3ff'}`
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default Othello;
