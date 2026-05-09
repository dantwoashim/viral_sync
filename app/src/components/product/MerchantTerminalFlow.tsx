"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle, QrCode, WarningCircle, ArrowRight } from "@phosphor-icons/react";
import { TerminalPanel } from "./TerminalPanel";
import type {
  ProductLoopCampaign,
  TerminalConfirmation,
} from "@/lib/product-loop/types";

type TerminalState = "idle" | "detected" | "signing" | "success" | "error";

import { PremiumShell, PremiumNav } from '@/components/premium/PremiumUi';
import { BottomSheet } from "./BottomSheet";
import { useVisualViewport } from "@/hooks/useVisualViewport";

export function MerchantTerminalFlow({
  campaign,
  initialPassCode,
  initialPassMac,
  initialPassId,
  initialNonce,
  terminalDevicePda,
  merchantAlias,
  token,
}: {
  campaign: ProductLoopCampaign;
  initialPassCode?: string;
  initialPassMac?: string;
  initialPassId?: string;
  initialNonce?: string;
  terminalDevicePda?: string;
  merchantAlias?: string;
  token?: string;
}) {
  const [state, setState] = useState<TerminalState>(
    initialPassCode ? "detected" : "idle",
  );

  const [code, setCode] = useState(initialPassCode ?? "");
  const [confirmation, setConfirmation] = useState<TerminalConfirmation | null>(
    null,
  );

  const viewport = useVisualViewport();

  // Controls bottom sheet visibility
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [flash, setFlash] = useState(false);

  const performFlash = () => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    setFlash(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFlash(false)));
  };

  const stateCopy = useMemo(
    () =>
      ({
        idle: ["Ready to confirm visits", "Scan pass or enter code."],
        detected: [
          "Visit pass found",
          `${campaign.visitorRewardLabel} customer reward. ${campaign.routerRewardLabel} router reward.`,
        ],
        signing: [
          "Terminal verifying visit",
          "The system is matching the pass code to the campaign to authorize the payout.",
        ],
        success: [
          "Visit verified",
          "The reward has been authorized and the receipt is ready.",
        ],
        error: [
          "This pass could not be verified.",
          confirmation?.reason ?? "Open details for more information.",
        ],
      })[state],
    [
      campaign.routerRewardLabel,
      campaign.visitorRewardLabel,
      confirmation?.reason,
      state,
    ],
  );

  async function confirm() {
    setConfirmation(null);
    performFlash();
    setState("success");

    try {
      const response = await fetch("/api/product-loop/terminal/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: campaign.slug,
          passCode: code,
          passMac: initialPassMac,
          passId: initialPassId,
          nonce: initialNonce,
          terminalDevicePda: terminalDevicePda ?? campaign.terminalDevicePda,
          merchantAlias: merchantAlias ?? campaign.merchantAlias,
          token: token || campaign.slug,
        }),
      });
      const payload = (await response.json()) as TerminalConfirmation;
      setConfirmation(payload);

      if (!response.ok || !payload.ok) {
        setState("error");
        setIsSheetOpen(true);
      } else {
        setIsSheetOpen(true);
      }
    } catch {
      setState("error");
      setIsSheetOpen(true);
    }
  }

  return (
    <>
      <div className="hidden md:block h-full">
        <PremiumShell>
          <PremiumNav />
          <section className="grid lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-24 items-center min-h-[calc(100vh-120px)] pt-20 pb-48 sm:pb-20 lg:py-32 border-b border-gray-100 max-w-7xl mx-auto px-6 relative">
          <div className="flex flex-col gap-8 max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
            <div className="inline-flex w-fit mx-auto lg:mx-0 items-center gap-2 border border-indigo-100 rounded-full px-4 py-1.5 bg-indigo-50/50 text-indigo-700 text-xs font-bold tracking-widest uppercase shadow-sm animate-stagger-1">
              <QrCode size={16} weight="bold" /> Terminal active
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-gray-900 animate-stagger-2">
              {stateCopy[0]}
            </h1>
            <p className="text-lg lg:text-xl text-gray-500 leading-relaxed max-w-xl mx-auto lg:mx-0 min-h-[60px] animate-stagger-3">
              {stateCopy[1]}
            </p>

            <div className="flex flex-col gap-3 sm:gap-4 sm:mt-6 max-w-md mx-auto lg:mx-0 pb-8 sm:pb-0 animate-stagger-4">
              <div className="flex flex-col gap-2 relative group w-full">
                <input
                  autoFocus
                  className="w-full bg-white sm:bg-white px-6 sm:px-8 py-5 sm:py-8 text-2xl sm:text-4xl font-mono font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-900/5 focus:shadow-2xl focus:shadow-indigo-500/10 border-2 border-transparent focus:border-indigo-500 transition-all block ring-0 pr-16"
                  aria-label="Visit pass code"
                  inputMode="text"
                  value={code}
                  onChange={(event) => {
                    const next = event.target.value.toUpperCase();
                    setCode(next);
                    if (next.length >= 4) setState("detected");
                  }}
                  placeholder="VS-..."
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-indigo-400 group-focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    aria-label="Paste from clipboard"
                    className="opacity-50 hover:opacity-100 p-2 text-gray-400 hover:text-indigo-600 transition-colors pointer-events-auto"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        const next = text.toUpperCase();
                        setCode(next);
                        if (next.length >= 4) setState("detected");
                      } catch (err) {
                        console.error('Failed to paste', err);
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" className="sm:w-8 sm:h-8"><path d="M216,40H176V32a24,24,0,0,0-24-24H104A24,24,0,0,0,80,32v8H40A16,16,0,0,0,24,56V208a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM96,32a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,208H40V56h40v16a8,8,0,0,0,8,8h80a8,8,0,0,0,8-8V56h40V208Z"></path></svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  className="flex-1 inline-flex items-center justify-center gap-2 h-14 sm:h-16 px-6 sm:px-8 rounded-xl sm:rounded-full bg-gray-900 text-white text-base sm:text-lg font-semibold shadow-2xl shadow-gray-900/20 shadow-hairline hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
                  type="button"
                  onClick={confirm}
                  disabled={
                    state === "idle" || state === "signing" || state === "success"
                  }
                >
                  <CheckCircle
                    size={20}
                    weight="fill"
                    className="sm:w-6 sm:h-6"
                  />{" "}
                  Confirm
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 h-14 sm:h-16 px-6 sm:px-8 rounded-xl sm:rounded-full bg-white border border-rose-200 text-rose-700 text-base sm:text-lg font-semibold hover:bg-rose-50 transition-colors shadow-sm shadow-hairline"
                  type="button"
                  onClick={() => {
                    setCode("VS-USED-PASS");
                    setState("detected");
                  }}
                >
                  <WarningCircle
                    size={20}
                    weight="bold"
                    className="sm:w-6 sm:h-6"
                  />{" "}
                  Test used
                </button>
              </div>
            </div>

            {state === "success" && confirmation ? (
              <div
                className="flex items-center justify-between gap-4 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 mt-6"
                role="status"
              >
                <div className="flex flex-col text-left">
                  <strong className="text-emerald-900 font-semibold text-lg">
                    Receipt opened
                  </strong>
                  <p className="text-emerald-700/80 text-sm mt-1">
                    {confirmation.reason}
                  </p>
                </div>
                <Link
                  className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 transition-colors shrink-0"
                  href={confirmation.receiptPath}
                >
                  Open receipt
                </Link>
              </div>
            ) : null}

            {state === "error" && confirmation ? (
              <details
                className="group mt-6 bg-rose-50 rounded-2xl border border-rose-100 overflow-hidden text-left"
                open
              >
                <summary className="flex items-center px-6 py-4 cursor-pointer text-sm font-bold tracking-widest uppercase text-rose-700 bg-rose-100/50 hover:bg-rose-100 transition-colors select-none">
                  Show program checks
                </summary>
                <div className="flex flex-col gap-2 p-6 overflow-x-auto">
                  {confirmation.checks.map((check) => (
                    <div key={check.label} className="flex items-start gap-3">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider shrink-0 mt-0.5 ${check.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                      >
                        {check.ok ? "Passed" : "Review"}
                      </span>
                      <span
                        className={`text-sm ${check.ok ? "text-gray-600" : "text-gray-900 font-medium"}`}
                      >
                        {check.label}: {check.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          <div className="flex justify-center items-center perspective-[2000px]">
            <div
              className={`w-full max-w-[420px] transition-transform duration-700 ${state === "signing" ? "scale-105 rotate-y-[5deg] rotate-x-[5deg]" : "hover:-translate-y-2"}`}
            >
              <TerminalPanel
                state={state}
                merchant={campaign.merchantAlias}
                campaignTitle={campaign.title}
                passCode={code}
                visitorReward={campaign.visitorRewardLabel}
                routerReward={campaign.routerRewardLabel}
                checks={confirmation?.checks}
              />
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-center gap-8 max-w-7xl mx-auto py-12 px-6">
          <div className="flex flex-col gap-1 items-center md:items-start">
            <small className="text-xs font-bold text-gray-500 tracking-widest uppercase">
              Campaign
            </small>
            <b className="text-lg font-semibold text-gray-900">
              {campaign.title}
            </b>
          </div>
          <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left border-l border-gray-200 pl-8">
            <small className="text-xs font-bold text-gray-500 tracking-widest uppercase">
              Reward pool remaining
            </small>
            <b className="text-lg font-semibold text-emerald-600">
              {campaign.rewardPoolRemainingLabel}
            </b>
          </div>
          <div className="flex flex-col gap-1 items-center md:items-start border-l border-gray-200 pl-8">
            <small className="text-xs font-bold text-gray-500 tracking-widest uppercase">
              Verified visits today
            </small>
            <b className="text-lg font-semibold text-gray-900">
              {campaign.settledCount}
            </b>
          </div>
          <div className="ml-auto flex shrink-0">
            <Link
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-gray-900 font-semibold shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              href="/merchant/today"
            >
              Open merchant dashboard
            </Link>
          </div>
        </section>
        </PremiumShell>
      </div>

      {/* Mobile True Native View */}
      <div className="md:hidden flex flex-col h-[100dvh] bg-black text-white overflow-hidden relative">
        {/* Simulated Camera Feed Background */}
        <div className="absolute inset-0 z-0 bg-[#050505] pointer-events-none flex flex-col items-center justify-center overflow-hidden">
          {/* Faint grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="w-72 h-72 border-2 border-white/10 rounded-[40px] relative flex items-center justify-center shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] bg-white/[0.02]">
            {/* Viewfinder corners */}
            <div className="absolute w-12 h-12 border-t-4 border-l-4 border-white/50 top-0 left-0 -translate-x-[2px] -translate-y-[2px] rounded-tl-[40px]" />
            <div className="absolute w-12 h-12 border-t-4 border-r-4 border-white/50 top-0 right-0 translate-x-[2px] -translate-y-[2px] rounded-tr-[40px]" />
            <div className="absolute w-12 h-12 border-b-4 border-l-4 border-white/50 bottom-0 left-0 -translate-x-[2px] translate-y-[2px] rounded-bl-[40px]" />
            <div className="absolute w-12 h-12 border-b-4 border-r-4 border-white/50 bottom-0 right-0 translate-x-[2px] translate-y-[2px] rounded-br-[40px]" />

            {/* Scanning Laser Line */}
            <div className="absolute left-4 right-4 h-0.5 shadow-[0_0_15px_3px_rgba(99,102,241,0.5)] bg-indigo-500 rounded-full animate-scan-beam" />
          </div>
          <div className="mt-8 text-white/30 text-xs font-bold tracking-[0.2em] font-mono uppercase">Align code within frame</div>
        </div>

        {/* Camera Flash overlay */}
        <div
          className="absolute inset-0 z-[60] bg-white pointer-events-none transition-opacity duration-150"
          style={{ opacity: flash ? 1 : 0 }}
        />

        {/* Dynamic Island / Pill Status */}
        <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-[300px]">
          <div className="flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300">
            <div className="flex items-center gap-3">
              {state === 'idle' && <QrCode size={18} className="text-white/70 shadow-sm" weight="bold" />}
              {state === 'signing' && <div className="w-4 h-4 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin shadow-sm" />}
              {state === 'detected' && <CheckCircle size={18} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" weight="fill" />}
              <span className="text-sm font-bold tracking-wide text-white drop-shadow-sm">{stateCopy[0]}</span>
            </div>
            {state === 'detected' && (
              <div className="text-[11px] text-gray-400 mt-1 font-medium text-center animate-fade-in truncate max-w-full">
                {campaign.visitorRewardLabel} reward detected
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 w-full relative pointer-events-none">
           {/* If we needed to render anything else over the camera */}
        </main>

        {/* Success / Error Sheet */}
        <BottomSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} snapPoints={["0.5", "0.9"]}>
          <div className="flex flex-col gap-6 w-full max-w-sm mx-auto p-4 flex-1">
             {state === "success" && confirmation ? (
               <div className="flex flex-col gap-4 animate-stagger-2">
                  <div className="flex flex-col gap-1 items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(16,185,129,0.2)] text-emerald-400 border border-emerald-400/30">
                      <CheckCircle size={32} weight="fill" />
                    </div>
                    <strong className="text-white font-bold text-2xl mt-2">Verification Complete</strong>
                    <p className="text-gray-400 text-[15px] max-w-xs">{confirmation.reason}</p>
                  </div>

                  <div className="flex-1 mt-4">
                    <Link
                      className="flex items-center justify-center w-full h-14 rounded-full bg-emerald-500 text-emerald-950 text-base font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      href={confirmation.receiptPath}
                    >
                      View Cryptographic Receipt
                    </Link>
                    <button
                      className="flex items-center justify-center w-full h-14 rounded-full bg-transparent text-white text-base font-bold active:scale-95 transition-all mt-3"
                      type="button"
                      onClick={() => {
                        setIsSheetOpen(false);
                        setCode("");
                        setState("idle");
                      }}
                    >
                      Scan Next Pass
                    </button>
                  </div>
               </div>
             ) : state === "error" && confirmation ? (
               <div className="flex flex-col gap-4 animate-stagger-2 pb-6">
                  <div className="flex flex-col gap-1 items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(244,63,94,0.2)] text-rose-400 border border-rose-400/30">
                      <WarningCircle size={32} weight="fill" />
                    </div>
                    <strong className="text-white font-bold text-2xl mt-2">Verification Failed</strong>
                    <p className="text-gray-400 text-[15px] max-w-xs">{confirmation.reason}</p>
                  </div>

                  <div className="flex flex-col gap-3 p-5 bg-[#1A1A1A] rounded-[24px] mt-4 border border-white/5">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Security Checks</span>
                    {confirmation.checks.map((check) => (
                      <div key={check.label} className="flex items-start gap-3">
                         {check.ok ? <CheckCircle size={20} weight="fill" className="text-emerald-500 shrink-0" /> : <WarningCircle size={20} weight="fill" className="text-rose-500 shrink-0" />}
                         <div className="flex flex-col">
                           <span className={`text-[15px] font-bold ${check.ok ? "text-gray-300" : "text-white"}`}>{check.label}</span>
                           {!check.ok && <span className="text-sm text-rose-400 mt-0.5">{check.detail}</span>}
                         </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <button
                      className="flex items-center justify-center w-full h-14 rounded-full bg-white text-black text-base font-bold active:scale-95 transition-all"
                      type="button"
                      onClick={() => {
                        setIsSheetOpen(false);
                        setCode("");
                        setState("idle");
                      }}
                    >
                      Clear and Try Again
                    </button>
                  </div>
               </div>
             ) : null}
          </div>
        </BottomSheet>

        {/* Absolute positioning to pin to bottom above keyboard visually using visualViewport tricks or fixed with bottom inset */}
        <div
          className="fixed left-0 w-full p-5 bg-[#0A0A0A]/80 backdrop-blur-2xl border-t border-white/10 z-40 transition-all duration-300 rounded-t-[32px] shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
          style={{
            bottom: viewport.keyboardOpen ? `${window.innerHeight - viewport.height}px` : 'calc(4rem + env(safe-area-inset-bottom))'
          }}
        >
           <div className="flex flex-col gap-4 relative max-w-sm mx-auto w-full">
             <div className="flex justify-center mb-1">
               <div className="w-10 h-1.5 rounded-full bg-white/20" />
             </div>
             <div className="relative group w-full">
                <input
                  className="w-full bg-black/40 px-5 py-4 text-3xl text-center font-mono font-bold text-white placeholder:text-gray-600 focus:outline-none rounded-[24px] border border-white/10 focus:border-indigo-500 transition-all block ring-0 pr-14 shadow-inner"
                  aria-label="Visit pass code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={code}
                  onChange={(event) => {
                    const next = event.target.value.toUpperCase();
                    setCode(next);
                    if (next.length >= 4 && state === 'idle') {
                      performFlash();
                      setState("detected");
                    }
                  }}
                  placeholder="VS-"
                  style={{ fontSize: viewport.keyboardOpen ? '20px' : '30px' }} // Attempt to prevent iOS Zoom while allowing large text
                />
                <button
                  type="button"
                  aria-label="Paste from clipboard"
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 p-2 text-gray-400 transition-colors pointer-events-auto"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const next = text.toUpperCase();
                      setCode(next);
                      if (next.length >= 4) {
                        performFlash();
                        setState("detected");
                      }
                    } catch (err) {
                      console.error('Failed to paste', err);
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H176V32a24,24,0,0,0-24-24H104A24,24,0,0,0,80,32v8H40A16,16,0,0,0,24,56V208a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM96,32a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,208H40V56h40v16a8,8,0,0,0,8,8h80a8,8,0,0,0,8-8V56h40V208Z"></path></svg>
                </button>
             </div>

             <div className="flex gap-3 w-full">
               <button
                  className="flex-1 inline-flex items-center justify-center gap-2 h-[64px] rounded-[24px] bg-indigo-600 focus:bg-indigo-500 text-white font-bold text-[17px] active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_40px_rgba(79,70,229,0.3)] shadow-indigo-500/30"
                  type="button"
                  onClick={confirm}
                  disabled={state === "idle" || state === "signing" || state === "success"}
                >
                  Confirm Visit <ArrowRight size={20} weight="bold" />
               </button>
               <button
                  className="w-[64px] h-[64px] shrink-0 inline-flex items-center justify-center rounded-[24px] bg-white/5 text-rose-500 font-bold active:scale-[0.97] transition-transform border border-rose-500/20 hover:bg-rose-500/10"
                  type="button"
                  onClick={() => {
                    setCode("VS-USED-PASS");
                    performFlash();
                    setState("detected");
                  }}
                  aria-label="Test Error"
                >
                  <WarningCircle size={26} weight="fill" />
               </button>
             </div>
           </div>
        </div>
      </div>
    </>
  );
}
