import { useNavigate } from 'react-router-dom';
import { PenTool, PaintRoller } from 'lucide-react';
import './index.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="app-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="title-anim-wrapper">
        <div className="title-paint-bg"></div>
        <h1 className="title title-text-reveal">BE IlLLUSTRATOR</h1>
        <div className="title-roller">
          <PaintRoller size={56} color="#ff7b00" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.2))' }} />
        </div>
      </div>
      <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', width: '100%', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
          描画モードを選択
        </h2>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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
    </div>
  );
}

export default Home;
