interface Props {
  files: string[];
  selected: string | null;
  onSelect: (file: string) => void;
}

export function ImagePicker({ files, selected, onSelect }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-neutral-400">Fingerprint</span>
      <select
        className="bg-neutral-900 ring-1 ring-neutral-700 rounded px-2 py-1 text-neutral-100"
        value={selected ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {files.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
    </label>
  );
}
