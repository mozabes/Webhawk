import {
  Vec3,
  vec3,
  vec3Add,
  vec3Scale,
  vec3Normalize,
  Quat,
  quatIdentity,
  quatNormalize,
  quatMultiply,
  quatFromAxisAngle,
  quatToMat4,
  Mat4,
} from './math';

export interface AircraftState {
  position: Vec3;
  rotation: Quat;
  velocity: Vec3;
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
    rotation: quatIdentity(),
    velocity: vec3(0, 0, -MIN_SPEED),
    throttle: 0.3,
  };
}

export function updateAircraft(
  state: AircraftState,
  input: InputState,
  deltaTime: number
): AircraftState {
  let { throttle } = state;
  let rotation = state.rotation;

  // Local axes for the aircraft
  const localRight: Vec3 = [1, 0, 0];   // X axis - pitch
  const localUp: Vec3 = [0, 1, 0];      // Y axis - yaw
  const localForward: Vec3 = [0, 0, 1]; // Z axis - roll

  // Apply pitch (W/S) - rotation around local X axis
  let pitchDelta = 0;
  if (input.forward) pitchDelta += PITCH_RATE * deltaTime;
  if (input.backward) pitchDelta -= PITCH_RATE * deltaTime;
  if (pitchDelta !== 0) {
    const pitchQuat = quatFromAxisAngle(localRight, pitchDelta);
    rotation = quatMultiply(rotation, pitchQuat);
  }

  // Apply yaw (A/D) - rotation around local Y axis
  let yawDelta = 0;
  if (input.left) yawDelta += YAW_RATE * deltaTime;
  if (input.right) yawDelta -= YAW_RATE * deltaTime;
  if (yawDelta !== 0) {
    const yawQuat = quatFromAxisAngle(localUp, yawDelta);
    rotation = quatMultiply(rotation, yawQuat);
  }

  // Apply roll (Q/E) - rotation around local Z axis
  let rollDelta = 0;
  if (input.rollLeft) rollDelta -= ROLL_RATE * deltaTime;
  if (input.rollRight) rollDelta += ROLL_RATE * deltaTime;
  if (rollDelta !== 0) {
    const rollQuat = quatFromAxisAngle(localForward, rollDelta);
    rotation = quatMultiply(rotation, rollQuat);
  }

  // Normalize to prevent drift
  rotation = quatNormalize(rotation);

  // Throttle control (Shift/Ctrl)
  if (input.throttleUp) throttle = Math.min(throttle + THROTTLE_ACCEL * deltaTime, 1.0);
  if (input.throttleDown) throttle = Math.max(throttle - THROTTLE_ACCEL * deltaTime, 0.0);

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
