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
