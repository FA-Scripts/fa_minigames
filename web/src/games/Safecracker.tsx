import { useEffect, useRef, useState } from 'react';
import { angleDistance, numberOption, safePositionMatches, safeTurnOutcome } from './logic';
import { GamePanel, localeText, type GameProps } from './shared';

export function Safecracker({ options, onComplete }: GameProps) {
  const positions = numberOption(options.positions, 4, 1, 8, true);
  const tolerance = numberOption(options.tolerance, 7, 2, 20);
  const maxErrors = numberOption(options.maxErrors, 2, 0, 10, true);
  const [targets] = useState(() => Array.from({ length: positions }, () => 30 + Math.random() * 300));
  const [angle, setAngle] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState('');
  const direction = useRef(0);
  const currentAngle = useRef(0);
  const currentCompleted = useRef(0);
  const currentErrors = useRef(0);
  const wrongTurnActive = useRef(false);
  const held = useRef(new Set<string>());
  const drag = useRef<number | null>(null);
  const dial = useRef<HTMLDivElement | null>(null);
  const finished = useRef(false);
  const started = useRef(performance.now());
  const requiredDirection = completed % 2 === 0 ? 1 : -1;
  const text = (key: string, fallback: string) => localeText(options, key, fallback);
  const turn = (delta: number) => {
    if (!delta || finished.current) return;

    const outcome = safeTurnOutcome(delta, currentCompleted.current % 2 === 0 ? 1 : -1, wrongTurnActive.current);
    if (outcome.newError) {
      const nextErrors = ++currentErrors.current;
      direction.current = 0;
      setErrors(nextErrors);
      setFeedback(text('safeWrongDirection', 'WRONG DIRECTION — turn the dial as indicated.'));
      if (nextErrors > maxErrors) {
        finished.current = true;
        onComplete(false, {
          completedStages: currentCompleted.current, errors: nextErrors,
          elapsedMs: Math.round(performance.now() - started.current),
        });
      }
    }
    if (outcome.allowed && wrongTurnActive.current) setFeedback('');
    wrongTurnActive.current = outcome.wrongTurnActive;
    if (!outcome.allowed) return;

    direction.current = Math.sign(delta);
    currentAngle.current = (currentAngle.current + delta + 360) % 360;
    setAngle(currentAngle.current);
  };
  const confirm = () => {
    if (finished.current) return;
    const position = currentCompleted.current;
    const correct = safePositionMatches(currentAngle.current, targets[position], tolerance, direction.current, position % 2 === 0 ? 1 : -1);
    const nextCompleted = position + (correct ? 1 : 0);
    const nextErrors = currentErrors.current + (correct ? 0 : 1);
    currentCompleted.current = nextCompleted;
    currentErrors.current = nextErrors;
    wrongTurnActive.current = false;
    held.current.clear();
    setCompleted(nextCompleted);
    setErrors(nextErrors);
    direction.current = 0;
    setFeedback(correct ? text('safeAccepted', 'POSITION ACCEPTED') : text('safeMiss', 'POSITION MISSED — follow the direction and proximity indicator.'));
    if (nextCompleted === positions || nextErrors > maxErrors) {
      finished.current = true;
      onComplete(nextCompleted === positions, {
        completedStages: nextCompleted, errors: nextErrors,
        elapsedMs: Math.round(performance.now() - started.current),
      });
    }
  };

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'd') {
        event.preventDefault();
        if (!event.repeat) held.current.add(key);
      }
      if (key === 'enter' && !event.repeat) {
        event.preventDefault();
        confirm();
      }
    };
    const up = (event: KeyboardEvent) => held.current.delete(event.key.toLowerCase());
    const blur = () => held.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  });

  useEffect(() => {
    dial.current?.focus();
    let previous = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 50) * 0.09;
      previous = now;
      turn((Number(held.current.has('d')) - Number(held.current.has('a'))) * delta);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const proximity = Math.max(0, 100 - angleDistance(angle, targets[completed] ?? angle) / 1.8);
  return <GamePanel eyebrow={text('safeEyebrow', 'VAULT // FA-62')} title={text('safeTitle', 'Find the combination')}
    status={localeText(options, 'safeStatus', '{completed}/{positions} POSITIONS · {errors}/{maxErrors} ERRORS', { completed, positions, errors, maxErrors })}
    instructions={text('safeInstructions', 'Turn with A/D or drag the dial. Follow the direction. Confirm near the binding point with Enter.')}
    cancelLabel={text('cancel', 'CANCEL')}>
    <div className="safe-layout">
      <div ref={dial} className="safe-dial" role="slider" tabIndex={0} aria-valuemin={0} aria-valuemax={359}
        aria-valuenow={Math.round(angle) % 360} aria-label={text('safeDial', 'Safe dial')}
        onKeyDown={event => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          turn(event.key === 'ArrowLeft' ? -1 : 1);
        }}
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = event.currentTarget.getBoundingClientRect();
          drag.current = Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI;
        }}
        onPointerMove={event => {
          if (drag.current === null) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const next = Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI;
          const delta = ((next - drag.current + 540) % 360) - 180;
          drag.current = next;
          turn(delta);
        }} onPointerUp={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
        <svg viewBox="0 0 260 260" aria-hidden="true">
          <circle cx="130" cy="130" r="118" className="dial-rim" />
          {Array.from({ length: 60 }, (_, index) => <path key={index} d={`M130 ${index % 5 === 0 ? 20 : 25} V32`} transform={`rotate(${index * 6} 130 130)`} />)}
          <g transform={`rotate(${angle} 130 130)`}><circle cx="130" cy="130" r="86" /><path d="M130 52 V76" className="dial-pointer" /></g>
        </svg>
        <output>{String(Math.round(angle) % 360).padStart(3, '0')}°</output>
      </div>
      <div className="safe-readout">
        <strong>{requiredDirection === 1 ? text('safeClockwise', 'CLOCKWISE · D') : text('safeCounterclockwise', 'COUNTERCLOCKWISE · A')}</strong>
        <label htmlFor="safe-proximity">{text('safeProximity', 'BINDING PROXIMITY')}</label>
        <progress id="safe-proximity" max={100} value={proximity} />
        <button className="instrument-action" onClick={confirm}>{text('confirm', 'CONFIRM')}</button>
        <p className="instrument-note" role="status">{feedback || text('safeHint', 'A stronger signal means the binding point is closer.')}</p>
      </div>
    </div>
  </GamePanel>;
}
