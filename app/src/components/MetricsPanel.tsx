interface Props {
  psnr: number;
  mse: number;
  retentionPct: number;
  bppEstimate: number;
  blocks: number;
  blockSize: number;
}

export function MetricsPanel({ psnr, mse, retentionPct, bppEstimate, blocks, blockSize }: Props) {
  return (
    <div className="bg-neutral-950 ring-1 ring-neutral-800 rounded p-4 flex flex-col gap-3 text-sm">
      <h2 className="text-sm uppercase tracking-wider text-neutral-300">Metrics</h2>

      <Metric
        label="PSNR"
        value={isFinite(psnr) ? `${psnr.toFixed(2)} dB` : "∞ dB"}
        help="Peak Signal-to-Noise Ratio. Logarithmic measure of reconstruction quality across the full image; higher is better. ~25 dB is visibly degraded, ~35 dB is decent, >40 dB is near-transparent."
      />
      <Metric
        label="MSE"
        value={mse.toExponential(2)}
        help="Mean Squared Error between original and reconstructed pixels on a 0..1 scale. PSNR is derived from this; included for the raw numeric reference."
      />
      <Metric
        label="Coefs retained"
        value={`${retentionPct.toFixed(1)}%`}
        help="Fraction of DCT coefficients (across all blocks) that the quantization step left non-zero. The other coefficients round to zero and contribute nothing to the reconstruction — this is what compression actually buys you."
      />
      <Metric
        label="Est. bpp"
        value={bppEstimate.toFixed(2)}
        help="Bits per pixel, very rough upper bound: 8 × (coefs retained). A real JPEG encoder also entropy-codes the integers (run-length + Huffman), so true rates are typically half this or less."
      />
      <Metric
        label="Blocks"
        value={`${blocks} × ${blockSize}²`}
        help="Total number of 8×8 blocks the padded image was divided into. Each block is transformed and quantized independently — which is why heavy quantization produces visible blocking artifacts."
      />
    </div>
  );
}

function Metric({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="flex flex-col gap-0.5 pb-2 border-b border-neutral-800 last:border-b-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-neutral-500">{label}</span>
        <span className="font-mono text-neutral-100">{value}</span>
      </div>
      <div className="text-xs text-neutral-500 leading-snug">{help}</div>
    </div>
  );
}
