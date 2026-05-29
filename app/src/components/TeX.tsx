import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  children: string;
  block?: boolean;
}

export function TeX({ children, block }: Props) {
  const html = katex.renderToString(children, {
    displayMode: !!block,
    throwOnError: false,
    output: "html",
  });
  return block ? (
    <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
