import { describe, expect, it, vi } from "vitest";
import { buildBirthdayField } from "../birthdayField";

describe("birthday point field", () => {
  it("builds the supplied 300×300 grid across a 20m plane", () => {
    const field = buildBirthdayField();
    const pos = field.mesh.geometry.getAttribute("position");
    expect(pos.count).toBe(90000);
    expect([pos.getX(0), pos.getY(0), pos.getZ(0)]).toEqual([-10, -10, 0]);
    expect([pos.getX(89999), pos.getY(89999), pos.getZ(89999)]).toEqual([10, 10, 0]);
    field.dispose();
  });
  it("defaults to five repeats", () => {
    const field = buildBirthdayField({ gridResolution: 2 });
    expect(field.uniforms.uIterations.value).toBe(5);
    field.dispose();
  });
  it("uses scaling k of 1.13", () => {
    const field = buildBirthdayField({ gridResolution: 2 });
    expect(field.uniforms.uK.value).toBe(1.13);
    field.setK(1.5);
    expect(field.uniforms.uK.value).toBe(1.5);
    field.dispose();
  });
  it("scales scene seconds by 0.1 and allows pausing", () => {
    const field = buildBirthdayField({ gridResolution: 2 });
    field.update(10);
    expect(field.uniforms.uTime.value).toBe(1);
    field.setTimeScale(0);
    field.update(20);
    expect(field.uniforms.uTime.value).toBe(0);
    field.dispose();
  });
  it("uses point radius 0.05", () => {
    const field = buildBirthdayField({ gridResolution: 2 });
    expect(field.uniforms.uPointSize.value).toBe(0.05);
    field.dispose();
  });
  it("bounds the repeat loop from one through eight", () => {
    const field = buildBirthdayField({ gridResolution: 2, iterations: 99 });
    expect(field.uniforms.uIterations.value).toBe(8);
    field.setIterations(-1);
    expect(field.uniforms.uIterations.value).toBe(1);
    field.dispose();
  });
  it("releases both GPU resources", () => {
    const field = buildBirthdayField({ gridResolution: 2 });
    const geo = vi.spyOn(field.mesh.geometry, "dispose");
    const mat = vi.spyOn(field.mesh.material, "dispose");
    field.dispose();
    expect(geo).toHaveBeenCalledOnce();
    expect(mat).toHaveBeenCalledOnce();
  });
});