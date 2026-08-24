import { useEffect, useMemo, useRef, useState } from "react";
import { clampOption, GamePanel, type GameProps } from "./shared";

export function Lockpick({ options, onComplete }: GameProps) {
  const difficulty = clampOption(options, "difficulty", 3, 1, 5);
  const tolerance = 15 - difficulty * 2;
  const target = useMemo(() => 18 + Math.random() * 144, []);
  const [angle, setAngle] = useState(90);
  const [tension, setTension] = useState(0);
  const [durability, setDurability] = useState(100);
  const turning = useRef(false);
  const state = useRef({ angle, tension, durability });
  state.current = { angle, tension, durability };

  const proximity = Math.max(0, 1 - Math.abs(angle - target) / 55);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = state.current;
      const distance = Math.abs(current.angle - target);
      const nextTension = turning.current
        ? Math.min(
            100,
            current.tension +
              (distance <= tolerance
                ? 4.8
                : Math.max(0.35, 2.4 - distance / 38)),
          )
        : Math.max(0, current.tension - 8);
      const damage =
        turning.current && distance > tolerance
          ? 0.55 + difficulty * 0.18 + nextTension / 90
          : 0;
      const nextDurability = Math.max(0, current.durability - damage);
      setTension(nextTension);
      setDurability(nextDurability);
      if (nextTension >= 100 && distance <= tolerance)
        onComplete(true, { durability: Math.round(nextDurability) });
      if (nextDurability <= 0)
        onComplete(false, { angle: Math.round(current.angle) });
    }, 40);
    return () => window.clearInterval(timer);
  }, [difficulty, onComplete, target, tolerance]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA")
        setAngle((value) => Math.max(0, value - 2));
      if (event.code === "ArrowRight" || event.code === "KeyD")
        setAngle((value) => Math.min(180, value + 2));
      if (event.code === "Space") {
        event.preventDefault();
        turning.current = true;
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") turning.current = false;
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, []);

  const aim = (event: React.PointerEvent<HTMLDivElement>) => {
    if (turning.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setAngle(
      Math.min(
        180,
        Math.max(0, ((event.clientX - rect.left) / rect.width) * 180),
      ),
    );
  };

  return (
    <GamePanel
      variant="lockpick"
      compact={options.compact === true}
      eyebrow="TUMBLER OVERRIDE // FA-17"
      title="Feel the binding point"
      status={`PICK ${Math.round(durability)}%`}
      instructions="Aim with the mouse or A/D. Hold LMB or SPACE to tension the cylinder."
    >
      <div
        className={`lockpick${turning.current ? " is-turning" : ""}`}
        style={
          {
            "--pick-angle": `${angle - 90}deg`,
            "--turn": `${tension * 0.72}deg`,
            "--shake": `${Math.max(0, proximity * 2.2)}px`,
          } as React.CSSProperties
        }
        onPointerMove={aim}
      >
        <div className="lockpick__housing">
          <div className="lockpick__cylinder">
            <i className="lockpick__keyway" />
          </div>
          <i className="lockpick__pick" />
          <i className="lockpick__tension" />
        </div>
        <div className="lockpick__meters">
          <label>
            TORQUE{" "}
            <span>
              <i style={{ transform: `scaleX(${tension / 100})` }} />
            </span>
          </label>
          <label>
            PICK INTEGRITY{" "}
            <span>
              <i style={{ transform: `scaleX(${durability / 100})` }} />
            </span>
          </label>
        </div>
        <button
          className="lockpick__turn"
          onPointerDown={() => {
            turning.current = true;
          }}
          onPointerUp={() => {
            turning.current = false;
          }}
          onPointerLeave={() => {
            turning.current = false;
          }}
        >
          HOLD TO TURN
        </button>
      </div>
    </GamePanel>
  );
}
