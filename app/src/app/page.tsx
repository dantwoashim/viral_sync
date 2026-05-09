import Link from 'next/link';
import { ArrowRight, CheckCircle, ShieldCheck, MapPin, CursorClick, Tag, Check, CheckSquareOffset, Scan, Wallet } from '@phosphor-icons/react/dist/ssr';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import MouseTilt from '@/components/ui/MouseTilt';
import { TerminalPanel } from '@/components/product/TerminalPanel';
import { VisitPass } from '@/components/product/VisitPass';
import { defaultProductLoopCampaign } from '@/lib/product-loop/productLoop';
import { gauntletLabel, getProofState } from '@/lib/proof/getProofState';

export default function HomePage() {
  const proof = getProofState();
  const campaign = defaultProductLoopCampaign();
  const samplePassCode = 'Issued after claim';
  const trust = [
    'Terminal signed',
    'Visitor signed',
    'Reward settled',
    `${gauntletLabel(proof.gauntlet)} negative-path tests rejected`,
  ];
  const flow = [
    { title: 'Share link', desc: 'Creator routes demand', icon: CursorClick },
    { title: 'Claim pass', desc: 'Visitor claims without payment', icon: Tag },
    { title: 'Counter scan', desc: 'Merchant confirms at counter', icon: Scan },
    { title: 'Signed receipt', desc: 'Three-signer proof', icon: CheckSquareOffset },
    { title: 'Payout settled', desc: 'Escrow releases', icon: Wallet }
  ];

  return (
    <PremiumShell>
      <PremiumNav />
      {/* Hero Section */}
      <section className="relative min-h-[min(calc(100vh-64px),800px)] flex items-center justify-center overflow-hidden bg-white">
        {/* Dynamic rotating mesh-gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] md:w-[1200px] md:h-[1200px] pointer-events-none opacity-40 mix-blend-multiply flex justify-center items-center">
            <div className="absolute w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] animate-blob" />
            <div className="absolute w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-2000 translate-x-1/4" />
            <div className="absolute w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-emerald-400 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-4000 translate-y-1/4" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full pt-20 pb-32 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-white/60 backdrop-blur-md text-gray-800 text-sm font-bold tracking-widest uppercase shadow-sm shadow-hairline mb-10">
              <ShieldCheck size={18} weight="bold" className="text-indigo-600" /> Counter-attested outcome settlement
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl xl:text-[7.5rem] font-bold tracking-tighter leading-[0.9] text-gray-900 font-serif max-w-6xl mx-auto">
              Pay only after the customer and terminal <span className="relative whitespace-nowrap"><span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">co-sign the outcome.</span><span className="absolute bottom-2 left-0 w-full h-6 bg-indigo-100/50 -z-0 transform -rotate-1 rounded-full blur-sm"></span></span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-500 leading-relaxed max-w-3xl mx-auto font-medium mt-10">
              Viral Sync lets merchants escrow rewards, creators route customers, and Solana release payouts only after a POC-1 receipt is counter-attested and valid.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mt-14 w-full">
              <Link className="inline-flex items-center justify-center gap-2 h-16 px-10 rounded-full bg-black text-white text-lg font-bold shadow-2xl shadow-black/20 shadow-hairline hover:-translate-y-1 hover:shadow-black/30 transition-all w-full sm:w-auto" href={`/receipt/${encodeURIComponent(proof.receiptId)}`}>
                View verified receipt <ArrowRight size={20} weight="bold" />
              </Link>
              <Link className="inline-flex items-center justify-center gap-2 h-16 px-10 rounded-full bg-white text-gray-900 text-lg font-bold shadow-lg shadow-gray-200/50 shadow-hairline hover:bg-gray-50 transition-all w-full sm:w-auto" href="/merchant/scan">
                Try merchant terminal
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-16" aria-label="Proof summary">
              {trust.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-gray-600 bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm shadow-hairline">
                  <Check size={18} weight="bold" className="text-emerald-500" /> {item}
                </span>
              ))}
            </div>
        </div>
      </section>

      {/* Rail Flow */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-gray-50/50 border-b border-gray-100">
        <div className="layout-grid">
          <div className="text-center mb-24 col-span-4 md:col-span-8 lg:col-span-12">
            <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs">How it Works</span>
            <h2 className="text-3xl md:text-5xl lg:text-[4rem] font-bold tracking-tighter leading-[0.95] text-gray-900 mt-4 font-serif">The verified outcome settlement flow.</h2>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-8" aria-label="Outcome settlement flow">
              {flow.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div className="relative group flex flex-col gap-4 bg-white rounded-[32px] p-8 shadow-hairline border border-black/[0.03] hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1" key={step.title}>
                    {index < flow.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-10 w-8 lg:w-12 h-[2px] bg-gray-200 -z-10 transform -translate-y-1/2 group-hover:bg-indigo-300 transition-colors" />
                    )}
                    <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm border border-indigo-100/50">
                      <Icon size={24} weight="duotone" />
                    </span>
                    <div className="flex flex-col gap-2 mt-2">
                      <strong className="text-gray-900 text-lg font-bold">{step.title}</strong>
                      <small className="text-gray-500 text-[15px] leading-relaxed font-medium">{step.desc}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-16 lg:py-32 bg-white border-b border-gray-100">
        <div className="layout-grid items-center">
          <div className="flex flex-col gap-6 col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-1">
            <span className="text-rose-600 font-bold tracking-widest uppercase text-xs inline-flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /> The Problem</span>
            <h2 className="text-4xl lg:text-[4.5rem] leading-[0.95] font-bold tracking-tighter text-gray-900 font-serif">Clicks and coupon opens are not <span className="italic text-gray-400">conversions</span>.</h2>
            <p className="text-xl text-gray-500 leading-relaxed font-medium">
              Viral Sync turns the expensive moment into the verified moment: a customer arrives, a terminal confirms the pass, the visitor confirms presence, and the reward settles from escrow.
            </p>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6 mt-12 lg:mt-0">
            <div className="bg-gray-50 rounded-[40px] p-10 lg:p-14 border border-black/[0.05] shadow-hairline">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-[var(--shadow-diffuse-light)] border border-white/10">
                  <CheckSquareOffset size={24} weight="fill" />
                </div>
                <strong className="text-2xl font-bold text-gray-900 tracking-tight">No trust-me dashboard.</strong>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed relative z-10">
                Every claim points back to a verifiable receipt and transparent fraud evidence, so you know exactly what happened at the counter. No opaque metrics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Flow */}
      <section className="py-16 lg:py-32 bg-gray-50/50 border-b border-gray-100">
        <div className="layout-grid">
          <div className="flex flex-col gap-4 text-center col-span-4 md:col-span-8 lg:col-span-8 lg:col-start-3 mb-16 lg:mb-24">
            <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs">Customer flow</span>
            <h2 className="text-4xl md:text-5xl lg:text-[5.5rem] font-bold tracking-tighter leading-[0.95] text-gray-900 font-serif px-2">Visit pass simple.<br/><span className="text-gray-400">No crypto at checkout.</span></h2>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-12">
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12 perspective-[2000px]">
              <MouseTilt className="w-full"><VisitPass stage="claim" merchant={campaign?.merchantAlias} visitorReward={campaign?.visitorRewardLabel} routerReward={campaign?.routerRewardLabel} /></MouseTilt>
              <MouseTilt className="w-full"><VisitPass stage="show" merchant={campaign?.merchantAlias} visitorReward={campaign?.visitorRewardLabel} routerReward={campaign?.routerRewardLabel} passCode={samplePassCode} expiresAt={campaign?.expiresAt} /></MouseTilt>
              <MouseTilt className="w-full"><VisitPass stage="verified" merchant={campaign?.merchantAlias} visitorReward={campaign?.visitorRewardLabel} routerReward={campaign?.routerRewardLabel} passCode={samplePassCode} /></MouseTilt>
            </div>
          </div>
        </div>
      </section>

      {/* Merchant Terminal */}
      <section className="py-16 lg:py-32 bg-white border-b border-gray-100">
        <div className="layout-grid items-center">
          <div className="flex flex-col gap-8 col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-1 mt-12 lg:mt-0 order-2 lg:order-1 items-center lg:items-start perspective-[2000px]">
            <MouseTilt className="shadow-[var(--shadow-diffuse-light)] rounded-[32px] w-full max-w-sm">
              <TerminalPanel
                state="detected"
                merchant={campaign?.merchantAlias}
                campaignTitle={campaign?.title}
                passCode={samplePassCode}
                visitorReward={campaign?.visitorRewardLabel}
                routerReward={campaign?.routerRewardLabel}
              />
            </MouseTilt>
          </div>
          <div className="flex flex-col gap-6 col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7 order-1 lg:order-2">
            <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs inline-flex items-center gap-2"><MapPin size={16} /> Merchant terminal</span>
            <h2 className="text-4xl lg:text-[4.5rem] leading-[0.95] font-bold tracking-tighter text-gray-900 font-serif">Confirm a visit in five seconds.</h2>
            <p className="text-xl text-gray-500 leading-relaxed font-medium">
              The counter UI says what staff need to know: valid pass, reward split, campaign match, and one clear confirm action. Technical errors stay behind a drawer.
            </p>
            <Link className="inline-flex w-fit items-center justify-center gap-2 h-16 px-10 mt-6 rounded-full bg-gray-900 text-white text-lg font-semibold shadow-2xl shadow-gray-900/20 shadow-hairline hover:-translate-y-1 transition-transform" href="/merchant/scan">
               Open terminal
            </Link>
          </div>
        </div>
      </section>

      {/* Developer Proof */}
      <section className="py-16 lg:py-32 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="layout-grid bg-[#0a0a0a] rounded-[32px] lg:rounded-[48px] p-8 lg:p-24 shadow-[var(--shadow-diffuse-gray)] shadow-hairline-dark text-white selection:bg-indigo-500/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

          <div className="col-span-4 md:col-span-8 lg:col-span-5 relative z-10 flex flex-col gap-6">
             <span className="text-indigo-400 font-bold tracking-widest uppercase text-xs inline-flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Developer proof</span>
             <h2 className="text-4xl md:text-5xl lg:text-[5rem] font-bold tracking-tighter leading-[0.95] font-serif">Judges can verify<br/><span className="text-gray-400">without trusting us.</span></h2>
             <p className="text-lg text-gray-400 leading-relaxed max-w-xl font-medium mt-4">
                The proof center consolidates receipt state, fraud evidence, verifier checks, program identity, artifacts, and limitations into one dense surface.
             </p>
          </div>

          <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7 relative z-10 flex flex-col gap-6 mt-12 lg:mt-0">
              <div className="bg-[#111] backdrop-blur-md border border-white/5 shadow-hairline-dark rounded-[24px] p-8 flex justify-between items-center group transition-colors hover:border-white/10 hover:bg-[#161616]">
                <div className="flex flex-col gap-1.5"><span className="text-xs tracking-widest uppercase font-bold text-gray-500">Proof status</span><b className="text-2xl font-mono group-hover:text-emerald-400 transition-colors flex items-center gap-3"><CheckCircle size={24} weight="fill" className="text-emerald-500" /> {proof.statusLabel}</b></div>
              </div>
              <div className="bg-[#111] backdrop-blur-md border border-white/5 shadow-hairline-dark rounded-[24px] p-8 flex justify-between items-center group transition-colors hover:border-white/10 hover:bg-[#161616]">
                <div className="flex flex-col gap-1.5"><span className="text-xs tracking-widest uppercase font-bold text-gray-500">Cluster</span><b className="text-2xl font-mono group-hover:text-indigo-400 transition-colors">{proof.cluster}</b></div>
              </div>
              <div className="bg-[#111] backdrop-blur-md border border-white/5 shadow-hairline-dark rounded-[24px] p-8 flex justify-between items-center group transition-colors hover:border-white/10 hover:bg-[#161616]">
                <div className="flex flex-col gap-1.5"><span className="text-xs tracking-widest uppercase font-bold text-gray-500">Fraud checks</span><b className="text-2xl font-mono group-hover:text-rose-400 transition-colors">{gauntletLabel(proof.gauntlet)} passed</b></div>
              </div>
              <Link className="inline-flex justify-center items-center gap-2 h-16 mt-8 rounded-full bg-white text-gray-900 font-bold hover:bg-gray-100 hover:-translate-y-1 shadow-2xl shadow-white/10 transition-all text-lg" href="/proof">
                Open proof center <ArrowRight size={20} weight="bold" />
              </Link>
          </div>
        </div>
      </section>
    </PremiumShell>
  );
}
