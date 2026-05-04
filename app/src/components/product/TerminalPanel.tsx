import { CheckCircle, Clock, QrCode, ShieldCheck } from '@phosphor-icons/react/dist/ssr';

type TerminalPanelCheck = { label: string; ok: boolean; detail?: string };

export function TerminalPanel({
  state = 'detected',
  merchant = 'Thamel Brew House',
  campaignTitle = 'Counter-attested visit',
  passCode,
  visitorReward = 'Pending',
  routerReward = 'Pending',
  checks,
}: {
  state?: 'idle' | 'detected' | 'signing' | 'success';
  merchant?: string;
  campaignTitle?: string;
  passCode?: string;
  visitorReward?: string;
  routerReward?: string;
  checks?: TerminalPanelCheck[];
}) {
  const rows = checks?.length ? checks.slice(0, 4).map((check) => [check.label, check.ok ? 'Yes' : 'Review']) : [
    ['Valid pass', state === 'idle' ? 'Waiting' : 'Yes'],
    ['Within time window', state === 'idle' ? 'Waiting' : 'Yes'],
    ['Not previously used', state === 'idle' ? 'Waiting' : 'Yes'],
    ['Terminal online', 'Yes'],
  ];

  return (
    <div className={`terminal-panel terminal-${state}`}>
      <div className="terminal-top">
        <span>Merchant Terminal</span>
        <b>Online</b>
      </div>
      <div className="terminal-body">
        <div className="terminal-pass">
          <QrCode size={92} weight="duotone" />
          <strong>{state === 'idle' ? 'Scan pass or enter code' : 'Customer presented a visit pass'}</strong>
          <small>{passCode ?? merchant}</small>
        </div>
        <div className="terminal-checks">
          <h3>{state === 'success' ? 'Visit verified' : state === 'signing' ? 'Signing receipt' : 'Confirm visit?'}</h3>
          {rows.map(([label, value]) => (
            <span key={label}><small>{label}</small><b>{value}</b></span>
          ))}
          <span><small>Customer reward</small><b>{visitorReward}</b></span>
          <span><small>Router reward</small><b>{routerReward}</b></span>
        </div>
      </div>
      <div className="terminal-action">
        {state === 'success' ? <CheckCircle size={18} weight="bold" /> : state === 'signing' ? <Clock size={18} weight="bold" /> : <ShieldCheck size={18} weight="bold" />}
        {state === 'success' ? 'Reward settled' : state === 'signing' ? 'Terminal verifying receipt' : campaignTitle}
      </div>
    </div>
  );
}
