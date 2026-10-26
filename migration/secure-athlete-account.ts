/**
 * Staging replacement for unsafe legacy athlete account lookups.
 * No GO MASTER sheet access, localStorage identity, or browser-side ID allocation.
 * IMPORTANT: server-side authorization must be independently implemented before wiring to production.
 */
export interface AthleteAccountSummary {
  go_id: string;
  full_name: string;
  current_rank: string;
  rank_type?: string;
  account_status: 'CLAIMED' | 'UNCLAIMED';
}
type BackendLookup = (action: string, params: Record<string,string>) => Promise<unknown>;

function normalizeRecord(raw: any): AthleteAccountSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const go_id = String(raw.go_id || '').trim();
  const full_name = String(raw.full_name || '').trim();
  if (!go_id || !full_name) return null;
  return {
    go_id, full_name,
    current_rank: String(raw.current_rank || '').trim(),
    rank_type: raw.rank_type ? String(raw.rank_type) : undefined,
    account_status: String(raw.account_status || '').toUpperCase() === 'CLAIMED' ? 'CLAIMED' : 'UNCLAIMED',
  };
}
export async function getAthleteById(goId: string, backend: BackendLookup): Promise<AthleteAccountSummary | null> {
  if (!goId.trim()) return null;
  const record = await backend('getAthleteAccount', { go_id: goId.trim() });
  if (record === null) return null;
  const sanitized = normalizeRecord(record);
  if (!sanitized) throw new Error('INVALID_ATHLETE_LOOKUP_RESPONSE');
  return sanitized;
}
export async function findSimilarAthletes(name: string, backend: BackendLookup): Promise<AthleteAccountSummary[]> {
  if (name.trim().length < 2) return [];
  const records = await backend('checkSimilarAthleteAccounts', { name: name.trim() });
  if (!Array.isArray(records)) throw new Error('INVALID_SIMILAR_SEARCH_RESPONSE');
  return records.map(normalizeRecord).filter((record): record is AthleteAccountSummary => record !== null).slice(0,20);
}
export function allocateGoIdOnClient(): never {
  throw new Error('ATHLETE_ID_ALLOCATION_REQUIRES_SERVER');
}
export function legacyAthleteIdentityAction(): never {
  throw new Error('ATHLETE_IDENTITY_BACKEND_NOT_VERIFIED');
}
