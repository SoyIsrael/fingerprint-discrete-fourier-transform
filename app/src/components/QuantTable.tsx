import { NumericGrid } from "./NumericGrid";
import { jpegLumaTable, flatTable, type QuantTable } from "../dsp/quantize";

interface Props {
  table: QuantTable;
  N: number;
  scale: number;
  onTableChange: (next: QuantTable) => void;
  onScaleChange: (next: number) => void;
}

export function QuantTableEditor({ table, N, scale, onTableChange, onScaleChange }: Props) {
  const dcIndex = 0; // DC sits at [0,0] in DCT layout

  const effective = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) effective[i] = table[i] * scale;

  function setCell(i: number, v: number) {
    const next = new Float64Array(table);
    next[i] = Math.max(0, v);
    onTableChange(next);
  }

  return (
    <div className="bg-neutral-950 ring-1 ring-neutral-800 rounded p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm uppercase tracking-wider text-neutral-300">Quantization Table</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Each DCT coefficient is divided by the matching cell, then rounded. DC is the top-left cell
            (outlined); top-left preserves precision, bottom-right discards detail. Click any cell to edit.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="text-xs px-2 py-1 rounded bg-neutral-900 ring-1 ring-neutral-700 text-neutral-300 hover:ring-neutral-500"
            onClick={() => onTableChange(jpegLumaTable())}
          >
            Reset (JPEG luma)
          </button>
          <button
            className="text-xs px-2 py-1 rounded bg-neutral-900 ring-1 ring-neutral-700 text-neutral-300 hover:ring-neutral-500"
            onClick={() => onTableChange(flatTable(N, 16))}
          >
            Flat (16)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs text-neutral-400">Base table</div>
          <NumericGrid
            values={table}
            N={N}
            cmap="viridis"
            cellSize={40}
            editable
            emphasizeIndex={dcIndex}
            onChange={setCell}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs text-neutral-400">Effective (× scale)</div>
          <NumericGrid
            values={effective}
            N={N}
            cmap="viridis"
            cellSize={40}
            format={(v) => v.toFixed(1)}
            emphasizeIndex={dcIndex}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm mt-1">
        <span className="text-neutral-400 w-28">Scale</span>
        <input
          type="range" min={0.05} max={5} step={0.05} value={scale}
          onChange={(e) => onScaleChange(parseFloat(e.target.value))}
          className="flex-1 accent-emerald-500"
        />
        <span className="font-mono text-xs text-neutral-200 w-12 text-right">{scale.toFixed(2)}×</span>
      </label>
      <div className="text-xs text-neutral-500 -mt-1 pl-30 ml-28">
        Multiplies every entry. Lower = finer quantization (higher quality); higher = coarser (more compression).
      </div>
    </div>
  );
}
