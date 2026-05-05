"use client";

import type { FraudCase } from '@/lib/proof/types';
import { Warning, ShieldCheck, BugBeetle, CodeBlock } from '@phosphor-icons/react';
import { SwipeActionRow } from './SwipeActionRow';

export function FraudCaseRow({ item, onBlock, onRefund }: { item: FraudCase, onBlock?: () => void, onRefund?: () => void }) {
  const blocked =
    item.observed === 'rejected' &&
    item.expectedErrorMatched === true &&
    item.accountsMutationVerified === true &&
    item.accountsMutated === false &&
    ['program_rejection', 'intent_validator_rejection'].includes(String(item.failureKind)) &&
    item.proofSource !== 'mock_final_fixture';

  return (
    <SwipeActionRow onBlock={() => onBlock && onBlock()} onRefund={() => onRefund && onRefund()}>
      <details className="group border border-gray-800 bg-[#0A0A0A] rounded-xl font-mono text-sm overflow-hidden transition-all duration-200">
        <summary className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 cursor-pointer hover:bg-[#111111] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 select-none">
          <div className="flex items-center gap-4">
          <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-gray-900 border border-gray-800 text-gray-400">
             <BugBeetle size={18} weight="duotone" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-gray-300 font-medium tracking-wide">{item.title ?? item.id}</span>
            <span className="text-gray-500 text-xs">ERR_CODE: {item.expectedErrorCode ?? item.expectedError ?? '0x8A1_PROGRAM_REJECT'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {blocked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase">
              <ShieldCheck size={14} weight="bold" /> Blocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-widest uppercase">
              <Warning size={14} weight="bold" /> Review
            </span>
          )}
          <span className="text-gray-600 group-open:-rotate-180 transition-transform duration-300">▼</span>
        </div>
      </summary>
      <div className="p-4 border-t border-gray-800 bg-[#050505] flex flex-col gap-4">
        <div className="flex flex-col gap-2">
            <span className="text-gray-500 text-xs uppercase tracking-widest">Attack Vector</span>
            <p className="text-gray-300 leading-relaxed font-sans">{item.attack ?? item.reason ?? 'Structured attack evidence from the proof run.'}</p>
        </div>
        <div className="flex flex-col gap-2">
            <span className="text-gray-500 text-xs uppercase tracking-widest flex items-center gap-2"><CodeBlock size={14} /> System Trace</span>
            <code className="block p-4 rounded-lg bg-[#000000] border border-gray-800 text-red-400/90 text-xs leading-relaxed overflow-x-auto">
              [FATAL] {item.actualError ?? 'Transaction simulation failed. No log excerpt published.'}
            </code>
        </div>
        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-900 text-xs">
           <span className="text-gray-500">Mutation check: <strong className={item.accountsMutationVerified ? "text-emerald-500" : "text-amber-500"}>{item.accountsMutationVerified ? 'PASSED_0x00' : 'PENDING_0x01'}</strong></span>
           <span className="text-gray-500 pb-1">Source: <strong className="text-gray-400">{item.proofSource ?? 'ARTIFACT_PIPELINE'}</strong></span>
        </div>
      </div>
    </details>
    </SwipeActionRow>
  );
}
