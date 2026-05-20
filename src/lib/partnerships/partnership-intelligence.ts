export type PartnershipUiState =
  | 'none'
  | 'company_interested'
  | 'university_interested'
  | 'mutual_interest'
  | 'active';

export function deriveUiState(input: {
  partnershipStatus: string | null;
  companyInterested: boolean;
  universityInterested: boolean;
}): PartnershipUiState {
  if (input.partnershipStatus === 'ACTIVE') return 'active';
  if (input.companyInterested && input.universityInterested) return 'mutual_interest';
  if (input.companyInterested) return 'company_interested';
  if (input.universityInterested) return 'university_interested';
  return 'none';
}

export const STATE_LABELS: Record<PartnershipUiState, string> = {
  none: 'No interaction',
  company_interested: 'Company interested',
  university_interested: 'University interested',
  mutual_interest: 'Mutual interest',
  active: 'Partnership active',
};

export function stateCtaForViewer(
  state: PartnershipUiState,
  viewer: 'company' | 'university'
): { label: string; action: 'interest' | 'waiting' | 'connected' } {
  if (state === 'active') return { label: 'Partnered', action: 'connected' };
  if (state === 'mutual_interest') return { label: 'Activating…', action: 'waiting' };
  if (state === 'company_interested' && viewer === 'university') {
    return { label: 'Interested in Partnership', action: 'interest' };
  }
  if (state === 'university_interested' && viewer === 'company') {
    return { label: 'Interested in Partnership', action: 'interest' };
  }
  if (state === 'company_interested' && viewer === 'company') {
    return { label: 'Interest sent', action: 'waiting' };
  }
  if (state === 'university_interested' && viewer === 'university') {
    return { label: 'Interest sent', action: 'waiting' };
  }
  return { label: 'Interested in Partnership', action: 'interest' };
}
