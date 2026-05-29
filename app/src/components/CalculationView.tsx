import { NumericGrid } from "./NumericGrid";
import { TeX } from "./TeX";

// Step-by-step derivation panel for a single cell — either a forward DCT
// coefficient X[k1,k2] (from the level-shifted pixel block) or a reconstructed
// pixel x[n1,n2] (from the dequantized coefficient block).

interface ForwardProps {
  mode: "forward";
  N: number;
  shifted: Float64Array;
  k1: number;
  k2: number;
  result: number;
  onClose: () => void;
}

interface InverseProps {
  mode: "inverse";
  N: number;
  dequant: Float64Array;
  n1: number;
  n2: number;
  result: number;
  onClose: () => void;
}

type Props = ForwardProps | InverseProps;

function alpha(k: number, N: number): number {
  return k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
}

function basisCell(k1: number, k2: number, n1: number, n2: number, N: number): number {
  const piOverN = Math.PI / N;
  return Math.cos(piOverN * (n1 + 0.5) * k1) * Math.cos(piOverN * (n2 + 0.5) * k2);
}

// Format a number for the expanded-sum display: keep it compact but readable.
function fmt(v: number): string {
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

export function CalculationView(props: Props) {
  const { N, onClose } = props;
  const isFwd = props.mode === "forward";
  const title = isFwd
    ? `Forward DCT · computing X[k₁=${props.k1}, k₂=${props.k2}]`
    : `Inverse DCT · reconstructing x[n₁=${props.n1}, n₂=${props.n2}]`;

  return (
    <div className="bg-neutral-900 ring-1 ring-amber-400/40 rounded p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-amber-200">{title}</h3>
        <button
          onClick={onClose}
          className="text-xs px-2 py-0.5 rounded bg-neutral-800 ring-1 ring-neutral-700 text-neutral-300 hover:ring-neutral-500"
        >
          Close
        </button>
      </div>

      <AlphaDefinition N={N} />

      {isFwd ? (
        <ForwardBody {...(props as ForwardProps)} />
      ) : (
        <InverseBody {...(props as InverseProps)} />
      )}
    </div>
  );
}

function AlphaDefinition({ N }: { N: number }) {
  return (
    <Block label="Normalization factor">
      <TeX block>{`\\alpha(k) \\;=\\; \\begin{cases} \\sqrt{\\dfrac{1}{N}} & \\text{if } k = 0 \\\\[6pt] \\sqrt{\\dfrac{2}{N}} & \\text{otherwise} \\end{cases} \\qquad N = ${N}`}</TeX>
    </Block>
  );
}

function ForwardBody(p: ForwardProps) {
  const { N, shifted, k1, k2, result } = p;
  const a1 = alpha(k1, N);
  const a2 = alpha(k2, N);

  const basis = new Float64Array(N * N);
  const product = new Float64Array(N * N);
  let sumProd = 0;
  for (let n1 = 0; n1 < N; n1++) {
    for (let n2 = 0; n2 < N; n2++) {
      const b = basisCell(k1, k2, n1, n2, N);
      const s = shifted[n1 * N + n2];
      basis[n1 * N + n2] = b;
      product[n1 * N + n2] = s * b;
      sumProd += s * b;
    }
  }
  const computed = a1 * a2 * sumProd;

  const alphaCase1 = k1 === 0 ? "\\sqrt{1/" + N + "}" : "\\sqrt{2/" + N + "}";
  const alphaCase2 = k2 === 0 ? "\\sqrt{1/" + N + "}" : "\\sqrt{2/" + N + "}";

  return (
    <>
      <Block label="General forward DCT-II (orthonormal)">
        <TeX block>{`X[k_1, k_2] \\;=\\; \\alpha(k_1)\\,\\alpha(k_2) \\sum_{n_1=0}^{N-1} \\sum_{n_2=0}^{N-1} s[n_1, n_2]\\, \\cos\\!\\left(\\frac{\\pi(n_1+\\tfrac{1}{2})\\,k_1}{N}\\right) \\cos\\!\\left(\\frac{\\pi(n_2+\\tfrac{1}{2})\\,k_2}{N}\\right)`}</TeX>
      </Block>

      <Block label={`Substituting k_1 = ${k1}, k_2 = ${k2}, N = ${N}`}>
        <TeX block>{`X[${k1}, ${k2}] \\;=\\; \\alpha(${k1})\\,\\alpha(${k2}) \\sum_{n_1=0}^{${N - 1}} \\sum_{n_2=0}^{${N - 1}} s[n_1, n_2]\\, \\cos\\!\\left(\\frac{\\pi(n_1+\\tfrac{1}{2})\\cdot ${k1}}{${N}}\\right) \\cos\\!\\left(\\frac{\\pi(n_2+\\tfrac{1}{2})\\cdot ${k2}}{${N}}\\right)`}</TeX>
        <TeX block>{`\\alpha(${k1}) = ${alphaCase1} \\approx ${a1.toFixed(4)}, \\qquad \\alpha(${k2}) = ${alphaCase2} \\approx ${a2.toFixed(4)}`}</TeX>
      </Block>

      <Block label="Pixel block, basis, and elementwise product">
        <div className="flex flex-wrap gap-6">
          <GridLabeled label="s[n₁,n₂]  (level-shifted)">
            <NumericGrid
              values={shifted} N={N} cmap="diverging" min={-128} max={127}
              cellSize={36} format={(v) => Math.round(v).toString()}
            />
          </GridLabeled>
          <GridLabeled label={`basis(n₁,n₂) = cos(π(n₁+½)·${k1}/${N})·cos(π(n₂+½)·${k2}/${N})`}>
            <NumericGrid
              values={basis} N={N} cmap="diverging" min={-1} max={1}
              cellSize={36} format={(v) => v.toFixed(2)}
            />
          </GridLabeled>
          <GridLabeled label="product = s ⊙ basis">
            <NumericGrid
              values={product} N={N} cmap="diverging"
              cellSize={36}
              format={(v) => Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)}
            />
          </GridLabeled>
        </div>
      </Block>

      <Block label="Sum of all 64 product terms (written out)">
        <ExpandedSum
          parts={Array.from({ length: N * N }, (_, i) => ({
            sign: i === 0 ? "" : " + ",
            body: `(${fmt(shifted[i])})·(${fmt(basis[i])})`,
          }))}
          total={sumProd}
        />
      </Block>

      <Block label="Final value">
        <TeX block>{`X[${k1}, ${k2}] \\;=\\; \\alpha(${k1})\\,\\alpha(${k2})\\,\\Sigma \\;=\\; ${a1.toFixed(4)} \\cdot ${a2.toFixed(4)} \\cdot ${sumProd.toFixed(3)} \\;=\\; \\boxed{${computed.toFixed(3)}}`}</TeX>
        <div className="text-xs text-neutral-500 font-mono pt-1">
          pipeline value at this cell: {result.toFixed(3)} (matches to floating-point precision)
        </div>
      </Block>
    </>
  );
}

function InverseBody(p: InverseProps) {
  const { N, dequant, n1, n2, result } = p;

  const weighted = new Float64Array(N * N);
  let sumW = 0;
  for (let k1 = 0; k1 < N; k1++) {
    for (let k2 = 0; k2 < N; k2++) {
      const a1 = alpha(k1, N);
      const a2 = alpha(k2, N);
      const b = basisCell(k1, k2, n1, n2, N);
      const w = a1 * a2 * dequant[k1 * N + k2] * b;
      weighted[k1 * N + k2] = w;
      sumW += w;
    }
  }

  return (
    <>
      <Block label="General inverse DCT (DCT-III, orthonormal)">
        <TeX block>{`x[n_1, n_2] \\;=\\; \\sum_{k_1=0}^{N-1} \\sum_{k_2=0}^{N-1} \\alpha(k_1)\\,\\alpha(k_2)\\, \\hat{X}[k_1, k_2]\\, \\cos\\!\\left(\\frac{\\pi(n_1+\\tfrac{1}{2})\\,k_1}{N}\\right) \\cos\\!\\left(\\frac{\\pi(n_2+\\tfrac{1}{2})\\,k_2}{N}\\right)`}</TeX>
      </Block>

      <Block label={`Substituting n_1 = ${n1}, n_2 = ${n2}, N = ${N}`}>
        <TeX block>{`x[${n1}, ${n2}] \\;=\\; \\sum_{k_1=0}^{${N - 1}} \\sum_{k_2=0}^{${N - 1}} \\alpha(k_1)\\,\\alpha(k_2)\\, \\hat{X}[k_1, k_2]\\, \\cos\\!\\left(\\frac{\\pi(${n1}+\\tfrac{1}{2})\\,k_1}{${N}}\\right) \\cos\\!\\left(\\frac{\\pi(${n2}+\\tfrac{1}{2})\\,k_2}{${N}}\\right)`}</TeX>
      </Block>

      <Block label="Dequantized coefficients and per-(k₁,k₂) weighted contributions">
        <div className="flex flex-wrap gap-6">
          <GridLabeled label="X̂[k₁,k₂]  (dequantized)">
            <NumericGrid
              values={dequant} N={N} cmap="diverging"
              cellSize={36}
              format={(v) => Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)}
            />
          </GridLabeled>
          <GridLabeled label="contribution = α(k₁)·α(k₂)·X̂·basis">
            <NumericGrid
              values={weighted} N={N} cmap="diverging"
              cellSize={36}
              format={(v) => Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)}
            />
          </GridLabeled>
        </div>
      </Block>

      <Block label="Sum of all 64 contributions (written out)">
        <ExpandedSum
          parts={Array.from({ length: N * N }, (_, i) => {
            const v = weighted[i];
            const sign = i === 0 ? (v < 0 ? "−" : "") : (v < 0 ? " − " : " + ");
            return { sign, body: fmt(Math.abs(v)) };
          })}
          total={sumW}
        />
      </Block>

      <Block label="Final value">
        <TeX block>{`x[${n1}, ${n2}]_{\\text{shifted}} \\;=\\; \\sum (\\text{contributions}) \\;=\\; ${sumW.toFixed(3)} \\quad\\Longrightarrow\\quad \\text{pixel} = ${sumW.toFixed(3)} + 128 = \\boxed{${(sumW + 128).toFixed(2)}}`}</TeX>
        <div className="text-xs text-neutral-500 font-mono pt-1">
          pipeline value at this pixel: {(result + 128).toFixed(2)}
        </div>
      </Block>
    </>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="bg-neutral-950 ring-1 ring-neutral-800 rounded p-3 text-neutral-100">
        {children}
      </div>
    </div>
  );
}

function GridLabeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-neutral-400 font-mono">{label}</div>
      {children}
    </div>
  );
}

function ExpandedSum({
  parts, total,
}: {
  parts: { sign: string; body: string }[];
  total: number;
}) {
  return (
    <div className="font-mono text-sm leading-relaxed text-neutral-100">
      <div className="text-amber-200">Σ =</div>
      <div className="break-words mt-1">
        {parts.map((p, i) => (
          <span key={i} className="whitespace-nowrap">
            <span className="text-neutral-500">{p.sign}</span>
            {p.body}
          </span>
        ))}
      </div>
      <div className="mt-2 text-emerald-300">
        Σ = <b className="text-base">{total.toFixed(3)}</b>
      </div>
    </div>
  );
}
