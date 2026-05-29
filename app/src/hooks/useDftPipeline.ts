import { useEffect, useState } from "react";
import { runPipeline, type PipelineParams, type PipelineResult } from "../dsp/pipeline";
import type { LoadedImage } from "../image/loadTiff";

export function useDftPipeline(
  image: LoadedImage | null,
  params: PipelineParams,
  debounceMs = 30,
): { result: PipelineResult | null; computing: boolean } {
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!image) {
      setResult(null);
      return;
    }
    setComputing(true);
    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        const r = runPipeline(image, params);
        setResult(r);
        setComputing(false);
      });
    }, debounceMs);
    return () => clearTimeout(t);
  }, [
    image,
    params.quant.table,
    params.quant.scale,
    params.quant.N,
    params.selected,
    debounceMs,
  ]);

  return { result, computing };
}
