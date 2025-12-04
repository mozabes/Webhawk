// Webhawk SDF Raymarching Shader
// Bold rainbow colors with black negative space

struct Uniforms {
  cameraPos: vec3<f32>,
  time: f32,
  cameraForward: vec3<f32>,
  fov: f32,
  cameraRight: vec3<f32>,
  aspectRatio: f32,
  cameraUp: vec3<f32>,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Full-screen triangle
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );

  var output: VertexOutput;
  output.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  return output;
}

// ============================================
// SDF Primitives
// ============================================

fn sdSphere(p: vec3<f32>, r: f32) -> f32 {
  return length(p) - r;
}

fn sdBox(p: vec3<f32>, b: vec3<f32>) -> f32 {
  let q = abs(p) - b;
  return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

fn sdCylinder(p: vec3<f32>, h: f32, r: f32) -> f32 {
  let d = abs(vec2<f32>(length(p.xz), p.y)) - vec2<f32>(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, vec2<f32>(0.0)));
}

fn sdTorus(p: vec3<f32>, t: vec2<f32>) -> f32 {
  let q = vec2<f32>(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

fn sdCone(p: vec3<f32>, c: vec2<f32>, h: f32) -> f32 {
  let q = h * vec2<f32>(c.x / c.y, -1.0);
  let w = vec2<f32>(length(p.xz), p.y);
  let a = w - q * clamp(dot(w, q) / dot(q, q), 0.0, 1.0);
  let b = w - q * vec2<f32>(clamp(w.x / q.x, 0.0, 1.0), 1.0);
  let k = sign(q.y);
  let d = min(dot(a, a), dot(b, b));
  let s = max(k * (w.x * q.y - w.y * q.x), k * (w.y - q.y));
  return sqrt(d) * sign(s);
}

// ============================================
// SDF Operations
// ============================================

fn opUnion(d1: f32, d2: f32) -> f32 {
  return min(d1, d2);
}

fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

fn opSubtraction(d1: f32, d2: f32) -> f32 {
  return max(-d1, d2);
}

fn opIntersection(d1: f32, d2: f32) -> f32 {
  return max(d1, d2);
}

fn opRepeat(p: vec3<f32>, c: vec3<f32>) -> vec3<f32> {
  return p - c * round(p / c);
}

fn opRepeatLimited(p: vec3<f32>, c: f32, l: vec3<f32>) -> vec3<f32> {
  return p - c * clamp(round(p / c), -l, l);
}

// ============================================
// Noise Functions
// ============================================

fn hash(p: vec3<f32>) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash(i + vec3<f32>(0.0, 0.0, 0.0)), hash(i + vec3<f32>(1.0, 0.0, 0.0)), u.x),
      mix(hash(i + vec3<f32>(0.0, 1.0, 0.0)), hash(i + vec3<f32>(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash(i + vec3<f32>(0.0, 0.0, 1.0)), hash(i + vec3<f32>(1.0, 0.0, 1.0)), u.x),
      mix(hash(i + vec3<f32>(0.0, 1.0, 1.0)), hash(i + vec3<f32>(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

fn fbm(p: vec3<f32>) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * noise(pos * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// ============================================
// World SDF - Bold Geometric Landscape
// ============================================

struct SDFResult {
  dist: f32,
  materialId: i32,
}

fn sdMountain(p: vec3<f32>) -> f32 {
  // Base terrain with noise
  let terrainHeight = fbm(vec3<f32>(p.x * 0.01, 0.0, p.z * 0.01)) * 80.0 + fbm(vec3<f32>(p.x * 0.05, 0.0, p.z * 0.05)) * 20.0;
  let terrain = p.y - terrainHeight + 50.0;

  return terrain;
}

fn sdFloatingIsland(p: vec3<f32>, center: vec3<f32>, radius: f32, height: f32) -> f32 {
  let q = p - center;

  // Top dome
  let dome = sdSphere(q - vec3<f32>(0.0, height * 0.3, 0.0), radius);

  // Bottom cone
  let cone = sdCone(q * vec3<f32>(1.0, -1.0, 1.0), vec2<f32>(0.8, 0.6), height);

  // Combine
  return opSmoothUnion(dome, cone, radius * 0.3);
}

fn sdPillar(p: vec3<f32>, center: vec3<f32>, height: f32, radius: f32) -> f32 {
  let q = p - center;

  // Main cylinder
  let cyl = sdCylinder(q, height, radius);

  // Top cap (torus)
  let cap = sdTorus(q - vec3<f32>(0.0, height, 0.0), vec2<f32>(radius * 1.2, radius * 0.3));

  return opSmoothUnion(cyl, cap, radius * 0.5);
}

fn sdRing(p: vec3<f32>, center: vec3<f32>, majorRadius: f32, minorRadius: f32) -> f32 {
  let q = p - center;
  return sdTorus(q, vec2<f32>(majorRadius, minorRadius));
}

fn mapWorld(p: vec3<f32>) -> SDFResult {
  var result: SDFResult;
  result.dist = 10000.0;
  result.materialId = 0;

  // Ground terrain - material 1 (will be colored by position)
  let terrain = sdMountain(p);
  if (terrain < result.dist) {
    result.dist = terrain;
    result.materialId = 1;
  }

  // Floating islands - material 2
  let island1 = sdFloatingIsland(p, vec3<f32>(200.0, 150.0, -300.0), 40.0, 60.0);
  if (island1 < result.dist) {
    result.dist = island1;
    result.materialId = 2;
  }

  let island2 = sdFloatingIsland(p, vec3<f32>(-150.0, 200.0, -500.0), 60.0, 80.0);
  if (island2 < result.dist) {
    result.dist = island2;
    result.materialId = 3;
  }

  let island3 = sdFloatingIsland(p, vec3<f32>(0.0, 180.0, -800.0), 50.0, 70.0);
  if (island3 < result.dist) {
    result.dist = island3;
    result.materialId = 4;
  }

  // Giant pillars - material 5,6
  let pillar1 = sdPillar(p, vec3<f32>(300.0, 0.0, -200.0), 200.0, 20.0);
  if (pillar1 < result.dist) {
    result.dist = pillar1;
    result.materialId = 5;
  }

  let pillar2 = sdPillar(p, vec3<f32>(-250.0, 0.0, -400.0), 250.0, 25.0);
  if (pillar2 < result.dist) {
    result.dist = pillar2;
    result.materialId = 6;
  }

  // Giant floating rings - material 7
  let ring1 = sdRing(p, vec3<f32>(100.0, 120.0, -250.0), 50.0, 5.0);
  if (ring1 < result.dist) {
    result.dist = ring1;
    result.materialId = 7;
  }

  let ring2Pos = vec3<f32>(-100.0, 160.0, -450.0);
  let ring2 = sdTorus(
    (p - ring2Pos) * mat3x3<f32>(
      1.0, 0.0, 0.0,
      0.0, 0.707, 0.707,
      0.0, -0.707, 0.707
    ),
    vec2<f32>(40.0, 4.0)
  );
  if (ring2 < result.dist) {
    result.dist = ring2;
    result.materialId = 8;
  }

  return result;
}

// ============================================
// Raymarching
// ============================================

fn calcNormal(p: vec3<f32>) -> vec3<f32> {
  let eps = 0.001;
  let h = vec2<f32>(eps, 0.0);
  return normalize(vec3<f32>(
    mapWorld(p + h.xyy).dist - mapWorld(p - h.xyy).dist,
    mapWorld(p + h.yxy).dist - mapWorld(p - h.yxy).dist,
    mapWorld(p + h.yyx).dist - mapWorld(p - h.yyx).dist
  ));
}

fn raymarch(ro: vec3<f32>, rd: vec3<f32>) -> SDFResult {
  var t = 0.0;
  var result: SDFResult;
  result.dist = -1.0;
  result.materialId = 0;

  let maxDist = 3000.0;
  let maxSteps = 128;

  for (var i = 0; i < maxSteps; i++) {
    let p = ro + rd * t;
    let d = mapWorld(p);

    if (d.dist < 0.001 * t) {
      result.dist = t;
      result.materialId = d.materialId;
      return result;
    }

    t += d.dist * 0.8; // Slight understepping for stability

    if (t > maxDist) {
      break;
    }
  }

  return result;
}

fn softShadow(ro: vec3<f32>, rd: vec3<f32>, mint: f32, maxt: f32, k: f32) -> f32 {
  var res = 1.0;
  var t = mint;

  for (var i = 0; i < 32; i++) {
    let h = mapWorld(ro + rd * t).dist;
    res = min(res, k * h / t);
    t += clamp(h, 0.02, 0.5);
    if (res < 0.001 || t > maxt) {
      break;
    }
  }

  return clamp(res, 0.0, 1.0);
}

// ============================================
// Rainbow Color Palette
// ============================================

fn rainbow(t: f32) -> vec3<f32> {
  // Bold, saturated rainbow
  let r = sin(t * 6.28318) * 0.5 + 0.5;
  let g = sin((t + 0.333) * 6.28318) * 0.5 + 0.5;
  let b = sin((t + 0.666) * 6.28318) * 0.5 + 0.5;
  return vec3<f32>(r, g, b);
}

fn getMaterialColor(materialId: i32, p: vec3<f32>) -> vec3<f32> {
  let time = uniforms.time;

  // Terrain - position-based rainbow stripes
  if (materialId == 1) {
    let stripe = sin(p.x * 0.02 + p.z * 0.02 + time * 0.5) * 0.5 + 0.5;
    return rainbow(stripe);
  }
  // Island 1 - Hot pink/magenta
  if (materialId == 2) {
    return vec3<f32>(1.0, 0.0, 0.5);
  }
  // Island 2 - Electric cyan
  if (materialId == 3) {
    return vec3<f32>(0.0, 1.0, 1.0);
  }
  // Island 3 - Bright yellow
  if (materialId == 4) {
    return vec3<f32>(1.0, 1.0, 0.0);
  }
  // Pillar 1 - Neon green
  if (materialId == 5) {
    return vec3<f32>(0.0, 1.0, 0.2);
  }
  // Pillar 2 - Electric purple
  if (materialId == 6) {
    return vec3<f32>(0.6, 0.0, 1.0);
  }
  // Ring 1 - Animated rainbow
  if (materialId == 7) {
    let t = fract(atan2(p.z - (-250.0), p.x - 100.0) / 6.28318 + time * 0.2);
    return rainbow(t);
  }
  // Ring 2 - Orange
  if (materialId == 8) {
    return vec3<f32>(1.0, 0.5, 0.0);
  }
  // Default - white
  return vec3<f32>(1.0, 1.0, 1.0);
}

// ============================================
// Fragment Shader
// ============================================

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  // Calculate ray direction from camera vectors
  let uv = input.uv * 2.0 - 1.0;

  // Build ray direction using camera basis vectors
  let fovScale = tan(uniforms.fov * 0.5);
  let rd = normalize(
    uniforms.cameraForward +
    uniforms.cameraRight * uv.x * uniforms.aspectRatio * fovScale +
    uniforms.cameraUp * uv.y * fovScale
  );

  let ro = uniforms.cameraPos;

  // Raymarch
  let result = raymarch(ro, rd);

  var color = vec3<f32>(0.0); // Black background - negative space

  if (result.dist > 0.0) {
    let p = ro + rd * result.dist;
    let n = calcNormal(p);

    // Sun direction (animated slightly)
    let sunDir = normalize(vec3<f32>(
      0.5 + sin(uniforms.time * 0.1) * 0.2,
      0.8,
      -0.3 + cos(uniforms.time * 0.1) * 0.2
    ));

    // Get material color
    let baseColor = getMaterialColor(result.materialId, p);

    // Lighting
    let diff = max(dot(n, sunDir), 0.0);
    let shadow = softShadow(p + n * 0.01, sunDir, 0.1, 100.0, 16.0);

    // Rim lighting for extra boldness
    let rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

    // Combine lighting
    let ambient = 0.15;
    let lighting = ambient + diff * shadow * 0.7 + rim * 0.3;

    color = baseColor * lighting;

    // Add slight glow to edges
    color += baseColor * rim * 0.5;

    // Distance fog to black
    let fogAmount = 1.0 - exp(-result.dist * 0.0003);
    color = mix(color, vec3<f32>(0.0), fogAmount);
  } else {
    // Sky - subtle gradient with stars
    let skyGrad = smoothstep(-0.2, 0.5, rd.y);

    // Very subtle deep blue to black gradient
    color = mix(vec3<f32>(0.0, 0.0, 0.05), vec3<f32>(0.0), skyGrad);

    // Add some distant "stars" (subtle rainbow points)
    let starField = hash(rd * 1000.0);
    if (starField > 0.998) {
      let starColor = rainbow(hash(rd * 500.0));
      color += starColor * 0.5;
    }
  }

  // Slight vignette
  let vignette = 1.0 - length(uv) * 0.3;
  color *= vignette;

  // Gamma correction
  color = pow(color, vec3<f32>(1.0 / 2.2));

  return vec4<f32>(color, 1.0);
}
