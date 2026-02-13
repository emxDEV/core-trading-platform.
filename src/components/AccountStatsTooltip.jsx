import React from 'react';
import { SmartPortal } from '../utils/uiUtils';
import { PROP_FIRMS, TYPE_COLORS } from '../constants/firms';

const AccountStatsTooltip = ({ hoveredAccount, accounts, trades, getAccountStats }) => {
    if (!hoveredAccount) return null;
    const stats = getAccountStats(hoveredAccount.acc.id, accounts, trades);
    if (!stats) return null;
    const { acc, balance, mll, target, drawdownRemaining, remainingToTarget, consistencyValid, failingDay, updatedTarget, updatedRemainingToTarget } = stats;
    const isEvaluation = acc.type === 'Evaluation';
    const isFunded = acc.type === 'Funded';
    const isEvalFunded = isEvaluation; // Progress bar only for Eval

    const tempTarget = (consistencyValid ?? true) ? target : (updatedTarget ?? target);
    const range = isEvalFunded ? (tempTarget - mll) : (acc.capital * 0.2);
    const displayMin = isEvalFunded ? mll : (acc.capital - range / 2);
    const displayMax = isEvalFunded ? tempTarget : (acc.capital + range / 2);
    const getPos = (val) => Math.min(Math.max(((val - displayMin) / (displayMax - displayMin)) * 100, 0), 100);

    const startPos = getPos(acc.capital);
    const balancePos = getPos(balance);

    return (
        <SmartPortal coords={{ x: hoveredAccount.x, y: hoveredAccount.y }} className="pointer-events-none z-[2000]">
            <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[2.5rem] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] min-w-[500px] relative overflow-hidden">
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-3">
                            {acc.prop_firm && PROP_FIRMS.find(f => f.name === acc.prop_firm) ? (
                                <img src={PROP_FIRMS.find(f => f.name === acc.prop_firm).logo} alt="" className={`w-10 h-10 object-cover shadow-lg ${PROP_FIRMS.find(f => f.name === acc.prop_firm)?.className || 'rounded-xl'}`} />
                            ) : (
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TYPE_COLORS[acc.type]?.active || 'bg-primary/20 text-primary'}`}>
                                    <span className="material-symbols-outlined text-[20px]">account_balance</span>
                                </div>
                            )}
                            <div>
                                <h3 className="text-white font-black text-lg leading-none mb-1 uppercase tracking-tight">{acc.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[acc.type]?.dot || 'bg-primary'}`}></span>
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{acc.is_ranked_up ? 'Eval -> Funded' : acc.type}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 flex flex-col items-end backdrop-blur-md">
                            <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Consistency Status</span>
                            <span className={`text-[10px] font-black tracking-widest ${consistencyValid === null ? 'text-slate-400' : consistencyValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {consistencyValid === null
                                    ? 'NOT REQUIRED'
                                    : consistencyValid
                                        ? `OPERATIONAL (${acc.consistency_rule}%)`
                                        : `BREACHED (${acc.consistency_rule}%)`}
                            </span>
                        </div>
                    </div>

                    {isEvalFunded ? (
                        <div className="space-y-8">
                            <div className="relative pt-8 pb-4">
                                <div className="h-2 w-full bg-white/5 rounded-full relative overflow-hidden border border-white/5">
                                    <div
                                        className={`absolute h-full transition-all duration-1000 ease-out ${balance >= acc.capital ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]'}`}
                                        style={{
                                            left: `${Math.min(startPos, balancePos)}%`,
                                            width: `${Math.abs(balancePos - startPos)}%`
                                        }}
                                    ></div>

                                    {consistencyValid === false && (
                                        <div
                                            className="absolute h-full bg-amber-400/20 border-l border-amber-400/50"
                                            style={{
                                                left: `${getPos(target)}%`,
                                                width: `${100 - getPos(target)}%`
                                            }}
                                        ></div>
                                    )}
                                </div>

                                <div className="absolute top-0 flex flex-col items-center" style={{ left: `${startPos}%`, transform: 'translateX(-50%)' }}>
                                    <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-2">Deployed</span>
                                    <div className="h-5 w-[2px] bg-slate-500/40"></div>
                                </div>

                                <div className="absolute top-[36px] flex flex-col items-center" style={{ left: `${balancePos}%`, transform: 'translateX(-50%)' }}>
                                    <div className="h-5 w-[2px] bg-white shadow-[0_0_10px_white]"></div>
                                </div>

                                <div className="absolute top-[30px] w-full flex justify-between px-0.5 pointer-events-none">
                                    <div className="flex flex-col">
                                        <span className="text-rose-400 font-black text-[13px] tabular-nums tracking-tighter">${mll.toLocaleString()}</span>
                                        <span className="text-slate-600 text-[8px] font-black uppercase tracking-widest">Breach Level</span>
                                    </div>
                                    <div className="flex flex-col items-end relative">
                                        {!consistencyValid && (
                                            <div className="absolute right-[110%] top-0 flex flex-col items-end opacity-30">
                                                <span className="text-slate-500 font-black text-[10px] tabular-nums line-through decoration-slate-400 decoration-2">${target.toLocaleString()}</span>
                                                <span className="text-slate-700 text-[7px] font-black uppercase tracking-widest leading-none mt-0.5">ORIGINAL</span>
                                            </div>
                                        )}
                                        <span className={`${(consistencyValid ?? true) ? 'text-emerald-400' : 'text-amber-400'} font-black text-[13px] tabular-nums tracking-tighter`}>
                                            ${((consistencyValid ?? true) ? target : (updatedTarget ?? target))?.toLocaleString() ?? '0'}
                                        </span>
                                        <span className={`${(consistencyValid ?? true) ? 'text-slate-600' : 'text-amber-500/60'} text-[8px] font-black uppercase tracking-widest`}>
                                            {(consistencyValid ?? true) ? 'Extraction Target' : 'Corrected Target'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 pt-6 border-t border-white/5 gap-4">
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col">
                                    <span className="text-white font-black text-sm tabular-nums tracking-tighter">${drawdownRemaining.toLocaleString()}</span>
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Drawdown</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col items-center">
                                    <span className="text-white font-black text-lg tabular-nums tracking-tighter">${balance.toLocaleString()}</span>
                                    <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Active Balance</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col items-end">
                                    <span className={`font-black text-sm tabular-nums tracking-tighter ${(consistencyValid ?? true) ? 'text-white' : 'text-amber-400'}`}>
                                        {((consistencyValid ?? true) ? remainingToTarget : (updatedRemainingToTarget ?? remainingToTarget)) > 0
                                            ? `$${((consistencyValid ?? true) ? remainingToTarget : (updatedRemainingToTarget ?? remainingToTarget))?.toLocaleString() ?? '0'}`
                                            : '$0'
                                        }
                                    </span>
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Distance</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1">Base Capital</span>
                                    <span className="text-white font-black text-xl tracking-tighter">${acc.capital?.toLocaleString()}</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1">Net Performance</span>
                                    <span className={`font-black text-xl tracking-tighter ${balance >= acc.capital ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {balance >= acc.capital ? '+' : ''}${(balance - acc.capital).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {isFunded && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                        <span className="text-rose-400/80 text-[9px] font-black uppercase tracking-widest block mb-1">Termination Point (MLL)</span>
                                        <span className="text-rose-400 font-black text-xl tracking-tighter">${mll.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                        <span className="text-emerald-400/80 text-[9px] font-black uppercase tracking-widest block mb-1">Operational Cushion</span>
                                        <span className="text-emerald-400 font-black text-xl tracking-tighter">${drawdownRemaining.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {isFunded && acc.payout_goal > 0 && (
                                <div className="bg-white/5 rounded-[2rem] p-6 border border-primary/30 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-primary/5 opacity-50" />
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <span className="text-primary/80 text-[9px] font-black uppercase tracking-widest block mb-1">Extraction Goal</span>
                                                <span className="text-primary font-black text-xl tracking-tighter">${acc.payout_goal.toLocaleString()}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1">Current Payout Delta</span>
                                                <span className={`font-black text-xl tracking-tighter ${(balance - acc.capital) >= acc.payout_goal ? 'text-emerald-400' : 'text-white'}`}>
                                                    ${Math.max(0, balance - acc.capital).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                            <div
                                                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${(balance - acc.capital) >= acc.payout_goal
                                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                                    : 'bg-gradient-to-r from-primary to-primary-light shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                                                    }`}
                                                style={{ width: `${Math.min(100, ((balance - acc.capital) / acc.payout_goal) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                                Deployment: {Math.min(100, Math.round(((balance - acc.capital) / acc.payout_goal) * 100))}%
                                            </span>
                                            {(balance - acc.capital) >= acc.payout_goal && (
                                                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.1em] flex items-center gap-1.5 animate-pulse">
                                                    <span className="material-symbols-outlined text-[14px]">verified</span>
                                                    Goal Reached
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col items-center py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Absolute Fleet Balance</span>
                                <span className="text-white font-black text-3xl tabular-nums tracking-tighter drop-shadow-glow">${balance.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SmartPortal>
    );
};

export default AccountStatsTooltip;
