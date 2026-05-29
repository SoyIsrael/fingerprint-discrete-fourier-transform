// Orthonormal 2D DCT (Type-II forward, Type-III inverse), via row-column 1D DCT.
// Block sizes are small (N=8), so the O(N^3) direct evaluation per block is
// trivially fast. Kept direct (not via FFT) so the math stays readable.
//
// Scaling: X[0] uses alpha=sqrt(1/N), X[k>0] uses alpha=sqrt(2/N), applied per
// dimension. With this scaling the transform is unitary and forward-then-inverse
// is the identity up to floating-point roundoff.

function dct1d(input: Float64Array, N: number, offset: number, stride: number, out: Float64Array): void {
  const piOverN = Math.PI / N;
  const a0 = Math.sqrt(1 / N);
  const ak = Math.sqrt(2 / N);
  for (let k = 0; k < N; k++) {
    let s = 0;
    for (let n = 0; n < N; n++) {
      s += input[offset + n * stride] * Math.cos(piOverN * (n + 0.5) * k);
    }
    out[k] = s * (k === 0 ? a0 : ak);
  }
}

function idct1d(input: Float64Array, N: number, offset: number, stride: number, out: Float64Array): void {
  const piOverN = Math.PI / N;
  const a0 = Math.sqrt(1 / N);
  const ak = Math.sqrt(2 / N);
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (let k = 0; k < N; k++) {
      const alpha = k === 0 ? a0 : ak;
      s += input[offset + k * stride] * alpha * Math.cos(piOverN * (n + 0.5) * k);
    }
    out[n] = s;
  }
}

export function dct2d(block: Float64Array, N: number): Float64Array {
  const mid = new Float64Array(N * N);
  const row = new Float64Array(N);
  // Rows first
  for (let r = 0; r < N; r++) {
    dct1d(block, N, r * N, 1, row);
    for (let c = 0; c < N; c++) mid[r * N + c] = row[c];
  }
  const out = new Float64Array(N * N);
  const col = new Float64Array(N);
  // Then columns
  for (let c = 0; c < N; c++) {
    dct1d(mid, N, c, N, col);
    for (let r = 0; r < N; r++) out[r * N + c] = col[r];
  }
  return out;
}

export function idct2d(coef: Float64Array, N: number): Float64Array {
  const mid = new Float64Array(N * N);
  const row = new Float64Array(N);
  for (let r = 0; r < N; r++) {
    idct1d(coef, N, r * N, 1, row);
    for (let c = 0; c < N; c++) mid[r * N + c] = row[c];
  }
  const out = new Float64Array(N * N);
  const col = new Float64Array(N);
  for (let c = 0; c < N; c++) {
    idct1d(mid, N, c, N, col);
    for (let r = 0; r < N; r++) out[r * N + c] = col[r];
  }
  return out;
}
