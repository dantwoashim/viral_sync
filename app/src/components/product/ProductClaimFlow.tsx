'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, Copy, Lightbulb, ShieldCheck } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisitPass } from './VisitPass';
import type { ProductLoopCampaign, VisitPassPacket } from '@/lib/product-loop/types';

type ClaimStage = 'offer' | 'creating' | 'pass' | 'error';

export function ProductClaimFlow({
  campaign,
  token,
}: {
  campaign: ProductLoopCampaign;
  token: string;
}) {
  const [stage, setStage] = useState<ClaimStage>('offer');
  const [pass, setPass] = useState<VisitPassPacket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const terminalHref = useMemo(() => {
    const code = pass?.passCode ?? '';
    const mac = pass?.passMac ?? '';
    const passId = pass?.passId ?? '';
    const nonce = pass?.nonce ?? '';
    return `/merchant/scan?slug=${encodeURIComponent(campaign.slug)}&pass=${encodeURIComponent(code)}&mac=${encodeURIComponent(mac)}&token=${encodeURIComponent(token)}&passId=${encodeURIComponent(passId)}&nonce=${encodeURIComponent(nonce)}&terminal=${encodeURIComponent(campaign.terminalDevicePda)}&merchant=${encodeURIComponent(campaign.merchantAlias)}`;
  }, [campaign.merchantAlias, campaign.slug, campaign.terminalDevicePda, pass?.nonce, pass?.passCode, pass?.passId, pass?.passMac, token]);

  async function createPass() {
    setStage('creating');
    setError(null);
    const response = await fetch('/api/product-loop/claim-pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: campaign.slug, token }),
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok !== true) {
      setError(payload?.error ?? 'The pass could not be created from the proof artifact.');
      setStage('error');
      return;
    }
    setPass(payload as VisitPassPacket);
    setStage('pass');
  }

  async function copyCode() {
    if (!pass?.passCode || !navigator.clipboard) return;
    await navigator.clipboard.writeText(pass.passCode);
  }

  return (
    <>
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-10 lg:gap-24 items-center min-h-[calc(100vh-120px)] py-12 lg:py-32 border-b border-gray-100 px-4 sm:px-6 max-w-full overflow-hidden">
        <div className="flex min-w-0 w-full flex-col gap-6 lg:gap-8 max-w-[22rem] sm:max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
          <div className="inline-flex w-fit mx-auto lg:mx-0 items-center justify-center gap-2 border border-black/10 rounded-full px-4 py-1.5 bg-white/60 text-gray-700 text-xs font-bold tracking-widest uppercase shadow-sm animate-stagger-1 mt-6 lg:mt-0">
            <ShieldCheck size={16} weight="bold" className="text-indigo-600" /> Proof-backed visit reward
          </div>
          <h1 className="text-[2rem] sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-gray-900 animate-stagger-2 px-2 lg:px-0 text-balance break-words max-w-full">
            You were invited to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{campaign.merchantAlias}</span>.
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-500 leading-relaxed max-w-[21rem] sm:max-w-xl mx-auto lg:mx-0 animate-stagger-3">
            Visit and earn <b className="text-gray-900">{campaign.visitorRewardLabel}</b>. The router earns {campaign.routerRewardLabel}{' '}
            only after the counter terminal confirms the same pass and the POC-1 receipt verifies.
          </p>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4 animate-stagger-4 min-h-[56px] relative">
            <AnimatePresence mode="popLayout">
              {stage === 'creating' ? (
                <motion.div
                  key="loading-pill"
                  layoutId="claim-button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="flex items-center justify-center h-14 w-14 rounded-full bg-gray-900 shadow-lg shadow-gray-900/20"
                >
                  <div className="w-5 h-5 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
                </motion.div>
              ) : pass ? (
                <motion.div
                  key="success-pill"
                  layoutId="claim-button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle size={20} weight="fill" /> Pass Created
                </motion.div>
              ) : (
                <motion.button
                  key="claim-btn"
                  layoutId="claim-button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="inline-flex items-center gap-2 h-14 px-8 rounded-[28px] bg-gray-900 text-white font-semibold shadow-lg shadow-hairline shadow-gray-900/20 disabled:opacity-70"
                  type="button"
                  onClick={createPass}
                >
                  Claim visit pass <ArrowRight size={16} weight="bold" />
                </motion.button>
              )}
            </AnimatePresence>
            {!pass && stage !== 'creating' && (
              <Link className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-white text-gray-900 font-semibold shadow-sm shadow-hairline border border-gray-200 hover:-translate-y-0.5 transition-transform" href={campaign.receiptPath}>
                View verified receipt
              </Link>
            )}
          </div>
          {error ? <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-medium" role="alert">{error}</div> : null}
        </div>
        <div className="flex justify-center items-center perspective-[2000px]">
          <div className="w-full max-w-[340px] sm:max-w-[420px] transition-transform duration-700 hover:-translate-y-4 hover:rotate-y-[5deg] hover:rotate-x-[5deg]">
            <VisitPass
              stage={stage === 'pass' ? 'show' : 'claim'}
              merchant={campaign.merchantAlias}
              visitorReward={campaign.visitorRewardLabel}
              routerReward={campaign.routerRewardLabel}
              passCode={pass?.passCode}
              passId={pass?.passId}
              expiresAt={pass?.expiresAt ?? campaign.expiresAt}
            />
          </div>
        </div>
      </section>

      <section id="show-pass" className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 py-20 lg:py-32 border-b border-gray-100 max-w-7xl mx-auto px-4 sm:px-6">
        <div className={`relative flex flex-col gap-5 lg:gap-6 p-6 lg:p-10 rounded-[32px] border ${pass ? 'bg-white border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)]' : 'bg-gray-50/50 border-gray-200/50 shadow-sm opacity-60'} transition-all duration-500 animate-stagger-1`}>
          <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${pass ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>1</span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Create your visit pass.</h2>
          <p className="text-gray-500 leading-relaxed mb-auto">The system issues a secure pass reserved for your visit, ready to be confirmed at the store.</p>
          <button className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-semibold transition-all w-full mt-6 ${pass ? 'bg-emerald-50 text-emerald-700 pointer-events-none' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'}`} type="button" onClick={createPass} disabled={stage === 'creating' || !!pass}>
            {pass ? <CheckCircle size={20} weight="fill" /> : null}{pass ? 'Pass created' : 'Create pass'}
          </button>
        </div>

        <div className={`relative flex flex-col gap-5 lg:gap-6 p-6 lg:p-10 rounded-[32px] border ${pass ? 'bg-white border-indigo-100 shadow-[0_8px_30px_rgba(79,70,229,0.08)] ring-1 ring-indigo-50' : 'bg-gray-50/50 border-gray-200/50 shadow-sm opacity-50'} transition-all duration-500 animate-stagger-2`}>
          <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${pass ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>2</span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Show this pass at the counter.</h2>
          <p className="text-gray-500 leading-relaxed">The terminal checks this code against the proof-backed campaign before opening the receipt.</p>

          <div className="my-6 pointer-events-none">
            <VisitPass
              stage="show"
              merchant={campaign.merchantAlias}
              visitorReward={campaign.visitorRewardLabel}
              routerReward={campaign.routerRewardLabel}
              passCode={pass?.passCode}
              passId={pass?.passId}
              expiresAt={pass?.expiresAt ?? campaign.expiresAt}
            />
          </div>

          <div className="flex gap-3 mt-auto">
            <button
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm disabled:opacity-50"
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('expand_visit_pass'))}
              disabled={!pass}
            >
              <Lightbulb size={16} /> Max Brightness
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm disabled:opacity-50" type="button" onClick={copyCode} disabled={!pass}><Copy size={16} /> Copy code</button>
          </div>
        </div>

        <div className={`relative flex flex-col gap-5 lg:gap-6 p-6 lg:p-10 rounded-[32px] border ${pass ? 'bg-white border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)]' : 'bg-gray-50/50 border-gray-200/50 shadow-sm opacity-50'} transition-all duration-500 animate-stagger-3`}>
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg bg-gray-200 text-gray-500">3</span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Confirm at terminal.</h2>
          <p className="text-gray-500 leading-relaxed">Open the counter view with this pass code preloaded, then inspect the resulting receipt.</p>

          <div className="flex flex-col gap-3 mt-6 mb-auto">
            {(pass?.checks ?? []).map((check) => (
              <div key={check.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                {check.ok ? <CheckCircle size={20} weight="fill" className="text-emerald-500 shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />}
                <span className={`text-sm ${check.ok ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{check.label}</span>
              </div>
            ))}
          </div>

          <Link className={`inline-flex items-center justify-center gap-2 h-14 mt-6 rounded-full font-semibold transition-all w-full shadow-sm ${pass ? 'bg-gray-900 text-white hover:bg-black hover:shadow-md' : 'bg-gray-100 text-gray-400 pointer-events-none'}`} href={pass ? terminalHref : '#show-pass'} aria-disabled={!pass}>
            Open terminal <ArrowRight size={18} weight="bold" />
          </Link>
        </div>
      </section>

      <p className="text-center text-sm font-mono text-gray-400 mt-12 mb-32 tracking-wider">
        Invite token: {token}
      </p>
    </>
  );
}
