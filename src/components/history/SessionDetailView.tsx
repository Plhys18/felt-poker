import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
// Nice ticks
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
// PnlChart — self-contained with scroll/drag/pinch/keyboard zoom+pan
// ---------------------------------------------------------------------------

interface PnlChartProps {
  frames: Frame[];
  playerIds: readonly PlayerId[];
  colorMap: Map<PlayerId, string>;
  nameMap: Map<PlayerId, string>;
  step: number;
}

function PnlChart({ frames, playerIds, colorMap, nameMap, step }: PnlChartProps) {
  // ── Compute full data range ──────────────────────────────────────────────
  const { fullMin, fullMax } = useMemo(() => {
    let fMin = 0; let fMax = 10;
    for (const f of frames) for (const p of f.sorted) {
      if (p.pnl < fMin) fMin = p.pnl;
      if (p.pnl > fMax) fMax = p.pnl;
    }
    const pad = Math.max((fMax - fMin) * 0.12, 50);
    return { fullMin: fMin - pad, fullMax: fMax + pad };
  }, [frames]);

  // ── Zoom / pan state (P&L units) ─────────────────────────────────────────
  const [yLo, setYLo] = useState(fullMin);
  const [yHi, setYHi] = useState(fullMax);

  // Reset when a new session is loaded
  const prevBoundsKey = useRef(`${fullMin}:${fullMax}`);
  const boundsKey = `${fullMin}:${fullMax}`;
  if (prevBoundsKey.current !== boundsKey) {
    prevBoundsKey.current = boundsKey;
    setYLo(fullMin);
    setYHi(fullMax);
  }

  const isDefaultView = Math.abs(yLo - fullMin) < 1 && Math.abs(yHi - fullMax) < 1;

  // ── Refs so event handlers always see latest values ──────────────────────
  const svgRef = useRef<SVGSVGElement>(null);
  const boundsRef = useRef({ yLo, yHi, fullMin, fullMax });
  boundsRef.current = { yLo, yHi, fullMin, fullMax };

  // ── Disable head animation during interactions (zoom/pan) ────────────────
  const [fastMove, setFastMove] = useState(false);
  const fastMoveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function startFast() {
    setFastMove(true);
    if (fastMoveTimeout.current) clearTimeout(fastMoveTimeout.current);
  }
  function stopFast() {
    fastMoveTimeout.current = setTimeout(() => setFastMove(false), 150);
  }

  // ── Cursor style ─────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);

  // ── Selected player highlight ────────────────────────────────────────────
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId | null>(null);
  const dragMovedRef = useRef(false);

  // ── Helpers to convert screen ↔ P&L ────────────────────────────────────
  function screenYtoPnl(clientY: number, lo: number, hi: number): number {
    const el = svgRef.current!;
    const rect = el.getBoundingClientRect();
    const svgY = (clientY - rect.top) / rect.height * VB_H;
    return hi - ((svgY - PT) / C_H) * (hi - lo);
  }

  function applyZoom(pnlAnchor: number, factor: number) {
    const { yLo, yHi, fullMin, fullMax } = boundsRef.current;
    const range = yHi - yLo;
    const newRange = Math.max(50, Math.min((fullMax - fullMin) * 1.3, range * factor));
    const ratio = (yHi - pnlAnchor) / range;
    let newHi = pnlAnchor + ratio * newRange;
    let newLo = newHi - newRange;
    // Snap back to full view when zooming out past threshold
    if (newRange >= (fullMax - fullMin) * 0.95) { newLo = fullMin; newHi = fullMax; }
    setYLo(newLo);
    setYHi(newHi);
  }

  // ── Non-passive wheel listener (must be imperative for preventDefault) ───
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      startFast();
      const { yLo, yHi } = boundsRef.current;
      const anchor = screenYtoPnl(e.clientY, yLo, yHi);
      const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      applyZoom(anchor, Math.pow(1.0012, delta));
      stopFast();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mouse drag to pan ────────────────────────────────────────────────────
  const dragRef = useRef<{ startY: number; startLo: number; startHi: number } | null>(null);

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startLo: yLo, startHi: yHi };
    dragMovedRef.current = false;
    setDragging(true);
    startFast();
  }

  function handleChartClick() {
    // Clicking the chart background deselects
    if (!dragMovedRef.current) setSelectedPlayer(null);
  }

  function handleHeadClick(e: React.MouseEvent, pid: PlayerId) {
    e.stopPropagation();
    if (dragMovedRef.current) return;
    setSelectedPlayer(prev => prev === pid ? null : pid);
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      if (Math.abs(e.clientY - d.startY) > 4 || Math.abs(e.clientX - (svgRef.current?.getBoundingClientRect().left ?? 0)) > 4) {
        dragMovedRef.current = true;
      }
      const el = svgRef.current!;
      const rect = el.getBoundingClientRect();
      const range = d.startHi - d.startLo;
      const svgDy = (e.clientY - d.startY) / rect.height * VB_H;
      const pnlDelta = svgDy / C_H * range;
      setYLo(d.startLo + pnlDelta);
      setYHi(d.startHi + pnlDelta);
    }
    function handleMouseUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDragging(false);
      stopFast();
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Touch: one-finger pan, two-finger pinch zoom ─────────────────────────
  const touchRef = useRef<
    | { type: 'pan'; startY: number; startLo: number; startHi: number }
    | { type: 'pinch'; startDist: number; startLo: number; startHi: number; anchorPnl: number }
    | null
  >(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      startFast();
      const { yLo, yHi } = boundsRef.current;
      if (e.touches.length === 2) {
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dist = Math.hypot(dx, dy);
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        touchRef.current = { type: 'pinch', startDist: dist, startLo: yLo, startHi: yHi, anchorPnl: screenYtoPnl(midY, yLo, yHi) };
      } else {
        touchRef.current = { type: 'pan', startY: e.touches[0].clientY, startLo: yLo, startHi: yHi };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = touchRef.current;
      if (!t) return;
      const rect = el.getBoundingClientRect();
      if (t.type === 'pinch' && e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const factor = t.startDist / dist;
        const range = t.startHi - t.startLo;
        const { fullMin, fullMax } = boundsRef.current;
        const newRange = Math.max(50, Math.min((fullMax - fullMin) * 1.3, range * factor));
        const ratio = (t.startHi - t.anchorPnl) / range;
        let newHi = t.anchorPnl + ratio * newRange;
        let newLo = newHi - newRange;
        if (newRange >= (fullMax - fullMin) * 0.95) { newLo = fullMin; newHi = fullMax; }
        setYLo(newLo);
        setYHi(newHi);
      } else if (t.type === 'pan' && e.touches.length === 1) {
        const range = t.startHi - t.startLo;
        const svgDy = (e.touches[0].clientY - t.startY) / rect.height * VB_H;
        const pnlDelta = svgDy / C_H * range;
        setYLo(t.startLo + pnlDelta);
        setYHi(t.startHi + pnlDelta);
      }
    };
    const onTouchEnd = () => { touchRef.current = null; stopFast(); };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard: arrow keys pan, +/- zoom, Escape resets ───────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { yLo, yHi, fullMin, fullMax } = boundsRef.current;
    const range = yHi - yLo;
    const panAmt = range * 0.25;
    const center = (yLo + yHi) / 2;
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); startFast(); setYLo(yLo + panAmt); setYHi(yHi + panAmt); stopFast(); break;
      case 'ArrowDown':  e.preventDefault(); startFast(); setYLo(yLo - panAmt); setYHi(yHi - panAmt); stopFast(); break;
      case '+': case '=': e.preventDefault(); applyZoom(center, 0.6); break;
      case '-': case '_': e.preventDefault(); applyZoom(center, 1.6); break;
      case 'Escape': case '0': e.preventDefault(); setYLo(fullMin); setYHi(fullMax); break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Rendering ───────────────────────────────────────────────────────────
  const yRange = yHi - yLo || 1;
  const xS = (i: number) => PL + (i / Math.max(frames.length - 1, 1)) * C_W;
  const yS = (v: number) => PT + C_H - ((v - yLo) / yRange) * C_H;

  const cursorX = xS(step);
  const frame = frames[step];
  const ticks = niceYTicks(yLo, yHi);
  const clipId = 'pnl-clip';

  return (
    <div className="relative select-none">
      {/* Reset zoom hint */}
      {!isDefaultView && (
        <button
          type="button"
          onClick={() => { setYLo(fullMin); setYHi(fullMax); }}
          className="absolute top-2 right-3 z-10 px-2 py-0.5 rounded-md bg-white/[0.08] text-white/40 text-xs font-semibold hover:bg-white/[0.14] hover:text-white/70 transition-colors"
          title="Reset zoom (Esc)"
        >
          Reset
        </button>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full overflow-visible outline-none"
        style={{
          display: 'block',
          height: '440px',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onClick={handleChartClick}
        onKeyDown={handleKeyDown}
        aria-label="P&L chart — scroll to zoom, drag to pan, click head to highlight"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PL} y={PT - 2} width={C_W} height={C_H + 4} />
          </clipPath>
        </defs>

        {/* ── Grid & Y-axis ─────────────────────────────────────────────── */}
        {ticks.map(v => (
          <g key={v}>
            <line
              x1={PL} y1={yS(v)} x2={VB_W - PR} y2={yS(v)}
              stroke={v === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}
              strokeWidth="1"
              strokeDasharray={v === 0 ? '5 3' : '2 4'}
            />
            <text x={PL - 8} y={yS(v) + 4} fill="rgba(255,255,255,0.3)" fontSize="11"
              textAnchor="end" fontFamily="monospace">
              {v > 0 ? '+' : ''}{v}
            </text>
          </g>
        ))}

        {/* ── Player lines (clipped) ────────────────────────────────────── */}
        <g clipPath={`url(#${clipId})`}>
          {/* Render unselected first (behind), selected last (on top) */}
          {[...playerIds].sort((a, b) =>
            a === selectedPlayer ? 1 : b === selectedPlayer ? -1 : 0
          ).map(pid => {
            const color = colorMap.get(pid) ?? '#fff';
            const isSelected = selectedPlayer === pid;
            const isDimmed   = selectedPlayer !== null && !isSelected;
            const allPts = frames.map((f, i) => `${xS(i)},${yS(f.byId.get(pid)?.pnl ?? 0)}`);
            const pastPts   = allPts.slice(0, step + 1).join(' ');
            const futurePts = allPts.slice(step).join(' ');
            return (
              <g key={pid} style={{ transition: 'opacity 0.2s' }} opacity={isDimmed ? 0.08 : 1}>
                {step < frames.length - 1 && (
                  <polyline points={futurePts} fill="none" stroke={color}
                    strokeWidth={isSelected ? 2 : 1.5}
                    strokeLinejoin="round" opacity="0.18" strokeDasharray="4 3" />
                )}
                <polyline points={pastPts} fill="none" stroke={color}
                  strokeWidth={isSelected ? 4 : 2.5}
                  strokeLinejoin="round" opacity={isSelected ? 1 : 0.85} />
              </g>
            );
          })}
        </g>

        {/* ── Cursor line ──────────────────────────────────────────────── */}
        <g style={{ transform: `translateX(${cursorX}px)`, transition: 'transform 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}>
          <line x1={0} y1={PT - 6} x2={0} y2={VB_H - PB + 6}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </g>

        {/* ── Player heads (selected renders last = on top) ────────────── */}
        {[...playerIds].sort((a, b) =>
          a === selectedPlayer ? 1 : b === selectedPlayer ? -1 : 0
        ).map(pid => {
          const color = colorMap.get(pid) ?? '#fff';
          const initials = (nameMap.get(pid) ?? '??').slice(0, 2).toUpperCase();
          const fp = frame?.byId.get(pid);
          const pnl = fp?.pnl ?? 0;

          const rawY  = yS(pnl);
          const minY  = PT - HEAD_R + 2;
          const maxY  = PT + C_H + HEAD_R - 2;
          const headY = Math.max(minY, Math.min(maxY, rawY));
          const isAbove = rawY < minY;
          const isBelow = rawY > maxY;
          const isOob   = isAbove || isBelow;

          const isSelected = selectedPlayer === pid;
          const isDimmed   = selectedPlayer !== null && !isSelected;
          const scale = isSelected ? 1.18 : 1;
          const headOpacity = isDimmed ? 0.2 : (isOob ? 0.4 : 1);

          return (
            <g
              key={pid}
              onClick={e => handleHeadClick(e, pid)}
              style={{
                transform: `translate(${cursorX}px, ${headY}px)`,
                transition: fastMove ? 'opacity 0.2s' : 'transform 0.35s cubic-bezier(0.34,1.4,0.64,1), opacity 0.2s',
                opacity: headOpacity,
                cursor: 'pointer',
              }}
            >
              {/* Scale ring around selected head */}
              {isSelected && (
                <circle cx={0} cy={0} r={HEAD_R * scale + 5} fill="none"
                  stroke={color} strokeWidth="2" opacity="0.6" />
              )}
              {/* Shadow */}
              <circle cx={0} cy={4} r={HEAD_R * scale} fill="rgba(0,0,0,0.3)" />
              {/* Glow */}
              <circle cx={0} cy={0} r={HEAD_R * scale + 3} fill="none" stroke={color}
                strokeWidth={isSelected ? 2 : 1} opacity={isSelected ? 0.55 : 0.3} />
              {/* Head */}
              <circle cx={0} cy={0} r={HEAD_R * scale} fill={color} />
              {/* Initials */}
              <text x={0} y={5 * scale} textAnchor="middle" fontSize={12 * scale} fontWeight="900"
                fill="rgba(0,0,0,0.75)"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                style={{ userSelect: 'none' }}>
                {initials}
              </text>
              {/* P&L label */}
              {!isOob && (
                <text x={0} y={HEAD_R * scale + 16} textAnchor="middle" fontSize={11} fontWeight="700"
                  fill={pnl > 0 ? '#4ade80' : pnl < 0 ? '#f87171' : 'rgba(255,255,255,0.4)'}
                  fontFamily="monospace" style={{ userSelect: 'none' }}>
                  {pnl > 0 ? '+' : ''}{pnl}
                </text>
              )}
              {/* Player name shown when selected */}
              {isSelected && !isOob && (
                <text x={0} y={HEAD_R * scale + 30} textAnchor="middle" fontSize={10} fontWeight="600"
                  fill="rgba(255,255,255,0.7)"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                  style={{ userSelect: 'none' }}>
                  {nameMap.get(pid)}
                </text>
              )}
              {/* Off-screen arrows */}
              {isAbove && <text x={0} y={-HEAD_R * scale - 2} textAnchor="middle" fontSize="13" fill={color}>▲</text>}
              {isBelow && <text x={0} y={ HEAD_R * scale + 4} textAnchor="middle" fontSize="13" fill={color}>▼</text>}
            </g>
          );
        })}

        {/* ── Step label ───────────────────────────────────────────────── */}
        <text x={cursorX} y={VB_H - 8} textAnchor="middle" fontSize="10"
          fill="rgba(255,255,255,0.35)"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          style={{ transition: 'x 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}>
          {frame?.label}
        </text>
      </svg>

      {/* Hint text */}
      <p className="text-white/20 text-[10px] text-right pr-3 pb-1 -mt-1 select-none pointer-events-none">
        scroll to zoom · drag to pan · click head to highlight · esc to reset
      </p>
    </div>
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

        <div className="px-4 pt-4 pb-1 flex items-center justify-between">
          <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Net P&amp;L</span>
          <span className="text-white/50 text-sm font-bold">{frame?.label}</span>
        </div>

        <PnlChart
          frames={frames} playerIds={playerIds}
          colorMap={colorMap} nameMap={nameMap}
          step={step}
        />

        {/* Stepper */}
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.06]">
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
