import { useState, useMemo } from 'react';
import type { Session } from '../../types/session';
import type { PlayerId } from '../../types/ids';
import { projectSession } from '../../engine/projection';
import { formatChips } from '../../engine/currency';
import { formatDate, formatDuration } from '../../lib/format';

// ---------------------------------------------------------------------------
// Player colors — 10 distinct, vibrant
// ---------------------------------------------------------------------------

const COLORS = [
  '#C9A84C', // gold
  '#60A5FA', // blue
  '#34D399', // emerald
  '#F87171', // red
  '#A78BFA', // violet
  '#FB923C', // orange
  '#38BDF8', // sky
  '#F472B6', // pink
  '#4ADE80', // green
  '#FACC15', // yellow
];

// ---------------------------------------------------------------------------
// Frame computation
// ---------------------------------------------------------------------------

interface FramePlayer {
  id: PlayerId;
  name: string;
  pnl: number;
  stack: number;
  totalBuyIn: number;
}

interface Frame {
  label: string;
  ts: number;
  sorted: FramePlayer[];
  byId: Map<PlayerId, FramePlayer>;
}

function buildFrames(session: Session): Frame[] {
  const handTs = [...new Set(
    session.events.filter(e => e.type === 'STACK_UPDATE').map(e => e.timestamp),
  )].sort((a, b) => a - b);

  const firstTs = handTs[0] ?? Infinity;

  function makeFrame(evts: typeof session.events, label: string, ts: number): Frame {
    const proj = projectSession({ ...session, events: evts });
    const sorted: FramePlayer[] = proj.sortedLeaderboard.map(ps => ({
      id: ps.id, name: ps.name, pnl: ps.netProfitLoss, stack: ps.currentStack, totalBuyIn: ps.totalBuyIn,
    }));
    return { label, ts, sorted, byId: new Map(sorted.map(p => [p.id, p])) };
  }

  return [
    makeFrame(session.events.filter(e => e.timestamp < firstTs), 'Start', firstTs),
    ...handTs.map((ts, i) =>
      makeFrame(session.events.filter(e => e.timestamp <= ts), `Hand ${i + 1}`, ts),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Nice Y-axis ticks
// ---------------------------------------------------------------------------

function niceYTicks(yMin: number, yMax: number): number[] {
  const range = yMax - yMin;
  const rawStep = range / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1))));
  const step = Math.ceil(rawStep / magnitude) * magnitude;
  const ticks: number[] = [];
  const start = Math.ceil(yMin / step) * step;
  for (let v = start; v <= yMax + step * 0.01; v += step) ticks.push(Math.round(v));
  return ticks;
}

// ---------------------------------------------------------------------------
// Big-heads P&L chart
// ---------------------------------------------------------------------------

interface PnlChartProps {
  frames: Frame[];
  playerIds: readonly PlayerId[];
  colorMap: Map<PlayerId, string>;
  nameMap: Map<PlayerId, string>;
  step: number;
}

const HEAD_R = 22;
const VB_W = 720;
const VB_H = 440;
const PL = 52;    // left — y-axis labels
const PR = 32;    // right — breathing room
const PT = HEAD_R + 12;  // top — heads don't clip
const PB = HEAD_R + 36;  // bottom — x labels + heads don't clip
const C_W = VB_W - PL - PR;
const C_H = VB_H - PT - PB;

function PnlChart({ frames, playerIds, colorMap, nameMap, step }: PnlChartProps) {
  // Overall P&L range across all frames
  let minPnl = 0;
  let maxPnl = 10;
  for (const f of frames) {
    for (const p of f.sorted) {
      if (p.pnl < minPnl) minPnl = p.pnl;
      if (p.pnl > maxPnl) maxPnl = p.pnl;
    }
  }
  const vPad = Math.max((maxPnl - minPnl) * 0.1, 40);
  const yMin = minPnl - vPad;
  const yMax = maxPnl + vPad;
  const yRange = yMax - yMin;

  const xS = (i: number) => PL + (i / Math.max(frames.length - 1, 1)) * C_W;
  const yS = (v: number) => PT + C_H - ((v - yMin) / yRange) * C_H;

  const cursorX = xS(step);
  const frame = frames[step];
  const ticks = niceYTicks(yMin, yMax);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full overflow-visible"
      style={{ display: 'block', height: '420px' }}
      aria-hidden="true"
    >
      {/* ── Y-axis ticks & grid ─────────────────────────────────────────── */}
      {ticks.map(v => (
        <g key={v}>
          <line
            x1={PL} y1={yS(v)} x2={VB_W - PR} y2={yS(v)}
            stroke={v === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={v === 0 ? 1 : 1}
            strokeDasharray={v === 0 ? '5 3' : '2 4'}
          />
          <text
            x={PL - 8} y={yS(v) + 4}
            fill="rgba(255,255,255,0.3)"
            fontSize="11"
            textAnchor="end"
            fontFamily="monospace"
          >
            {v > 0 ? '+' : ''}{v}
          </text>
        </g>
      ))}

      {/* ── Player trajectory lines ─────────────────────────────────────── */}
      {playerIds.map(pid => {
        const color = colorMap.get(pid) ?? '#fff';
        // Points up to the cursor (past = full opacity, ahead = faded)
        const allPts = frames.map((f, i) => ({ x: xS(i), y: yS(f.byId.get(pid)?.pnl ?? 0) }));
        const pastPts = allPts.slice(0, step + 1).map(p => `${p.x},${p.y}`).join(' ');
        const futurePts = allPts.slice(step).map(p => `${p.x},${p.y}`).join(' ');
        return (
          <g key={pid}>
            {/* Future portion — faded */}
            {step < frames.length - 1 && (
              <polyline
                points={futurePts}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                opacity="0.18"
                strokeDasharray="4 3"
              />
            )}
            {/* Past portion — solid */}
            <polyline
              points={pastPts}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              opacity="0.85"
            />
          </g>
        );
      })}

      {/* ── Cursor line ─────────────────────────────────────────────────── */}
      <g style={{ transform: `translateX(${cursorX}px)`, transition: 'transform 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}>
        <line
          x1={0} y1={PT - HEAD_R - 8}
          x2={0} y2={VB_H - PB + HEAD_R + 8}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
      </g>

      {/* ── Animated big player heads ────────────────────────────────────── */}
      {playerIds.map(pid => {
        const color = colorMap.get(pid) ?? '#fff';
        const name = nameMap.get(pid) ?? '??';
        const initials = name.slice(0, 2).toUpperCase();
        const player = frame?.byId.get(pid);
        const pnl = player?.pnl ?? 0;
        const headX = cursorX;
        const headY = yS(pnl);

        // Contrasting text color — dark for bright backgrounds, light for dark
        const textColor = 'rgba(0,0,0,0.75)';

        return (
          <g
            key={pid}
            style={{
              transform: `translate(${headX}px, ${headY}px)`,
              transition: 'transform 0.35s cubic-bezier(0.34,1.4,0.64,1)',
            }}
          >
            {/* Drop shadow */}
            <circle cx={0} cy={4} r={HEAD_R} fill="rgba(0,0,0,0.35)" />
            {/* Glow ring */}
            <circle cx={0} cy={0} r={HEAD_R + 3} fill="none" stroke={color} strokeWidth="1" opacity="0.35" />
            {/* Head */}
            <circle cx={0} cy={0} r={HEAD_R} fill={color} />
            {/* Initials */}
            <text
              x={0} y={5}
              textAnchor="middle"
              fontSize="13"
              fontWeight="900"
              fill={textColor}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              style={{ userSelect: 'none' }}
            >
              {initials}
            </text>
            {/* P&L label below head */}
            <text
              x={0} y={HEAD_R + 16}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={pnl > 0 ? '#4ade80' : pnl < 0 ? '#f87171' : 'rgba(255,255,255,0.4)'}
              fontFamily="monospace"
              style={{ userSelect: 'none' }}
            >
              {pnl > 0 ? '+' : ''}{pnl}
            </text>
          </g>
        );
      })}

      {/* ── Step label at bottom of cursor ──────────────────────────────── */}
      <text
        x={cursorX}
        y={VB_H - 8}
        textAnchor="middle"
        fontSize="10"
        fill="rgba(255,255,255,0.35)"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        style={{ transition: 'x 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}
      >
        {frame?.label}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SessionDetailViewProps {
  session: Session;
  onBack: () => void;
}

export function SessionDetailView({ session, onBack }: SessionDetailViewProps) {
  const frames = useMemo(() => buildFrames(session), [session]);
  const [step, setStep] = useState(frames.length - 1);

  const playerIds = useMemo(
    () => [...session.players].sort((a, b) => a.seatIndex - b.seatIndex).map(p => p.id),
    [session],
  );
  const colorMap = useMemo(
    () => new Map(playerIds.map((id, i) => [id, COLORS[i % COLORS.length]])),
    [playerIds],
  );
  const nameMap = useMemo(
    () => new Map(session.players.map(p => [p.id, p.name])),
    [session],
  );

  const frame = frames[step];
  const duration = session.config.createdAt && session.endedAt
    ? formatDuration(session.config.createdAt, session.endedAt)
    : null;

  function prevStep() { setStep(s => Math.max(0, s - 1)); }
  function nextStep() { setStep(s => Math.min(frames.length - 1, s + 1)); }

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-white/40 hover:text-white transition-colors p-1 -ml-1 shrink-0"
          aria-label="Back to history"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-white font-black text-xl truncate">{session.config.name}</h2>
          <p className="text-white/40 text-xs mt-0.5">
            {formatDate(session.config.createdAt)}
            {duration && <span> · {duration}</span>}
            <span> · {session.players.length} players · {frames.length - 1} hands</span>
          </p>
        </div>
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)' }}>
        <div className="px-4 pt-4 pb-1 flex items-center justify-between">
          <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Net P&amp;L</span>
          <span className="text-white/50 text-sm font-bold">{frame?.label}</span>
        </div>
        <div className="px-2">
          <PnlChart
            frames={frames}
            playerIds={playerIds}
            colorMap={colorMap}
            nameMap={nameMap}
            step={step}
          />
        </div>

        {/* Stepper controls inside the chart card */}
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/[0.06]">
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={step}
            onChange={e => setStep(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: '#c9a84c' }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={step <= 0}
              onClick={prevStep}
              className="flex-1 py-2 rounded-xl bg-white/[0.07] text-white/60 text-sm font-bold disabled:opacity-25 hover:bg-white/[0.12] transition-colors"
            >
              ← Prev
            </button>
            <span className="flex items-center justify-center text-white/25 text-xs tabular-nums w-16 shrink-0">
              {step} / {frames.length - 1}
            </span>
            <button
              type="button"
              disabled={step >= frames.length - 1}
              onClick={nextStep}
              className="flex-1 py-2 rounded-xl bg-white/[0.07] text-white/60 text-sm font-bold disabled:opacity-25 hover:bg-white/[0.12] transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ── Leaderboard ────────────────────────────────────────────────── */}
      <div className="bg-white/[0.05] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">
            Standings — {frame?.label}
          </span>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {frame?.sorted.map((player, i) => (
            <li key={player.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`text-xs font-black w-5 text-center tabular-nums shrink-0 ${
                i === 0 ? 'text-gold' : 'text-white/25'
              }`}>
                {i + 1}
              </span>
              <div
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black"
                style={{ backgroundColor: colorMap.get(player.id) ?? '#fff', color: 'rgba(0,0,0,0.7)' }}
              >
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-white/80 text-sm flex-1 font-medium truncate">{player.name}</span>
              <span className="text-white/40 text-xs tabular-nums shrink-0">{formatChips(player.stack)}</span>
              <span className={`text-xs font-bold tabular-nums w-16 text-right shrink-0 ${
                player.pnl > 0 ? 'text-profit' : player.pnl < 0 ? 'text-loss' : 'text-white/30'
              }`}>
                {player.pnl > 0 ? '+' : ''}{formatChips(player.pnl)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
