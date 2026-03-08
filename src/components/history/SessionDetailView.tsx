import { useState, useMemo } from 'react';
import type { Session } from '../../types/session';
import type { PlayerId } from '../../types/ids';
import { projectSession } from '../../engine/projection';
import { formatChips } from '../../engine/currency';
import { formatDate, formatDuration } from '../../lib/format';

// ---------------------------------------------------------------------------
// 10 distinct player colors
// ---------------------------------------------------------------------------

const COLORS = [
  '#C9A84C', '#60A5FA', '#34D399', '#F87171', '#A78BFA',
  '#FB923C', '#38BDF8', '#F472B6', '#4ADE80', '#FACC15',
];

// ---------------------------------------------------------------------------
// Frame computation — one frame per STACK_UPDATE timestamp group + frame 0
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
  sorted: FramePlayer[];          // sorted by pnl desc
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
      id: ps.id,
      name: ps.name,
      pnl: ps.netProfitLoss,
      stack: ps.currentStack,
      totalBuyIn: ps.totalBuyIn,
    }));
    const byId = new Map(sorted.map(p => [p.id, p]));
    return { label, ts, sorted, byId };
  }

  return [
    // Frame 0: state after all initial buy-ins, before any STACK_UPDATEs
    makeFrame(
      session.events.filter(e => e.timestamp < firstTs),
      'Start',
      firstTs,
    ),
    // Frames 1-N: one per hand
    ...handTs.map((ts, i) =>
      makeFrame(
        session.events.filter(e => e.timestamp <= ts),
        `Hand ${i + 1}`,
        ts,
      ),
    ),
  ];
}

// ---------------------------------------------------------------------------
// PnL chart (pure SVG, no dependencies)
// ---------------------------------------------------------------------------

interface PnlChartProps {
  frames: Frame[];
  playerIds: readonly PlayerId[];
  colorMap: Map<PlayerId, string>;
  step: number;
}

function PnlChart({ frames, playerIds, colorMap, step }: PnlChartProps) {
  const W = 560;
  const H = 200;
  const PL = 40, PR = 8, PT = 10, PB = 22;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  // Find overall P&L range across all frames
  let minPnl = 0;
  let maxPnl = 1;
  for (const f of frames) {
    for (const p of f.sorted) {
      if (p.pnl < minPnl) minPnl = p.pnl;
      if (p.pnl > maxPnl) maxPnl = p.pnl;
    }
  }
  // Pad the range a little
  const padV = Math.max(Math.abs(maxPnl - minPnl) * 0.08, 20);
  const yMin = minPnl - padV;
  const yMax = maxPnl + padV;
  const yRange = yMax - yMin;

  const xS = (i: number) => PL + (i / Math.max(frames.length - 1, 1)) * cW;
  const yS = (v: number) => PT + cH - ((v - yMin) / yRange) * cH;

  const cursorX = xS(step);
  const frame = frames[step];

  // Y ticks: just 0 and the extremes, nicely rounded
  const tickStep = Math.pow(10, Math.floor(Math.log10(Math.max(Math.abs(maxPnl), Math.abs(minPnl)))));
  const yTicks = [-1, 0, 1].map(m => m * tickStep).filter(v => v >= yMin && v <= yMax);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      style={{ height: '180px' }}
      aria-hidden="true"
    >
      {/* Y-axis grid & labels */}
      {yTicks.map(v => (
        <g key={v}>
          <line
            x1={PL} y1={yS(v)} x2={W - PR} y2={yS(v)}
            stroke={v === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}
            strokeWidth="1"
            strokeDasharray={v === 0 ? '4 3' : undefined}
          />
          <text
            x={PL - 5} y={yS(v) + 3.5}
            fill="rgba(255,255,255,0.25)"
            fontSize="9"
            textAnchor="end"
          >
            {v > 0 ? '+' : ''}{v}
          </text>
        </g>
      ))}

      {/* Player polylines */}
      {playerIds.map(pid => {
        const color = colorMap.get(pid) ?? '#fff';
        const pts = frames.map((f, i) => `${xS(i)},${yS(f.byId.get(pid)?.pnl ?? 0)}`).join(' ');
        return (
          <polyline
            key={pid}
            points={pts}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.8"
          />
        );
      })}

      {/* Animated cursor + dots */}
      <g style={{ transform: `translateX(${cursorX}px)`, transition: 'transform 0.25s ease' }}>
        <line
          x1={0} y1={PT - 4} x2={0} y2={H - PB + 6}
          stroke="rgba(255,255,255,0.35)" strokeWidth="1"
        />
        {playerIds.map(pid => {
          const color = colorMap.get(pid) ?? '#fff';
          const player = frame?.byId.get(pid);
          if (!player) return null;
          return (
            <circle
              key={pid}
              cx={0}
              cy={yS(player.pnl)}
              r="3"
              fill={color}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="0.5"
              style={{ transition: 'cy 0.25s ease' }}
            />
          );
        })}
      </g>

      {/* Step label under cursor */}
      <text
        x={cursorX}
        y={H - 4}
        fill="rgba(255,255,255,0.3)"
        fontSize="9"
        textAnchor="middle"
        style={{ transition: 'x 0.25s ease' }}
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

  // Stable player order (by seatIndex) for chart lines and legend
  const playerIds = useMemo(
    () => [...session.players].sort((a, b) => a.seatIndex - b.seatIndex).map(p => p.id),
    [session],
  );
  const colorMap = useMemo(
    () => new Map(playerIds.map((id, i) => [id, COLORS[i % COLORS.length]])),
    [playerIds],
  );

  const frame = frames[step];
  const duration =
    session.config.createdAt && session.endedAt
      ? formatDuration(session.config.createdAt, session.endedAt)
      : null;

  function prevStep() { setStep(s => Math.max(0, s - 1)); }
  function nextStep() { setStep(s => Math.min(frames.length - 1, s + 1)); }

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────────────── */}
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

      {/* ── P&L chart ────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-3">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">
          Net P&amp;L over time
        </p>
        <PnlChart
          frames={frames}
          playerIds={playerIds}
          colorMap={colorMap}
          step={step}
        />
        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          {playerIds.map(pid => {
            const color = colorMap.get(pid) ?? '#fff';
            const player = session.players.find(p => p.id === pid);
            return (
              <div key={pid} className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-white/40 text-xs">{player?.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stepper ──────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-sm font-bold">{frame?.label}</span>
          <span className="text-white/30 text-xs tabular-nums">
            {step} / {frames.length - 1}
          </span>
        </div>
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
            className="flex-1 py-2 rounded-xl bg-white/[0.07] text-white/60 text-sm font-semibold disabled:opacity-30 hover:bg-white/[0.12] transition-colors"
          >
            ← Prev
          </button>
          <button
            type="button"
            disabled={step >= frames.length - 1}
            onClick={nextStep}
            className="flex-1 py-2 rounded-xl bg-white/[0.07] text-white/60 text-sm font-semibold disabled:opacity-30 hover:bg-white/[0.12] transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* ── Leaderboard at current step ───────────────────────────────────── */}
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
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: colorMap.get(player.id) ?? '#fff' }}
              />
              <span className="text-white/80 text-sm flex-1 font-medium truncate">
                {player.name}
              </span>
              <span className="text-white/40 text-xs tabular-nums shrink-0">
                {formatChips(player.stack)}
              </span>
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
