export function numberOption(value: unknown, fallback: number, min: number, max: number, integer = false) {
  const parsed = typeof value === 'number' ? value : Number.NaN;
  const bounded = Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback));
  return integer ? Math.round(bounded) : bounded;
}

export function shuffled<T>(values: T[], random = Math.random): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function neighbors(index: number, size: number) {
  const row = Math.floor(index / size);
  const column = index % size;
  return [row > 0 ? index - size : -1, column < size - 1 ? index + 1 : -1,
    row < size - 1 ? index + size : -1, column > 0 ? index - 1 : -1].filter(value => value >= 0);
}

// A randomized DFS tree guarantees a simple path between opposite corners.
export function createRoute(size: number, random = Math.random): number[] {
  const visited = new Set<number>([0]);
  const route = [0];
  while (route[route.length - 1] !== size * size - 1) {
    const head = route[route.length - 1];
    const next = shuffled(neighbors(head, size).filter(cell => !visited.has(cell)), random)[0];
    if (next === undefined) {
      route.pop();
    } else {
      visited.add(next);
      route.push(next);
    }
  }
  return route;
}

export function networkStep(route: number[], completed: number, errors: number, maxErrors: number, selected: number, size: number) {
  const current = route[completed - 1];
  if (!neighbors(current, size).includes(selected) || route.slice(0, completed).includes(selected)) {
    return { completed, errors, failed: false };
  }
  const correct = selected === route[completed];
  const nextErrors = errors + (correct ? 0 : 1);
  return { completed: completed + (correct ? 1 : 0), errors: nextErrors, failed: nextErrors > maxErrors };
}

export function angleDistance(a: number, b: number) {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export function safePositionMatches(angle: number, target: number, tolerance: number, lastDirection: number, requiredDirection: number) {
  return lastDirection === requiredDirection && angleDistance(angle, target) <= tolerance;
}

export function safeTurnOutcome(delta: number, requiredDirection: number, wrongTurnActive: boolean) {
  if (delta === 0) return { allowed: false, newError: false, wrongTurnActive };

  const wrong = Math.sign(delta) !== requiredDirection;
  return { allowed: !wrong, newError: wrong && !wrongTurnActive, wrongTurnActive: wrong };
}

export function tuningMatches(frequency: number, phase: number, target: { frequency: number; phase: number }, tolerance: number) {
  return Math.abs(frequency - target.frequency) <= tolerance && Math.abs(phase - target.phase) <= tolerance;
}

export function advanceHold(previous: number, elapsed: number, matched: boolean) {
  return matched ? previous + elapsed : 0;
}

export const directions = ['n', 'e', 's', 'w'] as const;
export type Direction = typeof directions[number];
export type CircuitTile = { exits: Direction[]; rotation: number };

function direction(from: number, to: number): Direction {
  if (to === from + 1) return 'e';
  if (to === from - 1) return 'w';
  return to > from ? 's' : 'n';
}

export function rotatedExits(tile: CircuitTile): Direction[] {
  return tile.exits.map(exit => directions[(directions.indexOf(exit) + tile.rotation) % 4]);
}

export function circuitConnected(tiles: CircuitTile[], size: number) {
  if (!rotatedExits(tiles[0]).includes('w')) return false;
  const visited = new Set<number>();
  const pending = [0];
  while (pending.length) {
    const cell = pending.pop();
    if (cell === undefined || visited.has(cell)) continue;
    visited.add(cell);
    const exits = rotatedExits(tiles[cell]);
    if (cell === tiles.length - 1 && exits.includes('e')) return true;
    for (const next of neighbors(cell, size)) {
      const side = direction(cell, next);
      const opposite = directions[(directions.indexOf(side) + 2) % 4];
      if (exits.includes(side) && rotatedExits(tiles[next]).includes(opposite)) pending.push(next);
    }
  }
  return false;
}

export function createCircuit(size: number, random = Math.random) {
  const route = createRoute(size, random);
  const tiles: CircuitTile[] = Array.from({ length: size * size }, () => ({
    exits: shuffled<Direction>(['n', 'e', 's', 'w'], random).slice(0, 2),
    rotation: Math.floor(random() * 4),
  }));
  route.forEach((cell, index) => {
    tiles[cell] = {
      exits: [index === 0 ? 'w' : direction(cell, route[index - 1]),
        index === route.length - 1 ? 'e' : direction(cell, route[index + 1])],
      rotation: Math.floor(random() * 4),
    };
  });
  if (circuitConnected(tiles, size)) tiles[0].rotation = (tiles[0].rotation + 1) % 4;
  const solutionMoves = route.reduce((sum, cell) => sum + (4 - tiles[cell].rotation) % 4, 0);
  return { tiles, route, moveLimit: Math.max(solutionMoves + size * 2, size * size) };
}
