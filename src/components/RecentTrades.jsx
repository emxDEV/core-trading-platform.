import React, { useState } from 'react';
import { useData } from '../context/TradeContext';

import lucidLogo from '../assets/firms/lucid_trading.png';
import tradeifyLogo from '../assets/firms/tradeify.png';
import alphaFuturesLogo from '../assets/firms/alpha_futures.png';
import topstepLogo from '../assets/firms/topstep.png';
import { useNotifications } from '../context/NotificationContext';

const TYPE_COLORS = {
    'Live': { border: 'border-emerald-500/40 bg-emerald-500/5', dot: 'bg-emerald-500', text: 'text-emerald-500' },
    'Evaluation': { border: 'border-amber-500/40 bg-amber-500/5', dot: 'bg-amber-500', text: 'text-amber-500' },
    'Funded': { border: 'border-cyan-500/40 bg-cyan-500/5', dot: 'bg-cyan-500', text: 'text-cyan-500' },
    'Demo': { border: 'border-sky-500/40 bg-sky-500/5', dot: 'bg-sky-500', text: 'text-sky-500' },
    'Backtesting': { border: 'border-violet-500/40 bg-violet-500/5', dot: 'bg-violet-500', text: 'text-violet-500' },
};

const PROP_FIRMS = [
    { name: 'Lucid Trading', logo: lucidLogo, color: '#06b6d4' },
    { name: 'Tradeify', logo: tradeifyLogo, color: '#10b981' },
    { name: 'Alpha Futures', logo: alphaFuturesLogo, color: '#f59e0b' },
    { name: 'TopStep', logo: topstepLogo, color: '#8b5cf6' },
];

const COLOR_MAP = {
    primary: 'bg-primary/15 text-primary',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    rose: 'bg-rose-500/15 text-rose-400',
    amber: 'bg-amber-500/15 text-amber-400',
    violet: 'bg-violet-500/15 text-violet-400',
    sky: 'bg-sky-500/15 text-sky-400',
    pink: 'bg-pink-500/15 text-pink-400',
    lime: 'bg-lime-500/15 text-lime-400',
};

export default function RecentTrades() {
    const { filteredTrades, deleteTrade, undoDeleteTrade, openModal, getPillColor } = useData();
    const { confirm, showSuccess } = useNotifications();

    const handleDelete = async (trade) => {
        const confirmed = await confirm({
            title: 'Delete Trade?',
            message: `Are you sure you want to purge the ${trade.symbol} trade from history? This action is persistent.`,
            confirmText: 'Purge Trade',
            type: 'danger'
        });

        if (confirmed) {
            const success = await deleteTrade(trade.id);
            if (success) {
                showSuccess({
                    message: `${trade.symbol} trade has been purged.`,
                    action: {
                        label: 'Undo Deletion',
                        onClick: () => undoDeleteTrade()
                    }
                });
            }
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    const pillClass = (category, value, fallback = 'primary') => {
        const color = getPillColor(category, value) || fallback;
        return COLOR_MAP[color] || COLOR_MAP.primary;
    };

    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <h2 className="font-bold text-lg dark:text-white">Recent Trades</h2>
                </div>
            </div>
            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/60">
                            <th className="px-10 py-6">Date</th>
                            <th className="px-10 py-6">Symbol</th>
                            <th className="px-10 py-6">Account</th>
                            <th className="px-10 py-6">Model</th>
                            <th className="px-10 py-6">Session</th>
                            <th className="px-10 py-6">Side</th>
                            <th className="px-10 py-6 text-right">Net PNL</th>
                            <th className="px-10 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                        {filteredTrades.map((trade) => (
                            <tr key={trade.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                <td className="px-10 py-5">
                                    <span className="text-sm font-medium dark:text-slate-300">{trade.date}</span>
                                </td>
                                <td className="px-10 py-5">
                                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${pillClass('symbol', trade.symbol, 'sky')}`}>{trade.symbol}</span>
                                </td>
                                <td className="px-10 py-5">
                                    <div className="flex items-center gap-2">
                                        {trade.account_prop_firm && PROP_FIRMS.find(f => f.name === trade.account_prop_firm) ? (
                                            <img
                                                src={PROP_FIRMS.find(f => f.name === trade.account_prop_firm).logo}
                                                alt={trade.account_prop_firm}
                                                className="w-5 h-5 rounded-md object-cover shadow-sm"
                                            />
                                        ) : (
                                            <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[trade.account_type]?.dot || 'bg-slate-400'}`}></div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold dark:text-white leading-none">{trade.account_name || 'Deleted Account'}</span>
                                            {trade.account_type && (
                                                <span className={`text-[9px] uppercase font-black tracking-wider mt-1 ${TYPE_COLORS[trade.account_type]?.text || 'text-slate-500'}`}>
                                                    {trade.account_type}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-5">
                                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${pillClass('model', trade.model, 'violet')}`}>{trade.model || '—'}</span>
                                </td>
                                <td className="px-10 py-5">
                                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${pillClass('session', trade.trade_session, 'primary')}`}>{trade.trade_session || '—'}</span>
                                </td>
                                <td className="px-10 py-5">
                                    <span className={`inline-flex items-center px-3 py-1 rounded text-[10px] font-black ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {trade.side}
                                    </span>
                                </td>
                                <td className={`px-10 py-5 text-right font-black ${trade.pnl > 0 ? 'text-emerald-500' : trade.pnl < 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                                    {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                                </td>
                                <td className="px-10 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openModal(trade)}
                                            className="text-slate-400 hover:text-primary transition-colors"
                                            title="Edit Trade"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(trade)}
                                            className="text-slate-400 hover:text-rose-500 transition-colors"
                                            title="Delete Trade"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredTrades.length === 0 && (
                            <tr>
                                <td colSpan="8" className="px-8 py-24 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center mb-2">
                                            <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600">history</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold dark:text-white mb-1">No Trades Recorded</h3>
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium">Your trade history is currently empty for the selected filters. Start a new session by recording your first execution.</p>
                                        </div>
                                        <button
                                            onClick={() => openModal()}
                                            className="px-6 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                        >
                                            Record First Trade
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
