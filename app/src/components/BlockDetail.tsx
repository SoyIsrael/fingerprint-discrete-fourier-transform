import { useState, useEffect } from "react";
import { NumericGrid } from "./NumericGrid";
import { CalculationView } from "./CalculationView";
import type { BlockDetail as BlockDetailData } from "../dsp/pipeline";
import type { QuantTable } from "../dsp/quantize";

interface Props {
  detail: BlockDetailData | null;
  table: QuantTable;
  scale: number;
  N: number;
}

type DrillMode =
  | { kind: "forward"; index: number } // index in DCT coef grid -> (k1,k2)
  | { kind: "inverse"; index: number } // index in reconstructed pixels -> (n1,n2)
  | null;

export function BlockDetail({ detail, table, scale, N }: Props) {
  const [drill, setDrill] = useState<DrillMode>(null);

  // Clear drill panel whenever the underlying block changes.
  useEffect(() => { setDrill(null); }, [detail?.row, detail?.col]);

  if (!detail) {
    return (
      <div className="bg-neutral-950 ring-1 ring-neutral-800 rounded p-6 text-center text-sm text-neutral-400">
        Click any 8 × 8 block in the original image above to inspect it stage-by-stage.
      </div>
    );
  }

  const dcIndex = 0;
  const effTable = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) effTable[i] = table[i] * scale;

  const dctSelected = drill?.kind === "forward" ? drill.index : undefined;
  const reconSelected = drill?.kind === "inverse" ? drill.index : undefined;

  return (
    <div className="bg-neutral-950 ring-1 ring-neutral-800 rounded p-4 flex flex-col gap-4">
      <div>
        <h2 className="text-sm uppercase tracking-wider text-neutral-300">
          Selected block · row {detail.row}, col {detail.col}
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Each pane is the 8 × 8 matrix at that stage. Click any cell in <b className="text-neutral-300">DCT
          coefficients</b> to see how it's computed from the pixels, or any cell in <b
          className="text-neutral-300">Reconstructed</b> to see how it's rebuilt from the dequantized
          coefficients.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <Stage label="1. Pixels (0..255)">
          <NumericGrid
            values={detail.pixels} N={N} cmap="gray" min={0} max={255}
            format={(v) => Math.round(v).toString()}
          />
        </Stage>

        <Stage label="2. Level-shifted (−128..127)">
          <NumericGrid
            values={detail.shifted} N={N} cmap="diverging" min={-128} max={127}
            format={(v) => Math.round(v).toString()}
          />
        </Stage>

        <Stage label="3. DCT coefficients (click a cell)">
          <NumericGrid
            values={detail.dctCoef} N={N} cmap="diverging"
            emphasizeIndex={dcIndex}
            selectedIndex={dctSelected}
            onCellClick={(i) => setDrill({ kind: "forward", index: i })}
            format={(v) => Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)}
          />
        </Stage>

        <Stage label={`4. Quant table × ${scale.toFixed(2)}`}>
          <NumericGrid
            values={effTable} N={N} cmap="viridis"
            emphasizeIndex={dcIndex}
            format={(v) => v.toFixed(1)}
          />
        </Stage>

        <Stage label="5. Quantized = round(DCT ÷ Q)">
          <NumericGrid
            values={detail.quantValues} N={N} cmap="diverging"
            emphasizeIndex={dcIndex}
            format={(v) => v.toString()}
          />
        </Stage>

        <Stage label="6. Dequantized = Q × value">
          <NumericGrid
            values={detail.dequantCoef} N={N} cmap="diverging"
            emphasizeIndex={dcIndex}
            format={(v) => Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)}
          />
        </Stage>

        <Stage label="7. Reconstructed (0..255, click a cell)">
          <NumericGrid
            values={detail.reconPixels} N={N} cmap="gray" min={0} max={255}
            selectedIndex={reconSelected}
            onCellClick={(i) => setDrill({ kind: "inverse", index: i })}
            format={(v) => Math.round(v).toString()}
          />
        </Stage>

        <Stage label="Δ vs original">
          <NumericGrid
            values={diff(detail.pixels, detail.reconPixels)} N={N} cmap="diverging"
            min={-40} max={40}
            format={(v) => Math.round(v).toString()}
          />
        </Stage>
      </div>

      {drill?.kind === "forward" && (
        <CalculationView
          mode="forward"
          N={N}
          shifted={detail.shifted}
          k1={(drill.index / N) | 0}
          k2={drill.index - ((drill.index / N) | 0) * N}
          result={detail.dctCoef[drill.index]}
          onClose={() => setDrill(null)}
        />
      )}
      {drill?.kind === "inverse" && (
        <CalculationView
          mode="inverse"
          N={N}
          dequant={detail.dequantCoef}
          n1={(drill.index / N) | 0}
          n2={drill.index - ((drill.index / N) | 0) * N}
          result={detail.reconShifted[drill.index]}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}

function Stage({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-neutral-400">{label}</div>
      {children}
    </div>
  );
}

function diff(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = b[i] - a[i];
  return out;
}
