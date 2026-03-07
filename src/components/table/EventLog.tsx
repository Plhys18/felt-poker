import { useState } from 'react';
import { useSessionStore } from '../../store/session-store';
import { selectEvents } from '../../store/selectors';
import type { PlayerId } from '../../types/ids';
import type { GameEvent } from '../../types/events';
import { formatTime } from '../../lib/format';
import { formatChips } from '../../engine/currency';

const COLLAPSED_COUNT = 5;

interface EventLogProps {
  playerNames: Record<PlayerId, string>;
}

function formatEvent(
  event: GameEvent,
  playerNames: Record<string, string>,
): string {
  switch (event.type) {
    case 'GAME_STARTED':
      return 'Game started';
    case 'BUY_IN': {
      const name = playerNames[event.playerId] ?? 'Unknown';
      return `${name} bought in for ${formatChips(event.chipsReceived)} chips`;
    }
    case 'STACK_UPDATE': {
      const name = playerNames[event.playerId] ?? 'Unknown';
      return `${name}: ${event.previousStack} \u2192 ${event.newStack} chips`;
    }
    case 'CASH_OUT': {
      const name = playerNames[event.playerId] ?? 'Unknown';
      return `${name} cashed out (${event.finalStack} chips)`;
    }
    case 'REJOIN': {
      const name = playerNames[event.playerId] ?? 'Unknown';
      return `${name} rejoined`;
    }
    case 'SESSION_SETTLED':
      return 'Session settled';
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      return 'Unknown event';
    }
  }
}

function eventEmoji(event: GameEvent): string {
  switch (event.type) {
    case 'GAME_STARTED':
      return '\uD83C\uDFB0';
    case 'BUY_IN':
      return '\uD83C\uDFB4';
    case 'STACK_UPDATE':
      return '\uD83D\uDCCA';
    case 'CASH_OUT':
      return '\uD83D\uDCB0';
    case 'REJOIN':
      return '\u21A9\uFE0F';
    case 'SESSION_SETTLED':
      return '\u2705';
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      return '\u2022';
    }
  }
}

export function EventLog({ playerNames }: EventLogProps) {
  const allEvents = useSessionStore(selectEvents);
  const reversed = [...allEvents].reverse();
  const [expanded, setExpanded] = useState(false);

  if (reversed.length === 0) {
    return (
      <div className="bg-white/5 rounded-2xl border border-white/10 p-5 text-center">
        <p className="text-white/30 text-sm">No events yet</p>
      </div>
    );
  }

  const visible = expanded ? reversed : reversed.slice(0, COLLAPSED_COUNT);
  const hiddenCount = reversed.length - COLLAPSED_COUNT;

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wide">
          Event Log
        </h3>
      </div>
      <ul className="divide-y divide-white/5">
        {visible.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between px-4 py-2.5 gap-3"
          >
            <span className="text-base flex-shrink-0">{eventEmoji(event)}</span>
            <span className="flex-1 text-white/80 text-sm min-w-0 truncate">
              {formatEvent(event, playerNames)}
            </span>
            <span className="text-white/30 text-xs flex-shrink-0 tabular-nums">
              {formatTime(event.timestamp)}
            </span>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full px-4 py-2.5 text-white/40 text-xs font-semibold hover:text-white/70 hover:bg-white/5 transition-colors border-t border-white/5"
        >
          {expanded ? 'Show less' : `Show ${hiddenCount} more event${hiddenCount !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
