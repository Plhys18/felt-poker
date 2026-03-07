import type { SessionProjection } from '../types/projection';
import type { SessionConfig } from '../types/session';
import type { Settlement, Transfer } from '../types/settlement';
import type { PlayerId } from '../types/ids';

// Greedy two-pointer minimum transfer algorithm.
//
// Players: Alice +30, Bob -10, Carol -15, Dave -5
// Sorted creditors: [Alice +30], debtors: [Carol -15, Bob -10, Dave -5]
// Step 1: Alice → Carol 15. Alice now +15.
// Step 2: Alice → Bob 10. Alice now +5.
// Step 3: Alice → Dave 5. Done.
// Result: 3 transfers.

interface Balance {
  playerId: PlayerId;
  balance: number;
}

export function computeSettlement(
  projection: SessionProjection,
  _config: SessionConfig,
): Settlement {
  // Build balances from netProfitLoss
  const balances: Balance[] = projection.playersByPosition.map((ps) => ({
    playerId: ps.id,
    balance: ps.netProfitLoss,
  }));

  // Validate: sum of all balances should be ~0
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
  const isValid = Math.abs(totalBalance) < 1;

  // Filter out zero balances
  const nonZero = balances.filter((b) => Math.abs(b.balance) >= 1);

  // Separate creditors (positive) and debtors (negative)
  const creditors: Balance[] = nonZero
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance); // descending

  const debtors: Balance[] = nonZero
    .filter((b) => b.balance < 0)
    .sort((a, b) => a.balance - b.balance); // ascending (most negative first)

  // Work with mutable copies
  const creditorAmounts = creditors.map((c) => ({ playerId: c.playerId, amount: c.balance }));
  const debtorAmounts = debtors.map((d) => ({ playerId: d.playerId, amount: Math.abs(d.balance) }));

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditorAmounts.length && di < debtorAmounts.length) {
    const creditor = creditorAmounts[ci];
    const debtor = debtorAmounts[di];

    const transferAmount = Math.min(creditor.amount, debtor.amount);

    const roundedAmount = Math.round(transferAmount);

    if (roundedAmount > 0) {
      transfers.push({
        from: debtor.playerId,
        to: creditor.playerId,
        amount: roundedAmount,
      });
    }

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    if (creditor.amount < 0.5) ci++;
    if (debtor.amount < 0.5) di++;
  }

  return {
    transfers,
    isValid,
  };
}
