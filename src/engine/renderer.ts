import { WebGPUContext, resizeCanvas } from './webgpu';
import { CameraState } from './camera';
import { AircraftState } from './aircraft';
import { vec3Sub, vec3Normalize, vec3Cross } from './math';
import sdfShaderSource from '../shaders/sdf.wgsl?raw';

export interface Renderer {
  render: (camera: CameraState, aircraft: AircraftState, time: number) => void;
  destroy: () => void;
}

export async function createRenderer(ctx: WebGPUContext): Promise<Renderer> {
  const { device, context, format, canvas } = ctx;

  // Create shader module
  const shaderModule = device.createShaderModule({
    label: 'SDF Raymarching Shader',
    code: sdfShaderSource,
  });

  // Check for shader compilation errors
  const compilationInfo = await shaderModule.getCompilationInfo();
  for (const message of compilationInfo.messages) {
    const msgType = message.type === 'error' ? 'ERROR' : message.type === 'warning' ? 'WARNING' : 'INFO';
    console.log(`Shader ${msgType}: ${message.message}`);
    console.log(`  Line ${message.lineNum}:${message.linePos}`);
    if (message.type === 'error') {
      throw new Error(`Shader compilation error: ${message.message}`);
    }
  }

  // Uniform buffer layout (must match shader):
  // cameraPos: vec3<f32> (12 bytes) + time: f32 (4 bytes) = 16 bytes
  // cameraForward: vec3<f32> (12 bytes) + fov: f32 (4 bytes) = 16 bytes
  // cameraRight: vec3<f32> (12 bytes) + aspectRatio: f32 (4 bytes) = 16 bytes
  // cameraUp: vec3<f32> (12 bytes) + padding: f32 (4 bytes) = 16 bytes
  // aircraftPos: vec3<f32> (12 bytes) + padding: f32 (4 bytes) = 16 bytes
  // Total: 80 bytes
  const uniformBufferSize = 80;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Bind group layout
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
    ],
  });

  // Bind group
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
    ],
  });

  // Pipeline layout
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  // Render pipeline
  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: 'vertexMain',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragmentMain',
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  function updateUniforms(camera: CameraState, aircraft: AircraftState, time: number): void {
    resizeCanvas(canvas);

    const aspect = canvas.width / canvas.height;

    // Calculate camera basis vectors
    const forward = vec3Normalize(vec3Sub(camera.target, camera.position));
    const right = vec3Normalize(vec3Cross(forward, camera.up));
    const up = vec3Cross(right, forward);

    // Create uniform data buffer
    const uniformData = new ArrayBuffer(uniformBufferSize);
    const floatView = new Float32Array(uniformData);

    // cameraPos (0-2) + time (3)
    floatView[0] = camera.position[0];
    floatView[1] = camera.position[1];
    floatView[2] = camera.position[2];
    floatView[3] = time;

    // cameraForward (4-6) + fov (7)
    floatView[4] = forward[0];
    floatView[5] = forward[1];
    floatView[6] = forward[2];
    floatView[7] = camera.fov;

    // cameraRight (8-10) + aspectRatio (11)
    floatView[8] = right[0];
    floatView[9] = right[1];
    floatView[10] = right[2];
    floatView[11] = aspect;

    // cameraUp (12-14) + padding (15)
    floatView[12] = up[0];
    floatView[13] = up[1];
    floatView[14] = up[2];
    floatView[15] = 0;

    // aircraftPos (16-18) + padding (19)
    floatView[16] = aircraft.position[0];
    floatView[17] = aircraft.position[1];
    floatView[18] = aircraft.position[2];
    floatView[19] = 0;

    device.queue.writeBuffer(uniformBuffer, 0, uniformData);
  }

  function render(camera: CameraState, aircraft: AircraftState, time: number): void {
    updateUniforms(camera, aircraft, time);

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(3, 1, 0, 0); // Full-screen triangle
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  function destroy(): void {
    uniformBuffer.destroy();
  }

  return { render, destroy };
}
