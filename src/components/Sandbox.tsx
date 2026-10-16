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

const DEFAULTS = { timeSpeed: 1, tesseractSpeed: 1, hyperVib: 0, multiEcho: 1, waveAmp: 6, emanationHue: 200, beamIntensity: 1.5, psi: 0, bpm: 55, pitch5d: 0, density: 1, master: 0.8, droneVol: 0.7, harmVol: 0.5, heartVol: 0.8 };
type S = typeof DEFAULTS;

const SLIDERS: { group: string; items: { k: keyof S; label: string; min: number; max: number; step: number; suffix?: string }[] }[] = [
  { group: "⧖ 4D Time", items: [
    { k: "timeSpeed", label: "Time Flow", min: 0, max: 5, step: 0.1, suffix: "x" },
    { k: "tesseractSpeed", label: "Tesseract Morph", min: 0, max: 5, step: 0.1 } ] },
  { group: "✧ 5D Hyper", items: [
    { k: "hyperVib", label: "Hyper-Vibration", min: 0, max: 3, step: 0.1 },
    { k: "multiEcho", label: "Multiverse Echo", min: 1, max: 4, step: 0.1 },
    { k: "psi", label: "Superposition ψ", min: 0, max: 1, step: 0.01 } ] },
  { group: "≈ Inner Wave Function", items: [
    { k: "waveAmp", label: "Wave Amplitude", min: 0, max: 20, step: 0.5 } ] },
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
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.005, 4000);
    // Close framing: globe + tesseract fill the view, beam rising above
    const portrait = el.clientHeight > el.clientWidth;
    camera.position.set(0, 4, portrait ? 46 : 34);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false });
    } catch (err) {
      console.warn("WebGL unavailable", err);
      setGlError(true);
      return;
    }
    renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (!disposed) setGlError(true); });
    let disposed = false;
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 6, 0);
    controls.maxDistance = 900;
    controls.minDistance = 0.05;
    controls.zoomSpeed = 1.6;

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
          gl_FragColor=vec4(c*0.9+spec*rim*0.9, 0.12+rim*0.75); }`,
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

    // ===== Wave function: the old wavepool's interference law, now the physics of the inner universe =====
    const WAVE = `uniform float wt, wamp, wfreq, wlim; uniform vec3 wtint;
      vec3 wave(vec3 p){
        float z1 = sin(p.x*wfreq + wt) * cos(p.z*wfreq + wt);
        float z2 = sin(p.x*wfreq*0.33 - wt*1.5) * 0.5;
        float z3 = sin(p.y*wfreq*0.7 + wt*0.8) * cos(p.x*wfreq*0.5 - wt) * 0.4;
        p.y += (z1 + z2) * wamp;
        p.xz += vec2(z3, -z3) * wamp * 0.5;
        float L = length(p); if (L > wlim) p *= wlim / L;
        return p; }`;
    const waveUniforms = (freq: number, lim: number, ampScale: number) => ({
      wt: { value: 0 }, wamp: { value: 0 }, wfreq: { value: freq }, wlim: { value: lim }, wtint: { value: new THREE.Color(0x00aaff) }, ampScale,
    });
    const waveMats: { mat: THREE.ShaderMaterial; ampScale: number }[] = [];
    const pointsMat = (size: number, freq: number, lim: number, ampScale: number, opacity = 0.7) => {
      const u = waveUniforms(freq, lim, ampScale);
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...u, map: { value: dot }, psize: { value: size }, op: { value: opacity }, glow: { value: 1 } },
        vertexShader: WAVE + `attribute vec3 color; varying vec3 vC; uniform float psize;
          void main(){ vC = mix(color, wtint, 0.3); vec4 mv = modelViewMatrix * vec4(wave(position), 1.0);
            gl_PointSize = clamp(psize * 900.0 / -mv.z, 1.0, 24.0); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D map; uniform float op, glow; varying vec3 vC;
          void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vC * glow, a * op); }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      waveMats.push({ mat, ampScale });
      return mat;
    };
    // Macroverse lives inside the globe: 1100 local units mapped into an 11.5 radius
    const universe = new THREE.Group();
    universe.scale.setScalar(11.5 / 1100);
    embryo.add(universe);

    // ===== Neural network: neurons + dendrites across all scales =====
    const NEU = 1400, neurons: THREE.Vector3[] = [];
    for (let i = 0; i < NEU; i++) {
      const r = 1 * Math.exp(Math.random() * Math.log(1100)); // 1 → 1100, macro → micro
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
      uniforms: { time: { value: 0 }, glow: { value: 1 }, ...waveUniforms(0.012, 1120, 6) },
      vertexShader: WAVE + `attribute float phase; attribute vec3 color; varying vec3 vC; varying float vPh; void main(){ vC=mix(color, wtint, 0.25); vPh=phase; gl_Position=projectionMatrix*modelViewMatrix*vec4(wave(position),1.0); }`,
      fragmentShader: `varying vec3 vC; varying float vPh; uniform float time, glow; void main(){ float pulse=pow(0.5+0.5*sin(vPh-time*4.0),8.0); gl_FragColor=vec4(vC*(0.12+pulse*0.9)*glow, 0.12+pulse*0.5); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    waveMats.push({ mat: dendMat, ampScale: 6 });
    universe.add(new THREE.LineSegments(dGeo, dendMat));
    // neuron somas
    const somaGeo = new THREE.BufferGeometry().setFromPoints(neurons);
    const somaCol = new Float32Array(NEU * 3);
    neurons.forEach((n, i) => { c1.setHSL((n.length() / 1100) % 1, 1, 0.7); somaCol.set([c1.r, c1.g, c1.b], i * 3); });
    somaGeo.setAttribute("color", new THREE.BufferAttribute(somaCol, 3));
    const somaMat = pointsMat(0.06, 0.012, 1120, 6, 0.95);
    universe.add(new THREE.Points(somaGeo, somaMat));

    // ===== Multi-scale dust: cosmic → microscopic =====
    const makeDust = (count: number, rMin: number, rMax: number, size: number, freq = 0.012, lim = 1120, ampScale = 6) => {
      const g = new THREE.BufferGeometry(), p = new Float32Array(count * 3), c = new Float32Array(count * 3);
      const v = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const r = rMin * Math.exp(Math.random() * Math.log(rMax / rMin));
        v.randomDirection().multiplyScalar(r); p.set([v.x, v.y, v.z], i * 3);
        c1.setHSL(Math.random(), 1, 0.55 + Math.random() * 0.3); c.set([c1.r, c1.g, c1.b], i * 3);
      }
      g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      g.setAttribute("color", new THREE.BufferAttribute(c, 3));
      return new THREE.Points(g, pointsMat(size, freq, lim, ampScale, 0.6));
    };
    const cosmicDust = makeDust(45000, 1, 1100, 0.02);
    universe.add(cosmicDust);
    // microscopic interior of the globe: quantum foam that resolves when zoomed in
    const micro = new THREE.Group();
    embryo.add(micro);
    micro.add(makeDust(25000, 0.02, 1.2, 0.004, 1.2, 1.25, 0.05));
    micro.add(makeDust(15000, 0.002, 0.15, 0.0008, 12, 0.16, 0.005));
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

      // element tint + wave physics fed to every inner structure
      cA.setHex(cur.wave); cB.setHex(nxt.wave); tmp.copy(cA).lerp(cB, st.psi);
      waveMats.forEach(({ mat, ampScale }) => {
        mat.uniforms.wt.value = t; mat.uniforms.wamp.value = st.waveAmp * ampScale;
        mat.uniforms.wtint.value.lerp(tmp, 0.05);
        if (mat.uniforms.glow) mat.uniforms.glow.value = st.density;
      });
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
      dendMat.uniforms.time.value = t; dendMat.uniforms.glow.value = st.density;
      somaMat.uniforms.psize.value = 0.05 + st.pulse * 0.04;
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
      disposed = true;
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
          Navigate the nested Tesseract, travel from the macroverse to the microverse inside the wave-driven globe, and shift between the five elemental pillars — Water, Earth, Plasma, Air and Fire.
        </p>
        <button onClick={enter} className="enter-btn">ENTER THE FIRMAMENT</button>
        <p className="sandbox-eyebrow mt-6">Drag to rotate · Zoom from cosmos to microscopic · Sound on</p>
      </div>
    </div>
  );
}
