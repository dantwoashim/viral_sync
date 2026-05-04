import { QrCode } from '@phosphor-icons/react/dist/ssr';

export function VisitPass({
  stage = 'claim',
  merchant = 'Thamel Brew House',
  visitorReward = 'Pending',
  routerReward = 'Pending',
  passCode,
  passId,
  expiresAt,
}: {
  stage?: 'claim' | 'show' | 'verified';
  merchant?: string;
  visitorReward?: string;
  routerReward?: string;
  passCode?: string;
  passId?: string;
  expiresAt?: string | null;
}) {
  const copy = {
    claim: [`You were invited to ${merchant}.`, `Visit and earn ${visitorReward}. The router earns ${routerReward} after counter verification.`],
    show: ['Show this pass at the counter.', 'The terminal checks the proof-backed pass code before it opens the receipt.'],
    verified: ['Visit verified.', 'Your reward was settled on Solana and the receipt is ready to inspect.'],
  }[stage];
  const expiry = expiresAt ? new Date(expiresAt).toLocaleString('en', { phase: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Proof window locked';

  return (
    <div className={`visit-pass visit-pass-${stage}`}>
      <span className="pass-status">{stage === 'verified' ? 'Verified' : 'Visit pass'}</span>
      <h2>{copy[0]}</h2>
      <p>{copy[1]}</p>
      <div className="pass-code" aria-label="Visit pass QR placeholder">
        <QrCode size={92} weight="duotone" />
        {passCode ? <strong>{passCode}</strong> : null}
      </div>
      <div className="pass-meta">
        <span>{passId ?? merchant}</span>
        <b>{stage === 'verified' ? `${visitorReward} settled` : expiry}</b>
      </div>
    </div>
  );
}
