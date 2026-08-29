import { useEffect, useMemo, useState } from "react";
import { clampOption, GamePanel, localeText, shuffle, type GameProps } from "./shared";

export function Pattern({ options, onComplete }: GameProps) {
  const length = clampOption(options, "length", 6, 3, 9);
  const previewDuration = clampOption(
    options,
    "previewDuration",
    1800,
    800,
    5000,
  );
  const pattern = useMemo(
    () => shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, length),
    [length],
  );
  const [preview, setPreview] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setPreview(false), previewDuration);
    return () => window.clearTimeout(timer);
  }, [previewDuration]);
  const choose = (cell: number) => {
    if (preview || selected.includes(cell)) return;
    const next = [...selected, cell];
    setSelected(next);
    if (next.length === length)
      onComplete(
        pattern.every((value) => next.includes(value)),
        { selected: next },
      );
  };
  return (
    <GamePanel
      variant="pattern"
      compact={options.compact === true}
      eyebrow={localeText(options, "patternEyebrow", "ACCESS MATRIX")}
      title={localeText(options, "patternTitle", "Restore the pattern")}
      status={preview ? localeText(options, "patternMemorize", "MEMORIZE") : `${selected.length}/${length}`}
      instructions={localeText(options, "patternInstructions", "Remember every active cell, then select the same set.")}
      cancelLabel={localeText(options, "cancel", "CANCEL")}
    >
      <div className="pattern-grid">
        {Array.from({ length: 16 }, (_, cell) => (
          <button
            key={cell}
            className={
              (preview ? pattern : selected).includes(cell) ? "is-active" : ""
            }
            onClick={() => choose(cell)}
            disabled={preview}
            aria-label={`Cell ${cell + 1}`}
          />
        ))}
      </div>
    </GamePanel>
  );
}
