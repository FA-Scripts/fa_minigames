import { useEffect, useMemo, useRef, useState } from "react";
import { clampOption, GamePanel, localeText, shuffle, type GameProps } from "./shared";

function makeCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}
function makeBoard(target: string, count: number) {
  return shuffle([target, ...Array.from({ length: count - 1 }, makeCode)]);
}

export function Terminal({ options, onComplete }: GameProps) {
  const count = clampOption(options, "entries", 20, 12, 30);
  const rounds = clampOption(options, "rounds", 3, 1, 6);
  const refreshInterval = clampOption(
    options,
    "refreshInterval",
    10000,
    1000,
    60000,
  );
  const timeLimit = clampOption(options, "timeLimit", 60000, 5000, 300000);
  const initialTarget = useMemo(makeCode, []);
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState(initialTarget);
  const [entries, setEntries] = useState(() => makeBoard(initialTarget, count));
  const [clock, setClock] = useState({
    remaining: timeLimit,
    refresh: refreshInterval,
  });
  const deadline = useRef(Date.now() + timeLimit);
  const nextRefresh = useRef(Date.now() + refreshInterval);
  const finished = useRef(false);
  const serials = useMemo(
    () =>
      Array.from(
        { length: count },
        (_, index) => `0x${(4096 + index * 16).toString(16)}`,
      ),
    [count],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, deadline.current - now);
      if (now >= nextRefresh.current) {
        nextRefresh.current = now + refreshInterval;
        setEntries(makeBoard(target, count));
      }
      setClock({ remaining, refresh: Math.max(0, nextRefresh.current - now) });
      if (remaining <= 0 && !finished.current) {
        finished.current = true;
        onComplete(false, { reason: "time_limit", roundsCompleted: round - 1 });
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [count, onComplete, refreshInterval, round, target]);

  const select = (entry: string) => {
    if (entry !== target || finished.current)
      return onComplete(false, { roundsCompleted: round - 1 });
    if (round >= rounds) {
      finished.current = true;
      return onComplete(true, { roundsCompleted: rounds });
    }
    const nextTarget = makeCode();
    setRound((value) => value + 1);
    setTarget(nextTarget);
    setEntries(makeBoard(nextTarget, count));
    nextRefresh.current = Date.now() + refreshInterval;
  };

  const seconds = Math.ceil(clock.remaining / 1000);
  return (
    <GamePanel
      eyebrow={localeText(options, "terminalEyebrow", "PACKET SNIFFER // FA-40")}
      title={localeText(options, "terminalTitle", "Trace the access token")}
      status={localeText(options, "terminalStatus", "TRACE {round}/{rounds}", { round, rounds })}
      instructions={localeText(options, "terminalInstructions", "Find the requested token before the table refreshes or the session expires.")}
      cancelLabel={localeText(options, "cancel", "CANCEL")}
    >
      <div className="terminal">
        <div className="terminal__target">
          <span>{localeText(options, "terminalWatch", "WATCH TOKEN")}</span>
          <strong>{target}</strong>
          <div>
            <b>
              {localeText(options, "terminalTime", "TIME")} {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </b>
            <b>{localeText(options, "terminalRefresh", "REFRESH")} {(clock.refresh / 1000).toFixed(1)}s</b>
          </div>
          <i />
        </div>
        <div className="terminal-grid">
          {entries.map((entry, index) => (
            <button
              key={`${serials[index]}-${entry}`}
              onClick={() => select(entry)}
            >
              <span>{serials[index]}</span>
              <b>{entry}</b>
              <i style={{ animationDuration: `${refreshInterval}ms` }} />
            </button>
          ))}
        </div>
      </div>
    </GamePanel>
  );
}
