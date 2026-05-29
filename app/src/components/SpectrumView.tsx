import { ImageCanvas } from "./ImageCanvas";

interface Props {
  data: Float64Array;
  N: number;
  displaySize?: number;
  label?: string;
}

export function SpectrumView({ data, N, displaySize = 256, label = "Avg |DCT|" }: Props) {
  // Take log for display so the DC term doesn't crush everything else.
  const logged = new Float64Array(data.length);
  for (let i = 0; i < data.length; i++) logged[i] = Math.log1p(data[i]);
  return (
    <ImageCanvas
      data={logged}
      w={N}
      h={N}
      cmap="viridis"
      displaySize={displaySize}
      pixelated
      label={label}
    />
  );
}
