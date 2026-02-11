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
        <SmartPortal coords={{ x: hoveredAccount.x, y: hoveredAccount.y }} className="pointer-events-none">
            <div className="bg-[#0f111a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl min-w-[500px]">
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
                            <h3 className="text-white font-bold text-lg leading-none mb-1">{acc.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[acc.type]?.dot || 'bg-primary'}`}></span>
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{acc.is_ranked_up ? 'Eval -> Funded' : acc.type}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/5 flex flex-col items-end">
                        <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-0.5">Consistency</span>
                        <span className={`text-[10px] font-black tracking-widest ${consistencyValid === null ? 'text-slate-400' : consistencyValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {consistencyValid === null
                                ? 'NONE'
                                : consistencyValid
                                    ? `VALID (${acc.consistency_rule}%)`
                                    : `BREACHED (${acc.consistency_rule}%)`}
                        </span>
                    </div>
                </div>

                {isEvalFunded ? (
                    <div className="space-y-8">
                        <div className="relative pt-8 pb-4">
                            <div className="h-1.5 w-full bg-white/5 rounded-full relative overflow-hidden">
                                <div
                                    className={`absolute h-full transition-all duration-700 ease-out ${balance >= acc.capital ? 'bg-gradient-to-r from-emerald-500/50 to-emerald-400 shadow-[0_0_15px_#10b98160]' : 'bg-gradient-to-r from-rose-600 to-rose-400/50 shadow-[0_0_15px_#f43f5e60]'}`}
                                    style={{
                                        left: `${Math.min(startPos, balancePos)}%`,
                                        width: `${Math.abs(balancePos - startPos)}%`
                                    }}
                                ></div>

                                {consistencyValid === false && (
                                    <div
                                        className="absolute h-full bg-amber-400/30 border-l border-amber-400/50"
                                        style={{
                                            left: `${getPos(target)}%`,
                                            width: `${100 - getPos(target)}%`
                                        }}
                                    ></div>
                                )}
                            </div>

                            <div className="absolute top-0 flex flex-col items-center" style={{ left: `${startPos}%`, transform: 'translateX(-50%)' }}>
                                <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-2">START</span>
                                <div className="h-4 w-[2px] bg-slate-500/40"></div>
                            </div>

                            <div className="absolute top-[34px] flex flex-col items-center" style={{ left: `${balancePos}%`, transform: 'translateX(-50%)' }}>
                                <div className="h-4 w-[2px] bg-white"></div>
                            </div>

                            <div className="absolute top-[28px] w-full flex justify-between px-0.5 pointer-events-none">
                                <div className="flex flex-col">
                                    <span className="text-rose-400 font-black text-[12px] tabular-nums">${mll.toLocaleString()}</span>
                                    <span className="text-slate-600 text-[8px] font-black uppercase tracking-widest">MLL</span>
                                </div>
                                <div className="flex flex-col items-end relative">
                                    {!consistencyValid && (
                                        <div className="absolute right-[110%] top-0 flex flex-col items-end opacity-50">
                                            <span className="text-slate-500 font-black text-[10px] tabular-nums line-through decoration-slate-400 decoration-2">${target.toLocaleString()}</span>
                                            <span className="text-slate-700 text-[7px] font-black uppercase tracking-widest leading-none mt-0.5">ORIGINAL</span>
                                        </div>
                                    )}
                                    <span className={`${(consistencyValid ?? true) ? 'text-emerald-400' : 'text-amber-400'} font-black text-[12px] tabular-nums`}>
                                        ${((consistencyValid ?? true) ? target : (updatedTarget ?? target))?.toLocaleString() ?? '0'}
                                    </span>
                                    <span className={`${(consistencyValid ?? true) ? 'text-slate-600' : 'text-amber-500/60'} text-[8px] font-black uppercase tracking-widest`}>
                                        {(consistencyValid ?? true) ? 'Target' : 'Corrected Target'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 pt-6 border-t border-white/5">
                            <div className="flex flex-col">
                                <span className="text-white font-black text-sm tabular-nums">${drawdownRemaining.toLocaleString()}</span>
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">drawdown</span>
                            </div>
                            <div className="flex flex-col items-center translate-y-[-4px]">
                                <span className="text-white font-black text-xl tabular-nums">${balance.toLocaleString()}</span>
                                <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">balance</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`font-black text-sm tabular-nums ${(consistencyValid ?? true) ? 'text-white' : 'text-amber-400'}`}>
                                    {((consistencyValid ?? true) ? remainingToTarget : (updatedRemainingToTarget ?? remainingToTarget)) > 0
                                        ? `$${((consistencyValid ?? true) ? remainingToTarget : (updatedRemainingToTarget ?? remainingToTarget))?.toLocaleString() ?? '0'}`
                                        : '$0'
                                    }
                                </span>
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">remaining</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1">Initial Balance</span>
                                <span className="text-white font-black text-lg">${acc.capital?.toLocaleString()}</span>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1">Total P&L Since Reset</span>
                                <span className={`font-black text-lg ${balance >= acc.capital ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {balance >= acc.capital ? '+' : ''}${(balance - acc.capital).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {isFunded && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1 text-rose-400/80">Max Loss Limit (MLL)</span>
                                    <span className="text-rose-400 font-black text-lg">${mll.toLocaleString()}</span>
                                </div>
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1 text-emerald-400/80">Drawdown Remaining</span>
                                    <span className="text-emerald-400 font-black text-lg">${drawdownRemaining.toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        {isFunded && acc.payout_goal > 0 && (
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-primary/20">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1 text-primary/80">Payout Goal</span>
                                        <span className="text-primary font-black text-lg">${acc.payout_goal.toLocaleString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-1">Progress</span>
                                        <span className={`font-black text-lg ${(balance - acc.capital) >= acc.payout_goal ? 'text-emerald-400' : 'text-primary'}`}>
                                            ${Math.max(0, balance - acc.capital).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${(balance - acc.capital) >= acc.payout_goal
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                            : 'bg-gradient-to-r from-primary to-primary-light'
                                            }`}
                                        style={{ width: `${Math.min(100, ((balance - acc.capital) / acc.payout_goal) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[9px] text-slate-500 font-bold">
                                        {Math.min(100, Math.round(((balance - acc.capital) / acc.payout_goal) * 100))}% Complete
                                    </span>
                                    {(balance - acc.capital) >= acc.payout_goal && (
                                        <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                            Goal Reached!
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col items-center py-2 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-lg">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Current Balance</span>
                            <span className="text-white font-black text-2xl tabular-nums">${balance.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>
        </SmartPortal>
    );
};

export default AccountStatsTooltip;
