import Link from 'next/link';
import { ArrowRight, PlayCircle, Tag, HandCoins, ChartLineUp, Receipt, Code } from '@phosphor-icons/react/dist/ssr';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';

export default function DemoLauncherPage() {
  const steps = [
    { title: 'Claim Pass', desc: 'Customer saves pass to their phone.', icon: Tag },
    { title: 'Confirm at Terminal', desc: 'Staff confirms the visit.', icon: HandCoins },
    { title: 'View Summary', desc: 'Merchant sees daily outcomes.', icon: ChartLineUp },
    { title: 'Open Receipt', desc: 'Inspect the generated receipt.', icon: Receipt },
    { title: 'Inspect Proof', desc: 'Review fraud gauntlet & program.', icon: Code }
  ];

  return (
    <PremiumShell className="bg-white">
      <PremiumNav />

      {/* Hero Section */}
      <section className="relative min-h-[min(calc(100vh-64px),800px)] flex items-center justify-center overflow-hidden bg-white">
        {/* Dynamic rotating mesh-gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] md:w-[1200px] md:h-[1200px] pointer-events-none opacity-60 mix-blend-multiply">
           <div className="w-full h-full animate-[spin_40s_linear_infinite] relative">
              <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-300 rounded-full mix-blend-multiply filter blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
              <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[120px] animate-[pulse_12s_ease-in-out_infinite_reverse]" />
              <div className="absolute bottom-1/4 left-1/3 w-[700px] h-[700px] bg-emerald-200 rounded-full mix-blend-multiply filter blur-[140px] animate-[pulse_14s_ease-in-out_infinite]" />
           </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-4xl mx-auto relative z-10 w-full pt-[100px]">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-white/60 backdrop-blur-md text-gray-800 text-sm font-bold tracking-widest uppercase mb-10 shadow-sm shadow-hairline">
            <PlayCircle size={18} weight="bold" /> Start Demo
          </div>
          <h1 className="text-6xl md:text-8xl lg:text-[6rem] xl:text-[7.5rem] font-bold tracking-tight text-gray-900 mb-6 font-serif leading-[0.95]">
            Experience <span className="relative whitespace-nowrap"><span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">Viral Sync</span><span className="absolute bottom-2 left-0 w-full h-6 bg-indigo-100/50 -z-0 transform -rotate-1 rounded-full blur-sm"></span></span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 leading-relaxed max-w-2xl mx-auto mb-14 font-medium mt-10">
            This linear demo will guide you through the exact flow a customer and merchant experience,
            culminating in the technical proof available to judges and developers.
          </p>

          <Link className="inline-flex items-center justify-center gap-2 h-16 px-10 rounded-full bg-black text-white text-lg font-bold shadow-2xl shadow-black/20 shadow-hairline hover:-translate-y-1 transition-all hover:shadow-black/30 w-full sm:w-auto" href="/claim/thamel-brew-counter-attested-visits">
              Start Customer Claim <ArrowRight size={20} weight="bold" />
          </Link>
        </div>
      </section>

      {/* Demo Workflow */}
      <section className="py-24 px-6 bg-gray-50/50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs">Demo Sequence</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mt-2 font-serif">What to expect.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-8" aria-label="Demo workflow">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div className="relative group flex flex-col gap-4 bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1" key={step.title}>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-10 w-8 lg:w-12 h-[2px] bg-gray-200 -z-10 transform -translate-y-1/2 group-hover:bg-indigo-300 transition-colors" />
                  )}
                  <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <Icon size={24} weight="duotone" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <strong className="text-gray-900 text-lg font-bold">{step.title}</strong>
                    <small className="text-gray-500 text-sm leading-relaxed font-medium">{step.desc}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PremiumShell>
  );
}
