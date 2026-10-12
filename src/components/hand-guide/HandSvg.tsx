import { FINGERS, type FingerId } from "../../types/gesture";

type Pt = readonly [number, number];

/** Geometri tangan kiri seperti terlihat di cermin (telapak menghadap kamera, ibu jari di kanan). */
const VIEW_W = 160;
const FINGER_GEOMETRY: Record<FingerId, { base: Pt; tip: Pt; touch: Pt }> = {
  index: { base: [106, 98], tip: [114, 36], touch: [126, 76] },
  middle: { base: [88, 94], tip: [90, 24], touch: [110, 72] },
  ring: { base: [69, 96], tip: [66, 32], touch: [94, 74] },
  pinky: { base: [51, 104], tip: [44, 54], touch: [80, 80] },
};
const THUMB_BASE: Pt = [112, 142];
const THUMB_TIP: Pt = [146, 104];
const THUMB_CTRL: Pt = [142, 128];

const COLORS = { left: "#4fd6c8", right: "#f0577a", spot: "#f6b73c", skin: "#1f2436", ink: "#eef1f8" };

export interface HandSvgProps {
  side: "left" | "right";
  /** Label per jari, urutan `FINGERS` (telunjuk, tengah, manis, kelingking). */
  labels: readonly string[];
  /** Jari yang sedang disentuh ibu jari, atau null. */
  active: FingerId | null;
  className?: string;
}

/**
 * Ilustrasi tangan SVG untuk panduan input "Jari": ibu jari bergerak menyentuh jari aktif,
 * dan label nada/pad ditulis di atas tiap jari. Tangan kanan adalah cermin tangan kiri.
 */
export function HandSvg({ side, labels, active, className }: HandSvgProps) {
  const color = COLORS[side];
  const mx = (p: Pt): Pt => (side === "left" ? p : [VIEW_W - p[0], p[1]]);
  const line = (a: Pt, b: Pt) => `M${mx(a).join(" ")} L${mx(b).join(" ")}`;
  const curve = (a: Pt, c: Pt, b: Pt) => `M${mx(a).join(" ")} Q${mx(c).join(" ")} ${mx(b).join(" ")}`;

  const fingerPath = (f: FingerId) => {
    const g = FINGER_GEOMETRY[f];
    // Jari aktif ditekuk ke arah ibu jari.
    return f === active ? curve(g.base, [g.base[0], g.base[1] - 42], g.touch) : line(g.base, g.tip);
  };
  const thumbPath = active
    ? curve(THUMB_BASE, THUMB_CTRL, FINGER_GEOMETRY[active].touch)
    : curve(THUMB_BASE, THUMB_CTRL, THUMB_TIP);
  const palm = side === "left" ? { x: 38, y: 88 } : { x: VIEW_W - 38 - 80, y: 88 };
  const shapes = (stroke: string, extra: number) => (
    <>
      <rect x={palm.x} y={palm.y} width={80} height={72} rx={24} fill={stroke} stroke={stroke} strokeWidth={extra} />
      <rect x={side === "left" ? 56 : VIEW_W - 56 - 50} y={150} width={50} height={40} fill={stroke} />
      {FINGERS.map((f) => (
        <path key={f} d={fingerPath(f)} stroke={stroke} strokeWidth={14 + extra} strokeLinecap="round" fill="none" />
      ))}
      <path d={thumbPath} stroke={stroke} strokeWidth={15 + extra} strokeLinecap="round" fill="none" />
    </>
  );
  const touch = active ? mx(FINGER_GEOMETRY[active].touch) : null;

  return (
    <svg viewBox={`0 -18 ${VIEW_W} 208`} className={className} role="img" aria-label={describe(side, labels, active)}>
      {/* Siluet: garis luar berwarna, lalu isi di atasnya. */}
      <g>{shapes(color, 4)}</g>
      <g>{shapes(COLORS.skin, 0)}</g>
      {touch && (
        <g>
          <circle cx={touch[0]} cy={touch[1]} r={13} fill={COLORS.spot} opacity={0.35}>
            <animate attributeName="r" values="10;16;10" dur="0.9s" repeatCount="indefinite" />
          </circle>
          <circle cx={touch[0]} cy={touch[1]} r={6} fill={COLORS.spot} />
        </g>
      )}
      {FINGERS.map((f, i) => {
        const [x, y] = mx(FINGER_GEOMETRY[f].tip);
        const label = labels[i] ?? "";
        const on = f === active;
        const w = Math.max(24, label.length * 6.4 + 10);
        return (
          <g key={f}>
            <rect
              x={x - w / 2}
              y={y - 30}
              width={w}
              height={17}
              rx={8.5}
              fill={on ? COLORS.spot : "#0c0e16"}
              stroke={on ? COLORS.spot : color}
              strokeOpacity={0.6}
            />
            <text
              x={x}
              y={y - 18}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={700}
              fill={on ? "#07080d" : COLORS.ink}
              fontFamily="ui-sans-serif, system-ui"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const FINGER_NAMES: Record<FingerId, string> = {
  index: "telunjuk",
  middle: "jari tengah",
  ring: "jari manis",
  pinky: "kelingking",
};

function describe(side: "left" | "right", labels: readonly string[], active: FingerId | null): string {
  const map = FINGERS.map((f, i) => `${FINGER_NAMES[f]} ${labels[i] ?? ""}`).join(", ");
  const now = active ? ` Ibu jari sedang menyentuh ${FINGER_NAMES[active]}.` : "";
  return `Tangan ${side === "left" ? "kiri" : "kanan"}: ${map}.${now}`;
}

/** Ilustrasi input "Posisi tangan": cubit ibu jari + telunjuk lalu geser kiri–kanan (atau ayun ke bawah untuk drum). */
export function PositionSvg({ drums, className }: { drums: boolean; className?: string }) {
  const c = COLORS.right;
  return (
    <svg
      viewBox="0 0 220 150"
      className={className}
      role="img"
      aria-label={
        drums
          ? "Arahkan tangan ke pad lalu ayunkan cepat ke bawah, atau cubit ibu jari dan telunjuk untuk mengetuk pad."
          : "Cubit ibu jari dan telunjuk untuk membunyikan nada, geser tangan ke kiri atau kanan untuk berganti nada."
      }
    >
      <defs>
        <marker id="pg-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={COLORS.spot} />
        </marker>
      </defs>
      {/* Tangan kecil yang mencubit. */}
      <g transform="translate(70 18) scale(0.5)">
        <HandSvgInline color={c} />
      </g>
      {drums ? (
        <path d="M170 30 L170 100" stroke={COLORS.spot} strokeWidth={4} markerEnd="url(#pg-arrow)" />
      ) : (
        <>
          <path d="M60 70 L20 70" stroke={COLORS.spot} strokeWidth={4} markerEnd="url(#pg-arrow)" />
          <path d="M160 70 L200 70" stroke={COLORS.spot} strokeWidth={4} markerEnd="url(#pg-arrow)" />
        </>
      )}
      {(drums ? ["Kick", "Snare", "Hi-hat", "Crash"] : ["C", "D", "E", "F", "G", "A", "B", "C"]).map((l, i, arr) => {
        const w = 200 / arr.length;
        return (
          <g key={i}>
            <rect x={10 + i * w + 1} y={122} width={w - 2} height={22} rx={5} fill="#161a28" stroke="#2b3249" />
            <text
              x={10 + i * w + w / 2}
              y={137}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill={COLORS.ink}
              fontFamily="ui-sans-serif, system-ui"
            >
              {l}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Tangan dengan telunjuk menempel ke ibu jari (cubit), untuk dipakai di dalam SVG lain. */
function HandSvgInline({ color }: { color: string }) {
  const g = FINGER_GEOMETRY;
  const shapes = (stroke: string, extra: number) => (
    <>
      <rect x={38} y={88} width={80} height={72} rx={24} fill={stroke} stroke={stroke} strokeWidth={extra} />
      <rect x={56} y={150} width={50} height={40} fill={stroke} />
      {FINGERS.map((f) => (
        <path
          key={f}
          d={
            f === "index"
              ? `M${g.index.base.join(" ")} Q${g.index.base[0]} ${g.index.base[1] - 42} ${g.index.touch.join(" ")}`
              : `M${g[f].base.join(" ")} L${g[f].tip.join(" ")}`
          }
          stroke={stroke}
          strokeWidth={14 + extra}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <path
        d={`M${THUMB_BASE.join(" ")} Q${THUMB_CTRL.join(" ")} ${g.index.touch.join(" ")}`}
        stroke={stroke}
        strokeWidth={15 + extra}
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
  return (
    <>
      <g>{shapes(color, 4)}</g>
      <g>{shapes(COLORS.skin, 0)}</g>
      <circle cx={g.index.touch[0]} cy={g.index.touch[1]} r={7} fill={COLORS.spot} />
    </>
  );
}
