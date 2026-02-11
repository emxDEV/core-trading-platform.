import React, { useState, useMemo } from 'react';
import { useData } from '../context/TradeContext';

export default function OverviewStats() {
    const { filteredTrades: trades, accounts, stats, appSettings } = useData();
    const [pnlFilter, setPnlFilter] = useState('Total');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const filterOptions = [
        { label: 'Total PNL', value: 'Total', types: ['Live', 'Funded', 'Evaluation'], icon: 'payments' },
        { label: 'Live PNL', value: 'Live', types: ['Live'], icon: 'sensors' },
        { label: 'Funded PNL', value: 'Funded', types: ['Funded'], icon: 'account_balance' },
        { label: 'Eval PNL', value: 'Evaluation', types: ['Evaluation'], icon: 'assignment' },
        { label: 'Demo PNL', value: 'Demo', types: ['Demo'], icon: 'science' },
        { label: 'Backtest PNL', value: 'Backtesting', types: ['Backtesting'], icon: 'history' },
    ];

    const currentFilter = filterOptions.find(opt => opt.value === pnlFilter);

    const filteredStats = useMemo(() => {
        const matchingAccounts = accounts.filter(acc => currentFilter.types.includes(acc.type));
        const accountIds = matchingAccounts.map(acc => String(acc.id));

        const filteredTrades = trades.filter(t => accountIds.includes(String(t.account_id)));
        const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winCount = filteredTrades.filter(t => t.pnl > 0).length;
        const winRate = filteredTrades.length > 0 ? ((winCount / filteredTrades.length) * 100).toFixed(1) : 0;

        return {
            totalPnL,
            totalTrades: filteredTrades.length,
            winRate
        };
    }, [trades, accounts, currentFilter]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Win Rate Card */}
            <div className="bg-white dark:bg-surface-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Win Rate</span>
                    <span className="text-emerald-500 text-[10px] font-black bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded uppercase tracking-widest">{pnlFilter} Basis</span>
                </div>
                <div className="flex items-end gap-3 relative">
                    <span className="text-4xl font-black tracking-tighter dark:text-white">{filteredStats.winRate}%</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-2 border border-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${filteredStats.winRate}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* PnL Card with Selector */}
            <div className="bg-white dark:bg-surface-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider block mb-1">P/L Impact</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <span className="material-symbols-outlined text-[12px] opacity-70">{currentFilter.icon}</span>
                            {currentFilter.label}
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 hover:text-white hover:bg-primary transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                        </button>

                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                                <div className="absolute top-full right-0 mt-2 z-50 w-56 bg-[#11141D] border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in zoom-in-95 duration-200 backdrop-blur-3xl">
                                    <div className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">Select Analysis Basis</div>
                                    {filterOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setPnlFilter(opt.value); setIsFilterOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-all ${pnlFilter === opt.value
                                                ? 'bg-primary text-white'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px] opacity-70">{opt.icon}</span>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black tracking-tighter ${filteredStats.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'} drop-shadow-[0_0_15px_rgba(16,185,129,0.1)]`}>
                        {appSettings.maskBalances ? '****' : (filteredStats.totalPnL >= 0 ? '+' : '') + formatCurrency(filteredStats.totalPnL)}
                    </span>
                </div>
            </div>

            {/* Total Trades Card */}
            <div className="bg-white dark:bg-surface-dark p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
                <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Trades</span>
                    <span className="text-slate-400 text-[10px] font-black bg-slate-100 dark:bg-white/5 px-2 py-1 rounded uppercase tracking-widest">{pnlFilter} Basis</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tighter dark:text-white">{filteredStats.totalTrades}</span>
                    <span className="text-[10px] font-black text-slate-500 ml-2 uppercase tracking-widest">executions</span>
                </div>
            </div>
        </div>
    );
}

