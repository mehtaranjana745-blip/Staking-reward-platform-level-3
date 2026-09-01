export function validateAmount(val: string): boolean {
  const num = Number(val);
  return !isNaN(num) && num > 0;
}

export function formatAddress(addr: string): string {
  if (addr.length < 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function calculateMockRewards(staked: number, seconds: number): number {
  if (staked <= 0 || seconds <= 0) return 0;
  return staked * seconds;
}

export function isValidContractId(id: string): boolean {
  return typeof id === 'string' && id.length === 56 && id.startsWith('C');
}

export function toStroops(val: number | string): string {
  const num = Number(val);
  if (isNaN(num)) return '0';
  return (num * 10000000).toFixed(0);
}

export function fromStroops(val: number | string): string {
  const num = Number(val);
  if (isNaN(num)) return '0.0000';
  return (num / 10000000).toFixed(4);
}

export function parseTransactionError(err: any): string {
  if (!err) return 'Unknown error occurred';
  const msg = typeof err === 'string' ? err : err.message || '';
  if (msg.includes('User reject') || msg.includes('reject') || msg.includes('declined')) {
    return 'Transaction rejected by user';
  }
  if (msg.includes('insufficient') || msg.includes('balance')) {
    return 'Insufficient balance for this transaction';
  }
  if (msg.includes('timeout')) {
    return 'Network transaction timed out. Please try again.';
  }
  return msg || 'Transaction failed';
}

export function calculatePresetAmount(balance: number, percentage: number): string {
  if (balance <= 0 || percentage <= 0) return '0';
  const amount = (balance * percentage) / 100;
  return amount > 0 ? amount.toFixed(2) : '0';
}
