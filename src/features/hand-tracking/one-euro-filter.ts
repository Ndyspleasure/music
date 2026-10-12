/**
 * One Euro Filter (Casiez et al., 2012): low-pass adaptif. Halus saat gerakan lambat
 * (mengurangi jitter), responsif saat gerakan cepat (mengurangi lag).
 */
export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;
  public minCutoff: number;
  public beta: number;
  public dCutoff: number;

  constructor(minCutoff: number = 1.0, beta: number = 0.0, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  /** @param timestampMs waktu sampel dalam milidetik. */
  filter(value: number, timestampMs: number): number {
    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = value;
      this.tPrev = timestampMs;
      return value;
    }
    const dt = Math.max(1e-3, (timestampMs - this.tPrev) / 1000);
    this.tPrev = timestampMs;
    const dx = (value - this.xPrev) / dt;
    const edx = lerp(this.dxPrev, dx, alpha(this.dCutoff, dt));
    this.dxPrev = edx;
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const result = lerp(this.xPrev, value, alpha(cutoff, dt));
    this.xPrev = result;
    return result;
  }
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
