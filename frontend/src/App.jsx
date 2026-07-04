import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import Draw3D from './Draw3D';
import Draw2D from './Draw2D';
import LoadingScreen from './LoadingScreen';

function App() {
  const [loading, setLoading] = useState(true);

  // You can also use useEffect to preload assets if needed, but for now we just rely on the animation timing
  
  return (
    <>
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      <div style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.5s ease' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/draw3d" element={<Draw3D />} />
          <Route path="/draw2d" element={<Draw2D />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
