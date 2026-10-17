import * as THREE from "three";

export interface BirthdayFieldOptions {
  gridResolution?: number;
  gridSize?: number;
  iterations?: number;
  k?: number;
  timeScale?: number;
  pointSize?: number;
  /** Optional smooth radial compression for embedding inside a globe. */
  containmentRadius?: number;
  colors?: [THREE.Color, THREE.Color, THREE.Color];
}

const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
const clampIterations = (n: number) => Math.max(1, Math.min(8, Math.round(finite(n, 5))));

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime, uK, uPointSize, uUseUnnormalizedRInCos;
  uniform float uContainmentRadius, uViewportHeight;
  uniform int uIterations;
  varying float vDisplacement, vRadialDist;
  vec3 rotateZ(vec3 v, float a) {
    float s = sin(a), c = cos(a);
    return vec3(c*v.x-s*v.y, s*v.x+c*v.y, v.z);
  }
  void main() {
    vec3 p = position;
    float factN = 1.0;
    for (int n = 1; n <= 8; n++) {
      if (n > uIterations) break;
      float fn = float(n);
      factN *= fn;
      float rLen = length(p);
      vec3 rHat = rLen > 1e-6 ? p/rLen : vec3(0.0,0.0,1.0);
      vec3 b = cos(mix(rHat,p,uUseUnnormalizedRInCos)*uTime + vec3(uTime,-1.0,-1.0));
      vec3 v = sqrt(factN*(fn+1.0))*rHat;
      vec3 reflection = (2.0*dot(v,b)/max(dot(b,b),1e-6))*b-v;
      p += uK*rotateZ(rHat,uTime) - (uTime/factN)*reflection;
    }
    vDisplacement = length(p-position);
    vRadialDist = length(p);
    if (uContainmentRadius > 0.0) {
      // Smooth compression rather than clamping points into a hard shell.
      p *= uContainmentRadius/sqrt(uContainmentRadius*uContainmentRadius+dot(p,p));
    }
    vec4 mv = modelViewMatrix*vec4(p,1.0);
    gl_Position = projectionMatrix*mv;
    gl_PointSize = clamp(uPointSize*uViewportHeight*projectionMatrix[1][1]/max(-mv.z,0.1),1.0,14.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uCoreColor, uMidColor, uOuterColor;
  uniform float uOpacity;
  varying float vDisplacement, vRadialDist;
  void main() {
    vec2 xy = 2.0*gl_PointCoord-1.0;
    float r2 = dot(xy,xy);
    if (r2 > 1.0) discard;
    float alpha = 1.0-smoothstep(0.15,1.0,r2);
    float caustic = sin(vDisplacement*0.6)*0.5+0.5;
    vec3 col = mix(uCoreColor,uMidColor,smoothstep(0.4,3.2,vRadialDist));
    col = mix(col,uOuterColor,smoothstep(2.5,11.0,vRadialDist));
    col += 0.18*caustic*uMidColor;
    gl_FragColor = vec4(col,alpha*0.88*uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function buildBirthdayField(opts: BirthdayFieldOptions = {}) {
  const res = Math.max(2, Math.min(600, Math.round(finite(opts.gridResolution ?? 300, 300))));
  const size = Math.max(0.001, finite(opts.gridSize ?? 20, 20));
  let timeScale = Math.max(0, finite(opts.timeScale ?? 0.1, 0.1));
  const positions = new Float32Array(res*res*3);
  let ptr = 0;
  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      positions[ptr++] = -size/2+i*size/(res-1);
      positions[ptr++] = -size/2+j*size/(res-1);
      positions[ptr++] = 0;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
  const colors = opts.colors ?? [new THREE.Color(), new THREE.Color(), new THREE.Color()];
  const uniforms = {
    uTime: { value: 0 },
    uK: { value: finite(opts.k ?? 1.13, 1.13) },
    uIterations: { value: clampIterations(opts.iterations ?? 5) },
    uPointSize: { value: Math.max(0.001, finite(opts.pointSize ?? 0.05, 0.05)) },
    uUseUnnormalizedRInCos: { value: 0 },
    uContainmentRadius: { value: Math.max(0, finite(opts.containmentRadius ?? 0, 0)) },
    uViewportHeight: { value: 450 },
    uOpacity: { value: 1 },
    uCoreColor: { value: colors[0] },
    uMidColor: { value: colors[1] },
    uOuterColor: { value: colors[2] },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, uniforms,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  });
  const mesh = new THREE.Points(geometry,material);
  mesh.name = "BirthdayDeformationField";
  mesh.frustumCulled = false;
  return {
    mesh, uniforms,
    update(elapsedSeconds: number) { uniforms.uTime.value = Math.max(0, finite(elapsedSeconds, 0))*timeScale; },
    setIterations(n: number) { uniforms.uIterations.value = clampIterations(n); },
    setK(k: number) { uniforms.uK.value = finite(k, 1.13); },
    setTimeScale(speed: number) { timeScale = Math.max(0, finite(speed, 0.1)); },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}