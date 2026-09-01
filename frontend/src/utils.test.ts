import { describe, test, expect } from 'vitest';
import { validateAmount, formatAddress, calculateMockRewards, isValidContractId, toStroops, fromStroops, parseTransactionError, calculatePresetAmount } from './utils';

describe('Utility Functions Tests', () => {
  test('validateAmount validates positive numbers correctly', () => {
    expect(validateAmount('10')).toBe(true);
    expect(validateAmount('-5')).toBe(false);
    expect(validateAmount('abc')).toBe(false);
  });

  test('formatAddress truncates address properly', () => {
    expect(formatAddress('GDXKETAZIUWTNK7NP5VKR2JVXWUQDTRVG46YQDUBLFCL24UTR5PVAEPL')).toBe('GDXK...AEPL');
    expect(formatAddress('abc')).toBe('abc');
  });

  test('calculateMockRewards calculates correct rewards', () => {
    expect(calculateMockRewards(100, 10)).toBe(1000);
    expect(calculateMockRewards(0, 50)).toBe(0);
  });

  test('isValidContractId checks contract ID structure', () => {
    expect(isValidContractId('CADERYULZE76K23VX36Y4ZK53O7E6I2AE6MXHLNMSQ5XCEVX3DJPFWN2')).toBe(true);
    expect(isValidContractId('invalid_id')).toBe(false);
  });

  test('toStroops converts normal value to stroops correctly', () => {
    expect(toStroops(10)).toBe('100000000');
    expect(toStroops('1.5')).toBe('15000000');
    expect(toStroops('abc')).toBe('0');
  });

  test('fromStroops converts stroops to normal decimal string correctly', () => {
    expect(fromStroops(10000000)).toBe('1.0000');
    expect(fromStroops('15000000')).toBe('1.5000');
    expect(fromStroops('abc')).toBe('0.0000');
  });

  test('parseTransactionError handles various error shapes', () => {
    expect(parseTransactionError(null)).toBe('Unknown error occurred');
    expect(parseTransactionError('User rejected the transaction')).toBe('Transaction rejected by user');
    expect(parseTransactionError({ message: 'insufficient funds or balance' })).toBe('Insufficient balance for this transaction');
    expect(parseTransactionError(new Error('timeout occurred'))).toBe('Network transaction timed out. Please try again.');
    expect(parseTransactionError('some random error')).toBe('some random error');
  });

  test('calculatePresetAmount calculates proportional staking amounts', () => {
    expect(calculatePresetAmount(100, 25)).toBe('25.00');
    expect(calculatePresetAmount(200, 50)).toBe('100.00');
    expect(calculatePresetAmount(100, 100)).toBe('100.00');
    expect(calculatePresetAmount(0, 50)).toBe('0');
  });
});
