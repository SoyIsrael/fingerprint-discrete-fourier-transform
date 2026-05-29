// Dump every intermediate matrix the 2D DCT pipeline produces for a single 8x8
// block of a fingerprint TIFF: pixels, level-shifted, DCT coefficients,
// quantization table, quantized integers, dequantized coefficients,
// reconstructed shifted, reconstructed pixels, plus per-block MSE/PSNR.
//
// Imports the same pipeline.ts the UI uses, so output stays in sync with the
// app — no second math implementation.
//
// Usage:
//   npx tsx app/scripts/block-math-dump.ts --file <name|path> --row <r> --col <c> [--scale <s>] [--table jpeg|flat]

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import UTIF from "utif";
import { runPipeline, BLOCK_SIZE } from "../src/dsp/pipeline";
import { jpegLumaTable, flatTable, type QuantTable } from "../src/dsp/quantize";

interface Args {
  file: string;
  row: number;
  col: number;
  scale: number;
  table: "jpeg" | "flat";
}

function printHelp(): void {
  process.stdout.write(
    `Usage: npx tsx app/scripts/block-math-dump.ts --file <name|path> --row <r> --col <c> [--scale <s>] [--table jpeg|flat]\n\n` +
      `  --file    TIFF filename (resolved against fingerprints/) or absolute path\n` +
      `  --row     Block row (0-indexed)\n` +
      `  --col     Block column (0-indexed)\n` +
      `  --scale   Quant table multiplier (default 1; 0 ≈ no quantization)\n` +
      `  --table   jpeg (default) | flat\n`,
  );
}

function parseArgs(argv: string[]): Args {
  const out: Args = { file: "", row: 0, col: 0, scale: 1, table: "jpeg" };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
      case "--file":
        out.file = v;
        i++;
        break;
      case "--row":
        out.row = Number(v);
        i++;
        break;
      case "--col":
        out.col = Number(v);
        i++;
        break;
      case "--scale":
        out.scale = Number(v);
        i++;
        break;
      case "--table":
        if (v !== "jpeg" && v !== "flat") {
          console.error(`--table must be 'jpeg' or 'flat' (got ${v})`);
          process.exit(2);
        }
        out.table = v;
        i++;
        break;
      default:
        console.error(`unknown arg: ${k}`);
        printHelp();
        process.exit(2);
    }
  }
  if (!out.file) {
    console.error("--file is required");
    printHelp();
    process.exit(2);
  }
  if (!Number.isFinite(out.row) || !Number.isFinite(out.col)) {
    console.error("--row and --col must be numbers");
    process.exit(2);
  }
  return out;
}

interface LoadedTiff {
  data: Float64Array;
  w: number;
  h: number;
  path: string;
}

function loadTiff(file: string): LoadedTiff {
  // Bare filename → resolve under fingerprints/ at repo root.
  const looksLikePath =
    file.includes("/") || file.includes("\\") || /^[A-Za-z]:/.test(file);
  const path = looksLikePath ? resolve(file) : resolve("fingerprints", file);
  const buf = readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const ifds = UTIF.decode(ab);
  if (!ifds.length) throw new Error(`no IFDs in ${path}`);
  const ifd = ifds[0];
  UTIF.decodeImage(ab, ifd);
  const rgba = UTIF.toRGBA8(ifd);
  const w = ifd.width;
  const h = ifd.height;
  const data = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    data[i] = (r + g + b) / (3 * 255);
  }
  return { data, w, h, path };
}

type Matrix = Float64Array | Int32Array;

function printMatrix(
  name: string,
  data: Matrix,
  N: number,
  opts: { decimals?: number; width?: number } = {},
): void {
  const decimals = opts.decimals ?? 0;
  const width = opts.width ?? 8;
  process.stdout.write(name + "\n");
  for (let r = 0; r < N; r++) {
    const cells: string[] = [];
    for (let c = 0; c < N; c++) {
      const v = data[r * N + c] as number;
      const isInt = data instanceof Int32Array || Number.isInteger(v);
      const s = isInt ? String(v) : v.toFixed(decimals);
      cells.push(s.padStart(width));
    }
    process.stdout.write("  " + cells.join(" ") + "\n");
  }
  process.stdout.write("\n");
}

function scaledTable(t: QuantTable, scale: number): Float64Array {
  const out = new Float64Array(t.length);
  for (let i = 0; i < t.length; i++) out[i] = t[i] * scale;
  return out;
}

function main(): void {
  const args = parseArgs(process.argv);
  const img = loadTiff(args.file);
  const rows = Math.ceil(img.h / BLOCK_SIZE);
  const cols = Math.ceil(img.w / BLOCK_SIZE);
  if (args.row < 0 || args.row >= rows || args.col < 0 || args.col >= cols) {
    console.error(
      `block (${args.row},${args.col}) out of range — image ${img.w}x${img.h}, ${rows}x${cols} blocks`,
    );
    process.exit(2);
  }
  const table =
    args.table === "flat" ? flatTable(BLOCK_SIZE, 16) : jpegLumaTable();
  const result = runPipeline(
    { data: img.data, w: img.w, h: img.h },
    {
      quant: { table, scale: args.scale, N: BLOCK_SIZE },
      selected: { row: args.row, col: args.col },
    },
  );
  const d = result.selectedBlockDetail;
  if (!d) {
    console.error("no block detail produced");
    process.exit(1);
  }

  const N = BLOCK_SIZE;
  const NN = N * N;

  process.stdout.write(`File:   ${img.path}\n`);
  process.stdout.write(
    `Image:  ${img.w}x${img.h} px, ${rows}x${cols} blocks of ${N}x${N}\n`,
  );
  process.stdout.write(`Block:  (row=${d.row}, col=${d.col})\n`);
  process.stdout.write(
    `Quant:  table=${args.table}, scale=${args.scale}\n\n`,
  );

  printMatrix("1. Pixels (0..255):", d.pixels, N, { decimals: 0, width: 5 });
  printMatrix("2. Shifted (pixels - 128):", d.shifted, N, {
    decimals: 0,
    width: 6,
  });
  printMatrix("3. DCT coefficients (orthonormal Type-II):", d.dctCoef, N, {
    decimals: 2,
    width: 9,
  });
  printMatrix(
    `4. Quantization table (${args.table}${args.scale === 1 ? "" : ` × ${args.scale}`}):`,
    scaledTable(table, args.scale),
    N,
    { decimals: 1, width: 7 },
  );
  printMatrix(
    "5. Quantized integers (round(coef / table)):",
    d.quantValues,
    N,
    { decimals: 0, width: 6 },
  );
  printMatrix("6. Dequantized coefficients (q × table):", d.dequantCoef, N, {
    decimals: 2,
    width: 9,
  });
  printMatrix("7. Reconstructed shifted (IDCT output):", d.reconShifted, N, {
    decimals: 2,
    width: 8,
  });
  printMatrix("8. Reconstructed pixels (+128):", d.reconPixels, N, {
    decimals: 1,
    width: 7,
  });

  let sumSq = 0;
  for (let i = 0; i < NN; i++) {
    const e = (d.reconPixels[i] - d.pixels[i]) / 255;
    sumSq += e * e;
  }
  const mse = sumSq / NN;
  const psnr = mse > 0 ? 10 * Math.log10(1 / mse) : Infinity;
  let retained = 0;
  for (let i = 0; i < NN; i++) if (d.quantValues[i] !== 0) retained++;

  process.stdout.write(`Block metrics:\n`);
  process.stdout.write(`  MSE (normalized): ${mse.toExponential(3)}\n`);
  process.stdout.write(`  PSNR:             ${psnr.toFixed(2)} dB\n`);
  process.stdout.write(
    `  Retained bins:    ${retained}/${NN} (${((100 * retained) / NN).toFixed(1)}%)\n`,
  );
}

main();
