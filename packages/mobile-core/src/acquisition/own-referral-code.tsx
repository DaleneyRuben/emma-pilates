type ReferralCodeCardProps = { code: string; onCopied: () => void };
type EditReferralCodeProps = { fetcher: typeof fetch; onChanged: (code: string) => void };

const notBuilt = (): null => null;

export const ReferralCodeCard: (props: ReferralCodeCardProps) => null = notBuilt;
export const EditReferralCode: (props: EditReferralCodeProps) => null = notBuilt;
