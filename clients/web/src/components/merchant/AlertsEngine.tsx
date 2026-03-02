import React from 'react';

// Mock structure corresponding to `programs/viral_sync/src/state/merchant_reputation.rs`
interface ReputationData {
    reputationScore: number; // 0 to 10000
    suspicionScore: number;
    timeoutDisputes: number;
}

interface AlertsEngineProps {
    reputation: ReputationData | null;
    pendingDisputeCount: number;
}

/**
 * Merchant Dashboard V1 Component.
 * Surfaces the severe engine tracking signals mapping to the MerchantReputation engine built in Week 3.
 * Warns merchants explicitly when their neglect risks automated bond seizure (`resolve_expired_dispute` threshold).
 */
export const AlertsEngine: React.FC<AlertsEngineProps> = ({ reputation, pendingDisputeCount }) => {
    if (!reputation) return null;

    const getHealthColor = (score: number) => {
        if (score >= 9000) return 'text-green-500 bg-green-100 dark:bg-green-900/20 border-green-200';
        if (score >= 6000) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200';
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 border-red-200';
    };

    const isCritical = pendingDisputeCount > 0 || reputation.reputationScore < 7000;

    return (
        <div className={`p-6 rounded-xl border-l-4 shadow-sm ${isCritical ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' : 'border-l-indigo-500 bg-white dark:bg-gray-800'
            }`}>

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                    Reputation & Alerts
                    {isCritical && (
                        <span className="ml-3 px-2 py-0.5 rounded text-xs font-bold bg-red-500 text-white animate-pulse">ACTION REQUIRED</span>
                    )}
                </h3>

                <div className={`px-4 py-1 rounded-full font-bold flex items-center border ${getHealthColor(reputation.reputationScore)}`}>
                    Score: {(reputation.reputationScore / 100).toFixed(1)}
                </div>
            </div>

            <div className="space-y-3">
                {pendingDisputeCount > 0 && (
                    <div className="flex items-start p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                        <div>
                            <p className="font-bold text-red-800 dark:text-red-400">You have {pendingDisputeCount} active dispute(s) raised by Watchdogs.</p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">If not addressed via the Dashboard resolution panel within 14 days, the smart contract automatically upholds the dispute and penalizes your bond and score.</p>
                        </div>
                    </div>
                )}

                {reputation.timeoutDisputes > 0 && (
                    <div className="flex items-center p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-800 dark:text-orange-400 text-sm">
                        <span className="font-bold mr-2">Warning:</span> Your protocol history shows {reputation.timeoutDisputes} ignored disputes leading to heavy permanent scoring penalties.
                    </div>
                )}

                {reputation.suspicionScore > 500 && (
                    <div className="flex items-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-800 dark:text-yellow-400 text-sm">
                        <span className="font-bold mr-2">Data Flag:</span> Off-chain indexers have marked your redemption patterns as suspicious due to localized IP clustering or abnormal commission densities. If this exceeds threshold bounds, watchdogs will be notified.
                    </div>
                )}

                {!isCritical && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">All systems operational. No standing penalties or active disputes flagged against your bond.</p>
                )}
            </div>

        </div>
    );
};
