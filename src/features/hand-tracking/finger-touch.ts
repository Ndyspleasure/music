import { FINGERS, type FingerId, type Landmark } from "../../types/gesture";
import { fingerTouchRatio } from "./landmarks";

/**
 * Pengali ambang per jari. Ibu jari sulit mencapai ujung jari manis/kelingking dengan
 * tepat (biasanya hanya bantalan jari yang bersentuhan), jadi ambangnya dilonggarkan.
 */
export const FINGER_REACH: Record<FingerId, number> = { index: 1, middle: 1, ring: 1.15, pinky: 1.2 };

/** Skor ternormalisasi di bawah ini = sentuhan rapat, langsung diterima tanpa konfirmasi. */
export const FINGER_LOCK_SCORE = 0.4;
/** Untuk pindah jari, skor kandidat harus lebih kecil dari skor jari aktif minus selisih ini. */
export const FINGER_SWITCH_MARGIN = 0.25;
/** Jumlah frame berturut-turut kandidat harus tetap terdekat sebelum diterima. */
export const FINGER_CONFIRM_FRAMES = 2;

export interface FingerTouchChange {
  up?: FingerId;
  down?: FingerId;
}

/**
 * Menentukan jari mana (telunjuk/tengah/manis/kelingking) yang menyentuh ibu jari.
 *
 * Skor tiap jari = rasio jarak ujung ibu jari–ujung jari ÷ (ambang mulai × jangkauan jari);
 * skor < 1 berarti di bawah ambang. Jari tengah dan manis secara anatomi bergerak bersama,
 * sehingga saat ibu jari menuju satu jari, jari sebelahnya ikut dekat. Untuk mencegah salah
 * pilih:
 * - Jari baru diterima bila skornya sangat kecil (sentuhan rapat) atau tetap menjadi yang
 *   terdekat selama beberapa frame. Ibu jari yang sekadar lewat di dekat jari lain tidak memicu nada.
 * - Pindah jari tanpa membuka tangan memakai selisih absolut + konfirmasi frame yang sama,
 *   sehingga tidak berkedip di antara dua jari yang sama-sama dekat.
 */
export class FingerTouchDetector {
  private activeFinger: FingerId | null = null;
  private pending: FingerId | null = null;
  private pendingFrames = 0;
  private lastScores: Record<FingerId, number> = { index: Infinity, middle: Infinity, ring: Infinity, pinky: Infinity };

  get active(): FingerId | null {
    return this.activeFinger;
  }

  /** Skor terakhir per jari (urutan `FINGERS`); < 1 = di bawah ambang mulai. */
  get scores(): Readonly<Record<FingerId, number>> {
    return this.lastScores;
  }

  reset(): FingerTouchChange {
    const up = this.activeFinger ?? undefined;
    this.activeFinger = null;
    this.clearPending();
    return up ? { up } : {};
  }

  update(lm: Landmark[], pinchStart: number, pinchRelease: number): FingerTouchChange {
    const scores = { ...this.lastScores };
    let candidate: FingerId = FINGERS[0]!;
    for (const f of FINGERS) {
      const r = fingerTouchRatio(lm, f);
      scores[f] = Number.isFinite(r) ? r / (pinchStart * FINGER_REACH[f]) : Infinity;
      if (scores[f] < scores[candidate]) candidate = f;
    }
    this.lastScores = scores;
    const change: FingerTouchChange = {};
    const releaseScore = pinchRelease / pinchStart;

    const current = this.activeFinger;
    if (current) {
      if (scores[current] > releaseScore) {
        change.up = current;
        this.activeFinger = null;
        this.clearPending();
        // Lanjut: jari lain yang sudah menempel rapat boleh langsung diterima di frame ini.
      } else {
        const better =
          candidate !== current && scores[candidate] < 1 && scores[candidate] < scores[current] - FINGER_SWITCH_MARGIN;
        if (!better) this.clearPending();
        else if (this.confirm(candidate)) {
          change.up = current;
          change.down = candidate;
          this.activeFinger = candidate;
          this.clearPending();
        }
        return change;
      }
    }

    if (scores[candidate] < 1) {
      if (scores[candidate] < FINGER_LOCK_SCORE || this.confirm(candidate)) {
        change.down = candidate;
        this.activeFinger = candidate;
        this.clearPending();
      }
    } else {
      this.clearPending();
    }
    return change;
  }

  private confirm(f: FingerId): boolean {
    if (this.pending === f) this.pendingFrames++;
    else {
      this.pending = f;
      this.pendingFrames = 1;
    }
    return this.pendingFrames >= FINGER_CONFIRM_FRAMES;
  }

  private clearPending(): void {
    this.pending = null;
    this.pendingFrames = 0;
  }
}
