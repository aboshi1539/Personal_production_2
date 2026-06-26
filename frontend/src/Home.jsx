import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Target, Brain, Send, MousePointer2, Box, PenTool } from 'lucide-react';
import { io } from 'socket.io-client';
import './index.css';

const socket = io('http://localhost:3001');

function Home() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [users, setUsers] = useState({});
  const [meId, setMeId] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      socket.emit('joinLobby', {});
    };
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();

    socket.on('lobbyInit', ({ messages, users, me }) => {
      setMessages(messages);
      setUsers(users);
      setMeId(me);
    });

    socket.on('lobbyUserJoined', ({ id, user }) => {
      setUsers((prev) => ({ ...prev, [id]: user }));
    });

    socket.on('lobbyCursor', ({ id, x, y }) => {
      setUsers((prev) => {
        if (!prev[id]) return prev;
        return { ...prev, [id]: { ...prev[id], x, y } };
      });
    });

    socket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('lobbyUserLeft', (id) => {
      setUsers((prev) => {
        const newUsers = { ...prev };
        delete newUsers[id];
        return newUsers;
      });
    });

    const handleMouseMove = (e) => {
      socket.emit('lobbyMouseMove', { x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      socket.off('connect', onConnect);
      socket.off('lobbyInit');
      socket.off('lobbyUserJoined');
      socket.off('lobbyCursor');
      socket.off('chatMessage');
      socket.off('lobbyUserLeft');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      socket.emit('sendChatMessage', chatInput.trim());
      setChatInput('');
    }
  };

  return (
    <div className="app-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Other users' cursors */}
      {Object.entries(users).map(([id, user]) => {
        if (id === meId || user.x === -100) return null;
        return (
          <div key={id} style={{
            position: 'fixed',
            left: user.x,
            top: user.y,
            pointerEvents: 'none',
            zIndex: 1000,
            transition: 'left 0.05s linear, top 0.05s linear',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}>
            <MousePointer2 fill={user.color} color={user.color} size={24} style={{ filter: `drop-shadow(0 0 5px ${user.color})`, transform: 'rotate(-20deg)', transformOrigin: 'top left' }} />
            <span style={{
              background: 'rgba(0,0,0,0.6)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: user.color,
              marginTop: '0px',
              marginLeft: '15px',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 5px ${user.color}`
            }}>{user.name}</span>
          </div>
        );
      })}

      <h1 className="title" style={{ marginTop: '2rem' }}>BE IlLLUSTRATOR</h1>
      <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', width: '100%', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
          ゲームモードを選択
        </h2>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/puzzle')} className="start-button mode-button" style={{ width: '220px', fontSize: '1.2rem', padding: '0.8rem 1rem', borderColor: '#ff4500', color: '#ff4500' }}>
            <Box size={20} style={{ marginRight: '8px' }} />
            3D Puzzle
          </button>
          <button onClick={() => navigate('/shooter')} className="start-button mode-button" style={{ width: '220px', fontSize: '1.2rem', padding: '0.8rem 1rem', borderColor: '#ff6b6b', color: '#ff6b6b' }}>
            <Target size={20} style={{ marginRight: '8px' }} />
            3D Shooter
          </button>
          <button onClick={() => navigate('/draw3d')} className="start-button mode-button" style={{ width: '220px', fontSize: '1.2rem', padding: '0.8rem 1rem', borderColor: '#ff7b00', background: '#ff7b00', color: '#ffffff' }}>
            <PenTool size={20} style={{ marginRight: '8px' }} />
            3D Paint
          </button>
          <button onClick={() => navigate('/draw2d')} className="start-button mode-button" style={{ width: '220px', fontSize: '1.2rem', padding: '0.8rem 1rem', borderColor: '#3b82f6', background: '#3b82f6', color: '#ffffff' }}>
            <PenTool size={20} style={{ marginRight: '8px' }} />
            2D Paint
          </button>
        </div>
      </div>

      <div className="glass-panel chat-container" style={{ width: '100%', padding: '1.5rem', height: '350px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-glow)', fontSize: '1.5rem', fontWeight: 'bold' }}>Lobby Chat</h3>
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '1rem' }}>
          {messages.length === 0 && <div style={{ color: '#888', fontStyle: 'italic' }}>まだメッセージはありません...</div>}
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', wordBreak: 'break-word' }}>
              <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', flexShrink: 0 }}>[{msg.time}]</span>
              <span style={{ color: msg.color, fontWeight: 'bold', flexShrink: 0 }}>{msg.user}:</span>
              <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>{msg.text}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="メッセージを入力..."
            style={{
              flex: 1,
              padding: '0.8rem 1rem',
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary-glow)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
          />
          <button type="submit" style={{
            background: 'transparent',
            color: 'var(--primary-glow)',
            border: '2px solid var(--primary-glow)',
            borderRadius: '8px',
            padding: '0 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-glow)'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary-glow)'; }}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default Home;
