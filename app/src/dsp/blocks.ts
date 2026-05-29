// Split a 2D image (row-major Float64Array) into N x N blocks, and merge back.
// Image dimensions are padded by the pipeline before calling these so that
// width % N === 0 and height % N === 0.

export interface Blocked {
  blocks: Float64Array[]; // each length N*N
  cols: number;           // number of block columns
  rows: number;           // number of block rows
  N: number;
}

export function splitBlocks(img: Float64Array, w: number, h: number, N: number): Blocked {
  if (w % N !== 0 || h % N !== 0) {
    throw new Error(`image ${w}x${h} not divisible by block size ${N}`);
  }
  const cols = w / N;
  const rows = h / N;
  const blocks: Float64Array[] = new Array(cols * rows);
  for (let br = 0; br < rows; br++) {
    for (let bc = 0; bc < cols; bc++) {
      const block = new Float64Array(N * N);
      for (let r = 0; r < N; r++) {
        const srcRow = (br * N + r) * w + bc * N;
        for (let c = 0; c < N; c++) {
          block[r * N + c] = img[srcRow + c];
        }
      }
      blocks[br * cols + bc] = block;
    }
  }
  return { blocks, cols, rows, N };
}

export function mergeBlocks(blocked: Blocked): { data: Float64Array; w: number; h: number } {
  const { blocks, cols, rows, N } = blocked;
  const w = cols * N;
  const h = rows * N;
  const out = new Float64Array(w * h);
  for (let br = 0; br < rows; br++) {
    for (let bc = 0; bc < cols; bc++) {
      const block = blocks[br * cols + bc];
      for (let r = 0; r < N; r++) {
        const dstRow = (br * N + r) * w + bc * N;
        for (let c = 0; c < N; c++) {
          out[dstRow + c] = block[r * N + c];
        }
      }
    }
  }
  return { data: out, w, h };
}

// Pad an image to the next multiple of N using edge replication.
export function padToMultiple(
  img: Float64Array, w: number, h: number, N: number,
): { data: Float64Array; w: number; h: number; origW: number; origH: number } {
  const padW = (N - (w % N)) % N;
  const padH = (N - (h % N)) % N;
  if (padW === 0 && padH === 0) {
    return { data: img, w, h, origW: w, origH: h };
  }
  const nw = w + padW;
  const nh = h + padH;
  const out = new Float64Array(nw * nh);
  for (let r = 0; r < nh; r++) {
    const sr = r < h ? r : h - 1;
    for (let c = 0; c < nw; c++) {
      const sc = c < w ? c : w - 1;
      out[r * nw + c] = img[sr * w + sc];
    }
  }
  return { data: out, w: nw, h: nh, origW: w, origH: h };
}
