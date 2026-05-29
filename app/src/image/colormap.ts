// Render a Float64Array into an ImageData with a chosen colormap.

export type ColorMap = "gray" | "viridis" | "hot";

// 16-stop viridis approximation (good enough for spectrum display).
const VIRIDIS: [number, number, number][] = [
  [68, 1, 84], [72, 26, 108], [71, 47, 125], [65, 68, 135],
  [57, 86, 140], [49, 104, 142], [42, 120, 142], [35, 136, 142],
  [31, 152, 139], [34, 168, 132], [53, 183, 121], [85, 198, 103],
  [122, 209, 81], [165, 219, 54], [210, 226, 27], [253, 231, 37],
];

function pickViridis(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t)) * (VIRIDIS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  if (i >= VIRIDIS.length - 1) return VIRIDIS[VIRIDIS.length - 1];
  const a = VIRIDIS[i], b = VIRIDIS[i + 1];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

function pickHot(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  // Black -> red -> yellow -> white
  const r = Math.min(1, x / 0.4) * 255;
  const g = Math.max(0, Math.min(1, (x - 0.4) / 0.4)) * 255;
  const b = Math.max(0, Math.min(1, (x - 0.8) / 0.2)) * 255;
  return [r, g, b];
}

export interface RenderOpts {
  cmap?: ColorMap;
  // Explicit min/max; if not given, auto from data.
  min?: number;
  max?: number;
  // Invert (so high values are dark). Useful when displaying error maps over a dark UI.
  invert?: boolean;
}

export function renderToImageData(
  data: Float64Array, w: number, h: number, opts: RenderOpts = {},
): ImageData {
  let { min, max } = opts;
  if (min === undefined || max === undefined) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min = min === undefined ? lo : min;
    max = max === undefined ? hi : max;
  }
  const range = max - min || 1;
  const cmap = opts.cmap ?? "gray";
  const img = new ImageData(w, h);
  for (let i = 0; i < data.length; i++) {
    let t = (data[i] - min) / range;
    if (opts.invert) t = 1 - t;
    let r: number, g: number, b: number;
    if (cmap === "viridis") {
      [r, g, b] = pickViridis(t);
    } else if (cmap === "hot") {
      [r, g, b] = pickHot(t);
    } else {
      const v = Math.max(0, Math.min(255, t * 255));
      r = g = b = v;
    }
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  return img;
}
