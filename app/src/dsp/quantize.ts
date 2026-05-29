// DCT quantization: real-valued coefficients divided element-wise by a
// quantization table and rounded to integers. Table layout is the natural DCT
// layout (DC at [0,0], low frequencies in the top-left, high frequencies in
// the bottom-right) — same convention as JPEG.

export type QuantTable = Float64Array; // length N*N

export interface QuantParams {
  table: QuantTable;
  scale: number; // global multiplier on the table
  N: number;
}

// The JPEG-1992 standard luminance quantization table (Annex K). The familiar
// "low values in the top-left, high values in the bottom-right" matrix.
export function jpegLumaTable(): QuantTable {
  return new Float64Array([
    16, 11, 10, 16,  24,  40,  51,  61,
    12, 12, 14, 19,  26,  58,  60,  55,
    14, 13, 16, 24,  40,  57,  69,  56,
    14, 17, 22, 29,  51,  87,  80,  62,
    18, 22, 37, 56,  68, 109, 103,  77,
    24, 35, 55, 64,  81, 104, 113,  92,
    49, 64, 78, 87, 103, 121, 120, 101,
    72, 92, 95, 98, 112, 100, 103,  99,
  ]);
}

// Flat table: same value everywhere. Useful for showing uniform quantization.
export function flatTable(N: number, value = 16): QuantTable {
  const t = new Float64Array(N * N);
  t.fill(value);
  return t;
}

export interface QuantizedBlock {
  values: Int32Array; // length N*N, integer quantization indices
  retained: number;
}

export function quantizeBlock(coef: Float64Array, p: QuantParams): QuantizedBlock {
  const NN = p.N * p.N;
  const values = new Int32Array(NN);
  let retained = 0;
  for (let i = 0; i < NN; i++) {
    const q = p.table[i] * p.scale;
    values[i] = q > 0 ? Math.round(coef[i] / q) : Math.round(coef[i]);
    if (values[i] !== 0) retained++;
  }
  return { values, retained };
}

export function dequantizeBlock(q: QuantizedBlock, p: QuantParams): Float64Array {
  const NN = p.N * p.N;
  const out = new Float64Array(NN);
  for (let i = 0; i < NN; i++) {
    out[i] = q.values[i] * p.table[i] * p.scale;
  }
  return out;
}
