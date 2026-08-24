import { useEffect, useMemo, useState } from "react";
import { clampOption, GamePanel, type GameProps } from "./shared";

export function Sequence({ options, onComplete }: GameProps) {
  const length = clampOption(options, "length", 5, 3, 9);
  const previewInterval = clampOption(
    options,
    "previewInterval",
    420,
    220,
    900,
  );
  const sequence = useMemo(
    () => Array.from({ length }, () => Math.floor(Math.random() * 6)),
    [length],
  );
  const [shown, setShown] = useState(-1);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState<number[]>([]);
  const [pressed, setPressed] = useState(-1);

  useEffect(() => {
    let step = 0;
    const timer = window.setInterval(() => {
      setShown(step % 2 === 0 ? sequence[Math.floor(step / 2)] : -1);
      step += 1;
      if (step > sequence.length * 2) {
        window.clearInterval(timer);
        setShown(-1);
        setReady(true);
      }
    }, previewInterval);
    return () => window.clearInterval(timer);
  }, [previewInterval, sequence]);

  const select = (value: number) => {
    if (!ready) return;
    setPressed(value);
    window.setTimeout(() => setPressed(-1), 340);
    const next = [...entered, value];
    if (sequence[next.length - 1] !== value)
      return onComplete(false, { correct: next.length - 1 });
    setEntered(next);
    if (next.length === sequence.length) onComplete(true, { length });
  };

  return (
    <GamePanel
      variant="sequence"
      compact={options.compact === true}
      eyebrow="MEMORY RELAY // FA-06"
      title="Repeat the sequence"
      status={ready ? `INPUT ${entered.length}/${length}` : "RECORDING"}
      instructions="Observe the relay pulse, then reproduce the complete sequence."
    >
      <div className="sequence-console">
        <div className="sequence-leds">
          {sequence.map((_, index) => (
            <i
              key={index}
              className={index < entered.length ? "is-confirmed" : ""}
            />
          ))}
        </div>
        <div className="sequence-grid">
          {Array.from({ length: 6 }, (_, value) => (
            <button
              key={value}
              className={`${shown === value ? "is-lit" : ""}${pressed === value ? " is-pressed" : ""}`}
              onClick={() => select(value)}
              disabled={!ready}
            >
              <span>{value + 1}</span>
              <i />
            </button>
          ))}
        </div>
      </div>
    </GamePanel>
  );
}
