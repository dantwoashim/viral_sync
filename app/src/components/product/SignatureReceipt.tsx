'use client';

import MouseTilt from '@/components/ui/MouseTilt';
import { useMemo, useState, useEffect, useRef } from 'react';
import type { CSSProperties, TouchEvent } from 'react';
import { CheckCircle, ShieldCheck, XCircle, ArrowBendDownRight, Fingerprint, Receipt } from '@phosphor-icons/react';
import type { NormalizedReceiptProof } from '@/lib/proof/types';
import { receiptBackRows, receiptRows } from '@/lib/proof/normalizeReceipt';

function TextScramble({ text, play }: { text: string, play: boolean }) {
  const [output, setOutput] = useState('');

  useEffect(() => {
    if (!play) return;

    let iterations = 0;
    const chars = '0123456789ABCDEF';
    const steps = 10;
    const stepSize = Math.max(1, text.length / steps);

    const interval = setInterval(() => {
      setOutput(() => {
        const next = text.split('').map((char, index) => {
          if (index < iterations) return text[index];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        return next;
      });

      iterations += stepSize;
      if (iterations >= text.length) {
        clearInterval(interval);
        setOutput(text);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [text, play]);

  return <span>{play ? output : text}</span>;
}

export default function SignatureReceipt({ proof, compact = false }: { proof: NormalizedReceiptProof; compact?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const [sealClicks, setSealClicks] = useState(0);
  const rows = useMemo(() => receiptRows(proof), [proof]);
  const backRows = useMemo(() => receiptBackRows(proof), [proof]);
  const replayMode = sealClicks >= 5;

  const [dragProgress, setDragProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Normalize progress based on generic width
    let progress = diff / 250;
    if (flipped) {
      progress = 1 + progress;
    }
    setDragProgress(progress);
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null) return;
    setIsDragging(false);
    touchStartX.current = null;

    // Determine snap back or flip
    if (!flipped && dragProgress > 0.35) {
      setFlipped(true);
    } else if (flipped && dragProgress < 0.65) {
      setFlipped(false);
    } else if (!flipped && dragProgress < -0.35) {
      setFlipped(true); // support swipe left to right or right to left
    }
    setDragProgress(0); // CSS takes over
  };

  return (
    <div className={`relative group w-full ${compact ? 'scale-[0.85] origin-top' : 'max-w-sm'}`}>
      <MouseTilt perspective={2000} className="w-full">
        <div
          className="relative text-left outline-none w-full appearance-none bg-transparent p-0 m-0 border-0"
          aria-label={flipped ? 'Show receipt front' : 'Show technical receipt proof'}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => setFlipped((value) => !value)}
        >
          <div
            className="relative preserve-3d"
            style={{
               transform: isDragging
                 ? `rotateY(${dragProgress * 180}deg)`
                 : `rotateY(${flipped ? 180 : 0}deg)`,
               transition: isDragging ? 'none' : 'transform 0.8s var(--spring-bouncy)',
               filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.15)) drop-shadow(0 8px 10px rgba(0,0,0,0.1))'
            }}
          >
            {/* Front of Receipt */}
        <div className={`relative flex flex-col w-full bg-[#fdfbf7] p-8 rounded-xl before:absolute before:left-0 before:-bottom-3 before:w-full before:h-4 before:bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIxMSIgZmlsbD0iI2ZkZmJmNyI+PHBvbHlnb24gcG9pbnRzPSIwLDExIDEwLDAgMjAsMTEiLz48L3N2Zz4=")] before:bg-repeat-x overflow-visible border border-[#eae0d5]/50 border-b-0 backface-hidden ${replayMode ? 'brightness-95 contrast-125 sepia-[0.3]' : ''}`}>

          <div className="flex flex-col items-center justify-center text-center gap-1 mb-8 border-b-2 border-dashed border-[#eae0d5] pb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2 bg-emerald-50 px-3 py-1 rounded-full"><ShieldCheck size={16} /> Verified visit</span>
            <strong className="text-2xl font-black tracking-tight text-gray-900 font-serif leading-none">{proof.merchantName}</strong>
            <small className="text-xs font-mono font-medium text-gray-400 mt-2 tracking-widest uppercase">Receipt #001</small>
          </div>

          <div className="flex flex-col gap-4 font-mono text-sm leading-relaxed mb-6">
            {rows.map(([label, value], index) => (
              <div
                className="flex items-end justify-between gap-4 w-full animate-[fadeInUp_0.5s_ease-out_forwards]"
                style={{ animationDelay: `${index * 70}ms`, opacity: 0 } as CSSProperties}
                key={label}
              >
                <span className="text-gray-500 uppercase flex-shrink-0 text-xs font-bold leading-none">{label}</span>
                <span className="flex-1 border-b border-dotted border-gray-300 mb-1 opacity-50" />
                <b className="text-gray-900 flex-shrink-0 leading-none text-right">{value}</b>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-auto pt-6 border-t-2 border-dashed border-[#eae0d5] text-xs font-mono font-bold uppercase tracking-widest text-gray-400">
            <span>Settled on Solana</span>
            <span className="text-indigo-400">{proof.cluster}</span>
          </div>

          <div
            className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full border-2 bg-white shadow-sm transition-all z-10 hover:scale-110 active:scale-95 ${
              replayMode
                ? 'border-red-500 text-red-600 rotate-12 bg-red-50 mt-4'
                : 'border-emerald-500 text-emerald-600 -rotate-12 cursor-pointer'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              setSealClicks((value) => value + 1);
            }}
          >
            {replayMode ? (
              <>
                <XCircle size={18} weight="fill" />
                <span className="text-xs font-black uppercase tracking-widest">Replay Rejected</span>
              </>
            ) : (
              <>
                <CheckCircle size={18} weight="bold" />
                <span className="text-xs font-black uppercase tracking-widest">Viral Sync</span>
              </>
            )}
          </div>
        </div>

        {/* Back of Receipt (Technical) */}
        <div className="absolute inset-0 w-full h-full flex flex-col bg-gray-900 text-white p-8 shadow-2xl rounded-t-xl before:absolute before:left-0 before:-bottom-3 before:w-full before:h-4 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIxMSIgZmlsbD0iIzExMTgxNyI+PHBvbHlnb24gcG9pbnRzPSIwLDExIDEwLDAgMjAsMTEiLz48L3N2Zz4=')] before:bg-repeat-x border border-white/10 border-b-0 backface-hidden rotate-y-180 overflow-hidden">

          <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-2 mb-8 border-b border-white/10 pb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1"><Receipt size={16} /> Technical back side</span>
            <strong className="text-2xl font-bold tracking-tight text-white leading-none">POC-1 receipt</strong>
            <small className="text-gray-500 mt-1 flex items-center gap-1.5"><ArrowBendDownRight size={14} className="scale-x-[-1]" /> Click to return</small>
          </div>

          <div className="relative z-10 flex flex-col gap-5 font-mono text-xs overflow-y-auto mb-6 pr-2 custom-scrollbar">
            {backRows.map(([label, value]) => (
              <div className="flex flex-col gap-1 w-full" key={label}>
                <span className="text-indigo-300 font-bold uppercase tracking-wider text-[10px]">{label}</span>
                <b className="text-gray-300 font-medium break-all leading-snug">
                  {label.includes('id') || label.includes('hash') || label.includes('signature') || label.includes('pubkey') ? (
                    <TextScramble text={String(value)} play={flipped} />
                  ) : value}
                </b>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-white/10 flex justify-between items-center text-gray-500">
            <Fingerprint size={24} weight="duotone" />
            <span className="text-[10px] font-mono tracking-widest uppercase">Cryptographically secured</span>
          </div>
        </div>
          </div>
        </div>
      </MouseTilt>
    </div>
  );
}
