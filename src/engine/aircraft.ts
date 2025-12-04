import {
  Vec3,
  vec3,
  vec3Add,
  vec3Scale,
  vec3Normalize,
  Quat,
  quatFromEuler,
  quatNormalize,
  quatToMat4,
  Mat4,
} from './math';

export interface AircraftState {
  position: Vec3;
  rotation: Quat;
  velocity: Vec3;
  pitch: number;
  yaw: number;
  roll: number;
  throttle: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  throttleUp: boolean;
  throttleDown: boolean;
}

const PITCH_RATE = 1.5;
const YAW_RATE = 1.0;
const ROLL_RATE = 2.5;
const MIN_SPEED = 20.0;
const MAX_SPEED = 150.0;
const THROTTLE_ACCEL = 0.5;

export function createAircraft(): AircraftState {
  return {
    position: vec3(0, 100, 0),
    rotation: quatFromEuler(0, 0, 0),
    velocity: vec3(0, 0, -MIN_SPEED),
    pitch: 0,
    yaw: 0,
    roll: 0,
    throttle: 0.3,
  };
}

export function updateAircraft(
  state: AircraftState,
  input: InputState,
  deltaTime: number
): AircraftState {
  let { pitch, yaw, roll, throttle } = state;

  // Apply pitch (W/S) - W pulls up (increases pitch), S pushes down
  if (input.forward) pitch += PITCH_RATE * deltaTime;
  if (input.backward) pitch -= PITCH_RATE * deltaTime;

  // Apply yaw (A/D) - A turns left (increases yaw), D turns right
  const yawInfluence = Math.cos(roll) * 0.5 + 0.5;
  if (input.left) yaw += YAW_RATE * deltaTime * yawInfluence;
  if (input.right) yaw -= YAW_RATE * deltaTime * yawInfluence;

  // Apply roll (Q/E)
  if (input.rollLeft) roll -= ROLL_RATE * deltaTime;
  if (input.rollRight) roll += ROLL_RATE * deltaTime;

  // Auto-level roll slightly when turning (bank into the turn)
  if (input.left) roll = Math.min(roll + ROLL_RATE * 0.3 * deltaTime, Math.PI / 3);
  if (input.right) roll = Math.max(roll - ROLL_RATE * 0.3 * deltaTime, -Math.PI / 3);

  // Throttle control (Shift/Ctrl)
  if (input.throttleUp) throttle = Math.min(throttle + THROTTLE_ACCEL * deltaTime, 1.0);
  if (input.throttleDown) throttle = Math.max(throttle - THROTTLE_ACCEL * deltaTime, 0.0);

  // Clamp pitch
  pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));

  // Dampen roll back to center when not actively rolling
  if (!input.rollLeft && !input.rollRight && !input.left && !input.right) {
    roll *= 0.97;
  }

  // Build rotation quaternion
  const rotation = quatNormalize(quatFromEuler(pitch, yaw, roll));

  // Get forward direction from rotation matrix
  const rotMat = quatToMat4(rotation);
  const forward: Vec3 = vec3Normalize([
    -rotMat[8],
    -rotMat[9],
    -rotMat[10],
  ]);

  // Calculate speed from throttle
  const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * throttle;

  // Update velocity
  const velocity = vec3Scale(forward, speed);

  // Update position
  const position = vec3Add(state.position, vec3Scale(velocity, deltaTime));

  return {
    position,
    rotation,
    velocity,
    pitch,
    yaw,
    roll,
    throttle,
  };
}

export function getAircraftMatrix(state: AircraftState): Mat4 {
  const rotMat = quatToMat4(state.rotation);
  // Add translation
  rotMat[12] = state.position[0];
  rotMat[13] = state.position[1];
  rotMat[14] = state.position[2];
  return rotMat;
}

export function getForwardVector(state: AircraftState): Vec3 {
  const rotMat = quatToMat4(state.rotation);
  return vec3Normalize([-rotMat[8], -rotMat[9], -rotMat[10]]);
}

export function getUpVector(state: AircraftState): Vec3 {
  const rotMat = quatToMat4(state.rotation);
  return vec3Normalize([rotMat[4], rotMat[5], rotMat[6]]);
}

export function getRightVector(state: AircraftState): Vec3 {
  const rotMat = quatToMat4(state.rotation);
  return vec3Normalize([rotMat[0], rotMat[1], rotMat[2]]);
}
