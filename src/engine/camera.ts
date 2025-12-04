import {
  Vec3,
  vec3,
  vec3Add,
  vec3Sub,
  vec3Scale,
  vec3Normalize,
  vec3Length,
  Mat4,
  mat4Perspective,
  mat4LookAt,
} from './math';
import { AircraftState, getForwardVector, getUpVector } from './aircraft';

export interface CameraState {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
  near: number;
  far: number;
}

const CAMERA_DISTANCE = 15.0;
const CAMERA_HEIGHT = 5.0;
const CAMERA_SMOOTHING = 5.0;

export function createCamera(): CameraState {
  return {
    position: vec3(0, 105, 20),
    target: vec3(0, 100, 0),
    up: vec3(0, 1, 0),
    fov: Math.PI / 3,
    near: 0.5,
    far: 5000.0,
  };
}

export function updateCamera(
  camera: CameraState,
  aircraft: AircraftState,
  deltaTime: number
): CameraState {
  const forward = getForwardVector(aircraft);
  const aircraftUp = getUpVector(aircraft);

  // Calculate ideal camera position (behind and above the aircraft)
  const behindOffset = vec3Scale(forward, -CAMERA_DISTANCE);
  const upOffset = vec3Scale(aircraftUp, CAMERA_HEIGHT);
  const idealPosition = vec3Add(vec3Add(aircraft.position, behindOffset), upOffset);

  // Smoothly interpolate camera position
  const smoothFactor = 1 - Math.exp(-CAMERA_SMOOTHING * deltaTime);
  const posDiff = vec3Sub(idealPosition, camera.position);
  const newPosition = vec3Add(camera.position, vec3Scale(posDiff, smoothFactor));

  // Look slightly ahead of the aircraft
  const lookAhead = vec3Scale(forward, 20.0);
  const idealTarget = vec3Add(aircraft.position, lookAhead);
  const targetDiff = vec3Sub(idealTarget, camera.target);
  const newTarget = vec3Add(camera.target, vec3Scale(targetDiff, smoothFactor * 1.5));

  // Smoothly interpolate up vector
  const upDiff = vec3Sub(aircraftUp, camera.up);
  const rawUp = vec3Add(camera.up, vec3Scale(upDiff, smoothFactor * 0.5));
  const newUp = vec3Normalize(rawUp);

  return {
    ...camera,
    position: newPosition,
    target: newTarget,
    up: vec3Length(rawUp) > 0.01 ? newUp : vec3(0, 1, 0),
  };
}

export function getViewMatrix(camera: CameraState): Mat4 {
  return mat4LookAt(camera.position, camera.target, camera.up);
}

export function getProjectionMatrix(camera: CameraState, aspect: number): Mat4 {
  return mat4Perspective(camera.fov, aspect, camera.near, camera.far);
}
