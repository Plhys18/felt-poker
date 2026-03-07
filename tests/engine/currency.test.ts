import { describe, it, expect } from 'vitest';
import { formatChips, formatChipsPnL } from '../../src/engine/currency';

describe('formatChips', () => {
  it('formats a round number', () => {
    expect(formatChips(20)).toContain('20');
  });

  it('formats zero', () => {
    expect(formatChips(0)).toContain('0');
  });

  it('rounds fractional chips', () => {
    expect(formatChips(15.6)).toContain('16');
  });

  it('handles large amounts', () => {
    expect(formatChips(1000)).toMatch(/1.*000/);
  });

  it('does not include a currency symbol', () => {
    expect(formatChips(5)).not.toMatch(/[A-Z]{3}/);
  });
});

describe('formatChipsPnL', () => {
  it('positive amount starts with "+" sign', () => {
    const result = formatChipsPnL(20);
    expect(result).toContain('+');
    expect(result).toContain('20');
  });

  it('negative amount contains "-" sign', () => {
    const result = formatChipsPnL(-15);
    expect(result).toContain('-');
    expect(result).toContain('15');
  });

  it('zero does not have a sign', () => {
    const result = formatChipsPnL(0);
    expect(result).not.toMatch(/^\+/);
    expect(result).not.toMatch(/^-/);
    expect(result).toContain('0');
  });

  it('positive fractional rounds and contains "+"', () => {
    const result = formatChipsPnL(7.6);
    expect(result).toContain('+');
    expect(result).toContain('8');
  });

  it('negative fractional rounds and contains "-"', () => {
    const result = formatChipsPnL(-3.7);
    expect(result).toContain('-');
    expect(result).toContain('4');
  });
});
