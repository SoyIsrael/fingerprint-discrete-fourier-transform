import { ImageCanvas } from "./ImageCanvas";

interface Props {
  mask: Float64Array;
  N: number;
  displaySize?: number;
  label?: string;
}

export function MaskView({ mask, N, displaySize = 256, label = "Retained coefficients" }: Props) {
  return (
    <ImageCanvas
      data={mask}
      w={N}
      h={N}
      cmap="hot"
      min={0}
      max={1}
      displaySize={displaySize}
      pixelated
      label={label}
    />
  );
}
