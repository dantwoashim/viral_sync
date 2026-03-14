'use client';

import type { DataState } from '@/lib/types';
import { APP_MODE } from '@/lib/solana';

function resolveBadge(states: Array<DataState<unknown>>) {
    const nonLoading = states.filter((state) => state && !state.loading);

    if (nonLoading.some((state) => state.source === 'demo')) {
        return { className: 'pill pill-cloud', label: 'Demo Data' };
    }

    if (nonLoading.some((state) => state.source === 'live')) {
        return { className: 'pill pill-jade', label: 'Live Chain' };
    }

    if (states.some((state) => state.loading)) {
        return { className: 'pill pill-gold', label: APP_MODE === 'demo' ? 'Loading Demo' : 'Syncing Live' };
    }

    return {
        className: 'pill pill-gold',
        label: APP_MODE === 'demo' ? 'Demo Ready' : 'Awaiting Live Data',
    };
}

export default function DataModeBadge({ states }: { states: Array<DataState<unknown>> }) {
    const badge = resolveBadge(states);
    return <div className={badge.className}>{badge.label}</div>;
}
