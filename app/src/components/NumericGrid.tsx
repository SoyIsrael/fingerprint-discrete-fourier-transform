// 8x8 numeric grid: shows the value in each cell with an optional heatmap
// background. Used for pixel blocks, DFT coefficient blocks, and the
// quantization table itself.

import { useMemo } from "react";

type AnyArray = Float64Array | Int32Array | number[];

export type GridCmap = "gray" | "viridis" | "hot" | "diverging";

interface Props {
  values: AnyArray;
  N: number;
  format?: (v: number) => string;
  cmap?: GridCmap;
  min?: number;          // explicit color domain min
  max?: number;          // explicit color domain max
  cellSize?: number;     // px
  emphasizeIndex?: number; // cell to outline (e.g. DC bin)
  selectedIndex?: number;  // cell to mark as "selected" (e.g. clicked)
  editable?: boolean;
  onChange?: (index: number, value: number) => void;
  onCellClick?: (index: number) => void;
}

const VIRIDIS: [number, number, number][] = [
  [68, 1, 84], [72, 26, 108], [71, 47, 125], [65, 68, 135],
  [57, 86, 140], [49, 104, 142], [42, 120, 142], [35, 136, 142],
  [31, 152, 139], [34, 168, 132], [53, 183, 121], [85, 198, 103],
  [122, 209, 81], [165, 219, 54], [210, 226, 27], [253, 231, 37],
];

function lerp3(a: [number, number, number], b: [number, number, number], f: number) {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f] as const;
}

function colorize(t: number, cmap: GridCmap): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  if (cmap === "gray") {
    const v = x * 255;
    return [v, v, v];
  }
  if (cmap === "hot") {
    const r = Math.min(1, x / 0.4) * 255;
    const g = Math.max(0, Math.min(1, (x - 0.4) / 0.4)) * 255;
    const b = Math.max(0, Math.min(1, (x - 0.8) / 0.2)) * 255;
    return [r, g, b];
  }
  if (cmap === "diverging") {
    // -1 blue, 0 neutral, +1 red
    const t2 = x * 2 - 1;
    if (t2 < 0) {
      const f = -t2;
      return [40 + (1 - f) * 215, 60 + (1 - f) * 195, 200];
    }
    return [200, 60 + (1 - t2) * 195, 40 + (1 - t2) * 215];
  }
  // viridis
  const xi = x * (VIRIDIS.length - 1);
  const i = Math.floor(xi);
  const f = xi - i;
  if (i >= VIRIDIS.length - 1) return VIRIDIS[VIRIDIS.length - 1];
  return lerp3(VIRIDIS[i], VIRIDIS[i + 1], f) as [number, number, number];
}

export function NumericGrid({
  values, N, format, cmap = "gray", min, max,
  cellSize = 36, emphasizeIndex, selectedIndex, editable, onChange, onCellClick,
}: Props) {
  const { lo, hi } = useMemo(() => {
    if (min !== undefined && max !== undefined) return { lo: min, hi: max };
    let l = Infinity, h = -Infinity;
    for (let i = 0; i < values.length; i++) {
      const v = values[i] as number;
      if (v < l) l = v;
      if (v > h) h = v;
    }
    return { lo: min ?? l, hi: max ?? h };
  }, [values, min, max]);
  const range = hi - lo || 1;
  const fmt = format ?? ((v: number) => Math.round(v).toString());
  const isDiverging = cmap === "diverging";

  return (
    <div
      className="inline-grid font-mono text-[10px] leading-none rounded overflow-hidden ring-1 ring-neutral-800"
      style={{
        gridTemplateColumns: `repeat(${N}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${N}, ${cellSize}px)`,
      }}
    >
      {Array.from({ length: N * N }, (_, i) => {
        const v = (values[i] as number) ?? 0;
        let t = (v - lo) / range;
        if (isDiverging) {
          const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
          t = (v / m + 1) / 2;
        }
        const [r, g, b] = colorize(t, cmap);
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const fg = luminance > 140 ? "#0a0a0a" : "#f5f5f5";
        const isEmph = emphasizeIndex === i;
        const isSelected = selectedIndex === i;
        const ring = isSelected
          ? "inset 0 0 0 3px #fbbf24"
          : isEmph
          ? "inset 0 0 0 2px #34d399"
          : undefined;
        const clickable = onCellClick && !editable;
        return editable ? (
          <input
            key={i}
            type="number"
            value={fmt(v)}
            onChange={(e) => onChange?.(i, parseFloat(e.target.value) || 0)}
            className="text-center bg-transparent outline-none border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-emerald-400 focus:z-10"
            style={{
              backgroundColor: `rgb(${r},${g},${b})`,
              color: fg,
              width: cellSize,
              height: cellSize,
              boxShadow: ring,
            }}
          />
        ) : (
          <div
            key={i}
            className={
              "flex items-center justify-center " +
              (clickable ? "cursor-pointer hover:brightness-110 transition" : "")
            }
            onClick={clickable ? () => onCellClick!(i) : undefined}
            style={{
              backgroundColor: `rgb(${r},${g},${b})`,
              color: fg,
              boxShadow: ring,
            }}
          >
            {fmt(v)}
          </div>
        );
      })}
    </div>
  );
}
