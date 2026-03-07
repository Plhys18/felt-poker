import { useState } from 'react';
import { useSessionStore } from '../../store/session-store';
import type { Tab } from '../../hooks/use-tab';
import { newPlayerId, newSessionId } from '../../types/ids';
import type { PlayerConfig, SessionConfig as ISessionConfig } from '../../types/session';
import { Button } from '../ui/Button';
import { PlusIcon } from '../ui/icons';
import { PlayerInput } from './PlayerInput';
import { SessionConfig } from './SessionConfig';

interface SetupViewProps {
  setTab: (tab: Tab) => void;
}

interface PlayerDraft {
  localId: string;
  name: string;
}

function makePlayer(): PlayerDraft {
  return { localId: crypto.randomUUID(), name: '' };
}

export function SetupView({ setTab }: SetupViewProps) {
  const createSession = useSessionStore((s) => s.createSession);

  const [sessionName, setSessionName] = useState('');
  const [buyIn, setBuyIn] = useState(150);
  const [players, setPlayers] = useState<PlayerDraft[]>([makePlayer(), makePlayer()]);

  function addPlayers() {
    setPlayers((prev) => {
      const remaining = 12 - prev.length;
      if (remaining <= 0) return prev;
      const toAdd = Math.min(5, remaining);
      return [...prev, ...Array.from({ length: toAdd }, makePlayer)];
    });
  }

  function removePlayer(localId: string) {
    setPlayers((prev) => prev.filter((p) => p.localId !== localId));
  }

  function updatePlayerName(localId: string, name: string) {
    setPlayers((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, name } : p)),
    );
  }

  const namedPlayers = players.filter((p) => p.name.trim().length > 0);
  const canStart = sessionName.trim().length > 0 && namedPlayers.length >= 2;

  function handleStart() {
    if (!canStart) return;

    const sessionId = newSessionId();
    const config: ISessionConfig = {
      id: sessionId,
      name: sessionName.trim(),
      defaultBuyIn: buyIn,
      createdAt: Date.now(),
    };

    const playerConfigs: PlayerConfig[] = namedPlayers.map((p, i) => ({
      id: newPlayerId(),
      name: p.name.trim(),
      seatIndex: i,
    }));

    createSession(config, playerConfigs);
    setTab('table');
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center">
      {/* Hero */}
      <div className="pt-4 pb-8 text-center">
        <h1 className="text-5xl font-black text-gold tracking-tight mb-2 drop-shadow-[0_0_20px_rgba(201,168,76,0.4)]">Felt</h1>
        <p className="text-white/40 text-sm">Home poker tracker</p>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Two-column grid on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Session config */}
          <div className="bg-white/[0.07] rounded-2xl border border-white/10 p-5 shadow-lg shadow-black/20">
            <h2 className="text-white font-bold text-base mb-4">Session Details</h2>
            <SessionConfig
              name={sessionName}
              onNameChange={setSessionName}
              buyIn={buyIn}
              onBuyInChange={setBuyIn}
            />
          </div>

          {/* Players */}
          <div className="bg-white/[0.07] rounded-2xl border border-white/10 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base">
                Players{' '}
                <span className="text-white/40 font-normal text-sm">
                  ({players.length}/12)
                </span>
              </h2>
            </div>

            <div className="space-y-2.5">
              {players.map((p, i) => (
                <PlayerInput
                  key={p.localId}
                  index={i}
                  name={p.name}
                  onChange={(name) => updatePlayerName(p.localId, name)}
                  onRemove={() => removePlayer(p.localId)}
                />
              ))}
            </div>

            {players.length < 12 && (
              <button
                type="button"
                onClick={addPlayers}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors text-sm font-medium min-h-[44px]"
              >
                <PlusIcon size={16} />
                Add Players
              </button>
            )}
          </div>
        </div>

        {/* Start button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleStart}
          disabled={!canStart}
        >
          {canStart
            ? `Start Game — ${namedPlayers.length} Players`
            : namedPlayers.length < 2
            ? 'Add at least 2 players'
            : 'Enter session name'}
        </Button>

        {!canStart && (
          <p className="text-white/30 text-xs text-center -mt-2">
            {sessionName.trim().length === 0
              ? 'Give your session a name above'
              : `${2 - namedPlayers.length} more player${2 - namedPlayers.length === 1 ? '' : 's'} needed`}
          </p>
        )}
      </div>
    </div>
  );
}
