import React from 'react';

// Mock structure corresponding to `programs/viral_sync/src/state/viral_oracle.rs`
interface OracleData {
    kFactor: number; // Stored as u64 normally
    shareRate: number; // out of 10000 
    claimRate: number;
    firstRedeemRate: number;
    vsGoogleAdsEfficiencyBps: number;
}

interface OracleMetricsProps {
    data: OracleData | null;
    isLoading: boolean;
}

/**
 * Merchant Dashboard V1 Component.
 * Maps the securely ingested Helius-backed indexing data processed by `compute_viral_oracle`.
 */
export const OracleMetrics: React.FC<OracleMetricsProps> = ({ data, isLoading }) => {
    if (isLoading || !data) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md animate-pulse">
                <div className="h-6 bg-gray-300 dark:bg-gray-700 w-1/3 rounded mb-4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    const formatPct = (bps: number) => `${(bps / 100).toFixed(1)}%`;

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                Viral Oracle Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Core Protocol Health Measurement */}
                <div className="bg-indigo-50 dark:bg-gray-900/50 p-4 rounded-lg border border-indigo-100 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Network K-Factor</div>
                    <div className="text-3xl font-black text-indigo-700 dark:text-indigo-400">
                        {(data.kFactor / 100).toFixed(2)}
                    </div>
                    <div className="mt-2 text-xs text-indigo-600/80 dark:text-indigo-400/80">
                        {data.kFactor > 100 ? 'Viral Growth Expanding 🔥' : 'Sub-Viral Stability'}
                    </div>
                </div>

                {/* Funnel Pipeline */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Conversion Funnel</div>
                    <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">Share Rate</span>
                            <span className="font-bold text-gray-800 dark:text-white">{formatPct(data.shareRate)}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded"><div className="bg-blue-500 h-1.5 rounded" style={{ width: formatPct(data.shareRate) }}></div></div>

                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">Claim Rate</span>
                            <span className="font-bold text-gray-800 dark:text-white">{formatPct(data.claimRate)}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded"><div className="bg-purple-500 h-1.5 rounded" style={{ width: formatPct(data.claimRate) }}></div></div>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Redemption Completion</div>
                    <div className="text-3xl font-black text-gray-800 dark:text-white">
                        {formatPct(data.firstRedeemRate)}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Of claims convert to physical sales</div>
                </div>

                {/* Efficiency Mapping */}
                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                    <div className="text-sm text-green-700 dark:text-green-400 font-semibold mb-1">Ad Cost Efficiency</div>
                    <div className="text-3xl font-black text-green-700 dark:text-green-400">
                        +{formatPct(data.vsGoogleAdsEfficiencyBps)}
                    </div>
                    <div className="mt-2 text-xs text-green-800/70 dark:text-green-400/70">Versus baseline Meta/Google local-ad spend targets</div>
                </div>

            </div>
        </div>
    );
};
