"use client";

import { QrCode, ShieldCheck, ArrowUUpLeft, ArrowsOutSimple, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';

export function VisitPass({
  stage = 'claim',
  merchant = 'Thamel Brew House',
  visitorReward = 'Pending',
  routerReward = 'Pending',
  passCode,
  passId,
  expiresAt,
}: {
  stage?: 'claim' | 'show' | 'verified';
  merchant?: string;
  visitorReward?: string;
  routerReward?: string;
  passCode?: string;
  passId?: string;
  expiresAt?: string | null;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [flipped, setFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleExpand = () => setIsFullscreen(true);
    window.addEventListener('expand_visit_pass', handleExpand);
    return () => window.removeEventListener('expand_visit_pass', handleExpand);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { gamma, beta } = event; // gamma is left/right (-90 to 90), beta is front/back (-180 to 180)
      if (gamma === null || beta === null) return;

      const x = Math.min(Math.max((gamma || 0) / 45, -1), 1);
      const y = Math.min(Math.max(((beta || 0) - 45) / 45, -1), 1);

      setTilt(prev => ({
        x: prev.x + (x - prev.x) * 0.1,
        y: prev.y + (y - prev.y) * 0.1
      }));
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (Math.abs(velocity) > 500 || Math.abs(offset) > 100) {
      setFlipped(!flipped);
    }
  };

  const copy = {
    claim: [`You were invited to ${merchant}.`, `Visit and earn ${visitorReward}. The router earns ${routerReward} after counter verification.`],
    show: ['Show this pass at the counter.', 'The terminal checks the proof-backed pass code before it opens the receipt.'],
    verified: ['Visit verified.', 'Your reward was settled on Solana and the receipt is ready to inspect.'],
  }[stage];

  const expiry = expiresAt ? new Date(expiresAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) : 'Proof window locked';

  const isShow = stage === 'show' || stage === 'verified';

  const cardStyle = {
    WebkitMaskImage: isShow ? 'radial-gradient(circle at 0px 65%, transparent 20px, black 21px), radial-gradient(circle at 100% 65%, transparent 20px, black 21px)' : 'none',
    WebkitMaskPosition: 'top left, top right',
    WebkitMaskSize: '51% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskImage: isShow ? 'radial-gradient(circle at 0px 65%, transparent 20px, black 21px), radial-gradient(circle at 100% 65%, transparent 20px, black 21px)' : 'none',
    maskPosition: 'top left, top right',
    maskSize: '51% 100%',
    maskRepeat: 'no-repeat'
  };

  const content = (isExpandedView: boolean) => (
    <motion.div
      className={`relative flex flex-col w-full rounded-[32px] overflow-hidden transition-all duration-[800ms] shadow-2xl ${
        isExpandedView
          ? 'h-[600px] max-h-[85vh] bg-white text-black shadow-[0_0_120px_rgba(255,255,255,0.15)]'
          : isShow && stage !== 'verified'
            ? 'h-[420px] md:h-[480px] bg-white text-black shadow-[0_0_80px_rgba(255,255,255,0.1)]'
            : stage === 'verified'
              ? 'h-[420px] md:h-[480px] bg-emerald-950 text-emerald-50 shadow-emerald-900/40 ring-1 ring-emerald-500/20'
              : 'h-[420px] md:h-[480px] bg-[#0a0a0a] text-white shadow-black/40 ring-1 ring-white/10'
      }`}
      style={{
        ...cardStyle,
        transformStyle: 'preserve-3d',
      }}
      animate={{ rotateY: flipped ? 180 : 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* FRONT OF CARD */}
      <div
        className="absolute inset-0 backface-hidden flex flex-col p-6 lg:p-8"
        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
      >
        {/* Holographic foil overlay tied to tilt */}
        {isShow && (
          <div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay transition-opacity duration-1000"
            style={{
              background: `linear-gradient(${135 + tilt.x * 45}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)`,
              transform: `translateZ(10px) translateX(${tilt.x * 20}px) translateY(${tilt.y * 20}px)`,
            }}
          />
        )}

        <div className="relative z-10 flex flex-col items-start gap-4 h-full" style={{ transform: 'translateZ(30px)' }}>
          <div className="flex w-full justify-between items-start">
            <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-md border ${
              stage === 'verified'
                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                : isShow
                  ? 'bg-black/5 border-black/10 text-gray-800'
                  : 'bg-white/10 border-white/20 text-white'
            }`}>
              {stage === 'verified' ? 'Verified' : 'Visit pass'}
            </span>
            <div className="flex items-center gap-2">
              {isShow && !isExpandedView && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                  className={`p-1.5 rounded-full ${stage === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} transition-colors`}
                  aria-label="Expand Pass"
                >
                  <ArrowsOutSimple size={18} weight="bold" />
                </button>
              )}
              {isShow && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
                  className={`p-1.5 rounded-full ${stage === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} transition-colors`}
                  aria-label="Flip Pass"
                >
                  <ArrowUUpLeft size={18} weight="bold" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <h2 className="text-2xl font-bold tracking-tight leading-tight">{copy[0]}</h2>
            <p className={`text-[15px] font-medium leading-relaxed ${stage === 'verified' ? 'text-emerald-200/80' : isShow ? 'text-gray-600' : 'text-gray-300'}`}>{copy[1]}</p>
          </div>

          {/* QR Code Section */}
          <div className={`relative flex flex-col items-center justify-center w-full min-h-[180px] mt-auto transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
            stage === 'verified' ? 'bg-transparent text-emerald-400 shadow-none' :
            isShow ? 'bg-white' :
            'bg-white shadow-inner text-gray-900 border border-transparent'
          } rounded-2xl`}>

            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] transform ${stage === 'verified' ? 'opacity-0 scale-[3] blur-xl translate-y-20 rotate-45' : 'opacity-100 scale-100 translate-y-0 blur-none rotate-0'}`}>
               {/* High contrast QR */}
               <div className={`p-3 rounded-xl ${isShow ? 'bg-black' : 'bg-transparent'}`}>
                 <QrCode size={110} weight="fill" className={stage === 'claim' ? 'opacity-20' : isShow ? 'text-white' : 'text-indigo-600'} />
               </div>
               {isShow && <span className="text-[10px] font-mono tracking-widest text-gray-400 mt-3 font-bold">SCAN AT COUNTER</span>}
            </div>

            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] transform delay-150 ${stage === 'verified' ? 'opacity-100 scale-100 translate-y-0 blur-none' : 'opacity-0 scale-50 -translate-y-10 blur-xl pointer-events-none'}`}>
               <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-400/30">
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" className="text-emerald-400 drop-shadow-md">
                   <path d="M176.49,95.51a12,12,0,0,1,0,17l-56,56a12,12,0,0,1-17,0l-24-24a12,12,0,1,1,17-17L112,143l47.51-47.52A12,12,0,0,1,176.49,95.51ZM236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Z"></path>
                 </svg>
               </div>
               <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Proof Minted</span>
            </div>

            {passCode ? (
              <strong className={`absolute -top-4 font-mono text-base font-bold px-5 py-1.5 rounded-full border-[3px] shadow-sm tracking-wide transition-all duration-700 delay-75 z-10 ${
                stage === 'verified' ? 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-emerald-500/20' :
                isShow ? 'bg-black text-white border-black' :
                'bg-gray-50 text-gray-900 border-gray-900'
              }`}>
                {passCode}
              </strong>
            ) : null}
            {stage === 'claim' && !passCode && (
               <div className="absolute inset-0 flex items-center justify-center font-semibold text-gray-400">Code unlocked upon claim</div>
            )}
          </div>

          <div className={`flex items-center justify-between w-full pt-4 mt-2 border-t text-[13px] ${isShow && stage !== 'verified' ? 'border-black/10' : 'border-white/10'}`}>
            <span className={`font-medium opacity-60 truncate max-w-[120px] ${isShow && stage !== 'verified' ? 'text-gray-500' : ''}`}>{passId ?? merchant}</span>
            <b className={`font-bold ${stage === 'verified' ? 'text-emerald-400' : isShow ? 'text-gray-900' : 'text-gray-300'}`}>
              {stage === 'verified' ? `${visitorReward} settled` : expiry}
            </b>
          </div>
        </div>
      </div>

      {/* BACK OF CARD */}
      <div
        className="absolute inset-0 bg-[#111] text-white p-6 lg:p-8 flex flex-col justify-between"
        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      >
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h3 className="font-bold text-lg">Cryptographic Receipt</h3>
            <button
              onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
              className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <ArrowUUpLeft size={18} weight="bold" />
            </button>
          </div>

          <div className="flex flex-col gap-4 text-sm font-mono text-gray-400">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 uppercase font-sans tracking-widest font-bold">Pass ID</span>
              <span className="text-white truncate">{passId || 'Pending Claim'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 uppercase font-sans tracking-widest font-bold">Hash</span>
              <span className="text-emerald-400 truncate break-all">0x8f2a93c...d8b4e7</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 uppercase font-sans tracking-widest font-bold">Rewards</span>
              <span>Visitor: {visitorReward}</span>
              <span>Router: {routerReward}</span>
            </div>

            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-xs">
              <ShieldCheck size={20} className="text-indigo-400 mb-2" weight="fill" />
              This pass is cryptographically bound to your device state and verifiable on-chain.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      {/* Inline Representation */}
      <div className="w-full perspective-[2000px]">
        <motion.div
          drag={isShow ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="w-full relative cursor-pointer"
          onClick={() => {
            if (isShow && !isFullscreen) {
              setIsFullscreen(true);
            }
          }}
          style={{
            transform: `rotateX(${tilt.y * -15}deg) rotateY(${tilt.x * 15}deg)`,
            transformStyle: 'preserve-3d'
          }}
        >
          {content(false)}
        </motion.div>
      </div>

      {/* Maximum Brightness / Contrast Fullscreen Overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col justify-end pb-8 px-4"
          >
            <div className="absolute top-0 inset-x-0 pt-10 pb-4 px-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <span className="text-white font-bold opacity-0">.</span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto active:scale-95 transition-transform"
                aria-label="Close"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center w-full max-w-sm mx-auto pt-[60px] perspective-[2000px]">
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="w-full relative"
                style={{
                  transform: `rotateX(${tilt.y * -10}deg) rotateY(${tilt.x * 10}deg)`,
                  transformStyle: 'preserve-3d'
                }}
              >
                {content(true)}
              </motion.div>
              <div className="w-full flex justify-center mt-6">
                <span className="text-white/40 font-mono text-xs uppercase tracking-[0.2em] animate-pulse">Max Brightness Mode</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
