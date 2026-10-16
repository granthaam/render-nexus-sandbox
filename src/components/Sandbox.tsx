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

const DEFAULTS = { timeSpeed: 1, tesseractSpeed: 1, hyperVib: 0, multiEcho: 1, waveAmp: 6, poolY: -15, emanationHue: 200, beamIntensity: 1.5, psi: 0, bpm: 55, pitch5d: 0 };
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
];

export default function Sandbox() {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef<S & { element: ElementKey; pulse: number }>({ ...DEFAULTS, element: "water", pulse: 0 });
  const [ui, setUi] = useState<S>(DEFAULTS);
  const [element, setElement] = useState<ElementKey>("water");
  const [entered, setEntered] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const audio = useRef<any>(null);

  const set = (k: keyof S, v: number) => {
    state.current[k] = v;
    setUi((u) => ({ ...u, [k]: v }));
    const a = audio.current;
    if (!a) return;
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
    scene.fog = new THREE.FogExp2(0x050510, 0.008);
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.set(0, 30, el.clientWidth < 600 ? 120 : 90);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 160;
    controls.minDistance = 30;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;

    const waveGeo = new THREE.PlaneGeometry(400, 400, 120, 120);
    const base = new Float32Array(waveGeo.attributes.position.array);
    const waveMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x002255, emissiveIntensity: 0.8, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.9, side: THREE.DoubleSide });
    const pool = new THREE.Mesh(waveGeo, waveMat);
    pool.rotation.x = -Math.PI / 2;
    scene.add(pool);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending });
    pool.add(new THREE.Mesh(waveGeo, gridMat));

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
    const galaxy = new THREE.Points(gGeo, new THREE.PointsMaterial({ size: 0.35, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    embryo.add(galaxy);

    const sacGeo = new THREE.SphereGeometry(12, 48, 48);
    embryo.add(new THREE.Mesh(sacGeo, new THREE.MeshPhysicalMaterial({ transmission: 1, transparent: true, roughness: 0.1, ior: 1.8, thickness: 1, emissive: 0x220044, emissiveIntensity: 0.2 })));
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
      const lp = new Tone.Filter(400, "lowpass").toDestination();
      const rev = new Tone.Reverb(8).connect(lp);
      const drone = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 4, decay: 2, sustain: 1, release: 8 } }).connect(rev);
      drone.triggerAttack(["C2", "G2", "C3"]);
      const hp = new Tone.Filter(2000, "highpass").toDestination();
      const harm = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 2, decay: 1, sustain: 0.5, release: 4 } }).connect(new Tone.Reverb(4).connect(hp));
      harm.volume.value = -10;
      harm.triggerAttack(Tone.Frequency("C5").transpose(state.current.pitch5d).toNote());
      const heart = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 2, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1 } }).toDestination();
      new Tone.Loop((time) => { heart.triggerAttackRelease("C1", "8n", time); heart.triggerAttackRelease("C1", "8n", time + 0.2); }, "4n").start(0);
      Tone.Transport.start();
      audio.current = { Tone, harm, dispose: () => { drone.dispose(); harm.dispose(); heart.dispose(); } };
    } catch (e) { console.warn("audio unavailable", e); }
  };

  const cfg = ELEMENTS[element];
  const idx = ORDER.indexOf(element);

  return (
    <div className="sandbox-root">
      <div ref={mount} className="absolute inset-0" />

      {entered && (
        <>
          <header className="absolute left-4 top-4 z-10 max-w-[60%]">
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
        <p className="sandbox-eyebrow mt-6">Drag to rotate · Pinch / scroll to zoom · Sound on</p>
      </div>
    </div>
  );
}
