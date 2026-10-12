import { describe, expect, it } from "vitest";
import { syntheticLandmarks } from "../../test/hand-fixtures";
import { FINGERS, type FingerId, type Landmark } from "../../types/gesture";
import { FingerTouchDetector } from "./finger-touch";
import { FINGER_TIPS, handScale, LM } from "./landmarks";

const START = 0.35;
const RELEASE = 0.5;

/** Landmark dengan rasio jarak ibu jari → ujung tiap jari yang ditentukan (default jauh). */
function hand(ratios: Partial<Record<FingerId, number>>): Landmark[] {
  const lm = syntheticLandmarks(0.5, 0.5, 2);
  const scale = handScale(lm);
  const thumb = lm[LM.THUMB_TIP]!;
  FINGERS.forEach((f, i) => {
    const r = ratios[f] ?? 1.5;
    const angle = (i / FINGERS.length) * Math.PI * 2;
    lm[FINGER_TIPS[f]] = { x: thumb.x + Math.cos(angle) * r * scale, y: thumb.y + Math.sin(angle) * r * scale, z: 0 };
  });
  return lm;
}

function run(frames: Partial<Record<FingerId, number>>[]) {
  const d = new FingerTouchDetector();
  return frames.map((f) => d.update(hand(f), START, RELEASE));
}

describe("FingerTouchDetector", () => {
  it("sentuhan rapat langsung diterima", () => {
    expect(run([{ ring: 0.08, middle: 0.25 }])).toEqual([{ down: "ring" }]);
  });

  it("ibu jari yang lewat dekat jari tengah menuju jari manis tidak membunyikan jari tengah", () => {
    const changes = run([
      { middle: 0.3, ring: 0.45 }, // lewat dekat jari tengah (belum rapat)
      { middle: 0.28, ring: 0.2 }, // sekarang jari manis yang terdekat
      { middle: 0.27, ring: 0.1 }, // menempel di jari manis
    ]);
    const downs = changes.flatMap((c) => (c.down ? [c.down] : []));
    expect(downs).toEqual(["ring"]);
  });

  it("jari tengah dan manis sama-sama dekat: tidak berkedip bolak-balik", () => {
    const d = new FingerTouchDetector();
    d.update(hand({ ring: 0.05, middle: 0.22 }), START, RELEASE);
    expect(d.active).toBe("ring");
    // Derau landmark: jari tengah kadang tampak sedikit lebih dekat.
    for (const [ring, middle] of [
      [0.2, 0.16],
      [0.15, 0.2],
      [0.21, 0.14],
      [0.12, 0.18],
    ] as const) {
      expect(d.update(hand({ ring, middle }), START, RELEASE)).toEqual({});
    }
    expect(d.active).toBe("ring");
  });

  it("pindah dari jari tengah ke jari manis tanpa membuka tangan", () => {
    const d = new FingerTouchDetector();
    expect(d.update(hand({ middle: 0.05, ring: 0.25 }), START, RELEASE)).toEqual({ down: "middle" });
    // Ibu jari bergeser ke jari manis; jari tengah masih di dalam ambang lepas.
    expect(d.update(hand({ middle: 0.33, ring: 0.06 }), START, RELEASE)).toEqual({});
    expect(d.update(hand({ middle: 0.35, ring: 0.05 }), START, RELEASE)).toEqual({ up: "middle", down: "ring" });
  });

  it("sentuhan yang jelas (jari lain jauh) diterima di frame pertama", () => {
    // 0.28 belum "rapat", tetapi tidak ada jari lain yang dekat → tidak perlu menunggu konfirmasi.
    expect(run([{ index: 0.28 }])).toEqual([{ down: "index" }]);
  });

  it("sentuhan ambigu (dua jari sama-sama dekat) tetap menunggu konfirmasi", () => {
    expect(
      run([
        { middle: 0.28, ring: 0.36 },
        { middle: 0.28, ring: 0.36 },
      ]),
    ).toEqual([{}, { down: "middle" }]);
  });

  it("jari manis/kelingking punya ambang lebih longgar", () => {
    // 0.38 di atas ambang telunjuk/tengah (0.35) tetapi masih di bawah 0.35 × 1.15 untuk jari manis.
    expect(run([{ ring: 0.38 }, { ring: 0.38 }])).toContainEqual({ down: "ring" });
    expect(run([{ middle: 0.38 }, { middle: 0.38 }])).toEqual([{}, {}]);
  });

  it("lepas saat menjauh, dan reset melepas jari aktif", () => {
    const d = new FingerTouchDetector();
    d.update(hand({ index: 0.05 }), START, RELEASE);
    expect(d.update(hand({ index: 0.45 }), START, RELEASE)).toEqual({});
    expect(d.update(hand({ index: 0.6 }), START, RELEASE)).toEqual({ up: "index" });
    d.update(hand({ pinky: 0.05 }), START, RELEASE);
    expect(d.reset()).toEqual({ up: "pinky" });
    expect(d.active).toBeNull();
  });
});
