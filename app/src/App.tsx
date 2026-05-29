import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePicker } from "./components/ImagePicker";
import { ImageCanvas } from "./components/ImageCanvas";
import { SpectrumView } from "./components/SpectrumView";
import { MaskView } from "./components/MaskView";
import { QuantTableEditor } from "./components/QuantTable";
import { BlockDetail } from "./components/BlockDetail";
import { MetricsPanel } from "./components/MetricsPanel";
import { loadTiff, type LoadedImage } from "./image/loadTiff";
import { useDftPipeline } from "./hooks/useDftPipeline";
import { jpegLumaTable } from "./dsp/quantize";
import { BLOCK_SIZE, type BlockSelection } from "./dsp/pipeline";

const IMAGE_DISPLAY = 300;

function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [table, setTable] = useState(() => jpegLumaTable());
  const [scale, setScale] = useState(1);
  const [selectedBlock, setSelectedBlock] = useState<BlockSelection | null>(null);

  const originalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/fingerprints.json")
      .then((r) => r.json())
      .then((list: string[]) => {
        setFiles(list);
        if (list.length > 0) setSelectedFile(list[0]);
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    setLoadError(null);
    setSelectedBlock(null);
    loadTiff(`/fingerprints/${selectedFile}`)
      .then(setImage)
      .catch((e) => setLoadError(String(e)));
  }, [selectedFile]);

  useEffect(() => {
    if (image && !selectedBlock) {
      const r = Math.floor(image.h / BLOCK_SIZE / 2);
      const c = Math.floor(image.w / BLOCK_SIZE / 2);
      setSelectedBlock({ row: r, col: c });
    }
  }, [image, selectedBlock]);

  const params = useMemo(() => ({
    quant: { table, scale, N: BLOCK_SIZE },
    selected: selectedBlock,
  }), [table, scale, selectedBlock]);

  const { result, computing } = useDftPipeline(image, params);

  function handleClickOriginal(e: React.MouseEvent<HTMLDivElement>) {
    if (!image) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPx = ((e.clientX - rect.left) / rect.width) * image.w;
    const yPx = ((e.clientY - rect.top) / rect.height) * image.h;
    const col = Math.max(0, Math.min(Math.floor(image.w / BLOCK_SIZE) - 1, Math.floor(xPx / BLOCK_SIZE)));
    const row = Math.max(0, Math.min(Math.floor(image.h / BLOCK_SIZE) - 1, Math.floor(yPx / BLOCK_SIZE)));
    setSelectedBlock({ row, col });
  }

  const highlightStyle = selectedBlock && image ? {
    left: `${(selectedBlock.col * BLOCK_SIZE / image.w) * 100}%`,
    top: `${(selectedBlock.row * BLOCK_SIZE / image.h) * 100}%`,
    width: `${(BLOCK_SIZE / image.w) * 100}%`,
    height: `${(BLOCK_SIZE / image.h) * 100}%`,
  } : null;

  const errorAmp = 4;

  return (
    <div className="min-h-screen p-6 max-w-[1500px] mx-auto">
      <header className="flex items-end justify-between mb-6 pb-3 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-medium text-neutral-100">Fingerprint 2D DCT</h1>
          <p className="text-sm text-neutral-400 mt-1">
            JPEG-style 8 × 8 pipeline · level-shift · 2D DCT · divide-by-table & round · inverse path.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {computing && <span className="text-xs text-emerald-400 animate-pulse">computing…</span>}
          <ImagePicker files={files} selected={selectedFile} onSelect={setSelectedFile} />
        </div>
      </header>

      {loadError && (
        <div className="bg-red-900/30 ring-1 ring-red-700 text-red-200 rounded p-3 mb-4 text-sm">
          {loadError}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="relative" ref={originalRef} onClick={handleClickOriginal} title="Click to pick a block">
          <ImageCanvas
            label="Original (click to pick block)"
            data={image?.data ?? null}
            w={image?.w ?? 0}
            h={image?.h ?? 0}
            cmap="gray"
            min={0}
            max={1}
            displaySize={IMAGE_DISPLAY}
          />
          {highlightStyle && (
            <div
              className="absolute pointer-events-none ring-2 ring-emerald-400"
              style={{
                ...highlightStyle,
                top: `calc(${highlightStyle.top} + 22px)`,
              }}
            />
          )}
        </div>
        <ImageCanvas
          label="Reconstruction"
          data={result?.recon ?? null}
          w={image?.w ?? 0}
          h={image?.h ?? 0}
          cmap="gray" min={0} max={1}
          displaySize={IMAGE_DISPLAY}
        />
        <ImageCanvas
          label={`|Error| × ${errorAmp}`}
          data={result ? scale255(result.error, errorAmp) : null}
          w={image?.w ?? 0}
          h={image?.h ?? 0}
          cmap="hot" min={0} max={1}
          displaySize={IMAGE_DISPLAY}
        />
        {result && (
          <SpectrumView data={result.avgAbsCoef} N={result.N} displaySize={IMAGE_DISPLAY} />
        )}
        {result && (
          <MaskView mask={result.retentionMask} N={result.N} displaySize={IMAGE_DISPLAY} />
        )}
      </section>

      <section className="mb-6">
        <BlockDetail
          detail={result?.selectedBlockDetail ?? null}
          table={table}
          scale={scale}
          N={BLOCK_SIZE}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <QuantTableEditor
            table={table}
            N={BLOCK_SIZE}
            scale={scale}
            onTableChange={setTable}
            onScaleChange={setScale}
          />
        </div>
        {result && image && (
          <MetricsPanel
            psnr={result.metrics.psnr}
            mse={result.metrics.mse}
            retentionPct={result.metrics.retentionPct}
            bppEstimate={result.metrics.bppEstimate}
            blocks={result.blocksPerRow * result.blocksPerCol}
            blockSize={BLOCK_SIZE}
          />
        )}
      </section>
    </div>
  );
}

function scale255(a: Float64Array, k: number): Float64Array {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * k;
  return out;
}

export default App;
