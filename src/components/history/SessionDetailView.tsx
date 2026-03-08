import { useState, useMemo, useCallback } from 'react';
import type { Session } from '../../types/session';
import type { PlayerId } from '../../types/ids';
import { projectSession } from '../../engine/projection';
import { formatChips } from '../../engine/currency';
import { formatDate, formatDuration } from '../../lib/format';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const COLORS = [
  '#C9A84C', '#60A5FA', '#34D399', '#F87171', '#A78BFA',
  '#FB923C', '#38BDF8', '#F472B6', '#4ADE80', '#FACC15',
];

// ---------------------------------------------------------------------------
// Frame computation
// ---------------------------------------------------------------------------

interface FramePlayer { id: PlayerId; name: string; pnl: number; stack: number; totalBuyIn: number; }
interface Frame { label: string; ts: number; sorted: FramePlayer[]; byId: Map<PlayerId, FramePlayer>; }

function buildFrames(session: Session): Frame[] {
  const handTs = [...new Set(
    session.events.filter(e => e.type === 'STACK_UPDATE').map(e => e.timestamp),
  )].sort((a, b) => a - b);
  const firstTs = handTs[0] ?? Infinity;

  function make(evts: typeof session.events, label: string, ts: number): Frame {
    const proj = projectSession({ ...session, events: evts });
    const sorted: FramePlayer[] = proj.sortedLeaderboard.map(ps => ({
      id: ps.id, name: ps.name, pnl: ps.netProfitLoss, stack: ps.currentStack, totalBuyIn: ps.totalBuyIn,
    }));
    return { label, ts, sorted, byId: new Map(sorted.map(p => [p.id, p])) };
  }

  return [
    make(session.events.filter(e => e.timestamp < firstTs), 'Start', firstTs),
    ...handTs.map((ts, i) => make(session.events.filter(e => e.timestamp <= ts), `Hand ${i + 1}`, ts)),
  ];
}

// ---------------------------------------------------------------------------
// Nice tick computation
// ---------------------------------------------------------------------------

function niceYTicks(lo: number, hi: number, n = 6): number[] {
  const range = hi - lo;
  const raw = range / (n - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const step = Math.ceil(raw / mag) * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 0.01; v += step)
    ticks.push(Math.round(v));
  return ticks;
}

// ---------------------------------------------------------------------------
// Chart constants
// ---------------------------------------------------------------------------

const HEAD_R = 22;
const VB_W   = 720;
const VB_H   = 460;
const PL = 54;
const PR = HEAD_R + 12;
const PT = HEAD_R + 16;
const PB = HEAD_R + 36;
const C_W = VB_W - PL - PR;
const C_H = VB_H - PT - PB;

// ---------------------------------------------------------------------------
// PnlChart
// ---------------------------------------------------------------------------

interface PnlChartProps {
  frames: Frame[];
  playerIds: readonly PlayerId[];
  colorMap: Map<PlayerId, string>;
  nameMap: Map<PlayerId, string>;
  step: number;
  // Zoom / pan: the Y range to display (in P&L units)
  yLo: number;
  yHi: number;
}

function PnlChart({ frames, playerIds, colorMap, nameMap, step, yLo, yHi }: PnlChartProps) {
  const yRange = yHi - yLo || 1;
  const xS = (i: number) => PL + (i / Math.max(frames.length - 1, 1)) * C_W;
  const yS = (v: number) => PT + C_H - ((v - yLo) / yRange) * C_H;

  const cursorX = xS(step);
  const frame = frames[step];
  const ticks = niceYTicks(yLo, yHi);
  const clipId = 'chart-area-clip';

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full overflow-visible"
      style={{ display: 'block', height: '440px' }}
      aria-hidden="true"
    >
      <defs>
        {/* Clip rect for lines — keep heads outside so they're never cut off */}
        <clipPath id={clipId}>
          <rect x={PL} y={PT} width={C_W} height={C_H} />
        </clipPath>
      </defs>

      {/* ── Grid & Y-axis ───────────────────────────────────────────────── */}
      {ticks.map(v => (
        <g key={v}>
          <line
            x1={PL} y1={yS(v)} x2={VB_W - PR} y2={yS(v)}
            stroke={v === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}
            strokeWidth="1"
            strokeDasharray={v === 0 ? '5 3' : '2 4'}
          />
          <text x={PL - 8} y={yS(v) + 4} fill="rgba(255,255,255,0.3)" fontSize="11" textAnchor="end" fontFamily="monospace">
            {v > 0 ? '+' : ''}{v}
          </text>
        </g>
      ))}

      {/* ── Player lines (clipped to chart area) ────────────────────────── */}
      <g clipPath={`url(#${clipId})`}>
        {playerIds.map(pid => {
          const color = colorMap.get(pid) ?? '#fff';
          const allPts = frames.map((f, i) => `${xS(i)},${yS(f.byId.get(pid)?.pnl ?? 0)}`);
          const pastPts  = allPts.slice(0, step + 1).join(' ');
          const futurePts = allPts.slice(step).join(' ');
          return (
            <g key={pid}>
              {step < frames.length - 1 && (
                <polyline points={futurePts} fill="none" stroke={color}
                  strokeWidth="1.5" strokeLinejoin="round" opacity="0.15" strokeDasharray="4 3" />
              )}
              <polyline points={pastPts} fill="none" stroke={color}
                strokeWidth="2.5" strokeLinejoin="round" opacity="0.85" />
            </g>
          );
        })}
      </g>

      {/* ── Cursor line ─────────────────────────────────────────────────── */}
      <g style={{ transform: `translateX(${cursorX}px)`, transition: 'transform 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}>
        <line x1={0} y1={PT - 6} x2={0} y2={VB_H - PB + 6}
          stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </g>

      {/* ── Big animated player heads ────────────────────────────────────── */}
      {playerIds.map(pid => {
        const color = colorMap.get(pid) ?? '#fff';
        const initials = (nameMap.get(pid) ?? '??').slice(0, 2).toUpperCase();
        const fp = frame?.byId.get(pid);
        const pnl = fp?.pnl ?? 0;

        // Clamp head to chart bounds (with margin) so it stays visible when zoomed
        const rawY = yS(pnl);
        const minY = PT - HEAD_R + 2;
        const maxY = PT + C_H + HEAD_R - 2;
        const headY = Math.max(minY, Math.min(maxY, rawY));
        const isAbove = rawY < minY;
        const isBelow = rawY > maxY;
        const isOob = isAbove || isBelow;

        return (
          <g
            key={pid}
            style={{
              transform: `translate(${cursorX}px, ${headY}px)`,
              transition: 'transform 0.35s cubic-bezier(0.34,1.4,0.64,1)',
            }}
          >
            {/* Drop shadow */}
            <circle cx={0} cy={4} r={HEAD_R} fill="rgba(0,0,0,0.3)" />
            {/* Glow ring */}
            <circle cx={0} cy={0} r={HEAD_R + 3} fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
            {/* Head — slightly transparent when out-of-bounds */}
            <circle cx={0} cy={0} r={HEAD_R} fill={color} opacity={isOob ? 0.45 : 1} />
            {/* Initials */}
            <text x={0} y={5} textAnchor="middle" fontSize="12" fontWeight="900"
              fill="rgba(0,0,0,0.75)"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              style={{ userSelect: 'none' }}>
              {initials}
            </text>
            {/* P&L label below (hidden when out-of-bounds — avoid confusion) */}
            {!isOob && (
              <text x={0} y={HEAD_R + 16} textAnchor="middle" fontSize="11" fontWeight="700"
                fill={pnl > 0 ? '#4ade80' : pnl < 0 ? '#f87171' : 'rgba(255,255,255,0.4)'}
                fontFamily="monospace" style={{ userSelect: 'none' }}>
                {pnl > 0 ? '+' : ''}{pnl}
              </text>
            )}
            {/* Arrow when clamped */}
            {isAbove && (
              <text x={0} y={-HEAD_R - 4} textAnchor="middle" fontSize="14" fill={color}>↑</text>
            )}
            {isBelow && (
              <text x={0} y={HEAD_R + 4} textAnchor="middle" fontSize="14" fill={color}>↓</text>
            )}
          </g>
        );
      })}

      {/* ── Step label ──────────────────────────────────────────────────── */}
      <text x={cursorX} y={VB_H - 8} textAnchor="middle" fontSize="10"
        fill="rgba(255,255,255,0.35)"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        style={{ transition: 'x 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}>
        {frame?.label}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SessionDetailView({ session, onBack }: { session: Session; onBack: () => void }) {
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
  const nameMap = useMemo(() => new Map(session.players.map(p => [p.id, p.name])), [session]);

  // Compute full P&L range across all frames
  const { fullMin, fullMax } = useMemo(() => {
    let fMin = 0, fMax = 10;
    for (const f of frames) for (const p of f.sorted) {
      if (p.pnl < fMin) fMin = p.pnl;
      if (p.pnl > fMax) fMax = p.pnl;
    }
    const pad = Math.max((fMax - fMin) * 0.1, 40);
    return { fullMin: fMin - pad, fullMax: fMax + pad };
  }, [frames]);

  // Zoom: 1x = full range, 2x/3x/4x = zoomed in
  const [zoomLevel, setZoomLevel] = useState(1);
  // Pan center: the P&L value at the center of the zoomed view
  const [panCenter, setPanCenter] = useState(0);

  // Compute display range
  const fullRange = fullMax - fullMin;
  const zoomedRange = fullRange / zoomLevel;
  const yLo = zoomLevel === 1 ? fullMin : panCenter - zoomedRange / 2;
  const yHi = zoomLevel === 1 ? fullMax : panCenter + zoomedRange / 2;

  const panStep = zoomedRange * 0.3;

  const handleZoomIn = useCallback(() => {
    setZoomLevel(z => {
      if (z >= 4) return z;
      const next = z + 1;
      // Re-center on current frame's player midpoint
      const fp = frames[step];
      const pnls = fp.sorted.map(p => p.pnl);
      const mid = (Math.min(...pnls) + Math.max(...pnls)) / 2;
      setPanCenter(mid);
      return next;
    });
  }, [frames, step]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(z => Math.max(1, z - 1));
  }, []);

  const frame = frames[step];
  const duration = session.config.createdAt && session.endedAt
    ? formatDuration(session.config.createdAt, session.endedAt) : null;

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack}
          className="text-white/40 hover:text-white transition-colors p-1 -ml-1 shrink-0"
          aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-white font-black text-xl truncate">{session.config.name}</h2>
          <p className="text-white/40 text-xs mt-0.5">
            {formatDate(session.config.createdAt)}
            {duration && <> · {duration}</>}
            <> · {session.players.length} players · {frames.length - 1} hands</>
          </p>
        </div>
      </div>

      {/* ── Chart card ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>

        {/* Chart header */}
        <div className="px-4 pt-4 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Net P&amp;L</span>
            <span className="text-white/50 text-sm font-bold">{frame?.label}</span>
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            {zoomLevel > 1 && (
              <>
                <button type="button" onClick={() => setPanCenter(c => c + panStep)}
                  className="w-7 h-7 rounded-lg bg-white/[0.07] text-white/50 text-sm hover:bg-white/[0.12] transition-colors flex items-center justify-center"
                  title="Pan up">↑</button>
                <button type="button" onClick={() => setPanCenter(c => c - panStep)}
                  className="w-7 h-7 rounded-lg bg-white/[0.07] text-white/50 text-sm hover:bg-white/[0.12] transition-colors flex items-center justify-center"
                  title="Pan down">↓</button>
              </>
            )}
            <button type="button" onClick={handleZoomIn} disabled={zoomLevel >= 4}
              className="w-7 h-7 rounded-lg bg-white/[0.07] text-white/60 font-bold text-sm hover:bg-white/[0.12] disabled:opacity-25 transition-colors flex items-center justify-center"
              title="Zoom in">+</button>
            <span className="text-white/30 text-xs w-6 text-center tabular-nums">{zoomLevel}×</span>
            <button type="button" onClick={handleZoomOut} disabled={zoomLevel <= 1}
              className="w-7 h-7 rounded-lg bg-white/[0.07] text-white/60 font-bold text-sm hover:bg-white/[0.12] disabled:opacity-25 transition-colors flex items-center justify-center"
              title="Zoom out">−</button>
          </div>
        </div>

        {/* SVG chart */}
        <div className="px-2">
          <PnlChart
            frames={frames} playerIds={playerIds}
            colorMap={colorMap} nameMap={nameMap}
            step={step} yLo={yLo} yHi={yHi}
          />
        </div>

        {/* Stepper */}
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/[0.06]">
          <input type="range" min={0} max={frames.length - 1} value={step}
            onChange={e => setStep(Number(e.target.value))}
            className="w-full" style={{ accentColor: '#c9a84c' }} />
          <div className="flex gap-2 items-center">
            <button type="button" disabled={step <= 0} onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2 rounded-xl bg-white/[0.07] text-white/60 text-sm font-bold disabled:opacity-25 hover:bg-white/[0.12] transition-colors">
              ← Prev
            </button>
            <span className="text-white/25 text-xs tabular-nums w-16 text-center shrink-0">
              {step} / {frames.length - 1}
            </span>
            <button type="button" disabled={step >= frames.length - 1} onClick={() => setStep(s => s + 1)}
              className="flex-1 py-2 rounded-xl bg-white/[0.07] text-white/60 text-sm font-bold disabled:opacity-25 hover:bg-white/[0.12] transition-colors">
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
                i === 0 ? 'text-gold' : 'text-white/25'}`}>{i + 1}</span>
              <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black"
                style={{ backgroundColor: colorMap.get(player.id) ?? '#fff', color: 'rgba(0,0,0,0.7)' }}>
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-white/80 text-sm flex-1 font-medium truncate">{player.name}</span>
              <span className="text-white/40 text-xs tabular-nums shrink-0">{formatChips(player.stack)}</span>
              <span className={`text-xs font-bold tabular-nums w-16 text-right shrink-0 ${
                player.pnl > 0 ? 'text-profit' : player.pnl < 0 ? 'text-loss' : 'text-white/30'}`}>
                {player.pnl > 0 ? '+' : ''}{formatChips(player.pnl)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
