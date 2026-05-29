---
name: block-math-dump
description: Print every intermediate matrix the 2D DCT pipeline produces for a single 8×8 block of a fingerprint TIFF (pixels → level-shifted → DCT coefficients → quantized → dequantized → IDCT → reconstructed pixels) plus per-block MSE/PSNR/retention. Use when the user asks to see the math, dump matrices, debug the pipeline numerically, sanity-check against a textbook example, or pull numbers for a writeup.
---

# block-math-dump

Runs the same `runPipeline` the React UI uses, restricted to one selected 8×8 block, and prints every intermediate matrix to stdout. Single source of truth — no separate math implementation to drift from the app.

## Invocation

From the repo root:

```
npx tsx app/scripts/block-math-dump.ts --file <name|path> --row <r> --col <c> [--scale <s>] [--table jpeg|flat]
```

### Args

- `--file` (required) — TIFF filename. A bare name like `101_1.tif` is resolved against `fingerprints/` at the repo root; anything with a path separator is taken as-is.
- `--row`, `--col` (required) — block coordinates, 0-indexed. For the FVC2000 DB1_B images (~300×300) that's roughly 0..36 rows × 0..36 cols.
- `--scale` (default `1`) — global multiplier on the quantization table. `0` means "no quantization" (round each coefficient as-is).
- `--table` (default `jpeg`) — `jpeg` for the JPEG-1992 luminance table, `flat` for uniform 16.

## What it prints

Numbered output sections for the chosen block:

1. **Pixels** (0..255)
2. **Shifted** (pixels − 128)
3. **DCT coefficients** (orthonormal Type-II)
4. **Quantization table** (table × scale)
5. **Quantized integers** (`round(coef / (table × scale))`)
6. **Dequantized coefficients** (`q × table × scale`)
7. **Reconstructed shifted** (IDCT output)
8. **Reconstructed pixels** (+128)

Followed by per-block metrics — MSE (normalized to [0,1]), PSNR, and retained-bin count.

## When to invoke

- "Show / dump / print the DCT math for block (r, c) of <fingerprint>"
- "What numbers does the pipeline produce at block X?"
- "I need the matrices for a writeup / report / textbook comparison"
- "Sanity-check the DCT" — pick a uniform block (DC dominates, all AC ≈ 0) and confirm
- Reproducing a bug numerically when the UI's `BlockDetail` panel isn't enough

## Notes

- The pipeline runs on the entire image to produce the selection — overhead is negligible for FVC-sized TIFFs (~300×300).
- Floating-point output uses 2-decimal precision; integers (quantized values, pixel intensities) print as integers.
- If you need LaTeX output, post-process: each matrix block is a fixed-width grid that pandoc-style sed/awk can turn into `\begin{bmatrix}…\end{bmatrix}` cleanly.
- `tsx` is fetched on demand by `npx`; first invocation is slower than subsequent ones.
