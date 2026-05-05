"use client";

import {
  CheckCircle,
  QrCode,
  ShieldCheck,
  Spinner,
} from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";

type TerminalPanelCheck = { label: string; ok: boolean; detail?: string };

export function TerminalPanel({
  state = "detected",
  merchant = "Thamel Brew House",
  campaignTitle = "Counter-attested visit",
  passCode,
  visitorReward = "Pending",
  routerReward = "Pending",
  checks,
}: {
  state?: "idle" | "detected" | "signing" | "success" | "error";
  merchant?: string;
  campaignTitle?: string;
  passCode?: string;
  visitorReward?: string;
  routerReward?: string;
  checks?: TerminalPanelCheck[];
}) {
  const [didFlash, setDidFlash] = useState(false);

  useEffect(() => {
    // Phase 5: Haptic Hardware feedback & Visual flashes
    if (state === "success") {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const starter = setTimeout(() => {
        setDidFlash(true);
        timer = setTimeout(() => setDidFlash(false), 400);
      }, 0);
      return () => {
        clearTimeout(starter);
        if (timer) clearTimeout(timer);
      };
    } else if (state === "error") {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  }, [state]);

  const rows =
    checks?.length && state !== "signing"
      ? checks
          .slice(0, 4)
          .map((check) => [check.label, check.ok ? "Yes" : "Review", check.ok])
      : [
          [
            "Valid pass",
            state === "idle"
              ? "Waiting"
              : state === "signing"
                ? "Signing"
                : "Yes",
            state === "success",
          ],
          [
            "Within time window",
            state === "idle"
              ? "Waiting"
              : state === "signing"
                ? "Signing"
                : "Yes",
            state === "success",
          ],
          [
            "Not previously used",
            state === "idle"
              ? "Waiting"
              : state === "signing"
                ? "Signing"
                : "Yes",
            state === "success",
          ],
          ["Terminal online", "Yes", true],
        ];

  return (
    <div
      className={`relative flex flex-col w-full max-w-[420px] rounded-[32px] overflow-hidden transition-all duration-500 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] shadow-hairline border ${didFlash ? "animate-pop-flash ambient-glow-emerald z-50" : ""} ${
        state === "success"
          ? "bg-white border-emerald-100 shadow-emerald-500/10"
          : state === "signing"
            ? "bg-white border-indigo-100 shadow-indigo-500/10 ring-4 ring-indigo-50/50"
            : state === "error"
              ? "bg-white border-rose-100 shadow-rose-500/10 animate-shake ring-4 ring-rose-50/50"
              : "bg-white border-gray-100"
      }`}
    >
      <div
        className={`flex items-center justify-between px-6 py-4 text-xs font-bold tracking-widest uppercase border-b ${
          state === "success"
            ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-700"
            : state === "signing"
              ? "bg-indigo-50/50 border-indigo-100/50 text-indigo-700"
              : state === "error"
                ? "bg-rose-50/50 border-rose-100/50 text-rose-700"
                : "bg-gray-50/50 border-gray-100 text-gray-500"
        }`}
      >
        <span className="flex items-center gap-2">
          <ShieldCheck size={16} /> Merchant Terminal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
          Online
        </span>
      </div>

      <div className="flex flex-col p-6 sm:p-8 gap-6 sm:gap-8">
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <div
            className={`relative flex items-center justify-center w-24 h-24 rounded-3xl transition-colors duration-500 ${
              state === "success"
                ? "bg-emerald-50 text-emerald-600"
                : state === "signing"
                  ? "bg-indigo-50 text-indigo-600"
                  : state === "error"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-gray-50 text-gray-400"
            }`}
          >
            {state === "success" ? (
              <>
                <CheckCircle size={48} weight="fill" />
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 30 * Math.PI) / 180;
                  const tx = Math.cos(angle) * 60;
                  const ty = Math.sin(angle) * 60;
                  return (
                    <div
                      key={i}
                      className="particle animate-particle"
                      style={
                        {
                          "--tx": `${tx}px`,
                          "--ty": `${ty}px`,
                          animationDelay: `${(i % 4) * 0.025}s`,
                        } as React.CSSProperties
                      }
                    />
                  );
                })}
              </>
            ) : (
              <QrCode
                size={48}
                weight="duotone"
                className={state === "idle" ? "opacity-40" : "opacity-100"}
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <strong
              className={`text-xl font-bold tracking-tight ${state === "error" ? "text-rose-900" : "text-gray-900"}`}
            >
              {state === "idle"
                ? "Ready to scan pass"
                : state === "error"
                  ? "Verification failed"
                  : "Visit pass presented"}
            </strong>
            <span className="text-sm text-gray-500 font-medium">
              {passCode ? (
                <span
                  className={`font-mono px-2 py-0.5 rounded-md ${state === "error" ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-700"}`}
                >
                  {passCode}
                </span>
              ) : (
                merchant
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h3
            className={`text-sm font-bold tracking-widest uppercase mb-3 ${
              state === "success"
                ? "text-emerald-600"
                : state === "signing"
                  ? "text-indigo-600"
                  : state === "error"
                    ? "text-rose-600"
                    : "text-gray-900"
            }`}
          >
            {state === "success"
              ? "Visit verified"
              : state === "signing"
                ? "Signing receipt..."
                : state === "error"
                  ? "Fraud prevented"
                  : "Confirm visit?"}
          </h3>

          <div className="flex flex-col gap-3">
            {rows.map(([label, value, ok]) => (
              <div
                key={label as string}
                className="flex items-center justify-between py-1 border-b border-gray-100/50 last:border-0 last:pb-0"
              >
                <span className="text-sm text-gray-500">{label as string}</span>
                <span
                  className={`text-sm font-semibold flex items-center gap-1.5 ${
                    value === "Waiting" || value === "Signing"
                      ? "text-gray-400"
                      : ok
                        ? "text-gray-900"
                        : "text-rose-600"
                  }`}
                >
                  {value === "Signing" && state === "signing" ? (
                    <span className="animate-hex-decryption text-indigo-400"></span>
                  ) : (
                    <>
                      {value === "Yes" && ok && (
                        <CheckCircle
                          size={14}
                          weight="fill"
                          className="text-emerald-500"
                        />
                      )}
                      {value as string}
                    </>
                  )}
                </span>
              </div>
            ))}

            <div className="h-px bg-gray-100 my-1" />

            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-gray-500">
                Customer
              </span>
              <span className="text-sm font-bold text-gray-900">
                {visitorReward}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-gray-500">Router</span>
              <span className="text-sm font-bold text-gray-900">
                {routerReward}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`flex items-center justify-center gap-2 py-5 text-sm font-bold transition-colors duration-500 ${
          state === "success"
            ? "bg-emerald-600 text-white"
            : state === "signing"
              ? "bg-indigo-600 text-white"
              : state === "error"
                ? "bg-rose-600 text-white"
                : "bg-[#0a0a0a] text-white"
        }`}
      >
        {state === "success" ? (
          <CheckCircle size={20} weight="bold" />
        ) : state === "signing" ? (
          <Spinner size={20} weight="bold" className="animate-spin" />
        ) : state === "error" ? (
          <ShieldCheck size={20} weight="bold" />
        ) : (
          <ShieldCheck size={20} weight="bold" />
        )}

        {state === "success"
          ? "Reward settled"
          : state === "signing"
            ? "Terminal verifying receipt"
            : state === "error"
              ? "Pass blocked"
              : campaignTitle}
      </div>
    </div>
  );
}
