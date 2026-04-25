import React, { useCallback, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';

interface InAppQueueProps {
    generationPda: PublicKey;
    hasPendingEntries: boolean;
    relayUrl: string;
    relayApiKey?: string;
    buildFinalizeTransaction: (generationPda: PublicKey) => Promise<string>;
    onRelayed?: (signature: string) => void;
}

export const InAppQueue: React.FC<InAppQueueProps> = ({
    generationPda,
    hasPendingEntries,
    relayUrl,
    relayApiKey,
    buildFinalizeTransaction,
    onRelayed,
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastProcessed, setLastProcessed] = useState<number | null>(null);

    const triggerCrank = useCallback(async () => {
        setIsProcessing(true);
        try {
            const transactionBase64 = await buildFinalizeTransaction(generationPda);
            const response = await fetch(relayUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(relayApiKey ? { Authorization: `Bearer ${relayApiKey}` } : {}),
                },
                body: JSON.stringify({ transactionBase64 }),
            });

            const payload = await response.json() as { signature?: string; error?: string };
            if (!response.ok) {
                throw new Error(payload.error || 'Relayer rejected finalize_inbound.');
            }

            setLastProcessed(Date.now());
            if (payload.signature) {
                onRelayed?.(payload.signature);
            }

        } catch (err) {
            console.error("Failed to auto-finalize buffer queue", err);
        } finally {
            setIsProcessing(false);
        }
    }, [buildFinalizeTransaction, generationPda, onRelayed, relayApiKey, relayUrl]);

    useEffect(() => {
        if (hasPendingEntries && !isProcessing) {
            void triggerCrank();
        }
    }, [hasPendingEntries, isProcessing, triggerCrank]);

    if (!hasPendingEntries) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-blue-900 border border-blue-500 text-white p-3 rounded-lg shadow-xl shadow-blue-500/20 flex items-center space-x-3 z-50">
            <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
            <div className="text-sm">
                <div className="font-bold">Syncing Referrals...</div>
                <div className="text-blue-200 text-xs">
                    {isProcessing
                        ? 'Relayer processing gas-free transaction'
                        : lastProcessed
                            ? `Last synced ${new Date(lastProcessed).toLocaleTimeString()}`
                            : 'Standing by'}
                </div>
            </div>
        </div>
    );
};
