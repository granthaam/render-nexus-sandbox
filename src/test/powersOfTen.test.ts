import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { STAGES, stageRadius, clampStage, PowersOfTenController, positionAtRadius, stageKeyIndex, buildPowersOfTen } from '../layers/powersOfTen';
const engine = () => ({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(50, 1, .01, 1e6) });
describe('physical Powers of Ten ladder', () => {
  const radii = [1e-18, 1e-15, 1e-10, 2e-9, 1e-5, 1, 1e4, 6.37e6, 6.96e8, 4.5e12, 4.7e20, 4.4e26];
  radii.forEach((radius, i) => it(`uses the supplied radius for ${STAGES[i].label}`, () => expect(stageRadius(i)).toBe(radius)));
  it('starts at CITY and seeds the camera before the first frame', () => {
    const e = engine(), c = new PowersOfTenController(e);
    expect(c.index).toBe(6); expect(e.camera.position.length()).toBeCloseTo(36800, 6);
  });
  it('clamps and rounds stage requests', () => { expect(clampStage(-2)).toBe(0); expect(clampStage(20)).toBe(11); expect(clampStage(3.6)).toBe(4); });
  it('honors an instant jump to the current stage', () => {
    const c = new PowersOfTenController(engine()); c.jumpTo(0); c.jumpTo(0, { instant: true }); expect(c.distance / 1e-18).toBeCloseTo(3.68);
  });
  it('damps in log space at 3.5, not linear metres', () => {
    const c = new PowersOfTenController(engine(), 0); c.jumpTo(11); c.update(.1);
    const expected = Math.log(3.68e-18) + (Math.log(4.4e26 * 3.68) - Math.log(3.68e-18)) * (1 - Math.exp(-.35));
    expect(Math.log(c.distance)).toBeCloseTo(expected, 10);
  });
  it('is frame-rate independent', () => {
    const a = new PowersOfTenController(engine(), 0), b = new PowersOfTenController(engine(), 0); a.jumpTo(11); b.jumpTo(11);
    a.update(1); for (let n = 0; n < 100; n++) b.update(.01);
    expect(Math.log(a.distance)).toBeCloseTo(Math.log(b.distance), 10);
  });
  it('sets distance-relative clip planes at both extremes', () => {
    const e = engine(), c = new PowersOfTenController(e);
    for (const i of [0, 11]) { c.jumpTo(i, { instant: true }); expect(e.camera.near / c.distance).toBeCloseTo(.001, 12); expect(e.camera.far / c.distance).toBeCloseTo(1e5, 6); }
  });
  it('preserves even microscopic viewing directions', () => {
    const e = engine(), c = new PowersOfTenController(e, 0); e.camera.position.set(1e-18, 0, 0); c.jumpTo(11, { instant: true });
    expect(e.camera.position.clone().normalize().toArray()).toEqual([1, 0, 0]);
  });
  it('maps every physical radius to its ladder position', () => { radii.forEach((r, i) => expect(positionAtRadius(r)).toBeCloseTo(i)); });
  it('reserves the full number row for stage jumps', () => { '1234567890-='.split('').forEach((key, i) => expect(stageKeyIndex(key)).toBe(i)); expect(stageKeyIndex('b')).toBe(-1); });
  it('rebases render distance without discarding physical scale', () => {
    const e = engine(), c = new PowersOfTenController(e, 0, 9);
    for (const i of [0,11]) { c.jumpTo(i, { instant: true }); expect(e.camera.position.length()).toBeCloseTo(33.12); expect(c.radius / radii[i]).toBeCloseTo(1, 10); }
  });
  it('releases its scene layer', () => { const e = engine(), layer = buildPowersOfTen(e, 6, { renderRadius: 9 }); expect(e.scene.children).toContain(layer.object); layer.dispose(); expect(e.scene.children).not.toContain(layer.object); });
});
