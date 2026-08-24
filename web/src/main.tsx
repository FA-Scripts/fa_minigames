import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./games.css";
import {
  Circuit,
  Fingerprint,
  Lockpick,
  Pattern,
  Sequence,
  Skillbar,
  Terminal,
  Wires,
} from "./games";

type Game =
  | "drill"
  | "keypad"
  | "skillbar"
  | "sequence"
  | "lockpick"
  | "pattern"
  | "wires"
  | "circuit"
  | "fingerprint"
  | "terminal";
type NuiMessage = {
  action: "open" | "close";
  game?: Game;
  requestId?: string;
  options?: Record<string, unknown>;
};

const isBrowser = !(window as Window & { invokeNative?: unknown }).invokeNative;
const gameNames: Game[] = [
  "drill",
  "keypad",
  "skillbar",
  "sequence",
  "lockpick",
  "pattern",
  "wires",
  "circuit",
  "fingerprint",
  "terminal",
];
const requestedMockGame = new URLSearchParams(window.location.search).get(
  "game",
) as Game | null;
const browserMockGame: Game =
  requestedMockGame && gameNames.includes(requestedMockGame)
    ? requestedMockGame
    : "drill";
const browserMockCompact = ["true", "1"].includes(
  new URLSearchParams(window.location.search).get("compact") ?? "",
);
const drillStartPosition = -12;

async function nuiCallback(
  endpoint: string,
  payload: Record<string, unknown> = {},
) {
  if (isBrowser) {
    if (endpoint === "complete" && payload.game === "keypad") {
      return {
        ok: true,
        feedback: payload.code === "1234" ? "success" : "error",
        close: payload.code === "1234",
      };
    }
    return { ok: true };
  }
  const response = await fetch(
    `https://${GetParentResourceName()}/${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(payload),
    },
  );
  return response.json();
}

function Drill({
  options,
  onClose,
}: {
  options: Record<string, unknown>;
  onClose: () => void;
}) {
  const difficulty = Math.min(Math.max(Number(options.difficulty) || 2, 1), 5);
  const pinContacts = [0, 28, 56, 84];
  const [drillState, setDrillState] = useState({
    feed: 0,
    heat: 4,
    depth: 0,
    position: drillStartPosition,
    rpm: 0,
  });
  const stateRef = useRef(drillState);
  const controls = useRef({
    spinning: false,
    forward: false,
    backward: false,
    motion: 0,
  });
  const finished = useRef(false);

  const complete = useCallback(
    async (success: boolean) => {
      if (finished.current) return;
      finished.current = true;
      await nuiCallback("complete", { game: "drill", success });
      onClose();
    },
    [onClose],
  );

  useEffect(() => {
    const tick = window.setInterval(() => {
      const current = stateRef.current;
      const rpm = Math.min(
        100,
        Math.max(0, current.rpm + (controls.current.spinning ? 6.5 : -10)),
      );
      const currentPin = Math.min(3, Math.floor(current.depth / 25));
      const contactPoint = pinContacts[currentPin];
      const pointerMotion = controls.current.motion;
      controls.current.motion = 0;
      const advance =
        (controls.current.forward ? 1.4 : 0) + Math.max(0, pointerMotion);
      const retreat =
        (controls.current.backward ? 1.7 : 0) + Math.max(0, -pointerMotion);
      let position = current.position;
      let feed = current.feed;

      if (retreat > 0) {
        const releasedPressure = Math.min(feed, retreat * 3.1);
        feed -= releasedPressure;
        position = Math.max(
          drillStartPosition,
          position - Math.max(0, retreat - releasedPressure / 3.1),
        );
      } else if (advance > 0) {
        const travel = Math.min(Math.max(0, contactPoint - position), advance);
        position += travel;
        feed = Math.min(100, feed + Math.max(0, advance - travel) * 3.1);
      } else {
        feed = Math.max(0, feed - 0.28);
      }

      const touchingPin = Math.abs(position - contactPoint) < 0.36;
      const safeFeed = 64 - difficulty * 4;
      const biting = touchingPin && rpm >= 58 && feed >= 15 && feed <= safeFeed;
      const grinding = touchingPin && rpm >= 45 && feed > safeFeed;
      const heatDelta = grinding
        ? 1.05 + difficulty * 0.16
        : biting
          ? 0.12 + difficulty * 0.04
          : rpm > 40
            ? -0.42
            : -1.15;
      const heat = Math.min(100, Math.max(0, current.heat + heatDelta));
      const depthGain =
        biting && heat < 94
          ? (0.28 + feed / 250) * (1.08 - difficulty * 0.075)
          : 0;
      const pinLimit = (currentPin + 1) * 25;
      const depth = Math.min(100, pinLimit, current.depth + depthGain);
      if (depth >= pinLimit && current.depth < pinLimit) feed = 0;
      const next = { feed, heat, depth, position, rpm };

      stateRef.current = next;
      setDrillState(next);

      if (heat >= 100) void complete(false);
      if (depth >= 100) void complete(true);
    }, 50);

    return () => window.clearInterval(tick);
  }, [complete, difficulty]);

  useEffect(() => {
    const stopSpinning = () => {
      controls.current.spinning = false;
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        controls.current.spinning = true;
      }
      if (event.code === "KeyW" || event.code === "ArrowUp")
        controls.current.forward = true;
      if (event.code === "KeyS" || event.code === "ArrowDown")
        controls.current.backward = true;
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") stopSpinning();
      if (event.code === "KeyW" || event.code === "ArrowUp")
        controls.current.forward = false;
      if (event.code === "KeyS" || event.code === "ArrowDown")
        controls.current.backward = false;
    };
    const mouseMove = (event: MouseEvent) => {
      if (!controls.current.spinning || event.movementY === 0) return;
      controls.current.motion = Math.min(
        5,
        Math.max(-5, controls.current.motion - event.movementY * 0.12),
      );
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", stopSpinning);
    window.addEventListener("blur", stopSpinning);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", stopSpinning);
      window.removeEventListener("blur", stopSpinning);
    };
  }, []);

  const { feed, heat, depth, position, rpm } = drillState;
  const safeFeed = 64 - difficulty * 4;
  const currentPin = Math.min(3, Math.floor(depth / 25));
  const clearedPins = Math.min(4, Math.floor(depth / 25));
  const isTouching = Math.abs(position - pinContacts[currentPin]) < 0.36;
  const isSpinning = rpm >= 18;
  const isBiting =
    isTouching && rpm >= 58 && feed >= 15 && feed <= safeFeed && heat < 94;
  const isGrinding = isTouching && rpm >= 45 && feed > safeFeed;
  const status =
    heat >= 82
      ? "BACK OFF — BIT OVERHEATING"
      : isGrinding
        ? "TOO MUCH PRESSURE"
        : !isTouching
          ? `LINE UP PIN ${currentPin + 1}`
          : rpm < 58
            ? "SPIN UP THE DRILL"
            : isBiting
              ? `CUTTING PIN ${currentPin + 1}`
              : "ADD PRESSURE GENTLY";
  const sceneStyle = {
    "--depth": `${depth}%`,
    "--travel": `${position * 2.65}px`,
    "--travel-mobile": `${position * 1.8}px`,
    "--heat": heat,
    "--rpm": rpm,
  } as React.CSSProperties;

  return (
    <section className="drill-game" aria-label="Drill minigame">
      <header className="drill-game__header">
        <div>
          <span className="drill-kicker">DEPOSIT LOCK // 4 PIN</span>
          <h1>KEEP IT STEADY</h1>
        </div>
        <div
          className="pin-counter"
          aria-label={`${clearedPins} of 4 pins cleared`}
        >
          {[0, 1, 2, 3].map((pin) => (
            <span
              key={pin}
              className={
                depth >= (pin + 1) * 25
                  ? "is-cleared"
                  : pin === currentPin
                    ? "is-current"
                    : ""
              }
            >
              {pin + 1}
            </span>
          ))}
        </div>
      </header>

      <div
        className={`lock-scene${isSpinning ? " is-spinning" : ""}${isTouching ? " is-contact" : ""}${isBiting ? " is-biting" : ""}${isGrinding ? " is-grinding" : ""}${heat >= 72 ? " is-hot" : ""}`}
        style={sceneStyle}
      >
        <div className="safe-plate">
          <span className="safe-bolt safe-bolt--tl" />
          <span className="safe-bolt safe-bolt--tr" />
          <span className="safe-bolt safe-bolt--bl" />
          <span className="safe-bolt safe-bolt--br" />
          <div className="lock-cutaway">
            <div className="lock-tunnel" />
            <div className="pin-stack">
              {[0, 1, 2, 3].map((pin) => {
                const cleared = depth >= (pin + 1) * 25;
                const active = pin === currentPin && !cleared;
                return (
                  <div
                    key={pin}
                    className={`lock-pin${cleared ? " is-cleared" : ""}${active ? " is-active" : ""}${active && isTouching ? " is-contact" : ""}`}
                  >
                    <span className="lock-pin__spring" />
                    <span className="lock-pin__body" />
                    <span className="lock-pin__fragment" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="drill-assembly"
          aria-hidden="true"
          onMouseDown={() => {
            controls.current.spinning = true;
          }}
          onTouchStart={() => {
            controls.current.spinning = true;
          }}
          onTouchEnd={() => {
            controls.current.spinning = false;
          }}
        >
          <div className="drill-body">
            <span className="drill-vent" />
            <span className="drill-ridge drill-ridge--one" />
            <span className="drill-ridge drill-ridge--two" />
            <div className="drill-handle">
              <span />
            </div>
          </div>
          <div className="drill-chuck">
            <span />
            <span />
            <span />
          </div>
          <div className="fleeca-bit">
            <span className="bit-flute bit-flute--one" />
            <span className="bit-flute bit-flute--two" />
          </div>
        </div>

        <div className="sparks" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <i
              key={index}
              style={{ "--spark": index } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="smoke" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="metal-dust" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>

      <footer className="drill-game__footer">
        <div
          className={`drill-status${heat >= 82 || isGrinding ? " is-warning" : ""}`}
          aria-live="polite"
        >
          <span className="status-light" />
          <strong>{status}</strong>
        </div>
        <div className="drill-controls">
          <span>
            <kbd>LMB</kbd> / <kbd>SPACE</kbd> SPIN
          </span>
          <span>
            <kbd>W</kbd>
            <kbd>S</kbd> / MOVE MOUSE PRESSURE
          </span>
          <span>
            <kbd>ESC</kbd> CANCEL
          </span>
        </div>
      </footer>
      <p className="drill-hint">
        Let the bit bite. Push gently and pull back when the steel turns red.
      </p>
      <span className="sr-only">
        Difficulty level {difficulty}. Drill heat {Math.round(heat)} percent.
        Progress {Math.round(depth)} percent.
      </span>
    </section>
  );
}

function Keypad({
  options,
  onClose,
  onInputLock,
}: {
  options: Record<string, unknown>;
  onClose: () => void;
  onInputLock: (locked: boolean) => void;
}) {
  const requestedTitle =
    typeof options.title === "string" ? options.title.trim() : "";
  const title = requestedTitle ? requestedTitle.slice(0, 32) : "Safe";
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const playFeedbackTone = useCallback((kind: "success" | "error") => {
    try {
      const context = new AudioContext();
      const gain = context.createGain();
      const now = context.currentTime;
      const frequencies = kind === "success" ? [520, 760] : [220, 170];

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.075, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      gain.connect(context.destination);

      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const startsAt = now + index * 0.13;
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(frequency, startsAt);
        oscillator.connect(gain);
        oscillator.start(startsAt);
        oscillator.stop(startsAt + 0.1);
      });

      window.setTimeout(() => void context.close(), 420);
    } catch {
      // Audio feedback is optional when the embedded browser blocks Web Audio.
    }
  }, []);

  const submit = useCallback(async () => {
    if (code.length !== 4 || submitting || feedback) return;
    setSubmitting(true);
    onInputLock(true);

    try {
      const response = (await nuiCallback("complete", {
        game: "keypad",
        code,
      })) as {
        feedback?: "success" | "error";
        close?: boolean;
      };
      const result = response.feedback;

      if (!result) {
        onClose();
        return;
      }

      setFeedback(result);
      playFeedbackTone(result);
      await new Promise((resolve) => window.setTimeout(resolve, 800));

      if (response.close) {
        await nuiCallback("keypadFeedbackComplete");
        onClose();
        return;
      }

      setCode("");
      setFeedback(null);
    } finally {
      setSubmitting(false);
      onInputLock(false);
    }
  }, [code, feedback, onClose, onInputLock, playFeedbackTone, submitting]);

  useEffect(() => () => onInputLock(false), [onInputLock]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (submitting || feedback) return;
      if (/^\d$/.test(event.key))
        setCode((current) => (current + event.key).slice(0, 4));
      if (event.key === "Backspace") setCode((current) => current.slice(0, -1));
      if (event.key === "Enter") void submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, submit, submitting]);

  const press = (key: string) => {
    if (submitting || feedback) return;
    if (key === "clear") return setCode("");
    if (key === "enter") return void submit();
    setCode((current) => (current + key).slice(0, 4));
  };

  return (
    <section className="fa-keypad" aria-label={`${title} keypad`}>
      <div className="fa-keypad__glow" aria-hidden="true" />
      <span
        className="fa-keypad__screw fa-keypad__screw--tl"
        aria-hidden="true"
      />
      <span
        className="fa-keypad__screw fa-keypad__screw--tr"
        aria-hidden="true"
      />
      <span
        className="fa-keypad__screw fa-keypad__screw--bl"
        aria-hidden="true"
      />
      <span
        className="fa-keypad__screw fa-keypad__screw--br"
        aria-hidden="true"
      />
      <header className="fa-keypad__header">
        <div className="fa-keypad__heading">
          <span>SECURITY KEYPAD</span>
          <h1>{title}</h1>
        </div>
        <div className="fa-keypad__speaker" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </header>
      <div
        className={`fa-keypad__display${feedback ? ` is-${feedback}` : ""}`}
        aria-live="polite"
      >
        <div className="fa-keypad__display-label">
          <span>ENTER SAFE CODE</span>
          <small>{code.length}/4</small>
        </div>
        <div
          className={`code-slots${feedback ? ` is-${feedback}` : ""}`}
          aria-label={`${code.length} of 4 digits entered`}
        >
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className={code[index] ? "is-filled" : ""}>
              {code[index] && <i />}
            </span>
          ))}
        </div>
      </div>
      <div className="fa-key-grid">
        {[
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "clear",
          "0",
          "enter",
        ].map((key) => (
          <button
            key={key}
            type="button"
            disabled={submitting || feedback !== null}
            aria-label={
              key === "clear"
                ? "Clear code"
                : key === "enter"
                  ? "Confirm code"
                  : `Digit ${key}`
            }
            className={
              key === "enter"
                ? "fa-key fa-key--confirm"
                : key === "clear"
                  ? "fa-key fa-key--utility"
                  : "fa-key"
            }
            onClick={() => press(key)}
          >
            {key === "clear" ? (
              "CLR"
            ) : key === "enter" ? (
              <svg
                className="fa-key__arrow"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M5 12h13.5M13.25 6.75 18.5 12l-5.25 5.25" />
              </svg>
            ) : (
              key
            )}
          </button>
        ))}
      </div>
      <footer className="fa-keypad__footer">
        <span>
          <kbd>ESC</kbd> CANCEL
        </span>
        <span>
          <kbd>ENTER</kbd> CONFIRM
        </span>
      </footer>
    </section>
  );
}

function App() {
  const [game, setGame] = useState<Game | null>(
    isBrowser ? browserMockGame : null,
  );
  const [options, setOptions] = useState<Record<string, unknown>>(
    browserMockCompact ? { compact: true } : {},
  );
  const inputLocked = useRef(false);

  const close = useCallback(() => setGame(null), []);
  const setInputLock = useCallback((locked: boolean) => {
    inputLocked.current = locked;
  }, []);
  const completeStandardGame = useCallback(
    async (success: boolean, data?: Record<string, unknown>) => {
      if (!game) return;
      await nuiCallback("complete", { game, success, data: data ?? {} });
      close();
    },
    [close, game],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<NuiMessage>) => {
      if (event.data.action === "close") return close();
      if (event.data.action === "open" && event.data.game) {
        setOptions(event.data.options ?? {});
        setGame(event.data.game);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !game || inputLocked.current) return;
      void nuiCallback("cancel").finally(close);
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
    };
  }, [close, game]);

  if (!game) return null;

  return (
    <main className="overlay">
      <div className="grain" />
      {isBrowser && (
        <nav className="mock-switch" aria-label="Browser mock selector">
          {gameNames.map((name) => (
            <button
              key={name}
              className={game === name ? "is-active" : ""}
              onClick={() => setGame(name)}
            >
              {name}
            </button>
          ))}
        </nav>
      )}
      {game === "drill" && <Drill options={options} onClose={close} />}
      {game === "keypad" && (
        <Keypad options={options} onClose={close} onInputLock={setInputLock} />
      )}
      {game === "skillbar" && (
        <Skillbar options={options} onComplete={completeStandardGame} />
      )}
      {game === "sequence" && (
        <Sequence options={options} onComplete={completeStandardGame} />
      )}
      {game === "lockpick" && (
        <Lockpick options={options} onComplete={completeStandardGame} />
      )}
      {game === "pattern" && (
        <Pattern options={options} onComplete={completeStandardGame} />
      )}
      {game === "wires" && (
        <Wires options={options} onComplete={completeStandardGame} />
      )}
      {game === "circuit" && (
        <Circuit options={options} onComplete={completeStandardGame} />
      )}
      {game === "fingerprint" && (
        <Fingerprint options={options} onComplete={completeStandardGame} />
      )}
      {game === "terminal" && (
        <Terminal options={options} onComplete={completeStandardGame} />
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
