// @ts-nocheck -- dense WebGL buffer math; strict index checks add noise here
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type ElementKey = "water" | "earth" | "plasma" | "air" | "fire";

export const ELEMENTS: Record<
  ElementKey,
  { label: string; key: string; tagline: string; wave: number; emissive: number; palette: number[]; hue: number; flow: number; amp: number }
> = {
  water: { label: "Water", key: "W", tagline: "Fluid surface tension", wave: 0x00aaff, emissive: 0x002255, palette: [0.5, 0.58, 0.62], hue: 200, flow: 1, amp: 6 },
  earth: { label: "Earth", key: "E", tagline: "Crystalline lattice", wave: 0x5a7a2e, emissive: 0x1a2a08, palette: [0.12, 0.28, 0.08], hue: 90, flow: 0.4, amp: 3 },
  plasma: { label: "Plasma", key: "P", tagline: "Ionized resonance", wave: 0xcc33ff, emissive: 0x330055, palette: [0.8, 0.9, 0.5], hue: 280, flow: 2.2, amp: 8 },
  air: { label: "Air", key: "A", tagline: "Laminar drift", wave: 0xcfe8ff, emissive: 0x223344, palette: [0.55, 0.6, 0.0], hue: 180, flow: 0.7, amp: 2 },
  fire: { label: "Fire", key: "F", tagline: "Combustive bloom", wave: 0xff5a1f, emissive: 0x551100, palette: [0.02, 0.08, 0.13], hue: 20, flow: 1.8, amp: 10 },
};
export const ORDER: ElementKey[] = ["water", "earth", "plasma", "air", "fire"];

const DEFAULTS = { timeSpeed: 1, tesseractSpeed: 1, hyperVib: 0, multiEcho: 1, waveAmp: 6, poolY: -15, emanationHue: 200, beamIntensity: 1.5, psi: 0, bpm: 55, pitch5d: 0, density: 1, master: 0.8, droneVol: 0.7, harmVol: 0.5, heartVol: 0.8 };
type S = typeof DEFAULTS;

const SLIDERS: { group: string; items: { k: keyof S; label: string; min: number; max: number; step: number; suffix?: string }[] }[] = [
  { group: "⧖ 4D Time", items: [
    { k: "timeSpeed", label: "Time Flow", min: 0, max: 5, step: 0.1, suffix: "x" },
    { k: "tesseractSpeed", label: "Tesseract Morph", min: 0, max: 5, step: 0.1 } ] },
  { group: "✧ 5D Hyper", items: [
    { k: "hyperVib", label: "Hyper-Vibration", min: 0, max: 3, step: 0.1 },
    { k: "multiEcho", label: "Multiverse Echo", min: 1, max: 4, step: 0.1 },
    { k: "psi", label: "Superposition ψ", min: 0, max: 1, step: 0.01 } ] },
  { group: "≈ Wavepool", items: [
    { k: "waveAmp", label: "Wave Amplitude", min: 0, max: 20, step: 0.5 },
    { k: "poolY", label: "Pool Elevation", min: -40, max: 0, step: 1 } ] },
  { group: "↧ Emanation", items: [
    { k: "emanationHue", label: "Spectrum Shift", min: 0, max: 360, step: 1, suffix: "°" },
    { k: "beamIntensity", label: "Beam Luminosity", min: 0, max: 3, step: 0.1 } ] },
  { group: "♪ Resonance", items: [
    { k: "bpm", label: "Heartbeat BPM", min: 30, max: 120, step: 1 },
    { k: "pitch5d", label: "Harmonic Pitch", min: -12, max: 12, step: 1 } ] },
  { group: "🔊 Sound Mixer", items: [
    { k: "master", label: "Master Volume", min: 0, max: 1, step: 0.01 },
    { k: "droneVol", label: "Void Drone", min: 0, max: 1, step: 0.01 },
    { k: "harmVol", label: "5D Harmonic", min: 0, max: 1, step: 0.01 },
    { k: "heartVol", label: "Heartbeat", min: 0, max: 1, step: 0.01 } ] },
  { group: "🧠 Neural Cosmos", items: [
    { k: "density", label: "Synapse Glow", min: 0, max: 3, step: 0.05 } ] },
];

export default function Sandbox() {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef<S & { element: ElementKey; pulse: number }>({ ...DEFAULTS, element: "water", pulse: 0 });
  const [ui, setUi] = useState<S>(DEFAULTS);
  const [element, setElement] = useState<ElementKey>("water");
  const [entered, setEntered] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [glError, setGlError] = useState(false);
  const toggleMute = () => setMuted((m) => { const n = !m; const a = audio.current; if (a) a.master.gain.rampTo(n ? 0 : state.current.master, 0.3); return n; });
  const audio = useRef<any>(null);

  const set = (k: keyof S, v: number) => {
    state.current[k] = v;
    setUi((u) => ({ ...u, [k]: v }));
    const a = audio.current;
    if (!a) return;
    const gainKey = { master: "master", droneVol: "drone", harmVol: "harmG", heartVol: "heartG" }[k];
    if (gainKey && !(k === "master" && muted)) a[gainKey].gain.rampTo(v, 0.2);
    if (k === "bpm") a.Tone.Transport.bpm.rampTo(v, 1);
    if (k === "pitch5d") a.harm.frequency.rampTo(a.Tone.Frequency("C5").transpose(v).toFrequency(), 0.5);
  };

  const pickElement = (e: ElementKey) => {
    const cfg = ELEMENTS[e];
    state.current.element = e;
    setElement(e);
    set("emanationHue", cfg.hue);
    set("waveAmp", cfg.amp);
    set("timeSpeed", cfg.flow);
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const hit = ORDER.find((k) => ELEMENTS[k].key === ev.key.toUpperCase());
      if (hit) pickElement(hit);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = mount.current!;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x12050c, 0.0012);
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.005, 4000);
    camera.position.set(0, 30, el.clientWidth < 600 ? 120 : 90);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false });
    } catch (err) {
      console.warn("WebGL unavailable", err);
      setGlError(true);
      return;
    }
    renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); setGlError(true); });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 900;
    controls.minDistance = 0.05;
    controls.zoomSpeed = 1.6;

    const waveGeo = new THREE.PlaneGeometry(400, 400, 120, 120);
    const base = new Float32Array(waveGeo.attributes.position.array);
    const waveMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x002255, emissiveIntensity: 0.8, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.9, side: THREE.DoubleSide });
    const pool = new THREE.Mesh(waveGeo, waveMat);
    pool.rotation.x = -Math.PI / 2;
    scene.add(pool);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending });
    pool.add(new THREE.Mesh(waveGeo, gridMat));

    const dotCanvas = document.createElement("canvas"); dotCanvas.width = dotCanvas.height = 64;
    const dctx = dotCanvas.getContext("2d")!; const grd = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.6)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    dctx.fillStyle = grd; dctx.fillRect(0, 0, 64, 64);
    const dot = new THREE.CanvasTexture(dotCanvas);
    const embryo = new THREE.Group();
    scene.add(embryo);
    const N = 4000;
    const gGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), bPos = new Float32Array(N * 3), col = new Float32Array(N * 3), pick = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = 10 * Math.cbrt(Math.random()), th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(ph) * Math.cos(th), y = r * Math.sin(ph) * Math.sin(th), z = r * Math.cos(ph);
      pos.set([x, y, z], i * 3); bPos.set([x, y, z], i * 3); pick[i] = Math.random();
    }
    gGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    gGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const galaxy = new THREE.Points(gGeo, new THREE.PointsMaterial({ map: dot, size: 0.35, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    embryo.add(galaxy);

    const sacGeo = new THREE.SphereGeometry(12, 48, 48);
    const NOISE = `
      vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return -1.0+2.0*fract(sin(p)*43758.5453); }
      float noise(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*(3.0-2.0*f);
        return mix(mix(mix(dot(hash3(i),f),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
                   mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
      float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
      vec3 spectrum(float x){ return clamp(vec3(1.5-abs(4.0*x-3.0), 1.5-abs(4.0*x-2.0), 1.5-abs(4.0*x-1.0)),0.0,1.0); }
      vec3 cmb(float x){ x=clamp(x,0.0,1.0);
        vec3 c=mix(vec3(0.02,0.1,0.6),vec3(0.2,0.6,1.0),smoothstep(0.0,0.3,x));
        c=mix(c,vec3(0.75,0.95,0.9),smoothstep(0.3,0.5,x)); c=mix(c,vec3(1.0,0.8,0.3),smoothstep(0.5,0.7,x));
        return mix(c,vec3(0.85,0.2,0.05),smoothstep(0.7,1.0,x)); }`;
    const vsPos = `varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
    const globeMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, hue: { value: 0 } },
      vertexShader: vsPos,
      fragmentShader: NOISE + `varying vec3 vP; varying vec3 vN; varying vec3 vV; uniform float time, hue;
        void main(){ vec3 p=normalize(vP);
          float n=fbm(p*6.0+time*0.05)*0.6+fbm(p*28.0-time*0.1)*0.4;
          vec3 c=cmb(n*1.6+0.5);
          vec3 spec=spectrum(fract(n*2.0+hue+time*0.02));
          c=mix(c,spec,0.25);
          float rim=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.0);
          gl_FragColor=vec4(c*1.2+spec*rim*0.8, 0.55+rim*0.4); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const globe = new THREE.Mesh(sacGeo, globeMat);
    embryo.add(globe);
    const echoMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending });
    const echo = new THREE.Mesh(sacGeo, echoMat);
    embryo.add(echo);

    const tess = new THREE.Group();
    embryo.add(tess);
    const boxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(32, 32, 32));
    const boxMat = new THREE.LineBasicMaterial({ color: 0xffaaff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const innerMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const b1 = new THREE.LineSegments(boxEdges, boxMat), b2 = new THREE.LineSegments(boxEdges, boxMat), b3 = new THREE.LineSegments(boxEdges, innerMat);
    b2.scale.setScalar(0.6); b3.scale.setScalar(0.2);
    tess.add(b1, b2, b3);
    const b = 16, s = 9.6;
    const strut = new THREE.BufferGeometry();
    strut.setAttribute("position", new THREE.BufferAttribute(new Float32Array([b,b,b,s,s,s,-b,b,b,-s,s,s,b,-b,b,s,-s,s,-b,-b,b,-s,-s,s,b,b,-b,s,s,-s,-b,b,-b,-s,s,-s,b,-b,-b,s,-s,-s,-b,-b,-b,-s,-s,-s]), 3));
    tess.add(new THREE.LineSegments(strut, boxMat));

    const beamGeo = new THREE.CylinderGeometry(20, 2, 120, 32, 1, true);
    beamGeo.translate(0, 60, 0);
    const beamMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, hueShift: { value: 0 }, intensity: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec2 vUv; uniform float time, hueShift, intensity;
        vec3 hsl2rgb(vec3 c){ vec3 rgb=clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); return c.z+c.y*(rgb-0.5)*(1.0-abs(2.0*c.z-1.0)); }
        void main(){ float a=smoothstep(0.0,0.9,vUv.y)*intensity; float h=fract(vUv.x*0.6+time*0.3*0.2+hueShift); gl_FragColor=vec4(hsl2rgb(vec3(h,1.0,0.65)), a*0.5); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    scene.add(beam);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const core = new THREE.PointLight(0xffffff, 5, 200);
    embryo.add(core);

    // ===== Brain cortex enclosure (fills all empty space) =====
    const cortexMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, hue: { value: 0 }, glow: { value: 1 } },
      vertexShader: vsPos,
      fragmentShader: NOISE + `varying vec3 vP; uniform float time, hue, glow;
        void main(){ vec3 p=normalize(vP);
          float ridge=1.0-abs(fbm(p*5.0+vec3(0.0,time*0.01,0.0)));
          ridge=pow(ridge,6.0);
          float fold=1.0-abs(fbm(p*14.0+ridge));
          fold=pow(fold,8.0);
          float veins=pow(1.0-abs(noise(p*40.0+time*0.05)),20.0);
          vec3 tissue=mix(vec3(0.22,0.04,0.1),vec3(0.75,0.3,0.45),ridge);
          vec3 spec=spectrum(fract(ridge*0.7+fold*0.3+hue+time*0.015));
          vec3 c=tissue*0.6+spec*fold*0.55*glow+vec3(1.0,0.85,0.95)*veins*0.5*glow;
          gl_FragColor=vec4(c,1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const cortex = new THREE.Mesh(new THREE.SphereGeometry(1200, 96, 96), cortexMat);
    scene.add(cortex);
    // inner gyri layers — nested translucent folds for depth
    const gyri: THREE.Mesh[] = [];
    [180, 360, 620].forEach((rad, i) => {
      const m = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, hue: { value: i * 0.2 }, glow: { value: 1 } },
        vertexShader: vsPos,
        fragmentShader: NOISE + `varying vec3 vP; uniform float time, hue, glow;
          void main(){ vec3 p=normalize(vP); float f=pow(1.0-abs(fbm(p*${(8 + i * 4).toFixed(1)}+time*0.02)),10.0);
            vec3 c=spectrum(fract(f+hue+time*0.01)); gl_FragColor=vec4(c*glow*0.6, f*0.18); }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const g = new THREE.Mesh(new THREE.SphereGeometry(rad, 64, 64), m);
      gyri.push(g); scene.add(g);
    });

    // ===== Neural network: neurons + dendrites across all scales =====
    const NEU = 1400, neurons: THREE.Vector3[] = [];
    for (let i = 0; i < NEU; i++) {
      const r = 14 * Math.exp(Math.random() * Math.log(80)); // 14 → 1100, log-distributed
      const v = new THREE.Vector3().randomDirection().multiplyScalar(r);
      neurons.push(v);
    }
    const dPos: number[] = [], dCol: number[] = [], dPh: number[] = [];
    const c1 = new THREE.Color();
    neurons.forEach((a, i) => {
      for (let k = 0; k < 4; k++) {
        // connect to a nearby neuron with a curved dendrite (3 segments)
        let best = a, bd = Infinity;
        for (let t2 = 0; t2 < 24; t2++) { const b = neurons[(Math.random() * NEU) | 0]; const d = a.distanceTo(b); if (b !== a && d < bd) { bd = d; best = b; } }
        const mid = a.clone().lerp(best, 0.5).add(new THREE.Vector3().randomDirection().multiplyScalar(bd * 0.25));
        const pts = new THREE.QuadraticBezierCurve3(a, mid, best).getPoints(6);
        const hue = (a.length() / 1100 + Math.random() * 0.2) % 1;
        for (let s2 = 0; s2 < pts.length - 1; s2++) {
          dPos.push(pts[s2].x, pts[s2].y, pts[s2].z, pts[s2 + 1].x, pts[s2 + 1].y, pts[s2 + 1].z);
          c1.setHSL(hue + s2 * 0.02, 1, 0.6);
          dCol.push(c1.r, c1.g, c1.b, c1.r, c1.g, c1.b);
          const ph = Math.random() * 6.28 + i;
          dPh.push(ph + s2 * 0.4, ph + (s2 + 1) * 0.4);
        }
      }
    });
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute("position", new THREE.Float32BufferAttribute(dPos, 3));
    dGeo.setAttribute("color", new THREE.Float32BufferAttribute(dCol, 3));
    dGeo.setAttribute("phase", new THREE.Float32BufferAttribute(dPh, 1));
    const dendMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, glow: { value: 1 } },
      vertexShader: `attribute float phase; attribute vec3 color; varying vec3 vC; varying float vPh; void main(){ vC=color; vPh=phase; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vC; varying float vPh; uniform float time, glow; void main(){ float pulse=pow(0.5+0.5*sin(vPh-time*4.0),8.0); gl_FragColor=vec4(vC*(0.12+pulse*0.9)*glow, 0.12+pulse*0.5); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.LineSegments(dGeo, dendMat));
    // neuron somas
    const somaGeo = new THREE.BufferGeometry().setFromPoints(neurons);
    const somaCol = new Float32Array(NEU * 3);
    neurons.forEach((n, i) => { c1.setHSL((n.length() / 1100) % 1, 1, 0.7); somaCol.set([c1.r, c1.g, c1.b], i * 3); });
    somaGeo.setAttribute("color", new THREE.BufferAttribute(somaCol, 3));
    const somaMat = new THREE.PointsMaterial({ map: dot, size: 1.6, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    scene.add(new THREE.Points(somaGeo, somaMat));

    // ===== Multi-scale dust: cosmic → microscopic =====
    const makeDust = (count: number, rMin: number, rMax: number, size: number) => {
      const g = new THREE.BufferGeometry(), p = new Float32Array(count * 3), c = new Float32Array(count * 3);
      const v = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const r = rMin * Math.exp(Math.random() * Math.log(rMax / rMin));
        v.randomDirection().multiplyScalar(r); p.set([v.x, v.y, v.z], i * 3);
        c1.setHSL(Math.random(), 1, 0.55 + Math.random() * 0.3); c.set([c1.r, c1.g, c1.b], i * 3);
      }
      g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      g.setAttribute("color", new THREE.BufferAttribute(c, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({ map: dot, size, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.6, depthWrite: false }));
    };
    const cosmicDust = makeDust(40000, 15, 1100, 0.45);
    scene.add(cosmicDust);
    // microscopic interior of the globe: quantum foam that resolves when zoomed in
    const micro = new THREE.Group();
    embryo.add(micro);
    micro.add(makeDust(30000, 0.02, 11, 0.03));
    micro.add(makeDust(15000, 0.002, 1.5, 0.004));
    // micro neural lattice inside the core
    const mPos: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const a = new THREE.Vector3().randomDirection().multiplyScalar(0.05 * Math.exp(Math.random() * Math.log(200)));
      const b = a.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(a.length() * 0.3));
      mPos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute("position", new THREE.Float32BufferAttribute(mPos, 3));
    micro.add(new THREE.LineSegments(mGeo, new THREE.LineBasicMaterial({ color: 0xffccee, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));

    const cA = new THREE.Color(), cB = new THREE.Color(), tmp = new THREE.Color();
    const clock = new THREE.Clock();
    let t = 0, raf = 0, lastBeat = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const st = state.current, dt = clock.getDelta();
      t += dt * st.timeSpeed;
      const cur = ELEMENTS[st.element];
      const nxt = ELEMENTS[ORDER[(ORDER.indexOf(st.element) + 1) % ORDER.length]];

      // heartbeat visual (works with or without audio)
      const now = clock.elapsedTime, period = 60 / st.bpm;
      if (now - lastBeat > period) { lastBeat = now; st.pulse = 1; }
      st.pulse = Math.max(0, st.pulse - dt * 2.5);

      // element colors blended with superposition ψ
      cA.setHex(cur.wave); cB.setHex(nxt.wave);
      waveMat.color.lerp(tmp.copy(cA).lerp(cB, st.psi), 0.05);
      cA.setHex(cur.emissive); cB.setHex(nxt.emissive);
      waveMat.emissive.lerp(tmp.copy(cA).lerp(cB, st.psi), 0.05);
      gridMat.color.copy(waveMat.color).offsetHSL(0, 0, 0.2);

      pool.position.y = st.poolY;
      const wp = waveGeo.attributes.position;
      for (let i = 0; i < wp.count; i++) {
        const ox = base[i * 3], oy = base[i * 3 + 1];
        wp.setZ(i, (Math.sin(ox * 0.03 + t) * Math.cos(oy * 0.03 + t) + Math.sin(ox * 0.01 - t * 1.5) * 0.5) * st.waveAmp);
      }
      wp.needsUpdate = true;
      waveGeo.computeVertexNormals();

      const ps = 1 + st.pulse * 0.2;
      embryo.scale.setScalar(ps);
      echo.scale.setScalar(st.multiEcho);
      echoMat.opacity = 0.2 / st.multiEcho;

      const gp = gGeo.attributes.position as THREE.BufferAttribute, gc = gGeo.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < N; i++) {
        const j = (Math.random() - 0.5) * st.hyperVib * 2;
        gp.array[i * 3] = bPos[i * 3] + j; gp.array[i * 3 + 1] = bPos[i * 3 + 1] + j; gp.array[i * 3 + 2] = bPos[i * 3 + 2] + j;
        if ((i + Math.floor(t * 60)) % 30 === 0) {
          const pal = Math.random() < st.psi ? nxt.palette : cur.palette;
          const h = pal[pick[i] > 0.66 ? 0 : pick[i] > 0.33 ? 1 : 2];
          tmp.setHSL(h, 1, 0.65);
          gc.setXYZ(i, tmp.r, tmp.g, tmp.b);
        }
      }
      gp.needsUpdate = true; gc.needsUpdate = true;
      galaxy.rotation.y = t * 0.15; galaxy.rotation.z = t * 0.08;
      core.intensity = 3 + st.pulse * 5;

      tess.rotation.x = t * 0.2 * st.tesseractSpeed; tess.rotation.y = t * 0.3 * st.tesseractSpeed;
      b2.rotation.x = -t * 0.5 * st.tesseractSpeed; b2.rotation.y = -t * 0.4 * st.tesseractSpeed;
      b3.rotation.x = t * 0.8 * st.tesseractSpeed; b3.rotation.z = -t * 0.6 * st.tesseractSpeed;
      boxMat.opacity = 0.3 + Math.sin(t * 3) * 0.2;
      boxMat.color.setHSL(st.emanationHue / 360, 1, 0.8);

      beam.position.y = 12 * ps;
      beamMat.uniforms.time.value = t;
      beamMat.uniforms.hueShift.value = st.emanationHue / 360;
      beamMat.uniforms.intensity.value = st.beamIntensity + st.pulse * 0.5;

      const hueN = st.emanationHue / 360;
      globeMat.uniforms.time.value = t; globeMat.uniforms.hue.value = hueN;
      cortexMat.uniforms.time.value = t; cortexMat.uniforms.hue.value = hueN; cortexMat.uniforms.glow.value = st.density;
      gyri.forEach((g, i) => { g.material.uniforms.time.value = t; g.material.uniforms.glow.value = st.density; g.rotation.y = t * 0.01 * (i + 1); });
      dendMat.uniforms.time.value = t; dendMat.uniforms.glow.value = st.density;
      somaMat.size = 1.4 + st.pulse * 1.2;
      cosmicDust.rotation.y = t * 0.005;
      micro.rotation.x = t * 0.1; micro.rotation.y = -t * 0.07;
      // keep micro detail readable: scale point size with zoom distance
      const dist = camera.position.length();
      controls.zoomSpeed = dist < 15 ? 0.6 : 1.6;

      controls.update();
      renderer.render(scene, camera);
    };
    // initial colors
    for (let i = 0; i < N; i++) { tmp.setHSL(ELEMENTS.water.palette[i % 3], 1, 0.65); col.set([tmp.r, tmp.g, tmp.b], i * 3); }
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // free the GPU context so remounts never exhaust the browser limit
      el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => () => { audio.current?.Tone.Transport.stop(); audio.current?.dispose(); }, []);

  const enter = async () => {
    setEntered(true);
    try {
      const Tone = await import("tone");
      await Tone.start();
      Tone.Transport.bpm.value = state.current.bpm;
      const master = new Tone.Gain(muted ? 0 : state.current.master).toDestination();
      const droneG = new Tone.Gain(state.current.droneVol).connect(master);
      const harmG = new Tone.Gain(state.current.harmVol).connect(master);
      const heartG = new Tone.Gain(state.current.heartVol).connect(master);
      const lp = new Tone.Filter(400, "lowpass").connect(droneG);
      const rev = new Tone.Reverb(8).connect(lp);
      const drone = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 4, decay: 2, sustain: 1, release: 8 } }).connect(rev);
      drone.triggerAttack(["C2", "G2", "C3"]);
      const hp = new Tone.Filter(2000, "highpass").connect(harmG);
      const harm = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 2, decay: 1, sustain: 0.5, release: 4 } }).connect(new Tone.Reverb(4).connect(hp));
      harm.volume.value = -10;
      harm.triggerAttack(Tone.Frequency("C5").transpose(state.current.pitch5d).toNote());
      const heart = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 2, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1 } }).connect(heartG);
      Tone.Transport.scheduleRepeat((time) => { try { heart.triggerAttackRelease("C1", "16n", time + 0.01); } catch {} }, "4n");
      Tone.Transport.start();
      audio.current = { Tone, harm, master, drone: droneG, harmG, heartG, dispose: () => { drone.dispose(); harm.dispose(); heart.dispose(); } };
    } catch (e) { console.warn("audio unavailable", e); }
  };

  const cfg = ELEMENTS[element];
  const idx = ORDER.indexOf(element);

  return (
    <div className="sandbox-root">
      <div ref={mount} className="absolute inset-0" />
      {glError && (
        <div className="intro-overlay z-[60]">
          <h2 className="sandbox-title mb-2">3D view paused</h2>
          <p className="mb-6 max-w-sm px-6 text-center text-sm text-muted-foreground">Your browser ran out of graphics memory. Close other tabs, then reload.</p>
          <button onClick={() => window.location.reload()} className="enter-btn">RELOAD</button>
        </div>
      )}

      {entered && (
        <>
          <header className="sandbox-hud">
            <p className="sandbox-eyebrow">Pillar {idx + 1} / 5 · ψ = {ui.psi.toFixed(2)}</p>
            <h2 className="sandbox-title">{cfg.label}</h2>
            <p className="text-sm text-muted-foreground">{cfg.tagline}</p>
          </header>

          <nav className="sandbox-elements">
            {ORDER.map((k) => (
              <button key={k} onClick={() => pickElement(k)} data-active={k === element} className="sandbox-chip">
                <span className="opacity-60">{ELEMENTS[k].key}</span> {ELEMENTS[k].label}
              </button>
            ))}
          </nav>

          <button onClick={toggleMute} className="sandbox-toggle sandbox-mute" aria-label={muted ? "Unmute sound" : "Mute sound"}>
            {muted ? "🔇 Muted" : "🔊 Sound"}
          </button>
          <button onClick={() => setPanelOpen((o) => !o)} className="sandbox-toggle">
            {panelOpen ? "Close" : "Controls"}
          </button>

          <aside className="glass-panel" data-open={panelOpen}>
            <h3 className="sandbox-section mb-3 text-center">Master Controls</h3>
            {SLIDERS.map((g) => (
              <div key={g.group} className="mb-3 border-b border-border pb-2">
                <h4 className="sandbox-section">{g.group}</h4>
                {g.items.map((it) => (
                  <label key={it.k} className="block">
                    <span className="sandbox-label"><span>{it.label}</span><span>{ui[it.k]}{it.suffix ?? ""}</span></span>
                    <input type="range" className="glass-slider" min={it.min} max={it.max} step={it.step} value={ui[it.k]} onChange={(e) => set(it.k, parseFloat(e.target.value))} />
                  </label>
                ))}
              </div>
            ))}
          </aside>
        </>
      )}

      <div className="intro-overlay" data-hidden={entered}>
        <p className="sandbox-eyebrow mb-3">Elemental systems online</p>
        <h1 className="rainbow-text mb-4 text-center text-5xl font-black tracking-tighter md:text-7xl">5D GESTATION</h1>
        <p className="mb-8 max-w-lg px-6 text-center text-sm leading-relaxed text-muted-foreground">
          Navigate the nested Tesseract, bend the Wavepool of Time, and shift between the five elemental pillars — Water, Earth, Plasma, Air and Fire.
        </p>
        <button onClick={enter} className="enter-btn">ENTER THE FIRMAMENT</button>
        <p className="sandbox-eyebrow mt-6">Drag to rotate · Zoom from cosmos to microscopic · Sound on</p>
      </div>
    </div>
  );
}
