import { useEffect, useRef, useState } from "react";
import { clampOption, GamePanel, type GameProps, rangeStyle } from "./shared";

export function Skillbar({ options, onComplete }: GameProps) {
  const difficulty = clampOption(options, "difficulty", 3, 1, 5);
  const rounds = clampOption(options, "rounds", 3, 1, 8);
  const width = 24 - difficulty * 3;
  const [position, setPosition] = useState(0);
  const [round, setRound] = useState(1);
  const direction = useRef(1);
  const target = useRef(12 + Math.random() * (74 - width));

  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setPosition((current) => {
          const next = current + direction.current * (1 + difficulty * 0.34);
          if (next >= 100 || next <= 0) direction.current *= -1;
          return Math.min(100, Math.max(0, next));
        }),
      16,
    );
    return () => window.clearInterval(timer);
  }, [difficulty]);

  const stop = () => {
    const hit =
      position >= target.current && position <= target.current + width;
    if (!hit) return onComplete(false, { roundsCompleted: round - 1 });
    if (round >= rounds) return onComplete(true, { roundsCompleted: rounds });
    setRound((value) => value + 1);
    target.current = 8 + Math.random() * (84 - width);
  };

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      stop();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <GamePanel
      variant="skillbar"
      compact={options.compact === true}
      eyebrow="SIGNAL CALIBRATOR // FA-02"
      title="Catch the signal"
      status={`PASS ${round}/${rounds}`}
      instructions="Stop the sweep inside the illuminated capture window."
    >
      <button
        className="skillbar"
        onClick={stop}
        style={
          {
            ...rangeStyle(position),
            "--target": target.current,
            "--target-width": width,
          } as React.CSSProperties
        }
      >
        <span className="skillbar__scale">
          {Array.from({ length: 21 }, (_, index) => (
            <i key={index} />
          ))}
        </span>
        <span className="skillbar__zone">
          <b>LOCK</b>
        </span>
        <i className="skillbar__needle" />
        <small>TRIGGER: LMB / SPACE</small>
      </button>
    </GamePanel>
  );
}
