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

export function calculateProjectedYield(stakedAmount: number, days: number): number {
  if (stakedAmount <= 0 || days <= 0) return 0;
  // Based on demo rate of 0.01 RWT per second per XLM (864 RWT/day per XLM)
  return Number((stakedAmount * days * 864).toFixed(2));
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hrs > 0) parts.push(`${hrs.toString().padStart(2, '0')}h`);
  if (mins > 0 || hrs > 0) parts.push(`${mins.toString().padStart(2, '0')}m`);
  parts.push(`${secs.toString().padStart(2, '0')}s`);

  return parts.join(' ');
}
