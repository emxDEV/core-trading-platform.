import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useData, getAccountStats } from '../context/TradeContext';
import { useNotifications } from '../context/NotificationContext';
import { SkeletonAccountCard } from './SkeletonLoader';
import lucidLogo from '../assets/firms/lucid_trading.png';
import tradeifyLogo from '../assets/firms/tradeify.png';
import alphaFuturesLogo from '../assets/firms/alpha_futures.png';
import topstepLogo from '../assets/firms/topstep.png';

const PROP_FIRMS = [
    { name: 'Lucid Trading', logo: lucidLogo, color: '#06b6d4' },
    { name: 'Tradeify', logo: tradeifyLogo, color: '#10b981' },
    { name: 'Alpha Futures', logo: alphaFuturesLogo, color: '#f59e0b' },
    { name: 'TopStep', logo: topstepLogo, color: '#8b5cf6' },
];

const TYPE_COLORS = {
    'Live': { border: 'border-emerald-500/40 bg-emerald-500/5', dot: 'bg-emerald-500', text: 'text-emerald-500' },
    'Evaluation': { border: 'border-amber-500/40 bg-amber-500/5', dot: 'bg-amber-500', text: 'text-amber-500' },
    'Funded': { border: 'border-cyan-500/40 bg-cyan-500/5', dot: 'bg-cyan-500', text: 'text-cyan-500' },
    'Demo': { border: 'border-sky-500/40 bg-sky-500/5', dot: 'bg-sky-500', text: 'text-sky-500' },
    'Backtesting': { border: 'border-violet-500/40 bg-violet-500/5', dot: 'bg-violet-500', text: 'text-violet-500' },
};

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

// Observer System to prevent UI elements from being cut off
const useBoundaryObserver = (coords, padding = 16) => {
    const [adjustedStyles, setAdjustedStyles] = useState({
        position: 'fixed',
        top: coords?.y || 0,
        left: coords?.x || 0,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 99999,
    });
    const ref = useRef(null);

    React.useLayoutEffect(() => {
        if (!coords || !ref.current) return;

        const element = ref.current;
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let { x, y } = coords;
        let finalX = x;
        let finalY = y;

        if (x + rect.width > viewportWidth - padding) {
            finalX = viewportWidth - rect.width - padding;
        }
        if (finalX < padding) finalX = padding;

        if (y + rect.height > viewportHeight - padding) {
            finalY = viewportHeight - rect.height - padding;
        }
        if (finalY < padding) finalY = padding;

        setAdjustedStyles({
            position: 'fixed',
            top: finalY,
            left: finalX,
            opacity: 1,
            zIndex: 99999,
            pointerEvents: 'auto',
            transition: 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'scale(1)',
            transformOrigin: 'top left'
        });
    }, [coords, padding]);

    return { ref, style: adjustedStyles };
};

const SmartPortal = ({ coords, children, padding = 16, className = "" }) => {
    const { ref, style } = useBoundaryObserver(coords, padding);
    return createPortal(
        <div ref={ref} style={style} className={className} onMouseDown={e => e.stopPropagation()}>
            {children}
        </div>,
        document.body
    );
};

const AccountCard = ({ acc, onReset, onContextMenu }) => {
    const { copyGroups, appSettings } = useData();
    const stats = acc.stats;
    const isBreached = stats?.isBreached;
    const propFirm = PROP_FIRMS.find(f => f.name === acc.prop_firm);

    const activeLeaderGroup = copyGroups.find(g => g.is_active && String(g.leader_account_id) === String(acc.id));
    const activeFollowerInGroup = copyGroups.find(g => g.is_active && g.members && g.members.some(m => String(m.follower_account_id) === String(acc.id)));

    // Risk Calculation
    const maxDrawdown = acc.capital - stats?.mll;
    const currentDrawdownRemaining = stats?.drawdownRemaining;
    const drawdownBufferPercent = maxDrawdown > 0 ? (currentDrawdownRemaining / maxDrawdown) * 100 : 0;
    const isCritical = !isBreached && drawdownBufferPercent < 20;

    return (
        <div
            onContextMenu={(e) => onContextMenu(e, acc)}
            className={`bg-white dark:bg-surface-dark rounded-xl border p-6 transition-all hover:shadow-md cursor-default select-none 
                ${isBreached
                    ? 'border-rose-200 dark:border-rose-900/30 bg-rose-50/10'
                    : isCritical
                        ? 'border-rose-500/50 bg-rose-500/5 shadow-rose-500/10 animate-critical-border animate-critical-pulse'
                        : 'border-slate-200 dark:border-slate-800'}`}
        >
            <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        {propFirm ? (
                            <img src={propFirm.logo} alt={acc.prop_firm} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
                        ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_COLORS[acc.type]?.dot || 'bg-slate-400'}`}>
                                <span className="text-white font-bold text-xs">{acc.name.substring(0, 2).toUpperCase()}</span>
                            </div>
                        )}
                        {activeLeaderGroup && (
                            <div className="absolute -top-1.5 -left-1.5 bg-amber-400 text-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-slate-900 z-10 animate-bounce-subtle">
                                <span className="material-symbols-outlined text-[10px] font-black">crown</span>
                            </div>
                        )}
                        {activeFollowerInGroup && (
                            <div className="absolute -top-1.5 -left-1.5 bg-primary text-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-slate-900 z-10">
                                <span className="material-symbols-outlined text-[10px] font-black">sync</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm dark:text-white leading-tight">{acc.name}</h4>
                            {activeLeaderGroup && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">Leader</span>}
                            {activeFollowerInGroup && <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Follower</span>}
                        </div>
                        <span className={`text-[10px] uppercase font-black tracking-wider ${isBreached ? 'text-rose-500' : TYPE_COLORS[acc.type]?.text || 'text-slate-400'}`}>
                            {isBreached ? (acc.breach_report === 'MANUAL_BREACH' ? 'MANUALLY BREACHED' : 'BREACHED') : (acc.is_ranked_up ? 'Eval -> Funded' : acc.type)}
                        </span>
                        {isCritical && <span className="ml-2 bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px] font-black animate-pulse shadow-lg shadow-rose-500/20">CRITICAL</span>}
                    </div>
                </div>
                {isBreached && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                        Failed
                    </span>
                )}
            </div>

            <div className="space-y-1 mb-4">
                <div className="text-2xl font-bold dark:text-white tracking-tight">
                    {appSettings.maskBalances ? '****' : formatCurrency(stats?.balance || 0)}
                </div>
                <div className={`text-xs font-bold ${stats?.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {appSettings.maskBalances ? '****' : (stats?.totalPnL >= 0 ? '+' : '') + formatCurrency(stats?.totalPnL || 0)} PnL
                </div>
            </div>

            {/* Performance Metrics Grid */}
            {!isBreached && stats?.tradeCount > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Win Rate</span>
                        <span className={`text-sm font-bold ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stats.winRate.toFixed(0)}%
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Profit Factor</span>
                        <span className={`text-sm font-bold ${stats.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {stats.profitFactor.toFixed(2)}
                        </span>
                    </div>
                </div>
            )}

            {/* Mini Equity Sparkline */}
            {!isBreached && stats?.recentPnl && stats.recentPnl.length > 1 && (
                <div className="mb-4 h-12 w-full relative opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {(() => {
                            const data = stats.recentPnl;
                            // Convert to cumulative for equity line
                            let cum = 0;
                            const points = data.map(pnl => { cum += pnl; return cum; });

                            const min = Math.min(0, ...points);
                            const max = Math.max(0, ...points);
                            const range = max - min || 1;

                            // Generate path
                            const pathD = points.map((val, i) => {
                                const x = (i / (points.length - 1)) * 100;
                                const y = 100 - ((val - min) / range) * 100;
                                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ');

                            return (
                                <path
                                    d={pathD}
                                    fill="none"
                                    stroke={points[points.length - 1] >= 0 ? '#10b981' : '#f43f5e'}
                                    strokeWidth="2"
                                    vectorEffect="non-scaling-stroke"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            );
                        })()}
                    </svg>
                    {/* Zero Line */}
                    {(() => {
                        const data = stats.recentPnl;
                        let cum = 0;
                        const points = data.map(pnl => { cum += pnl; return cum; });
                        const min = Math.min(0, ...points);
                        const max = Math.max(0, ...points);
                        const range = max - min || 1;
                        // Calculate where 0 is
                        if (min < 0 && max > 0) {
                            const zeroY = 100 - ((0 - min) / range) * 100;
                            return (
                                <div
                                    className="absolute left-0 right-0 border-t border-dashed border-slate-300/30 dark:border-white/10 pointer-events-none"
                                    style={{ top: `${zeroY}%` }}
                                />
                            );
                        }
                        return null;
                    })()}
                </div>
            )}

            {/* Progress bar to target (if eval) */}
            {acc.type === 'Evaluation' && acc.profit_target > 0 && !isBreached && (
                <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                        <span>To Target</span>
                        <span className="text-emerald-400">{formatCurrency(stats?.remainingToTarget || 0)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, (stats?.totalPnL / acc.profit_target) * 100))}%` }}
                        />
                    </div>
                </div>
            )}

            {!isBreached && (
                <div className="mt-2">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                        <span>Drawdown Rem.</span>
                        <span className="text-rose-400">{formatCurrency(stats?.drawdownRemaining || 0)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, 100 - (stats?.drawdownRemaining / (acc.capital - stats?.mll)) * 100))}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Payout Goal Progress */}
            {!isBreached && acc.type === 'Funded' && acc.payout_goal > 0 && (
                <div className="mt-2">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                        <span>Payout Target</span>
                        <span className={stats?.totalPnL >= acc.payout_goal ? 'text-emerald-400' : 'text-primary'}>
                            {formatCurrency(acc.payout_goal)}
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${stats?.totalPnL >= acc.payout_goal
                                ? 'bg-emerald-500'
                                : 'bg-primary'
                                }`}
                            style={{ width: `${Math.min(100, Math.max(0, (stats?.totalPnL / acc.payout_goal) * 100))}%` }}
                        />
                    </div>
                    {stats?.totalPnL >= acc.payout_goal && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="material-symbols-outlined text-[10px] text-emerald-400">check_circle</span>
                            <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">Goal Reached</span>
                        </div>
                    )}
                </div>
            )}

            {/* Breached State Details */}
            {isBreached && (
                <div className="mt-4 p-2 bg-rose-100/50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800/50 text-center flex flex-col gap-2">
                    <div>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Account Eliminated</span>
                        <div className="text-[10px] text-rose-500 mt-1">{acc.breach_report === 'MANUAL_BREACH' ? 'Marked manually as breached' : 'Exceeded Max Loss Limit'}</div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onReset(acc);
                        }}
                        className="bg-white dark:bg-black/20 text-[10px] font-bold text-rose-500 px-3 py-1.5 rounded border border-rose-200 dark:border-rose-800/50 hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors uppercase tracking-wider"
                    >
                        Reset Account
                    </button>
                </div>
            )}
        </div>
    );
};

export default function AccountsList() {
    const { accounts, filteredTrades, updateAccount, isLoading } = useData();
    const { confirm } = useNotifications();
    const [contextMenu, setContextMenu] = useState(null);
    const [showAccounts, setShowAccounts] = useState(true);

    // Filters State
    const [filterType, setFilterType] = useState('All');
    const [filterFirm, setFilterFirm] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    // Close context menu on outside click
    useEffect(() => {
        const handleOutsideClick = () => setContextMenu(null);
        window.addEventListener('mousedown', handleOutsideClick);
        return () => window.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handleReset = async (acc) => {
        const confirmed = await confirm({
            title: 'Reset Account',
            message: 'Are you sure you want to reset this account? This will start a fresh phase.',
            confirmText: 'Reset',
            type: 'danger'
        });

        if (confirmed) {
            const accountToUpdate = { ...acc };
            delete accountToUpdate.stats;

            await updateAccount({
                ...accountToUpdate,
                prev_reset_date: acc.reset_date,
                reset_date: new Date().toISOString(),
                breach_report: null
            });
        }
        setContextMenu(null);
    };

    const handleUndoReset = async (acc) => {
        const accountToUpdate = { ...acc };
        delete accountToUpdate.stats;

        await updateAccount({
            ...accountToUpdate,
            reset_date: acc.prev_reset_date,
            prev_reset_date: null,
            breach_report: null // Clear manual breach too if undoing reset
        });
        setContextMenu(null);
    };

    const handleManualBreach = async (acc) => {
        const confirmed = await confirm({
            title: 'Manual Breach',
            message: 'Are you sure you want to manually mark this account as breached?',
            confirmText: 'Breach',
            type: 'danger'
        });

        if (confirmed) {
            const accountToUpdate = { ...acc };
            delete accountToUpdate.stats;

            await updateAccount({
                ...accountToUpdate,
                breach_report: 'MANUAL_BREACH'
            });
        }
        setContextMenu(null);
    };

    const handleUndoBreach = async (acc) => {
        const accountToUpdate = { ...acc };
        delete accountToUpdate.stats;

        await updateAccount({
            ...accountToUpdate,
            breach_report: null
        });
        setContextMenu(null);
    };

    const onContextMenu = (e, acc) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            acc
        });
    };

    const accountStats = accounts.map(acc => {
        const stats = getAccountStats(acc.id, accounts, filteredTrades);
        return { ...acc, stats };
    })
        .filter(acc => {
            // Apply Type Filter
            if (filterType !== 'All' && acc.type !== filterType) return false;

            // Apply Prop Firm Filter
            if (filterFirm !== 'All' && acc.prop_firm !== filterFirm) return false;

            // Apply Status Filter
            if (filterStatus === 'Active' && acc.stats.isBreached) return false;
            if (filterStatus === 'Breached' && !acc.stats.isBreached) return false;

            return true;
        })
        .sort((a, b) => {
            return (b.stats?.balance || 0) - (a.stats?.balance || 0);
        });

    const activeAccounts = accountStats.filter(a => !a.stats?.isBreached);
    const breachedAccounts = accountStats.filter(a => a.stats?.isBreached);

    const FilterDropdown = ({ label, options, active, onChange, icon }) => {
        const [isOpen, setIsOpen] = useState(false);
        const containerRef = useRef(null);

        useEffect(() => {
            const clickOutside = (e) => {
                if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
            };
            window.addEventListener('mousedown', clickOutside);
            return () => window.removeEventListener('mousedown', clickOutside);
        }, []);

        return (
            <div className="relative" ref={containerRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${active !== 'All'
                        ? 'bg-primary/20 border-primary/40 text-primary'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                >
                    <span className="material-symbols-outlined text-[16px] opacity-70">{icon}</span>
                    <span>{active === 'All' ? label : active}</span>
                    <span className="material-symbols-outlined text-[14px] opacity-40">expand_more</span>
                </button>
                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 z-[100] min-w-[160px] bg-[#0F172A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 animate-in zoom-in slide-in-from-top-2 duration-200">
                        {options.map(opt => (
                            <button
                                key={opt}
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-[11px] font-bold transition-colors ${active === opt ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 relative">
            {/* Compact Filter Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <FilterDropdown
                        label="Type"
                        icon="category"
                        options={['All', 'Evaluation', 'Funded', 'Live', 'Demo', 'Backtesting']}
                        active={filterType}
                        onChange={setFilterType}
                    />
                    <FilterDropdown
                        label="Prop Firm"
                        icon="store"
                        options={['All', ...PROP_FIRMS.map(f => f.name)]}
                        active={filterFirm}
                        onChange={setFilterFirm}
                    />
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        {['All', 'Active', 'Breached'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => setFilterStatus(opt)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === opt
                                    ? (opt === 'Active' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                                        opt === 'Breached' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' :
                                            'bg-white text-slate-900 shadow-sm')
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {(filterType !== 'All' || filterFirm !== 'All' || filterStatus !== 'All') && (
                        <button
                            onClick={() => { setFilterType('All'); setFilterFirm('All'); setFilterStatus('All'); }}
                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                        >
                            Reset
                        </button>
                    )}
                    <button
                        onClick={() => setShowAccounts(!showAccounts)}
                        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {accountStats.length} {accountStats.length === 1 ? 'Account' : 'Accounts'}
                        </span>
                        <span className="material-symbols-outlined text-[18px]">{showAccounts ? 'expand_less' : 'expand_more'}</span>
                    </button>
                </div>
            </div>

            {showAccounts && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-8">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => <SkeletonAccountCard key={i} />)}
                        </div>
                    ) : (
                        <>
                            {activeAccounts.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-5 px-1">Active Accounts ({activeAccounts.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {activeAccounts.map(acc => <AccountCard key={acc.id} acc={acc} onReset={handleReset} onContextMenu={onContextMenu} />)}
                                    </div>
                                </div>
                            )}

                            {breachedAccounts.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500 mb-5 px-1">Breached Accounts ({breachedAccounts.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {breachedAccounts.map(acc => <AccountCard key={acc.id} acc={acc} onReset={handleReset} onContextMenu={onContextMenu} />)}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Empty State: No accounts exist at all */}
            {!isLoading && accounts.length === 0 && (
                <div className="py-24 text-center">
                    <div className="max-w-md mx-auto space-y-6">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                            <div className="relative bg-white/5 w-24 h-24 rounded-3xl flex items-center justify-center border border-white/10 mx-auto">
                                <span className="material-symbols-outlined text-5xl text-primary">account_balance</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-2xl font-black text-white">No Accounts Yet</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Get started by creating your first trading account. Click the <span className="text-primary font-bold">"+ New Trade"</span> button in the top right, then add an account to begin tracking your trades.
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                                <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                                <span className="text-xs font-bold text-slate-400">Accounts are created when adding your first trade</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State: Filtered out all accounts */}
            {!isLoading && accounts.length > 0 && accountStats.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                    <span className="material-symbols-outlined text-5xl text-slate-700 mb-4">search_off</span>
                    <p className="text-slate-500 font-medium">No accounts match your current filters.</p>
                    <button
                        onClick={() => { setFilterType('All'); setFilterFirm('All'); setFilterStatus('All'); }}
                        className="mt-4 text-primary font-bold text-sm hover:underline"
                    >
                        Clear all filters
                    </button>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <SmartPortal coords={{ x: contextMenu.x, y: contextMenu.y }} className="min-w-[180px] bg-[#0f111a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden focus:outline-none">
                    <div className="py-1">
                        {!contextMenu.acc.stats.isBreached && (
                            <button
                                onClick={() => handleManualBreach(contextMenu.acc)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors text-left uppercase tracking-wider"
                            >
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                Manual Breach
                            </button>
                        )}

                        {contextMenu.acc.breach_report === 'MANUAL_BREACH' && (
                            <button
                                onClick={() => handleUndoBreach(contextMenu.acc)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors text-left uppercase tracking-wider"
                            >
                                <span className="material-symbols-outlined text-[18px]">undo</span>
                                Undo Breach
                            </button>
                        )}

                        <button
                            onClick={() => handleReset(contextMenu.acc)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors text-left uppercase tracking-wider"
                        >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                            Reset Account
                        </button>

                        {contextMenu.acc.prev_reset_date && (
                            <button
                                onClick={() => handleUndoReset(contextMenu.acc)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-sky-400 hover:bg-sky-500/10 transition-colors text-left uppercase tracking-wider"
                            >
                                <span className="material-symbols-outlined text-[18px]">history</span>
                                Undo Reset
                            </button>
                        )}
                    </div>
                </SmartPortal>
            )}
        </div>
    );
}
