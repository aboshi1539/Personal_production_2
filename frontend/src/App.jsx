import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import Game from './Game';
import Othello from './Othello';
import QuizRace from './QuizRace';
import ThreePuzzle from './ThreePuzzle';
import CatchPuzzle from './CatchPuzzle';
import ShootingGame from './ShootingGame';
import Draw3D from './Draw3D';
import Draw2D from './Draw2D';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game" element={<Game />} />
      <Route path="/othello" element={<Othello />} />
      <Route path="/quiz" element={<QuizRace />} />
      <Route path="/puzzle" element={<ThreePuzzle />} />
      <Route path="/catch-puzzle" element={<CatchPuzzle />} />
      <Route path="/shooter" element={<ShootingGame />} />
      <Route path="/draw3d" element={<Draw3D />} />
      <Route path="/draw2d" element={<Draw2D />} />
    </Routes>
  );
}

export default App;
