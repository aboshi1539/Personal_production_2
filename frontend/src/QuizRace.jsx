import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { ArrowLeft, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './index.css';

const socket = io('http://localhost:3001');

const QUESTIONS = [
  { q: "Reactで状態を管理するフックは？", options: ["useEffect", "useState", "useContext", "useRef"], ans: 1 },
  { q: "JavaScriptで定数を宣言するキーワードは？", options: ["var", "let", "const", "def"], ans: 2 },
  { q: "HTMLは何の略？", options: ["Hyper Text Markup Language", "High Text Machine Language", "Hyper Tool Multi Language", "Home Tool Markup Language"], ans: 0 }
];

function QuizRace() {
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [gameState, setGameState] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    socket.connect();
    socket.emit('joinQuiz');

    socket.on('assignedRole', (r) => setRole(r));
    socket.on('quizStart', () => {
      setStatus('playing');
      setCurrentQ(0);
      setScore(0);
      setStartTime(Date.now());
    });
    socket.on('quizState', (state) => {
      setGameState(state);
      if (state.status === 'finished') setStatus('finished');
    });
    socket.on('playerDisconnected', () => {
      setStatus('waiting');
    });

    return () => {
      socket.off('assignedRole');
      socket.off('quizStart');
      socket.off('quizState');
      socket.off('playerDisconnected');
      socket.disconnect();
    };
  }, []);

  const handleAnswer = (index) => {
    const correct = QUESTIONS[currentQ].ans === index;
    const newScore = score + (correct ? 1 : 0);
    setScore(newScore);

    if (currentQ + 1 < QUESTIONS.length) {
      setCurrentQ(currentQ + 1);
    } else {
      setStatus('waitingResult');
      const timeElapsed = Date.now() - startTime;
      socket.emit('quizFinish', { score: newScore, time: timeElapsed });
    }
  };

  return (
    <div className="app-container">
      <button className="back-button" onClick={() => navigate('/')}>
        <ArrowLeft size={20} style={{ marginRight: '8px' }} />
        ホームに戻る
      </button>
      <h1 className="title" style={{ fontSize: '3rem', color: '#b000ff', textShadow: '0 0 10px rgba(176, 0, 255, 0.5)' }}>Neon Quiz Race</h1>

      {status === 'connecting' && <div className="glass-panel"><div className="status-text loading-dots">接続中</div></div>}
      
      {status === 'waiting' && (
        <div className="glass-panel">
          <Brain size={48} style={{ color: '#b000ff' }} />
          <div className="status-text">あなたは <span style={{ color: '#b000ff' }}>{role}</span> です</div>
          <div className="status-text loading-dots">対戦相手を待っています</div>
        </div>
      )}

      {status === 'playing' && (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ color: '#b000ff', marginBottom: '1rem', fontSize: '1.2rem' }}>問題 {currentQ + 1} / {QUESTIONS.length}</div>
          <div style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>{QUESTIONS[currentQ].q}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {QUESTIONS[currentQ].options.map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(i)} className="start-button mode-button" style={{ fontSize: '1.2rem', padding: '1rem', width: '100%', justifyContent: 'flex-start', color: 'var(--text-main)', borderColor: 'var(--text-main)', boxShadow: 'none' }}>
                {i + 1}. {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === 'waitingResult' && (
        <div className="glass-panel">
          <div className="status-text loading-dots">相手の終了を待っています</div>
        </div>
      )}

      {status === 'finished' && gameState && (
        <div className="glass-panel">
          <h2 style={{ color: '#ffff00', textShadow: '0 0 10px #ffff00', fontSize: '2rem', marginBottom: '1.5rem' }}>結果発表</h2>
          {gameState.results.map((res, i) => (
            <div key={i} style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', width: '400px' }}>
              <span>{i + 1}位: {res.role === role ? 'あなた' : '相手'}</span>
              <span>{res.score}問正解 ({Math.floor(res.time / 1000)}秒)</span>
            </div>
          ))}
          <button onClick={() => navigate('/')} className="start-button" style={{ marginTop: '2rem' }}>ホームに戻る</button>
        </div>
      )}
    </div>
  );
}
export default QuizRace;
