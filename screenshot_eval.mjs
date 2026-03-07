import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const DIR = '/tmp/felt_eval';
mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch();
const BASE = 'http://localhost:5173/felt-poker/';

async function shot(p, name) {
  await p.screenshot({ path: `${DIR}/${name}.png` });
  console.log('✓', name);
}

const SESSION = {
  schemaVersion: 1,
  config: { id: 's1', name: 'Poker Night', defaultBuyIn: 150, createdAt: Date.now() },
  players: [
    { id: 'p1', name: 'Alice', seatIndex: 0 },
    { id: 'p2', name: 'Bob', seatIndex: 1 },
  ],
  events: [
    { id: 'e0', type: 'GAME_STARTED', timestamp: Date.now() },
    { id: 'e1', type: 'BUY_IN', timestamp: Date.now(), playerId: 'p1', chipsReceived: 150 },
    { id: 'e2', type: 'BUY_IN', timestamp: Date.now(), playerId: 'p2', chipsReceived: 150 },
  ],
  status: 'active', endedAt: null,
};

// Desktop
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();

  // Setup screen — sidebar should show Hand Eval
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await shot(p, '01_setup_desktop');

  // Click Hand Eval in sidebar
  await p.locator('aside nav button', { hasText: 'Hand Eval' }).click();
  await p.waitForTimeout(400);
  await shot(p, '02_eval_empty_desktop');

  // Active session
  await p.evaluate((s) => localStorage.setItem('felt:current', JSON.stringify(s)), SESSION);
  await p.reload({ waitUntil: 'networkidle' });
  await p.locator('aside nav button', { hasText: 'Hand Eval' }).click();
  await p.waitForTimeout(400);
  await shot(p, '03_eval_active_session_desktop');

  await ctx.close();
}

// Mobile  
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();

  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate((s) => localStorage.setItem('felt:current', JSON.stringify(s)), SESSION);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(500);

  // Navigate to eval - last tab
  const tabBtns = p.locator('nav[aria-label="Main navigation"] button');
  const count = await tabBtns.count();
  await tabBtns.nth(count - 1).click();
  await p.waitForTimeout(400);
  await shot(p, '04_eval_mobile');

  // Open card picker
  const slots = p.locator('button:has([class*="text-2xl"])');
  const slotCount = await slots.count();
  console.log('slots found:', slotCount);
  if (slotCount > 0) {
    await slots.first().click();
    await p.waitForTimeout(300);
    await shot(p, '05_card_picker_mobile');
  }

  await ctx.close();
}

await browser.close();
console.log('Done →', DIR);
