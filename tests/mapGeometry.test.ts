import { describe, expect, it } from "vitest";
import {
  placeMapCallout,
  hasMapPosition,
  matchesMapRoles,
} from "../src/lib/mapGeometry";

describe("map callout geometry", () => {
  it("flips a top pin below and clamps horizontally", () => {
    const p = placeMapCallout({ x: 4, y: 50 }, 390, 530, 252, 300);
    expect(p.left).toBe(10);
    expect(p.top).toBe(60);
    expect(p.below).toBe(true);
    expect(p.tailLeft).toBeGreaterThanOrEqual(18);
  });
  it("places a low pin above and handles the right edge", () => {
    const p = placeMapCallout({ x: 385, y: 490 }, 390, 530, 252, 300);
    expect(p.left + p.width).toBeLessThanOrEqual(380);
    expect(p.top + p.maxHeight).toBeLessThan(490);
    expect(p.below).toBe(false);
  });
  it.each([
    [320, 240, 160, 120],
    [240, 180, 120, 50],
    [390, 150, 190, 75],
  ])("fits short map %sx%s", (w, h, x, y) => {
    const p = placeMapCallout({ x, y }, w, h, 252, 500);
    expect(p.left).toBeGreaterThanOrEqual(10);
    expect(p.top).toBeGreaterThanOrEqual(10);
    expect(p.left + p.width).toBeLessThanOrEqual(w - 10);
    expect(p.top + p.maxHeight).toBeLessThanOrEqual(h - 10);
  });
  it("hides off-map anchors instead of a detached popup", () => {
    expect(
      placeMapCallout({ x: -60, y: 100 }, 390, 530, 252, 300).visible,
    ).toBe(false);
  });
});
describe("safe coordinates and role filtering", () => {
  it("accepts real zero latitude but never missing or 0,0 coordinates", () => {
    expect(hasMapPosition({ latitude: 0, longitude: 30 })).toBe(true);
    expect(hasMapPosition({ latitude: 0, longitude: 0 })).toBe(false);
    expect(hasMapPosition({ latitude: 91, longitude: 120 })).toBe(false);
    expect(hasMapPosition({ latitude: 37 })).toBe(false);
  });
  it("All means all selected roles, not every role in the database", () => {
    expect(matchesMapRoles("간호사", ["치과위생사"], null)).toBe(false);
    expect(matchesMapRoles("치과위생사", ["치과위생사", "간호사"], null)).toBe(
      true,
    );
    expect(
      matchesMapRoles("간호사", ["치과위생사", "간호사"], "치과위생사"),
    ).toBe(false);
    expect(matchesMapRoles("간호사", [], null)).toBe(true);
  });
});
