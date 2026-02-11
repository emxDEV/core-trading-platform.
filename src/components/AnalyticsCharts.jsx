import React, { useMemo } from 'react';
import { useData } from '../context/TradeContext';
import { SkeletonChart } from './SkeletonLoader';

export default function AnalyticsCharts() {
    const { filteredTrades: trades, isLoading } = useData();

    const pnlData = useMemo(() => {
        if (!trades.length) return [];
        // Sort trades by date + created_at
        const sorted = [...trades].sort((a, b) => {
            const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });

        let cumulative = 0;
        return sorted.map(t => {
            cumulative += (t.pnl || 0);
            return {
                id: t.id,
                equity: cumulative,
                pnl: t.pnl,
                date: t.date
            };
        });
    }, [trades]);

    const maxPnl = Math.max(...pnlData.map(d => Math.abs(d.equity)), 1000);
    const getBarHeight = (equity) => {
        const height = (Math.abs(equity) / maxPnl) * 100;
        return `${Math.max(height, 5)}%`;
    };

    const topStrategies = useMemo(() => {
        if (!trades.length) return [];

        const strategyStats = trades.reduce((acc, trade) => {
            const model = (trade.model || 'Unknown').trim();
            if (!acc[model]) {
                acc[model] = { total: 0, wins: 0 };
            }
            acc[model].total += 1;
            if (trade.pnl > 0) acc[model].wins += 1;
            return acc;
        }, {});

        return Object.entries(strategyStats)
            .map(([name, stats]) => ({
                name,
                winRate: Math.round((stats.wins / stats.total) * 100)
            }))
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 3);
    }, [trades]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-12">
                <SkeletonChart />
                <div className="bg-white dark:bg-surface-dark p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                    <div className="h-4 w-32 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="flex justify-between">
                                <div className="h-3 w-20 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                                <div className="h-3 w-10 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-12">
            <div className="bg-white dark:bg-surface-dark p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Equity Curve</h3>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/30"></div>
                    </div>
                </div>
                <div className="relative h-48 w-full flex items-end justify-between px-2 gap-1 overflow-hidden group">
                    {pnlData.length > 0 ? (
                        pnlData.slice(-15).map((d, i) => (
                            <div
                                key={d.id}
                                className={`flex-1 rounded-t-lg transition-all duration-500 hover:brightness-125 relative group/bar`}
                                style={{
                                    height: getBarHeight(d.equity),
                                    backgroundColor: d.equity >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(244, 63, 94, 0.6)'
                                }}
                            >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 whitespace-nowrap z-10 pointer-events-none transition-all">
                                    ${d.equity.toLocaleString()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-medium italic">
                            No trade data available for this phase
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-slate-100 dark:border-slate-800 pt-4">
                    <span>Start of Period</span>
                    <span>Current Performance</span>
                </div>
            </div>
            <div className="bg-white dark:bg-surface-dark p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-8">Top Strategies</h3>
                <div className="space-y-8">
                    {topStrategies.length > 0 ? (
                        topStrategies.map((strategy) => (
                            <div key={strategy.name}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold dark:text-white">{strategy.name}</span>
                                    <span className="text-sm font-black text-emerald-500">{strategy.winRate}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                        style={{ width: `${strategy.winRate}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-slate-400 text-sm">No strategies recorded yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
