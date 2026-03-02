import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

interface BlinkGeneratorProps {
    mint: PublicKey;
    generationPda: PublicKey;
}

/**
 * Consumer Dashboard component mapping V4 Architecture.
 * Converts the user's active Generation PDA and Mint into an encoded 
 * Solana Action `solana-action:` URL strictly purposed for Twitter/X sharing.
 */
export const BlinkGenerator: React.FC<BlinkGeneratorProps> = ({ mint, generationPda }) => {
    const { wallet } = useWallet();
    const [copied, setCopied] = useState(false);

    // Base URL for the Action Server hosted alongside the PWA
    const ACTION_SERVER_BASE = process.env.NEXT_PUBLIC_ACTION_SERVER_URL || 'https://api.viralsync.io';

    const generateBlinkUrl = () => {
        // Escrow generation via blink requires the action server to know the 
        // upstream source generation PDA to build the `create_escrow_share` logic
        const actionEndpoint = `${ACTION_SERVER_BASE}/actions/viral-sync?source=${generationPda.toBase58()}&mint=${mint.toBase58()}`;

        // Format into standard Dialect/Solana Action spec
        const blinkUrl = `solana-action:${encodeURIComponent(actionEndpoint)}`;
        return blinkUrl;
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generateBlinkUrl());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    return (
        <div className="p-4 bg-gray-900 rounded-lg shadow-lg border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-2">Generate Viral Link</h3>
            <p className="text-gray-400 text-sm mb-4">
                Share this Blink on Twitter (X). When someone clicks it, the protocol will automatically generate an escrowed token for them, attributing the referral back to you!
            </p>

            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    readOnly
                    value={generateBlinkUrl()}
                    className="flex-1 bg-black text-green-400 border border-gray-700 rounded p-2 text-sm focus:outline-none"
                />
                <button
                    onClick={copyToClipboard}
                    className={`px-4 py-2 rounded font-bold transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {copied ? 'Copied!' : 'Copy Blink'}
                </button>
            </div>
        </div>
    );
};
