import { InputState } from './aircraft';

export function createInputState(): InputState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    rollLeft: false,
    rollRight: false,
    throttleUp: false,
    throttleDown: false,
  };
}

export function setupInputHandlers(
  inputState: InputState,
  canvas: HTMLCanvasElement
): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        inputState.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        inputState.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        inputState.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        inputState.right = true;
        break;
      case 'KeyQ':
        inputState.rollRight = true;
        break;
      case 'KeyE':
        inputState.rollLeft = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        inputState.throttleUp = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        inputState.throttleDown = true;
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        inputState.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        inputState.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        inputState.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        inputState.right = false;
        break;
      case 'KeyQ':
        inputState.rollRight = false;
        break;
      case 'KeyE':
        inputState.rollLeft = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        inputState.throttleUp = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        inputState.throttleDown = false;
        break;
    }
  };

  const handleBlur = () => {
    // Reset all input when window loses focus
    inputState.forward = false;
    inputState.backward = false;
    inputState.left = false;
    inputState.right = false;
    inputState.rollLeft = false;
    inputState.rollRight = false;
    inputState.throttleUp = false;
    inputState.throttleDown = false;
  };

  // Focus canvas for keyboard input
  canvas.tabIndex = 0;
  canvas.focus();

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', handleBlur);

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', handleBlur);
  };
}
