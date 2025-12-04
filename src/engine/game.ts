import { initWebGPU, WebGPUContext } from './webgpu';
import { createRenderer, Renderer } from './renderer';
import { createAircraft, updateAircraft, AircraftState } from './aircraft';
import { createCamera, updateCamera, CameraState } from './camera';
import { createInputState, setupInputHandlers } from './input';
import { vec3Length } from './math';

export interface GameState {
  aircraft: AircraftState;
  camera: CameraState;
  time: number;
  fps: number;
  speed: number;
  altitude: number;
}

export interface Game {
  getState: () => GameState;
  destroy: () => void;
}

export async function createGame(canvas: HTMLCanvasElement): Promise<Game> {
  // Initialize WebGPU
  let ctx: WebGPUContext;
  try {
    ctx = await initWebGPU(canvas);
  } catch (e) {
    throw new Error(`Failed to initialize WebGPU: ${e}`);
  }

  // Create renderer
  const renderer: Renderer = await createRenderer(ctx);

  // Initialize game state
  let aircraft = createAircraft();
  let camera = createCamera();
  const inputState = createInputState();

  // Setup input handlers
  const cleanupInput = setupInputHandlers(inputState, canvas);

  // Game loop timing
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTime = 0;
  let currentFps = 0;
  let running = true;
  let gameTime = 0;

  function gameLoop(): void {
    if (!running) return;

    const now = performance.now();
    const deltaTime = Math.min((now - lastTime) / 1000, 0.1); // Cap at 100ms
    lastTime = now;
    gameTime += deltaTime;

    // FPS calculation
    frameCount++;
    fpsTime += deltaTime;
    if (fpsTime >= 1.0) {
      currentFps = frameCount;
      frameCount = 0;
      fpsTime = 0;
    }

    // Update aircraft
    aircraft = updateAircraft(aircraft, inputState, deltaTime);

    // Update camera to follow aircraft
    camera = updateCamera(camera, aircraft, deltaTime);

    // Render
    renderer.render(camera, aircraft, gameTime);

    requestAnimationFrame(gameLoop);
  }

  // Start game loop
  requestAnimationFrame(gameLoop);

  function getState(): GameState {
    return {
      aircraft,
      camera,
      time: gameTime,
      fps: currentFps,
      speed: vec3Length(aircraft.velocity),
      altitude: aircraft.position[1],
    };
  }

  function destroy(): void {
    running = false;
    cleanupInput();
    renderer.destroy();
  }

  return { getState, destroy };
}
