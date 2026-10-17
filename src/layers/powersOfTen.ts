import * as THREE from 'three';
import { buildStageGeometry } from '../components/powersOfTen';

export interface Stage { id: string; label: string; radius: number; blurb: string }
export const STAGES: Stage[] = [
  { id: 'quark', label: 'QUARKS', radius: 1e-18, blurb: '10⁻¹⁸ m — quark confinement scale' },
  { id: 'proton', label: 'NUCLEUS', radius: 1e-15, blurb: '10⁻¹⁵ m — proton radius' },
  { id: 'atom', label: 'ATOM', radius: 1e-10, blurb: '10⁻¹⁰ m — hydrogen ground state' },
  { id: 'dna', label: 'DNA', radius: 2e-9, blurb: '2 × 10⁻⁹ m — double helix width' },
  { id: 'cell', label: 'CELL', radius: 1e-5, blurb: '10⁻⁵ m — typical eukaryotic cell' },
  { id: 'human', label: 'HUMAN', radius: 1, blurb: '10⁰ m — the picnic blanket' },
  { id: 'city', label: 'CITY', radius: 1e4, blurb: '10⁴ m — metropolitan extent' },
  { id: 'earth', label: 'EARTH', radius: 6.37e6, blurb: '10⁷ m — planetary radius' },
  { id: 'sun', label: 'SUN', radius: 6.96e8, blurb: '10⁹ m — stellar radius' },
  { id: 'system', label: 'SOLAR SYSTEM', radius: 4.5e12, blurb: '10¹³ m — heliopause' },
  { id: 'galaxy', label: 'GALAXY', radius: 4.7e20, blurb: '10²¹ m — Milky Way radius' },
  { id: 'cosmic', label: 'COSMIC WEB', radius: 4.4e26, blurb: '10²⁷ m — observable universe' },
];
export const clampStage = (i: number) => Math.max(0, Math.min(11, Math.round(Number.isFinite(i) ? i : 6)));
export const stageRadius = (i: number) => STAGES[clampStage(i)]?.radius ?? 1e4;
export const stageKeyIndex = (key: string) => '1234567890-='.indexOf(key);
const DIST_FACTOR = 3.2 * 1.15;
const LOGS = STAGES.map(s => Math.log(s.radius));
export function positionAtRadius(radius: number) {
  const log = Math.log(Math.max(1e-18, radius));
  for (let i = 0; i < LOGS.length - 1; i++) {
    const lower = LOGS[i], upper = LOGS[i + 1];
    if (lower === undefined || upper === undefined) continue;
    if (log <= upper) return Math.max(0, i + (log - lower) / (upper - lower));
  }
  return 11;
}
export interface Engine { camera: THREE.PerspectiveCamera; scene: THREE.Scene }
export class PowersOfTenController {
  index: number;
  private currentLogDist: number;
  private targetLogDist: number;
  private dir = new THREE.Vector3(0, .35, 1).normalize();
  private targetPoint = new THREE.Vector3();
  private currentPoint = new THREE.Vector3();
  /** Render rebasing keeps float32 shaders near the origin; physical distance stays in JS doubles. */
  constructor(private engine: Engine, startIndex = 6, private renderRadius?: number, public fit = 1) {
    this.index = clampStage(startIndex);
    this.currentLogDist = this.targetLogDist = Math.log(stageRadius(this.index) * DIST_FACTOR);
    this.apply();
  }
  get distance() { return Math.exp(this.currentLogDist); }
  get radius() { return this.distance / DIST_FACTOR; }
  get position() { return positionAtRadius(this.radius); }
  get position01() { return this.position / 11; }
  get transitioning() { return Math.abs(this.targetLogDist - this.currentLogDist) > .001; }
  get renderDistance() { return this.renderRadius === undefined ? this.distance : this.renderRadius * DIST_FACTOR * this.fit; }
  jumpTo(i: number, opts: { instant?: boolean } = {}) {
    this.index = clampStage(i);
    this.dir.copy(this.engine.camera.position).sub(this.currentPoint);
    if (!Number.isFinite(this.dir.lengthSq()) || this.dir.lengthSq() === 0) this.dir.set(0, .35, 1);
    this.dir.normalize();
    this.targetLogDist = Math.log(stageRadius(this.index) * DIST_FACTOR);
    if (opts.instant) { this.currentLogDist = this.targetLogDist; this.currentPoint.copy(this.targetPoint); this.apply(); }
  }
  step(delta: number) { this.jumpTo(this.index + delta); }
  /** Adopt a user orbit/pinch before rebasing the camera again. */
  adoptCamera() {
    const offset = this.engine.camera.position.clone().sub(this.currentPoint);
    const ratio = offset.length() / this.renderDistance;
    if (Number.isFinite(ratio) && ratio > 0) {
      this.currentLogDist = THREE.MathUtils.clamp(this.currentLogDist + Math.log(ratio), Math.log(1e-18 * DIST_FACTOR), Math.log(4.4e26 * DIST_FACTOR));
      this.targetLogDist = this.currentLogDist;
      this.index = clampStage(this.position);
      this.dir.copy(offset).normalize();
    }
  }
  update(dt: number) {
    const k = 1 - Math.exp(-Math.max(0, Number.isFinite(dt) ? dt : 0) * 3.5);
    this.currentLogDist += (this.targetLogDist - this.currentLogDist) * k;
    this.currentPoint.lerp(this.targetPoint, k);
    this.apply();
  }
  private apply() {
    const cam = this.engine.camera, dist = this.renderDistance;
    cam.position.copy(this.dir).multiplyScalar(dist).add(this.currentPoint);
    cam.near = dist * 1e-3; cam.far = dist * 1e5;
    cam.updateProjectionMatrix(); cam.lookAt(this.currentPoint);
  }
}

/** Stylized astronomical point illustrations, not literal metre-scale meshes. */
function cosmicGeometry(stage: number) {
  const p: number[] = [], c: number[] = [], color = new THREE.Color();
  const add = (x: number, y: number, z: number, hue: number, light = .65) => { p.push(x, y, z); color.setHSL(hue, .85, light); c.push(color.r, color.g, color.b); };
  for (let i = 0; i < 16000; i++) {
    const a = i * 2.399963, r = Math.sqrt(Math.random());
    if (stage === 8) {
      const v = new THREE.Vector3().randomDirection(); const rr = .7 + .08 * Math.sin(v.x * 32) * Math.sin(v.y * 29);
      add(v.x * rr, v.y * rr, v.z * rr, .05 + Math.random() * .1, .5 + Math.random() * .3);
    } else if (stage === 9) {
      const orbit = i % 8, rr = .12 + orbit * .11;
      add(Math.cos(a) * rr, (Math.random() - .5) * .012, Math.sin(a) * rr, orbit / 10);
      if (i < 2000) { const v = new THREE.Vector3().randomDirection().multiplyScalar(.065); add(v.x, v.y, v.z, .1); }
    } else if (stage === 10) {
      const angle = r * 10 + (i % 4) * Math.PI / 2 + (Math.random() - .5) * .4;
      add(Math.cos(angle) * r, (Math.random() - .5) * .08 * (1 - r), Math.sin(angle) * r, .52 + r * .35);
    } else {
      const strand = i % 28, t = (i / 28 % 570) / 570, phase = strand * 2.399;
      const x = Math.sin(phase * 3) * .8, y = Math.cos(phase * 2) * .8, z = Math.sin(phase) * .8;
      const next = phase + 2.399;
      add(x * (1-t) + Math.sin(next * 3) * .8 * t + (Math.random()-.5)*.025,
        y * (1-t) + Math.cos(next * 2) * .8 * t + Math.sin(t * Math.PI)*.12,
        z * (1-t) + Math.sin(next) * .8 * t + (Math.random()-.5)*.025, .5 + strand / 90);
    }
  }
  const points = new THREE.BufferGeometry(); points.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); points.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  return { points, lines: new THREE.BufferGeometry(), flat: stage === 9 || stage === 10 };
}
export function buildPowersOfTen(engine: Engine, startIndex = 6, options: { dot?: THREE.Texture; renderRadius?: number; fit?: number } = {}) {
  const group = new THREE.Group(); group.name = 'powersOfTen'; engine.scene.add(group);
  const controller = new PowersOfTenController(engine, startIndex, options.renderRadius, options.fit);
  const mapping = [11, 10, 9, 7, 6, 3, 2, 0];
  const layers = STAGES.map((_, i) => {
    const source = mapping[i];
    const geo = source === undefined ? cosmicGeometry(i) : buildStageGeometry(source);
    const object = new THREE.Group();
    const pm = new THREE.PointsMaterial({ map: options.dot ?? null, size: .06, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const lm = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    object.add(new THREE.Points(geo.points, pm));
    if (geo.lines.getAttribute('position')) object.add(new THREE.LineSegments(geo.lines, lm));
    if (geo.flat) object.rotation.x = .5;
    group.add(object); return { object, pm, lm, geo };
  });
  return { name: 'powersOfTen', object: group, controller,
    jumpTo: (i: number) => controller.jumpTo(i),
    update(t: number, dt: number) {
      controller.update(dt);
      const pos = controller.position;
      layers.forEach((l, i) => {
        const weight = Math.max(0, 1 - Math.abs(i - pos));
        l.object.visible = weight > .001;
        // Bounded visual crossfade bridges enormous physical gaps without a blank frame.
        const radius = options.renderRadius ?? controller.radius;
        l.object.scale.setScalar(radius * Math.exp(THREE.MathUtils.clamp(i - pos, -.5, .5)) * .85);
        l.pm.size = radius * .025; l.pm.opacity = weight; l.lm.opacity = weight * .8;
        l.object.rotation.y = t * (.03 + i * .006);
      });
    },
    dispose() { engine.scene.remove(group); layers.forEach(l => { l.geo.points.dispose(); l.geo.lines.dispose(); l.pm.dispose(); l.lm.dispose(); }); },
  };
}
