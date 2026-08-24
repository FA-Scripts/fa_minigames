import { useMemo, useRef, useState } from "react";
import { clampOption, GamePanel, shuffle, type GameProps } from "./shared";

const availableChannels = ["A", "B", "C", "D", "E"];
type Point = { x: number; y: number };

export function Wires({ options, onComplete }: GameProps) {
  const channelCount = clampOption(options, "channels", 4, 3, 5);
  const channels = useMemo(
    () => availableChannels.slice(0, channelCount),
    [channelCount],
  );
  const order = useMemo(() => shuffle(channels), [channels]);
  const board = useRef<HTMLDivElement>(null);
  const sockets = useRef<Record<string, HTMLButtonElement | null>>({});
  const [drag, setDrag] = useState<{ channel: string; point: Point } | null>(
    null,
  );
  const [joined, setJoined] = useState<string[]>([]);

  const socketPoint = (side: "left" | "right", channel: string): Point => {
    const panel = board.current?.getBoundingClientRect();
    const socket =
      sockets.current[`${side}-${channel}`]?.getBoundingClientRect();
    if (!panel || !socket) return { x: 0, y: 0 };
    return {
      x: (side === "left" ? socket.right : socket.left) - panel.left,
      y: socket.top + socket.height / 2 - panel.top,
    };
  };

  const move = (event: React.PointerEvent) => {
    if (!drag || !board.current) return;
    const rect = board.current.getBoundingClientRect();
    setDrag({
      ...drag,
      point: { x: event.clientX - rect.left, y: event.clientY - rect.top },
    });
  };

  const connect = (target: string) => {
    if (!drag) return;
    if (drag.channel !== target)
      return onComplete(false, { connections: joined.length });
    const next = [...joined, target];
    setJoined(next);
    setDrag(null);
    if (next.length === channels.length)
      onComplete(true, { connections: next.length });
  };

  const path = (start: Point, end: Point) =>
    `M ${start.x} ${start.y} C ${start.x + 80} ${start.y}, ${end.x - 80} ${end.y}, ${end.x} ${end.y}`;

  return (
    <GamePanel
      eyebrow="BYPASS HARNESS // FA-11"
      title="Patch the live harness"
      status={`${joined.length}/${channels.length} LINKED`}
      instructions="Drag each loose lead into the socket carrying the same channel label."
    >
      <div
        className="wire-board"
        ref={board}
        onPointerMove={move}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        <svg aria-hidden="true">
          {joined.map((channel) => (
            <path
              key={channel}
              className={`cable cable--${channel.toLowerCase()}`}
              d={path(
                socketPoint("left", channel),
                socketPoint("right", channel),
              )}
            />
          ))}
          {drag && (
            <path
              className={`cable cable--${drag.channel.toLowerCase()} is-dragging`}
              d={path(socketPoint("left", drag.channel), drag.point)}
            />
          )}
        </svg>
        <div className="wire-bank wire-bank--source">
          {channels.map((channel) => (
            <button
              key={channel}
              ref={(node) => {
                sockets.current[`left-${channel}`] = node;
              }}
              disabled={joined.includes(channel)}
              onPointerDown={() =>
                setDrag({ channel, point: socketPoint("left", channel) })
              }
            >
              <span>FEED {channel}</span>
              <i className={`socket socket--${channel.toLowerCase()}`} />
            </button>
          ))}
        </div>
        <div className="wire-board__channel">
          <span>LIVE PATCH BAY</span>
          <i />
          <i />
          <i />
        </div>
        <div className="wire-bank wire-bank--target">
          {order.map((channel) => (
            <button
              key={channel}
              ref={(node) => {
                sockets.current[`right-${channel}`] = node;
              }}
              disabled={joined.includes(channel)}
              onPointerUp={() => connect(channel)}
            >
              <i className={`socket socket--${channel.toLowerCase()}`} />
              <span>BUS {channel}</span>
            </button>
          ))}
        </div>
      </div>
    </GamePanel>
  );
}
