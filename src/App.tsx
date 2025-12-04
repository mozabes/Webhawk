import { useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { GameState } from './engine/game';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const handleStateUpdate = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  return (
    <div className="app">
      <GameCanvas onStateUpdate={handleStateUpdate} />
      <HUD state={gameState} />
    </div>
  );
}

export default App;
