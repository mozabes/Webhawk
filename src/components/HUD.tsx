import { GameState } from '../engine/game';

interface HUDProps {
  state: GameState | null;
}

export function HUD({ state }: HUDProps) {
  if (!state) return null;

  const speedKnots = Math.round(state.speed * 1.944); // m/s to knots approximation
  const altitudeFt = Math.round(state.altitude * 3.281); // m to feet
  const throttlePercent = Math.round(state.aircraft.throttle * 100);

  return (
    <div className="hud">
      <div className="hud-left">
        <div className="hud-item">
          <span className="hud-label">SPD</span>
          <span className="hud-value">{speedKnots}</span>
          <span className="hud-unit">KTS</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">ALT</span>
          <span className="hud-value">{altitudeFt}</span>
          <span className="hud-unit">FT</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">THR</span>
          <span className="hud-value">{throttlePercent}</span>
          <span className="hud-unit">%</span>
        </div>
      </div>

      <div className="hud-center">
        <div className="crosshair">
          <div className="crosshair-h" />
          <div className="crosshair-v" />
        </div>
      </div>

      <div className="hud-right">
        <div className="hud-item">
          <span className="hud-label">FPS</span>
          <span className="hud-value">{state.fps}</span>
        </div>
      </div>

      <div className="hud-bottom">
        <div className="controls-hint">
          <span>W/S</span> Pitch
          <span>A/D</span> Yaw
          <span>Q/E</span> Roll
          <span>Shift/Ctrl</span> Throttle
        </div>
      </div>
    </div>
  );
}
