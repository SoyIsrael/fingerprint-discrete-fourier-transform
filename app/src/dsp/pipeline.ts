import { dct2d, idct2d } from "./dct";
import { padToMultiple, splitBlocks, mergeBlocks } from "./blocks";
import { quantizeBlock, dequantizeBlock, type QuantParams } from "./quantize";

// JPEG-style 8x8 block flow: shift pixels to [-128, 127], 2D DCT, divide each
// coefficient by the matching table entry and round, then the inverse path
// (multiply, IDCT, shift back).
export const BLOCK_SIZE = 8;
const PIXEL_SCALE = 255;
const LEVEL_SHIFT = 128;

export interface PipelineInput {
  data: Float64Array; // length w*h, values in [0,1]
  w: number;
  h: number;
}

export interface BlockSelection { row: number; col: number }

export interface PipelineParams {
  quant: QuantParams; // table is natural DCT layout (DC at [0,0])
  selected: BlockSelection | null;
}

export interface BlockDetail {
  row: number;
  col: number;
  pixels: Float64Array;     // 0..255
  shifted: Float64Array;    // -128..127
  dctCoef: Float64Array;    // raw DCT-II coefficients (real)
  quantValues: Int32Array;  // round(coef / (table * scale))
  dequantCoef: Float64Array; // quantValues * table * scale
  reconShifted: Float64Array; // -128..127 (after IDCT)
  reconPixels: Float64Array;  // 0..255 (after adding 128)
}

export interface PipelineResult {
  recon: Float64Array;            // [0,1], cropped
  error: Float64Array;             // |recon - original|, [0,1]
  avgAbsCoef: Float64Array;        // length N*N, average |coefficient| across blocks
  retentionMask: Float64Array;     // length N*N, fraction of blocks where bin survived
  N: number;
  blocksPerRow: number;
  blocksPerCol: number;
  selectedBlockDetail: BlockDetail | null;
  metrics: { mse: number; psnr: number; retentionPct: number; bppEstimate: number };
}

export function runPipeline(input: PipelineInput, params: PipelineParams): PipelineResult {
  const N = BLOCK_SIZE;
  const NN = N * N;

  // 1. Pad and level-shift to -128..127.
  const padded = padToMultiple(input.data, input.w, input.h, N);
  const shifted = new Float64Array(padded.data.length);
  for (let i = 0; i < padded.data.length; i++) {
    shifted[i] = padded.data[i] * PIXEL_SCALE - LEVEL_SHIFT;
  }

  // 2. Split into 8x8 blocks (already shifted).
  const blocked = splitBlocks(shifted, padded.w, padded.h, N);
  const reconBlocks: Float64Array[] = new Array(blocked.blocks.length);
  const avgAbs = new Float64Array(NN);
  const maskAcc = new Float64Array(NN);
  let totalRetained = 0;
  let detail: BlockDetail | null = null;

  for (let i = 0; i < blocked.blocks.length; i++) {
    const blockShifted = blocked.blocks[i];

    // 3. Forward DCT.
    const coef = dct2d(blockShifted, N);
    for (let j = 0; j < NN; j++) avgAbs[j] += Math.abs(coef[j]);

    // 4. Quantize (divide & round).
    const q = quantizeBlock(coef, params.quant);
    totalRetained += q.retained;
    for (let j = 0; j < NN; j++) if (q.values[j] !== 0) maskAcc[j]++;

    // 5. Dequantize (multiply back) and inverse DCT.
    const dq = dequantizeBlock(q, params.quant);
    const back = idct2d(dq, N);

    // 6. Un-shift to 0..255.
    const reconBlock = new Float64Array(NN);
    for (let j = 0; j < NN; j++) reconBlock[j] = back[j] + LEVEL_SHIFT;
    reconBlocks[i] = reconBlock;

    if (params.selected) {
      const blockRow = (i / blocked.cols) | 0;
      const blockCol = i - blockRow * blocked.cols;
      if (blockRow === params.selected.row && blockCol === params.selected.col) {
        const pixels = new Float64Array(NN);
        for (let j = 0; j < NN; j++) pixels[j] = blockShifted[j] + LEVEL_SHIFT;
        detail = {
          row: blockRow, col: blockCol,
          pixels,
          shifted: blockShifted.slice(),
          dctCoef: coef,
          quantValues: q.values,
          dequantCoef: dq,
          reconShifted: back,
          reconPixels: reconBlock,
        };
      }
    }
  }

  // Merge, crop, normalize back to [0,1].
  const merged = mergeBlocks({ blocks: reconBlocks, cols: blocked.cols, rows: blocked.rows, N });
  const recon = new Float64Array(input.w * input.h);
  const error = new Float64Array(input.w * input.h);
  let sumSq = 0;
  for (let r = 0; r < input.h; r++) {
    for (let c = 0; c < input.w; c++) {
      const v01 = merged.data[r * merged.w + c] / PIXEL_SCALE;
      recon[r * input.w + c] = v01;
      const e = v01 - input.data[r * input.w + c];
      error[r * input.w + c] = Math.abs(e);
      sumSq += e * e;
    }
  }

  const blockCount = blocked.blocks.length;
  for (let j = 0; j < NN; j++) {
    avgAbs[j] /= blockCount;
    maskAcc[j] /= blockCount;
  }

  const mse = sumSq / (input.w * input.h);
  const psnr = mse > 0 ? 10 * Math.log10(1 / mse) : Infinity;
  const retentionPct = (100 * totalRetained) / (blockCount * NN);

  return {
    recon, error, avgAbsCoef: avgAbs, retentionMask: maskAcc, N,
    blocksPerRow: blocked.cols, blocksPerCol: blocked.rows,
    selectedBlockDetail: detail,
    metrics: { mse, psnr, retentionPct, bppEstimate: (retentionPct / 100) * 8 },
  };
}
