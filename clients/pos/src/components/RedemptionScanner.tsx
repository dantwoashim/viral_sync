import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';

interface RedemptionScannerProps {
    merchantVaultAuth: string;
    storeLocation: { latMicro: number, lngMicro: number };
}

/**
 * Point of Sale (POS) component engineered for iPads at retail registers.
 * Connects the V4 Architecture's requirement for physical presence to unlock
 * loyalty tokens. Merges NFC payloads with the user's Session Keys.
 */
export const RedemptionScanner: React.FC<RedemptionScannerProps> = ({ merchantVaultAuth, storeLocation }) => {
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleNfcTap = async () => {
        setScanStatus('scanning');

        try {
            // 1. In a live environment, this triggers the Web NFC API (`NDEFReader`)
            // It reads the user's encoded SessionKey pubkey from their phone.
            console.log('Awaiting NFC Tap from consumer device...');
            await new Promise(res => setTimeout(res, 1500)); // Mock NFC read delay

            setScanStatus('verifying');

            // 2. Once the Consumer's payload is detected, the POS software locally 
            // generates the `redeem_with_geo` payload using the utility built in Week 5
            console.log(`Generating Geolocation bounds: ${storeLocation.latMicro}, ${storeLocation.lngMicro}`);

            // 3. The transaction is formulated, embedding the POS-signed geography variables,
            // and submitted to the blockchain utilizing the Consumer's pre-approved SessionKey.
            await new Promise(res => setTimeout(res, 2000)); // Mock Transaction finality

            setScanStatus('success');
            setTimeout(() => setScanStatus('idle'), 4000);

        } catch (err: any) {
            setScanStatus('error');
            setErrorMessage(err.message || 'NFC read failed or transaction rejected.');
            setTimeout(() => setScanStatus('idle'), 5000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md mx-auto relative overflow-hidden">

            {/* Decorative pulse rings */}
            {scanStatus === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-indigo-500/30 rounded-full animate-ping"></div>
                    <div className="w-48 h-48 border-4 border-indigo-500/50 rounded-full animate-ping animation-delay-300 absolute"></div>
                </div>
            )}

            <div className="text-center z-10 w-full">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Redeem Rewards</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-12">Tap your Viral-Sync enabled device to pay with points.</p>

                <button
                    onClick={handleNfcTap}
                    disabled={scanStatus !== 'idle' && scanStatus !== 'error'}
                    className={`relative w-48 h-48 mx-auto rounded-full flex flex-col items-center justify-center transition-all duration-300 transform outline-none
            ${scanStatus === 'idle' ? 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105 shadow-[0_0_40px_rgba(79,70,229,0.4)] cursor-pointer' : ''}
            ${scanStatus === 'scanning' ? 'bg-indigo-800 scale-95 shadow-inner cursor-wait' : ''}
            ${scanStatus === 'verifying' ? 'bg-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.5)] animate-pulse' : ''}
            ${scanStatus === 'success' ? 'bg-green-500 shadow-[0_0_50px_rgba(34,197,94,0.6)] scale-110' : ''}
            ${scanStatus === 'error' ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.6)]' : ''}
          `}
                >
                    {scanStatus === 'idle' && (
                        <>
                            <svg className="w-16 h-16 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            <span className="text-white font-bold text-lg tracking-wider">TAP HERE</span>
                        </>
                    )}

                    {scanStatus === 'scanning' && <span className="text-indigo-200 font-bold text-lg animate-pulse">READING...</span>}
                    {scanStatus === 'verifying' && <span className="text-yellow-900 font-bold text-lg">VERIFYING...</span>}

                    {scanStatus === 'success' && (
                        <>
                            <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                            <span className="text-white font-bold absolute bottom-6">APPROVED</span>
                        </>
                    )}

                    {scanStatus === 'error' && (
                        <>
                            <svg className="w-16 h-16 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            <span className="text-white font-bold tracking-wider">DECLINED</span>
                        </>
                    )}
                </button>

                {scanStatus === 'error' && (
                    <p className="mt-8 text-red-500 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-lg inline-block">
                        {errorMessage}
                    </p>
                )}
            </div>

            {/* Footer Store Info */}
            <div className="absolute bottom-4 left-0 w-full text-center text-xs text-slate-400 font-mono">
                LOC: [{storeLocation.latMicro}, {storeLocation.lngMicro}] • V4 SECURE
            </div>
        </div>
    );
};
