import { useRef, useState } from "react";
import { GamePanel, localeText, type GameProps } from "./shared";

import { circuitConnected, createCircuit, directions, numberOption } from "./logic";

export function Circuit({ options, onComplete }: GameProps) {
  const size = numberOption(options.size, 4, 3, 5, true);
  const [board] = useState(() => createCircuit(size));
  const [tiles, setTiles] = useState(board.tiles);
  const moveLimit = board.moveLimit;
  const finished = useRef(false);
  const [moves, setMoves] = useState(moveLimit);
  const rotate = (index: number) => {
    if (finished.current) return;
    const next = tiles.map((tile, tileIndex) =>
      tileIndex === index
        ? { ...tile, rotation: (tile.rotation + 1) % 4 }
        : tile,
    );
    const remaining = moves - 1;
    setTiles(next);
    setMoves(remaining);
    const success = circuitConnected(next, size);
    if (success || remaining <= 0) {
      finished.current = true;
      onComplete(success, { movesUsed: moveLimit - remaining });
    }
  };
  return (
    <GamePanel
      eyebrow={localeText(options, "circuitEyebrow", "POWER ROUTER // FA-24")}
      title={localeText(options, "circuitTitle", "Close the circuit")}
      status={localeText(options, "circuitStatus", "{moves} TURNS", { moves })}
      instructions={localeText(options, "circuitInstructions", "Build one continuous powered route from INPUT to OUTPUT.")}
      cancelLabel={localeText(options, "cancel", "CANCEL")}
    >
      <div
        className="circuit-board"
      >
        <span className="circuit-terminal circuit-terminal--in">
          {localeText(options, "circuitInput", "INPUT")}
          <i />
        </span>
        <div
          className="circuit-grid"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {tiles.map((tile, index) => (
            <button
              key={index}
              onClick={() => rotate(index)}
              aria-label={localeText(options, "circuitTile", "Rotate circuit tile {tile}", { tile: index + 1 })}
            >
              <span style={{ transform: `rotate(${tile.rotation * 90}deg)` }}>
                {directions.map(
                  (side) =>
                    tile.exits.includes(side) && (
                      <i key={side} className={`trace trace--${side}`} />
                    ),
                )}
                <b />
              </span>
            </button>
          ))}
        </div>
        <span className="circuit-terminal circuit-terminal--out">
          <i />
          {localeText(options, "circuitOutput", "OUTPUT")}
        </span>
      </div>
    </GamePanel>
  );
}
