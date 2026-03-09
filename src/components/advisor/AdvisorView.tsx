import { useState, useRef, useEffect } from 'react';
import {
  type Card,
  RANK_LABEL,
  SUIT_COLOR,
  cardKey,
} from '../../engine/hand-eval';
import { CardPicker } from '../eval/CardPicker';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Provider = 'claude' | 'openai' | 'gemini' | 'groq';

interface AdvisorConfig {
  provider: Provider;
  apiKey: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GameContext {
  holeCards: Card[];
  communityCards: Card[];
  position: string;
  potSize: string;
  stackSize: string;
  numPlayers: string;
}

// ---------------------------------------------------------------------------
// Config helpers — session-only, never persisted to disk
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: AdvisorConfig = { provider: 'claude', apiKey: '' };

// ---------------------------------------------------------------------------
// API calls (plain fetch, no SDK deps)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a professional poker advisor. The user will describe their Texas Hold'em situation (hole cards, community cards, position, pot size, stack size, number of players). Give concise, actionable advice: FOLD, CALL, or RAISE — with brief reasoning. Consider pot odds, position, hand strength, and implied odds. Keep responses short (2-4 sentences). If the situation is unclear, ask for clarification.`;

async function queryProvider(
  config: AdvisorConfig,
  messages: Message[],
  signal: AbortSignal,
): Promise<string> {
  const { provider, apiKey } = config;

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text;
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 512,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        }),
        signal,
      },
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  if (provider === 'groq') {
    // Groq uses OpenAI-compatible API
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 512,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Groq API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// ---------------------------------------------------------------------------
// Card display (compact, reused from eval)
// ---------------------------------------------------------------------------

function MiniCard({ card, onClick }: { card: Card | null; onClick: () => void }) {
  if (!card) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-12 h-16 rounded-lg border-2 border-dashed border-white/15 bg-white/3 flex items-center justify-center text-white/20 hover:border-white/35 hover:text-white/40 transition-all active:scale-95"
      >
        <span className="text-lg font-light">+</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-12 h-16 rounded-lg border border-white/20 bg-white/[0.08] shadow-md shadow-black/30 flex flex-col items-center justify-center hover:bg-white/15 hover:border-white/35 transition-all active:scale-95"
    >
      <span className={`text-sm font-black leading-none ${SUIT_COLOR[card.suit]}`}>
        {RANK_LABEL[card.rank]}
      </span>
      <span className={`text-xs leading-none mt-0.5 ${SUIT_COLOR[card.suit]}`}>
        {card.suit}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Settings dialog
// ---------------------------------------------------------------------------

function SettingsDialog({
  open,
  onClose,
  config,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  config: AdvisorConfig;
  onSave: (c: AdvisorConfig) => void;
}) {
  const [provider, setProvider] = useState<Provider>(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);

  useEffect(() => {
    if (open) {
      setProvider(config.provider);
      setApiKey(config.apiKey);
    }
  }, [open, config]);

  return (
    <Dialog open={open} onClose={onClose} title="AI Provider Settings">
      <div className="space-y-4">
        <div>
          <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-2">Provider</label>
          <div className="flex gap-2">
            {(['claude', 'openai', 'gemini', 'groq'] as Provider[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  provider === p
                    ? 'bg-gold/15 text-gold border border-gold/30'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                }`}
              >
                {{ claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini', groq: 'Groq' }[p]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-2">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={{ claude: 'sk-ant-...', openai: 'sk-...', gemini: 'AI...', groq: 'gsk_...' }[provider]}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
          />
          <p className="text-white/30 text-xs mt-2">
            Your key is held in memory only — it&apos;s never saved to disk and disappears when you close the tab.
          </p>
        </div>
        <Button
          variant="primary"
          fullWidth
          onClick={() => {
            onSave({ provider, apiKey });
            onClose();
          }}
          disabled={!apiKey.trim()}
        >
          Save
        </Button>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Format cards for the prompt
// ---------------------------------------------------------------------------

function formatCards(cards: Card[]): string {
  return cards.map(c => `${RANK_LABEL[c.rank]}${c.suit}`).join(' ');
}

function buildPrompt(ctx: GameContext): string {
  const parts: string[] = [];
  if (ctx.holeCards.length > 0) parts.push(`My hole cards: ${formatCards(ctx.holeCards)}`);
  if (ctx.communityCards.length > 0) parts.push(`Community cards: ${formatCards(ctx.communityCards)}`);
  if (ctx.position) parts.push(`Position: ${ctx.position}`);
  if (ctx.potSize) parts.push(`Pot size: ${ctx.potSize}`);
  if (ctx.stackSize) parts.push(`My stack: ${ctx.stackSize}`);
  if (ctx.numPlayers) parts.push(`Players at table: ${ctx.numPlayers}`);
  parts.push('What should I do?');
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

const POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'] as const;

export function AdvisorView() {
  const [config, setConfig] = useState<AdvisorConfig>(DEFAULT_CONFIG);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Card state
  const [holeCards, setHoleCards] = useState<(Card | null)[]>([null, null]);
  const [communityCards, setCommunityCards] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [pickerTarget, setPickerTarget] = useState<{ type: 'hole' | 'community'; index: number } | null>(null);

  // Game context
  const [position, setPosition] = useState('');
  const [potSize, setPotSize] = useState('');
  const [stackSize, setStackSize] = useState('');
  const [numPlayers, setNumPlayers] = useState('');

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const allUsed: Card[] = [
    ...holeCards,
    ...communityCards,
  ].filter((c): c is Card => c !== null);

  function handleCardSelect(card: Card) {
    if (!pickerTarget) return;
    if (pickerTarget.type === 'hole') {
      setHoleCards(h => { const next = [...h]; next[pickerTarget.index] = card; return next; });
    } else {
      setCommunityCards(c => { const next = [...c]; next[pickerTarget.index] = card; return next; });
    }
    setPickerTarget(null);
  }

  function pickerUsed(): Card[] {
    if (!pickerTarget) return allUsed;
    // Exclude the card currently in the target slot
    const target = pickerTarget.type === 'hole' ? holeCards[pickerTarget.index] : communityCards[pickerTarget.index];
    if (!target) return allUsed;
    return allUsed.filter(c => cardKey(c) !== cardKey(target));
  }

  async function askAdvisor() {
    if (!config.apiKey) {
      setSettingsOpen(true);
      return;
    }

    const hole = holeCards.filter((c): c is Card => c !== null);
    if (hole.length < 2) {
      setError('Select your 2 hole cards first');
      return;
    }

    const community = communityCards.filter((c): c is Card => c !== null);
    const prompt = buildPrompt({ holeCards: hole, communityCards: community, position, potSize, stackSize, numPlayers });
    const userMsg: Message = { role: 'user', content: prompt };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setError(null);
    setLoading(true);

    try {
      abortRef.current = new AbortController();
      const reply = await queryProvider(config, newMessages, abortRef.current.signal);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  async function sendFollowUp() {
    if (!followUp.trim() || !config.apiKey) return;

    const userMsg: Message = { role: 'user', content: followUp.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setFollowUp('');
    setError(null);
    setLoading(true);

    try {
      abortRef.current = new AbortController();
      const reply = await queryProvider(config, newMessages, abortRef.current.signal);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function reset() {
    abortRef.current?.abort();
    setHoleCards([null, null]);
    setCommunityCards([null, null, null, null, null]);
    setPosition('');
    setPotSize('');
    setStackSize('');
    setNumPlayers('');
    setMessages([]);
    setError(null);
    setFollowUp('');
  }

  function handleSaveConfig(c: AdvisorConfig) {
    setConfig(c);
  }

  const hasCards = allUsed.length > 0;
  const providerLabel = { claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini', groq: 'Groq' }[config.provider];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black text-xl">AI Advisor</h2>
        <div className="flex items-center gap-2">
          {hasCards && (
            <button type="button" onClick={reset} className="text-white/30 hover:text-white/60 text-sm transition-colors">
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="text-white/40 hover:text-white/60 text-xs transition-colors flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>
            {config.apiKey ? providerLabel : 'Set API Key'}
          </button>
        </div>
      </div>

      {/* No API key banner */}
      {!config.apiKey && (
        <div className="rounded-2xl px-5 py-4 text-center border border-gold/20 bg-gold/5">
          <p className="text-white/70 text-sm">
            Connect your AI provider to get poker advice.
          </p>
          <Button variant="primary" size="sm" className="mt-3" onClick={() => setSettingsOpen(true)}>
            Set up API Key
          </Button>
        </div>
      )}

      {/* Card selection */}
      <div className="flex flex-col gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04]">
        {/* Hole cards */}
        <div>
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Your Hole Cards</span>
          <div className="flex gap-2 mt-2">
            {holeCards.map((card, i) => (
              <MiniCard key={i} card={card} onClick={() => setPickerTarget({ type: 'hole', index: i })} />
            ))}
          </div>
        </div>

        {/* Community cards */}
        <div>
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Community Cards</span>
          <div className="flex gap-2 mt-2">
            {communityCards.map((card, i) => (
              <MiniCard key={i} card={card} onClick={() => setPickerTarget({ type: 'community', index: i })} />
            ))}
          </div>
        </div>
      </div>

      {/* Game context */}
      <div className="grid grid-cols-2 gap-3">
        {/* Position */}
        <div>
          <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-1.5">Position</label>
          <div className="flex flex-wrap gap-1.5">
            {POSITIONS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(position === p ? '' : p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  position === p
                    ? 'bg-gold/15 text-gold border border-gold/30'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div>
          <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-1.5">Players</label>
          <input
            type="text"
            inputMode="numeric"
            value={numPlayers}
            onChange={e => setNumPlayers(e.target.value)}
            placeholder="e.g. 6"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        {/* Pot size */}
        <div>
          <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-1.5">Pot Size</label>
          <input
            type="text"
            inputMode="numeric"
            value={potSize}
            onChange={e => setPotSize(e.target.value)}
            placeholder="e.g. 150"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        {/* Stack size */}
        <div>
          <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-1.5">Your Stack</label>
          <input
            type="text"
            inputMode="numeric"
            value={stackSize}
            onChange={e => setStackSize(e.target.value)}
            placeholder="e.g. 500"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
          />
        </div>
      </div>

      {/* Ask button */}
      <Button
        variant="primary"
        fullWidth
        onClick={askAdvisor}
        disabled={loading || holeCards.filter(Boolean).length < 2}
      >
        {loading ? 'Thinking...' : messages.length > 0 ? 'Ask Again (new context)' : 'What should I do?'}
      </Button>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 bg-red-900/30 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 max-h-80 overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-white/5 text-white/60 border border-white/8'
                  : 'bg-gold/5 text-white border border-gold/15'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider block mb-1 text-white/30">
                {msg.role === 'user' ? 'You' : providerLabel}
              </span>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          {loading && (
            <div className="rounded-xl px-4 py-3 bg-gold/5 border border-gold/15">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/30">{providerLabel}</span>
              <p className="text-white/40 text-sm mt-1 animate-pulse">Thinking...</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Follow-up input */}
      {messages.length > 0 && !loading && (
        <div className="flex gap-2">
          <input
            type="text"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendFollowUp(); }}
            placeholder="Ask a follow-up..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
          />
          <Button variant="secondary" size="md" onClick={sendFollowUp} disabled={!followUp.trim()}>
            Send
          </Button>
        </div>
      )}

      {/* Card picker overlay */}
      {pickerTarget && (
        <CardPicker
          used={pickerUsed()}
          onSelect={handleCardSelect}
          onClose={() => setPickerTarget(null)}
        />
      )}

      {/* Settings dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
      />
    </div>
  );
}
