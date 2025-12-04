import { useEffect, useRef, useState } from 'react';
import { createGame, Game, GameState } from '../engine/game';

interface GameCanvasProps {
  onStateUpdate: (state: GameState) => void;
}

export function GameCanvas({ onStateUpdate }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;

    async function init() {
      try {
        const game = await createGame(canvas!);
        if (!mounted) {
          game.destroy();
          return;
        }
        gameRef.current = game;

        // Update UI state periodically
        const updateInterval = setInterval(() => {
          if (gameRef.current) {
            onStateUpdate(gameRef.current.getState());
          }
        }, 100);

        return () => {
          clearInterval(updateInterval);
        };
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Unknown error');
        }
      }
    }

    const cleanup = init();

    return () => {
      mounted = false;
      cleanup?.then((fn) => fn?.());
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [onStateUpdate]);

  if (error) {
    return (
      <div className="error-container">
        <h2>WebGPU Error</h2>
        <p>{error}</p>
        <p>
          WebGPU requires a modern browser with WebGPU support enabled.
          Try Chrome 113+ or Edge 113+.
        </p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      onClick={() => canvasRef.current?.focus()}
    />
  );
}
