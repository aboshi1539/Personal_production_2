import { useNavigate } from 'react-router-dom';
import { PenTool, PaintRoller } from 'lucide-react';
import './index.css';

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '64px', background: '#ff7b00', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255,123,0,0.2)' }}>
        <h1 style={{ color: '#fff', margin: 0, fontSize: '2.2rem', fontFamily: '"Orbitron", sans-serif', letterSpacing: '3px', fontWeight: '900', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>CANVAS³</h1>
      </div>
      <div className="app-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: '"Orbitron", sans-serif', paddingTop: '120px' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', width: '100%', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: 'var(--text-main)', fontFamily: '"Orbitron", sans-serif', lineHeight: '1.4' }}>
            <span style={{ color: '#ff7b00' }}>CANVAS³</span>(キャンバスキューブ)は<br></br><span style={{ color: '#ff7b00' }}>3D</span>と<span style={{ color: '#3b82f6' }}>2D</span>のキャンバスで<strong>描く</strong>、<strong>創る</strong>、<strong>動かす</strong>ことができる<br></br>Webアプリケーションです。
          </h2>

          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: '2rem', padding: '0 1rem' }}>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: '300px', maxWidth: '450px', backgroundColor: 'rgba(255,255,255,0.6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0', fontSize: '1.4rem', color: '#ff7b00', alignSelf: 'flex-start', fontWeight: 'bold' }}>
                3D空間で自由にアートを描こう！
              </h3>
              <p style={{ margin: 0, fontSize: '1.1rem', color: '#000000', textAlign: 'left', width: '100%', lineHeight: '1.5' }}>
                奥行きのある3D空間で、自由に図形を配置したり絵を描いたりできるモードです。
              </p>
              <div style={{ display: 'flex', width: '100%', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
                <img src="/screenshot3d.png" alt="3D Paint Screenshot" style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <button onClick={() => navigate('/draw3d')} className="start-button mode-button" style={{ width: '100%', fontSize: '1.2rem', padding: '0.8rem 1rem', borderColor: '#ff7b00', background: '#ff7b00', color: '#ffffff' }}>
                  <PenTool size={20} style={{ marginRight: '8px' }} />
                  3Dに絵を描く
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: '300px', maxWidth: '450px', backgroundColor: 'rgba(255,255,255,0.6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0', fontSize: '1.4rem', color: '#3b82f6', alignSelf: 'flex-start', fontWeight: 'bold' }}>
                シンプルなお絵描きを楽しもう！
              </h3>
              <p style={{ margin: 0, fontSize: '1.1rem', color: '#000000', textAlign: 'left', width: '100%', lineHeight: '1.5' }}>
                シンプルな平面のキャンバスに、イラストやスケッチを自由に描くモードです。
              </p>
              <div style={{ display: 'flex', width: '100%', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
                <img src="/screenshot2d.png" alt="2D Paint Screenshot" style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <button onClick={() => navigate('/draw2d')} className="start-button mode-button" style={{ width: '100%', fontSize: '1.2rem', padding: '0.8rem 1rem', borderColor: '#3b82f6', background: '#3b82f6', color: '#ffffff' }}>
                  <PenTool size={20} style={{ marginRight: '8px' }} />
                  2Dに絵を描く
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default Home;
