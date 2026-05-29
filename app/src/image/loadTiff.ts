import UTIF from "utif";

export interface LoadedImage {
  data: Float64Array; // length w*h, values in [0,1]
  w: number;
  h: number;
}

export async function loadTiff(url: string): Promise<LoadedImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  const ifds = UTIF.decode(buf);
  if (!ifds.length) throw new Error(`no IFDs in ${url}`);
  const ifd = ifds[0];
  UTIF.decodeImage(buf, ifd);
  const rgba = UTIF.toRGBA8(ifd); // Uint8Array, RGBA
  const w = ifd.width;
  const h = ifd.height;
  const out = new Float64Array(w * h);
  // Average RGB to gray; alpha ignored. Fingerprint TIFFs are grayscale already,
  // so R == G == B; the average is just a safety net.
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    out[i] = (r + g + b) / (3 * 255);
  }
  return { data: out, w, h };
}
