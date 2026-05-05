"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ArrowRight,
  FileCsv,
  ShieldCheck,
  DeviceMobile
} from "@phosphor-icons/react";
import { PullToRefreshContainer } from "./PullToRefreshContainer";
import { FraudCaseRow } from "./FraudCaseRow";
import type { FraudCase, NormalizedReceiptProof } from "@/lib/proof/types";
import type { ProductLoopCampaign } from "@/lib/product-loop/types";
import { PremiumShell, PremiumNav } from "@/components/premium/PremiumUi";

export function MerchantTodayFlow({
  campaign,
  proof,
  fakeVisits
}: {
  campaign: ProductLoopCampaign | null;
  proof: NormalizedReceiptProof;
  fakeVisits: number;
}) {
  const remaining = campaign?.rewardPoolRemainingLabel ?? "Pending";
  const [localCases, setLocalCases] = useState<FraudCase[]>(
    proof.gauntlet.cases ?? proof.manifest.attackEvidence ?? [],
  );
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const handleAction = async (id: string, action: 'block' | 'refund') => {
    // Store original so we can put it back if needed
    const originalItem = localCases.find(c => c.id === id);
    if (!originalItem) return;

    // Optimistically remove
    setLocalCases(prev => prev.filter(c => c.id !== id));
    setFailedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    // Simulate API call
    await new Promise(r => setTimeout(r, 600));

    // Force "refund" to fail to demonstrate the "elegantly springs back with subtle shake" requirement
    if (action === 'refund') {
      setLocalCases(prev => {
        // Only add it back if it's not already there
        if (!prev.find(c => c.id === id)) {
          return [originalItem, ...prev];
        }
        return prev;
      });
      setFailedIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };

  const handleRefresh = async () => {
    await new Promise(r => setTimeout(r, 1200));
  };

  return (
    <>
      <div className="hidden md:block h-full">
        <PremiumShell className="bg-gray-50 relative">
          <PremiumNav />
          <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-white to-transparent pointer-events-none" />

          <section className="grid lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-24 items-end pt-24 pb-16 max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col gap-6 max-w-2xl">
              <span className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 bg-white text-gray-700 text-xs font-bold tracking-widest uppercase shadow-sm mt-8">
                Daily outcomes
              </span>
              <h1 className="text-6xl md:text-[5rem] lg:text-[7rem] font-bold tracking-tighter text-gray-900 font-serif leading-[0.9]">
                Good morning,<br />
                <span className="text-gray-400 font-serif italic tracking-tight">Thamel Brew.</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-500 leading-relaxed font-medium mt-4">
                A clear view of the real foot traffic and verified outcomes you paid for today.
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[40px] p-12 shadow-2xl flex flex-col items-start h-full justify-between relative overflow-hidden text-white transition-transform hover:-translate-y-2 duration-500 perspective-[1000px]">
              <div className="relative z-10 w-full">
                <span className="text-emerald-100 font-bold text-sm tracking-widest uppercase flex items-center gap-2 mb-4">
                  <DeviceMobile size={20} weight="bold" /> Staff Terminal
                </span>
                <strong className="block text-5xl font-bold text-white mt-2 mb-4 font-serif">Online & Ready</strong>
                <p className="text-emerald-100 text-lg leading-relaxed max-w-sm font-medium">
                  Store terminal is active and listening for passes.
                </p>
              </div>
              <Link
                className="inline-flex items-center gap-3 h-16 px-10 mt-12 rounded-full bg-white text-emerald-900 text-lg font-bold shadow-lg hover:bg-emerald-50 transition-colors w-full sm:w-auto relative z-10"
                href="/merchant/scan"
              >
                Open Terminal <ArrowRight size={20} weight="bold" />
              </Link>
            </div>
          </section>

          {/* Desktop metrics and receipts... */}
            <section className="py-20 max-w-7xl mx-auto px-6 relative z-10" aria-label="Merchant metrics">
              <div className="flex flex-col md:flex-row items-center justify-between gap-16 border-y border-gray-200/50 py-16">
                <div className="flex flex-col gap-2 text-center items-center w-full">
                  <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-2 mb-2">
                    <Wallet size={20} /> Rewards Earned
                  </span>
                  <strong className="font-bold text-gray-900 tracking-tighter leading-none" style={{ fontSize: "clamp(5rem, 15vw, 12rem)" }}>
                    ${fakeVisits * 2}<span className="text-[0.5em] text-gray-400">.00</span>
                  </strong>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-8 text-left">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Operating readiness gate</span>
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Merchant readiness stays tied to proof health, security limits, economics, and pilot evidence.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Execution audit</span>
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Code-executable work is separated from founder-only actions like final video and merchant permissions.
                  </p>
                </div>
              </div>
            </section>
        </PremiumShell>
      </div>

      <div className="md:hidden flex flex-col h-[100dvh]">
        <PullToRefreshContainer onRefresh={handleRefresh}>
          <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
            <header className="px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-8">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest block mb-2">Today&apos;s Store Metrics</span>
              <h1 className="text-4xl font-bold tracking-tighter text-white font-serif leading-[1.05]">
                Thamel Brew
              </h1>
            </header>

            <section className="px-5 mb-10 flex flex-col gap-4">
               <div className="flex flex-col items-center justify-center bg-gray-900/50 rounded-[32px] border border-white/5 py-8 relative overflow-hidden backdrop-blur-xl">
                 <div className="absolute top-0 right-0 p-24 bg-emerald-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                 <span className="text-emerald-400 font-bold tracking-widest uppercase text-[10px] sm:text-xs inline-flex gap-2 items-center z-10 mb-2 text-center px-4">
                   <Wallet size={16} weight="bold" /> Total Rewards Distributed
                 </span>
                 <strong className="text-5xl sm:text-[4rem] text-white font-bold tracking-tighter z-10 leading-none">
                   ${fakeVisits * 2}<span className="text-gray-600">.00</span>
                 </strong>
                 <p className="text-gray-400 mt-3 font-medium z-10 text-sm">from {fakeVisits} verified visits</p>
               </div>

               <div className="flex gap-4">
                 <div className="flex-1 bg-gradient-to-br from-indigo-900/40 to-[#0A0A0A] rounded-[24px] border border-indigo-500/20 p-5 flex flex-col justify-between">
                   <span className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-4">Budget Escrow</span>
                   <strong className="text-2xl text-white font-bold tracking-tight">{remaining}</strong>
                 </div>
                 <div className="flex-1 bg-gradient-to-br from-[#111] to-[#0A0A0A] rounded-[24px] border border-white/5 p-5 flex flex-col justify-between">
                   <span className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-4">Export Data</span>
                   <Link href="/proof" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"><FileCsv size={20} weight="fill" /></Link>
                 </div>
               </div>
            </section>

            <section className="px-5 mb-10">
              <div className="flex items-center justify-between mb-4 px-1">
                 <h2 className="text-white font-bold tracking-tight text-xl">Recent Blocks</h2>
                 <span className="text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><ShieldCheck weight="fill" size={14}/> Active</span>
              </div>
              <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-5 px-5 gap-3" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
                <AnimatePresence mode="popLayout">
                  {localCases.slice(0, 4).map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={failedIds.has(item.id)
                        ? { scale: 1, opacity: 1, x: [0, -10, 10, -10, 10, 0] }
                        : { scale: 1, opacity: 1 }
                      }
                      exit={{ scale: 0.8, opacity: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }}
                      transition={failedIds.has(item.id)
                        ? { layout: { type: "spring", stiffness: 400, damping: 30 }, x: { duration: 0.4 } }
                        : { layout: { type: "spring", stiffness: 400, damping: 30 } }
                      }
                      className="min-w-[85vw] snap-center origin-center"
                    >
                      <FraudCaseRow item={item} onBlock={() => handleAction(item.id, 'block')} onRefund={() => handleAction(item.id, 'refund')} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          </div>
        </PullToRefreshContainer>
      </div>
    </>
  );
}
