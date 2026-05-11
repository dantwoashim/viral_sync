import Link from 'next/link';
import { ArrowRight, CheckCircle, ShieldCheck, MapPin, Tag, Storefront, ChartLineUp, ShieldWarning, HandCoins } from '@phosphor-icons/react/dist/ssr';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import MouseTilt from '@/components/ui/MouseTilt';
import { TerminalPanel } from '@/components/product/TerminalPanel';

export default function ForMerchantsPage() {
  const steps = [
    { title: 'Create Offer', desc: 'Set a reward for a confirmed visit (e.g. $2.00)', icon: Storefront },
    { title: 'Customers Claim', desc: 'They save a simple pass to their phone.', icon: Tag },
    { title: 'Staff Confirm', desc: 'Scan at the counter in 5 seconds.', icon: HandCoins },
    { title: 'Receipt Generated', desc: 'Secure settlement validates the visit.', icon: ShieldCheck },
    { title: 'Review outcomes', desc: 'Track counter-confirmed visits and reward settlement.', icon: ChartLineUp }
  ];

  return (
    <PremiumShell className="bg-white">
      <PremiumNav />

      {/* Hero Section */}
      <section className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white border-b border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-64 bg-indigo-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 p-64 bg-emerald-500/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="layout-grid items-center min-h-[min(calc(100vh-64px),800px)] py-20 lg:py-32 relative z-10 pt-[100px]">
          <div className="col-span-4 md:col-span-8 lg:col-span-6 flex flex-col gap-8 max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
            <div className="inline-flex w-fit mx-auto lg:mx-0 items-center gap-2 rounded-full px-4 py-1.5 bg-white/60 text-gray-700 text-xs font-bold tracking-widest uppercase shadow-sm shadow-hairline">
              <Storefront size={16} weight="bold" className="text-indigo-600" /> For Local Merchants
            </div>
            <h1 className="text-5xl lg:text-7xl xl:text-[6rem] font-bold tracking-tighter leading-[0.9] text-gray-900 font-serif">
              Pay only when customers <span className="relative whitespace-nowrap"><span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">actually visit.</span><span className="absolute bottom-1 left-0 w-full h-3 bg-indigo-100 -z-0 transform -rotate-1"></span></span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-500 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
              Stop paying for impressions or clicks alone. With Viral Sync, rewards settle only after a customer reaches the counter and your staff confirms the visit.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
              <Link className="inline-flex items-center justify-center gap-2 h-16 px-10 rounded-full bg-indigo-600 text-white font-semibold shadow-[var(--shadow-diffuse-light)] hover:-translate-y-1 transition-transform w-full sm:w-auto text-lg shadow-hairline" href="/merchant/scan">
                Start free pilot <ArrowRight size={20} weight="bold" />
              </Link>
            </div>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8 flex justify-center items-center perspective-[2000px] mt-16 lg:mt-0">
             {/* Abstract illustration of merchant savings */}
             <div className="w-full max-w-[420px] bg-[#0a0a0a] text-white p-10 rounded-[40px] shadow-[var(--shadow-diffuse-gray)] shadow-hairline-dark transition-transform duration-700 hover:-translate-y-4 hover:rotate-y-[-5deg] hover:rotate-x-[5deg] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <h2 className="text-2xl font-bold tracking-tight mb-2 relative z-10">Outcome-Based Rewards</h2>
                <p className="text-gray-400 font-medium leading-relaxed mb-8 relative z-10">Escrow rewards securely. If they don&apos;t show up, you don&apos;t pay.</p>
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex justify-between items-center w-full border-b border-white/10 pb-4">
                    <span className="text-gray-300 font-medium">Customer claimed pass</span>
                    <b className="text-white px-3 py-1 bg-white/10 rounded-lg text-sm">No charge</b>
                  </div>
                  <div className="flex justify-between items-center w-full border-b border-white/10 pb-4">
                    <span className="text-gray-300 font-medium">Customer arrives</span>
                    <b className="text-emerald-400 px-3 py-1 bg-emerald-500/10 rounded-lg text-sm flex items-center gap-1.5"><CheckCircle size={16} weight="fill" /> Verified</b>
                  </div>
                  <div className="flex justify-between items-center w-full pt-2">
                    <span className="text-gray-300 font-medium font-bold">Reward released</span>
                    <b className="text-3xl text-white font-bold tracking-tighter">$2.00</b>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 lg:py-32 px-6 bg-gray-50/50 border-b border-gray-100 relative">
        <div className="layout-grid">
          <div className="text-center mb-24 col-span-4 md:col-span-8 lg:col-span-12">
            <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs">Merchant Workflow</span>
            <h2 className="text-4xl md:text-5xl lg:text-[4.5rem] leading-[0.95] font-bold tracking-tighter text-gray-900 mt-4 font-serif">Setup once, track forever.</h2>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-8" aria-label="Merchant workflow">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div className="relative group flex flex-col gap-4 bg-white rounded-[32px] p-8 shadow-hairline border border-black/[0.03] hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1" key={step.title}>
                    {index < steps.length - 1 && (
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

       {/* Merchant economics */}
       <section className="py-24 lg:py-32 bg-white border-b border-gray-100">
        <div className="layout-grid items-center">
          <div className="flex flex-col gap-6 col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-1">
            <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs inline-flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Merchant Economics</span>
            <h2 className="text-4xl lg:text-[4.5rem] leading-[0.95] font-bold tracking-tighter text-gray-900 font-serif">Reward real visits, not clicks.</h2>
            <p className="text-xl text-gray-500 leading-relaxed font-medium">
              Traditional ads charge before the merchant sees a clear outcome. Viral Sync ties reward settlement to a counter-confirmed event.
              You set a campaign budget, escrow it, and payouts trigger only after the receipt path is valid.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-6">
               <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100"><CheckCircle size={18} weight="fill" className="text-emerald-500" /> No upfront ad spend</span>
               <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100"><CheckCircle size={18} weight="fill" className="text-emerald-500" /> Counter-confirmed outcomes</span>
            </div>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6 mt-12 lg:mt-0 relative overflow-hidden">
             <div className="bg-gray-50 rounded-[40px] p-10 lg:p-14 border border-black/[0.05] shadow-hairline">
               <div className="absolute -right-10 -top-10 text-gray-200/50">
                  <Storefront size={200} weight="duotone" />
               </div>
               <div className="grid grid-cols-2 gap-6 relative z-10">
                  <article className="bg-white rounded-[24px] p-8 border border-black/[0.05] shadow-hairline flex flex-col gap-2 transition-transform hover:-translate-y-1">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Campaign Budget</span>
                    <strong className="text-3xl text-gray-900 font-bold tracking-tight">$100.00</strong>
                  </article>
                  <article className="bg-white rounded-[24px] p-8 border border-black/[0.05] shadow-hairline flex flex-col gap-2 transition-transform hover:-translate-y-1">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Reward / visit</span>
                    <strong className="text-3xl text-gray-900 font-bold tracking-tight">$2.00</strong>
                  </article>
                  <article className="bg-white rounded-[24px] p-8 border border-black/[0.05] shadow-hairline flex flex-col gap-2 transition-transform hover:-translate-y-1">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Confirmed Visits</span>
                    <strong className="text-3xl text-gray-900 font-bold tracking-tight">12</strong>
                  </article>
                  <article className="bg-emerald-500 text-white rounded-[24px] p-8 border border-emerald-600 flex flex-col gap-2 shadow-[var(--shadow-diffuse-emerald)] shadow-hairline transition-transform hover:-translate-y-1">
                    <span className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Budget Remaining</span>
                    <strong className="text-3xl text-white font-bold tracking-tight">$76.00</strong>
                  </article>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Staff terminal preview */}
      <section className="py-24 lg:py-32 bg-gray-50/50 border-b border-gray-100">
        <div className="layout-grid items-center">
          <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-1 mt-12 lg:mt-0 order-2 lg:order-1 perspective-[2000px] flex justify-center lg:justify-start">
            <MouseTilt>
              <TerminalPanel
                state="detected"
                merchant="Your Business"
                campaignTitle="Weekend Special"
                passCode="A1B2"
                visitorReward="$2.00"
              />
            </MouseTilt>
          </div>
          <div className="flex flex-col gap-6 col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8 order-1 lg:order-2">
            <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs inline-flex items-center gap-2"><MapPin size={16} /> Staff Terminal</span>
            <h2 className="text-4xl lg:text-[4.5rem] leading-[0.95] font-bold tracking-tighter text-gray-900 font-serif">Zero training required.</h2>
            <p className="text-xl text-gray-500 leading-relaxed font-medium">
              The cashier interface is designed like a standard POS terminal. Staff just verify the pass code and tap confirm. No crypto terms, no complex training.
            </p>
            <Link className="inline-flex w-fit items-center justify-center gap-2 h-16 px-10 mt-6 rounded-full bg-gray-900 text-white text-lg font-semibold shadow-2xl shadow-gray-900/20 shadow-hairline hover:-translate-y-1 transition-transform" href="/merchant/scan">
              Try staff view
            </Link>
          </div>
        </div>
      </section>

      {/* Daily report preview */}
      <section className="py-24 lg:py-32 bg-white border-b border-gray-100">
        <div className="layout-grid items-center">
          <div className="flex flex-col gap-6 col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-1">
            <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs inline-flex items-center gap-2"><ChartLineUp size={16} /> Daily Report</span>
            <h2 className="text-4xl lg:text-[4.5rem] leading-[0.95] font-bold tracking-tighter text-gray-900 font-serif">Know exactly what you paid for.</h2>
            <p className="text-xl text-gray-500 leading-relaxed font-medium">Every end-of-day report provides a clear breakdown of verified visits, blocked fraud attempts, and exact ROI.</p>
            <Link className="inline-flex w-fit items-center justify-center gap-2 h-16 px-10 mt-4 rounded-full bg-white text-gray-900 font-semibold shadow-sm shadow-hairline border border-gray-200 hover:bg-gray-50 transition-colors" href="/merchant/today">
              View daily dashboard
            </Link>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6 mt-12 lg:mt-0 relative overflow-hidden">
            <div className="bg-[#0a0a0a] rounded-[40px] p-12 flex flex-col gap-8 items-center justify-center shadow-[var(--shadow-diffuse-gray)] shadow-hairline-dark relative text-center min-h-[400px]">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="flex flex-col items-center gap-3 relative z-10 w-full max-w-sm">
                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 w-full flex items-center justify-between">
                      <span className="text-emerald-100 font-medium">Verified Visits</span>
                      <b className="text-4xl text-emerald-400 font-bold flex items-center gap-2"><CheckCircle size={32} weight="fill" /> 24</b>
                   </div>
                   <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 w-full flex items-center justify-between mt-2">
                      <span className="text-rose-100 font-medium">Fraud Blocked</span>
                      <b className="text-4xl text-rose-400 font-bold flex items-center gap-2"><ShieldWarning size={32} weight="fill" /> 2</b>
                   </div>
                </div>
            </div>
          </div>
        </div>
      </section>

    </PremiumShell>
  );
}
