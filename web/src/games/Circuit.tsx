import { useMemo, useState } from "react";
import { clampOption, GamePanel, localeText, type GameProps } from "./shared";

type Direction = "n" | "e" | "s" | "w";
type Tile = { exits: Direction[]; rotation: number };

function isStraight(tile: Tile) {
  return (
    (tile.exits.includes("n") && tile.exits.includes("s")) ||
    (tile.exits.includes("e") && tile.exits.includes("w"))
  );
}

function isTileSolved(tile: Tile) {
  return isStraight(tile) ? tile.rotation % 2 === 0 : tile.rotation === 0;
}

function direction(from: [number, number], to: [number, number]): Direction {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (dx === 1) return "e";
  if (dx === -1) return "w";
  if (dy === 1) return "s";
  return "n";
}

function createBoard(size: number): Tile[] {
  const route: [number, number][] = [];
  for (let row = 0; row < size; row += 1) {
    const columns = Array.from({ length: size }, (_, index) =>
      row % 2 === 0 ? index : size - 1 - index,
    );
    columns.forEach((column) => route.push([column, row]));
  }
  const board: Tile[] = Array(size * size);
  route.forEach((cell, index) => {
    const before: [number, number] = index === 0 ? [-1, 0] : route[index - 1];
    const after: [number, number] =
      index === route.length - 1
        ? [cell[0] === 0 ? -1 : size, size - 1]
        : route[index + 1];
    board[cell[1] * size + cell[0]] = {
      exits: [direction(cell, before), direction(cell, after)],
      rotation: 1 + Math.floor(Math.random() * 3),
    };
  });
  return board;
}

export function Circuit({ options, onComplete }: GameProps) {
  const size = clampOption(options, "size", 4, 3, 5);
  const [tiles, setTiles] = useState(() => createBoard(size));
  const moveLimit = size * size * 3;
  const [moves, setMoves] = useState(moveLimit);
  const rotate = (index: number) => {
    const next = tiles.map((tile, tileIndex) =>
      tileIndex === index
        ? { ...tile, rotation: (tile.rotation + 1) % 4 }
        : tile,
    );
    const remaining = moves - 1;
    setTiles(next);
    setMoves(remaining);
    if (next.every(isTileSolved))
      return onComplete(true, { movesUsed: moveLimit - remaining });
    if (remaining <= 0) onComplete(false);
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
        className={`circuit-board${size % 2 === 0 ? " has-left-output" : ""}`}
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
              aria-label={`Rotate circuit tile ${index + 1}`}
            >
              <span style={{ transform: `rotate(${tile.rotation * 90}deg)` }}>
                {(["n", "e", "s", "w"] as Direction[]).map(
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
