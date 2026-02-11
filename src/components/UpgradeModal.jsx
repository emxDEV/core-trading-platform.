import React from 'react';

const UpgradeModal = ({ accounts, onClose }) => {
    if (!accounts || accounts.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[300000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="relative w-full max-w-lg">
                {/* Multi-layered Glow Effects */}
                <div className="absolute -inset-20 blur-[100px] opacity-20 bg-primary animate-pulse rounded-full" />
                <div className="absolute -inset-10 blur-[60px] opacity-30 bg-emerald-500 animate-pulse delay-700 rounded-full" />

                <div className="relative bg-[#0F172A]/90 border border-white/10 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in slide-in-from-bottom-12 duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]">

                    {/* Top Animated Header */}
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 via-emerald-500/10 to-transparent flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />

                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-4 transform -rotate-12 animate-in zoom-in spin-in-12 duration-1000">
                                <span className="material-symbols-outlined text-5xl text-emerald-400">celebration</span>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Phase Passed!</h2>
                        </div>

                        {/* Confetti-like particles (CSS only) */}
                        <div className="absolute top-4 left-10 w-2 h-2 bg-primary rounded-full animate-ping" />
                        <div className="absolute bottom-10 right-20 w-3 h-3 bg-emerald-400 rounded-full animate-ping delay-300" />
                        <div className="absolute top-20 right-10 w-2 h-2 bg-amber-400 rounded-full animate-ping delay-700" />
                    </div>

                    <div className="p-10">
                        <p className="text-slate-400 text-center font-bold text-sm mb-8 tracking-wide">
                            The following {accounts.length === 1 ? 'account has' : 'accounts have'} successfully reached the profit target and {accounts.length === 1 ? 'was' : 'were'} upgraded to Funded status!
                        </p>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto px-2 custom-scrollbar">
                            {accounts.map((acc, index) => (
                                <div
                                    key={acc.id}
                                    className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl animate-in slide-in-from-left-8 duration-700"
                                    style={{ animationDelay: `${index * 150}ms` }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-emerald-400">workspace_premium</span>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-white tracking-tight leading-none mb-1">{acc.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest line-through">Evaluation</span>
                                                <span className="material-symbols-outlined text-[12px] text-slate-600">arrow_forward</span>
                                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Funded</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Status</div>
                                        <div className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">Passed</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full mt-10 py-5 bg-white text-slate-950 font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-emerald-400 hover:scale-[1.02] transition-all duration-300 shadow-2xl active:scale-95 group"
                        >
                            <span className="flex items-center justify-center gap-2">
                                Keep Trading
                                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">trending_up</span>
                            </span>
                        </button>
                    </div>

                    {/* Progress Bar like line at the bottom */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
