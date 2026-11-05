import { useEffect, useRef, useState } from 'react';
import { GamePanel, localeText, type GameProps } from './shared';
import { createRoute, neighbors, networkStep, numberOption } from './logic';

export function NetworkHack({ options, onComplete }: GameProps) {
  const size = numberOption(options.size, 5, 4, 6, true);
  const previewDuration = numberOption(options.previewDuration, 2200, 500, 10000, true);
  const maxErrors = numberOption(options.maxErrors, 1, 0, 10, true);
  const [route] = useState(() => createRoute(size));
  const [preview, setPreview] = useState(true);
  const [state, setState] = useState({ completed: 1, errors: 0, failed: false });
  const [cursor, setCursor] = useState(0);
  const [lastError, setLastError] = useState<number | null>(null);
  const started = useRef(performance.now());
  const finished = useRef(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const text = (key: string, fallback: string) => localeText(options, key, fallback);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreview(false), previewDuration);
    return () => window.clearTimeout(timer);
  }, [previewDuration]);

  const select = (cell: number) => {
    if (preview || finished.current) return;
    const next = networkStep(route, state.completed, state.errors, maxErrors, cell, size);
    if (next.errors > state.errors) setLastError(cell);
    else if (next.completed > state.completed) setLastError(null);
    setState(next);
    if (next.failed || next.completed === route.length) {
      finished.current = true;
      onComplete(!next.failed, {
        completedStages: next.completed - 1, errors: next.errors,
        elapsedMs: Math.round(performance.now() - started.current),
      });
    }
  };

  return (
    <GamePanel eyebrow={text('networkEyebrow', 'NETWORK // FA-51')} title={text('networkTitle', 'Trace the safe route')}
      status={preview ? text('networkPreview', 'MEMORIZE THE ROUTE') : localeText(options, 'networkStatus', '{errors}/{maxErrors} ERRORS', { errors: state.errors, maxErrors })}
      instructions={text('networkInstructions', 'Memorize the route. Select adjacent nodes with the mouse or arrow keys and Enter.')}
      cancelLabel={text('cancel', 'CANCEL')}>
      <div className="network-layout">
        <div className="network-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          role="group" aria-label={text('networkGrid', 'Network nodes')}
          onKeyDown={event => {
            const offsets: Record<string, number> = { ArrowUp: -size, ArrowDown: size, ArrowLeft: -1, ArrowRight: 1 };
            const offset = offsets[event.key];
            if (offset === undefined) return;
            event.preventDefault();
            const next = cursor + offset;
            if (neighbors(cursor, size).includes(next)) {
              setCursor(next);
              buttons.current[next]?.focus();
            }
          }}>
          {Array.from({ length: size * size }, (_, cell) => {
            const visited = route.slice(0, state.completed).includes(cell);
            const shown = preview && route.includes(cell);
            const current = cell === route[state.completed - 1];
            return <button key={cell} ref={element => { buttons.current[cell] = element; }}
              className={`network-node${shown || visited ? ' is-safe' : ''}${current ? ' is-current' : ''}${lastError === cell ? ' is-error' : ''}`}
              tabIndex={cell === cursor ? 0 : -1} autoFocus={cell === 0} onFocus={() => setCursor(cell)}
              onClick={() => select(cell)} aria-disabled={preview} aria-current={current ? 'step' : undefined}
              aria-label={localeText(options, 'networkNode', 'Node {node}', { node: cell + 1 })}>
              {cell === 0 ? text('networkInput', 'IN') : cell === size * size - 1 ? text('networkOutput', 'OUT') : String(cell + 1).padStart(2, '0')}
              {shown && <small>{route.indexOf(cell) + 1}</small>}
            </button>;
          })}
        </div>
        <p className="instrument-note" role="status">{lastError === null
          ? text('networkHint', 'Safe nodes stay revealed. Follow the route in order.')
          : text('networkAlarm', 'ALARM — that node is outside the route. Try another neighbor.')}</p>
      </div>
    </GamePanel>
  );
}
