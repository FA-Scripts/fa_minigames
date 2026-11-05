import { useEffect, useRef, useState } from 'react';
import { advanceHold, numberOption, tuningMatches } from './logic';
import { GamePanel, localeText, type GameProps } from './shared';

function createTarget() {
  return { frequency: 15 + Math.random() * 70, phase: 15 + Math.random() * 70 };
}

function wave(frequency: number, phase: number) {
  return Array.from({ length: 241 }, (_, i) => {
    const x = i * 2;
    const y = 85 + Math.sin(i / 240 * Math.PI * (2 + frequency / 10) + phase / 100 * Math.PI * 2) * 55;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function FrequencyTuning({ options, onComplete }: GameProps) {
  const rounds = numberOption(options.rounds, 2, 1, 8, true);
  const tolerance = numberOption(options.tolerance, 5, 1, 15);
  const holdDuration = numberOption(options.holdDuration, 1500, 250, 10000, true);
  const [target, setTarget] = useState(createTarget);
  const [frequency, setFrequency] = useState(0);
  const [phase, setPhase] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [progress, setProgress] = useState(0);
  const held = useRef(0);
  const finished = useRef(false);
  const started = useRef(performance.now());
  const text = (key: string, fallback: string) => localeText(options, key, fallback);
  const matched = tuningMatches(frequency, phase, target, tolerance);
  const live = useRef({ matched, completed });
  live.current = { matched, completed };

  useEffect(() => {
    let previous = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      if (!finished.current) {
        // A suspended/background frame cannot count as a continuous hold.
        held.current = advanceHold(held.current, elapsed, live.current.matched && elapsed < 250);
        setProgress(Math.min(held.current / holdDuration, 1));
        if (held.current >= holdDuration) {
          const next = live.current.completed + 1;
          held.current = 0;
          live.current = { matched: false, completed: next };
          setCompleted(next);
          setProgress(0);
          if (next === rounds) {
            finished.current = true;
            onComplete(true, { completedStages: next, elapsedMs: Math.round(now - started.current) });
          } else {
            setTarget(createTarget());
            setFrequency(0);
            setPhase(0);
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [holdDuration, onComplete, rounds]);

  return <GamePanel eyebrow={text('frequencyEyebrow', 'SIGNAL // FA-73')} title={text('frequencyTitle', 'Tune the carrier')}
    status={localeText(options, 'frequencyStatus', 'CHANNEL {round}/{rounds}', { round: Math.min(completed + 1, rounds), rounds })}
    instructions={text('frequencyInstructions', 'Match frequency and phase to the reference. Keep both aligned until the signal locks.')}
    cancelLabel={text('cancel', 'CANCEL')}>
    <div className="frequency-layout">
      <div className="wave-legend"><span>{text('frequencyReference', 'REFERENCE')}</span><span>{text('frequencyCurrent', 'YOUR SIGNAL')}</span></div>
      <svg className={`frequency-scope${matched ? ' is-matched' : ''}`} viewBox="0 0 480 170" role="img" aria-label={text('frequencyWave', 'Reference and current signal waveforms')}>
        <path d="M0 85 H480 M120 0 V170 M240 0 V170 M360 0 V170" className="scope-grid" />
        <path d={wave(target.frequency, target.phase)} className="wave-reference" />
        <path d={wave(frequency, phase)} className="wave-current" />
      </svg>
      <div className="tuning-controls">
        <label>{text('frequencyFrequency', 'FREQUENCY')} <output>{frequency}%</output>
          <input autoFocus type="range" min={0} max={100} value={frequency} onChange={event => {
            const next = Number(event.target.value);
            if (!tuningMatches(next, phase, target, tolerance)) held.current = 0;
            setFrequency(next);
          }} />
        </label>
        <label>{text('frequencyPhase', 'PHASE')} <output>{phase}%</output>
          <input type="range" min={0} max={100} value={phase} onChange={event => {
            const next = Number(event.target.value);
            if (!tuningMatches(frequency, next, target, tolerance)) held.current = 0;
            setPhase(next);
          }} />
        </label>
      </div>
      <label className="instrument-note" htmlFor="frequency-hold">{matched ? text('frequencyHolding', 'HOLD STEADY') : text('frequencySearching', 'SEARCHING FOR ALIGNMENT')}</label>
      <progress id="frequency-hold" max={1} value={progress} />
    </div>
  </GamePanel>;
}
