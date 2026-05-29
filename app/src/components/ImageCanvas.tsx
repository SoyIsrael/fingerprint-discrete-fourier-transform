import { useEffect, useRef } from "react";
import { renderToImageData, type ColorMap } from "../image/colormap";

interface Props {
  data: Float64Array | null;
  w: number;
  h: number;
  cmap?: ColorMap;
  min?: number;
  max?: number;
  invert?: boolean;
  // Display size (CSS pixels). Defaults to native size.
  displaySize?: number;
  label?: string;
  pixelated?: boolean;
}

export function ImageCanvas({
  data, w, h, cmap = "gray", min, max, invert, displaySize, label, pixelated,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !data || w === 0 || h === 0) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = renderToImageData(data, w, h, { cmap, min, max, invert });
    ctx.putImageData(img, 0, 0);
  }, [data, w, h, cmap, min, max, invert]);

  const style: React.CSSProperties = {
    imageRendering: pixelated ? "pixelated" : "auto",
    width: displaySize ? `${displaySize}px` : undefined,
    height: displaySize ? `${displaySize}px` : undefined,
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <div className="text-xs uppercase tracking-wider text-neutral-400">{label}</div>}
      <canvas
        ref={ref}
        style={style}
        className="bg-neutral-900 rounded ring-1 ring-neutral-800"
      />
    </div>
  );
}
