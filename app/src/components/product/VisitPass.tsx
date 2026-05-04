import { QrCode } from '@phosphor-icons/react/dist/ssr';

export function VisitPass({ stage = 'claim' }: { stage?: 'claim' | 'show' | 'verified' }) {
  const copy = {
    claim: ['You were invited to Thamel Brew.', 'Visit today and earn Rs. 15. Your friend earns Rs. 75 after your visit is verified.'],
    show: ['Show this pass at the counter.', 'The terminal will confirm your visit. No payment required.'],
    verified: ['Visit verified.', 'Your reward was settled on Solana.'],
  }[stage];

  return (
    <div className={`visit-pass visit-pass-${stage}`}>
      <span className="pass-status">{stage === 'verified' ? 'Verified' : 'Visit pass'}</span>
      <h2>{copy[0]}</h2>
      <p>{copy[1]}</p>
      <div className="pass-code" aria-label="Visit pass QR placeholder">
        <QrCode size={92} weight="duotone" />
      </div>
      <div className="pass-meta">
        <span>Thamel Brew</span>
        <b>{stage === 'verified' ? 'Rs. 15 settled' : '04:59'}</b>
      </div>
    </div>
  );
}
