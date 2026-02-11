import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/TradeContext';
import { useNotifications } from '../../context/NotificationContext';
import CurrencyInput from '../CurrencyInput';
import { PROP_FIRMS } from '../../constants/firms';
import { soundEngine } from '../../utils/SoundEngine';

export const CelebrationModal = ({ data, onClose }) => {
    const { updateAccount } = useData();
    const [step, setStep] = useState(0);
    const [isSettingUp, setIsSettingUp] = useState(false);

    // Queue Management
    const events = data.events || [data];
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentEvent = events[currentIndex];

    const [fundedCapital, setFundedCapital] = useState('');
    const [fundedTarget, setFundedTarget] = useState('');
    const [fundedMaxLoss, setFundedMaxLoss] = useState('');
    const [fundedConsistency, setFundedConsistency] = useState('');
    const [shouldResetBalance, setShouldResetBalance] = useState(false);

    // Reset state when switching accounts
    useEffect(() => {
        setStep(0);
        setIsSettingUp(false);
        setFundedCapital(currentEvent?.account?.capital || '');
        setFundedTarget(currentEvent?.type === 'RANK_UP' ? '' : currentEvent?.account?.profit_target || '');
        setFundedMaxLoss(currentEvent?.account?.max_loss || '');
        setFundedConsistency(currentEvent?.account?.consistency_rule || '');
        setShouldResetBalance(currentEvent?.type === 'RANK_UP' ? true : false);

        // Restart animation
        setTimeout(() => setStep(1), 50);
    }, [currentIndex, currentEvent]);

    // Inject Cinematic Styles
    useEffect(() => {
        const styleId = 'celebration-animations';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    33% { transform: translateY(-30px) translateX(20px); }
                    66% { transform: translateY(-15px) translateX(-20px); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-200%) skewX(-35deg); }
                    100% { transform: translateX(200%) skewX(-35deg); }
                }
                @keyframes glory-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.3; filter: blur(40px); }
                    50% { transform: scale(1.2); opacity: 0.6; filter: blur(60px); }
                }
                @keyframes success-burst {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(3); opacity: 0; }
                }
                @keyframes scale-bounce {
                    0% { transform: scale(0.8); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                @keyframes vibrate {
                    0%, 100% { transform: translate(0); }
                    20% { transform: translate(-2px, 2px); }
                    40% { transform: translate(-2px, -2px); }
                    60% { transform: translate(2px, 2px); }
                    80% { transform: translate(2px, -2px); }
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    useEffect(() => {
        if (!currentEvent) return;

        // Cinematic Sequence with Sound
        const timer1 = setTimeout(() => {
            setStep(1);
            soundEngine.playTransition();
        }, 50);   // Entrance

        const timer2 = setTimeout(() => {
            setStep(2);
            // Subtle build-up tick
            soundEngine.playPop(300, 0.05, 0.1);
        }, 800);  // Evaluation Pulse

        const timer3 = setTimeout(() => {
            setStep(3);
            // The Big Moment - Success Chord
            soundEngine.playSuccess();
        }, 1800); // The "Flash" Swap to Funded

        const timer4 = setTimeout(() => setStep(4), 2800); // Stats Stagger 1
        const timer5 = setTimeout(() => setStep(5), 3000); // Stats Stagger 2 + Button

        return () => {
            [timer1, timer2, timer3, timer4, timer5].forEach(clearTimeout);
        };
    }, [currentEvent, currentIndex]); // Re-run on index change is handled by upper effect mostly, but safely here too

    if (!currentEvent) return null;
    const { account, oldStats, newStats, type } = currentEvent;
    const firm = account.prop_firm ? PROP_FIRMS.find(f => f.name === account.prop_firm) : null;
    const isLast = currentIndex === events.length - 1;

    const handleComplete = async (setupData) => {
        if (setupData) {
            await updateAccount({
                ...account,
                ...setupData
            });
        }

        if (isLast) {
            onClose();
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    if (isSettingUp) {
        return createPortal(
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-xl" />
                <div className="relative w-full max-w-lg bg-white dark:bg-surface-dark border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
                    <div className="p-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                <span className="material-symbols-outlined text-cyan-400">payments</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white">{type === 'RANK_UP' ? 'Funded Setup' : 'Payout & Reset'}</h3>
                                <p className="text-slate-400 text-sm">
                                    {type === 'RANK_UP' ? 'Configure your new funded parameters' : 'Confirm your payout and reset parameters'}
                                    {events.length > 1 && <span className="block text-cyan-400 mt-1 font-bold uppercase tracking-wider text-[10px]">Processing Account {currentIndex + 1} of {events.length}</span>}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {type === 'TARGET_HIT' && (
                                <div className="flex gap-2 p-1 bg-slate-900/50 rounded-2xl border border-white/5 mb-2">
                                    <button
                                        onClick={() => {
                                            setShouldResetBalance(false);
                                            setFundedCapital(account.capital); // Keep original capital setting
                                        }}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!shouldResetBalance ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Update Target Only
                                    </button>
                                    <button
                                        onClick={() => setShouldResetBalance(true)}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${shouldResetBalance ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Withdraw & Reset
                                    </button>
                                </div>
                            )}

                            {(shouldResetBalance || type === 'RANK_UP') && (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">
                                        {type === 'RANK_UP' ? 'New Starting Capital' : 'Reset Capital to'}
                                    </label>
                                    <CurrencyInput
                                        value={fundedCapital}
                                        onChange={setFundedCapital}
                                        placeholder="e.g. 100,000"
                                        className="w-full bg-white dark:bg-background-dark border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white font-bold"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-2 italic">Balance will be reset to this amount</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2 block">Payout Goal ($)</label>
                                    <CurrencyInput
                                        value={fundedTarget}
                                        onChange={setFundedTarget}
                                        placeholder="e.g. 5,000"
                                        className="w-full bg-white dark:bg-background-dark border border-primary/20 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2 block">Max Loss ($)</label>
                                    <CurrencyInput
                                        value={fundedMaxLoss}
                                        onChange={setFundedMaxLoss}
                                        placeholder="e.g. 5,000"
                                        className="w-full bg-white dark:bg-background-dark border border-rose-500/20 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-white font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 mb-2 block">Consistency Rule (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={fundedConsistency}
                                        onChange={(e) => setFundedConsistency(e.target.value)}
                                        placeholder="e.g. 50"
                                        className="w-full bg-white dark:bg-background-dark border border-amber-500/20 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-white font-bold"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-amber-400 font-bold">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-10">
                            <button
                                onClick={onClose}
                                className="flex-1 py-5 bg-slate-800 text-slate-400 font-black rounded-[2rem] hover:bg-slate-700 transition-all border border-white/5 active:scale-95 text-xs uppercase tracking-widest"
                            >
                                Cancel All
                            </button>
                            <button
                                onClick={() => {
                                    handleComplete({
                                        capital: parseFloat(fundedCapital) || account.capital,
                                        profit_target: 0,
                                        payout_goal: parseFloat(fundedTarget) || 0,
                                        max_loss: parseFloat(fundedMaxLoss) || 0,
                                        consistency_rule: fundedConsistency,
                                        type: 'Funded',
                                        is_ranked_up: true,
                                        reset_date: (shouldResetBalance || type === 'RANK_UP') ? new Date().toISOString() : account.reset_date
                                    });
                                }}
                                className="flex-[2] py-5 bg-cyan-500 text-white font-black rounded-[2rem] hover:bg-cyan-400 transition-all shadow-[0_0_40px_rgba(6,182,212,0.2)] active:scale-95 text-xs uppercase tracking-widest"
                            >
                                {isLast
                                    ? (type === 'RANK_UP' ? 'Start Funded Phase' : 'Confirm Reset')
                                    : 'Confirm & Next Account →'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 overflow-hidden">
            {/* Immersive Backdrop */}
            <div
                className={`absolute inset-0 bg-[#020617] transition-all duration-1000 ${step > 0 ? 'bg-opacity-95 backdrop-blur-3xl' : 'bg-opacity-0 backdrop-blur-0'}`}
                onClick={onClose}
            >
                {/* Screen Vibration during Swap */}
                <div className={`absolute inset-0 transition-transform ${step === 3 ? 'animate-[vibrate_0.3s_linear_infinite]' : ''}`} />

                {/* Cosmic Particles & Light Rays */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--color-primary-rgb),0.2),transparent_70%)] transition-opacity duration-1000 ${step >= 3 ? 'opacity-100' : 'opacity-40'}`} />

                    {/* Big Flare at Step 3 */}
                    <div className={`absolute inset-0 bg-white transition-all duration-700 pointer-events-none mix-blend-overlay ${step === 3 ? 'opacity-40 scale-100' : 'opacity-0 scale-50'}`} />

                    {[...Array(40)].map((_, i) => (
                        <div
                            key={i}
                            className={`absolute bg-white/20 rounded-full transition-all duration-[3000ms] ease-out ${step > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
                            style={{
                                width: Math.random() * 3 + 1 + 'px',
                                height: Math.random() * 3 + 1 + 'px',
                                left: Math.random() * 100 + '%',
                                top: Math.random() * 100 + '%',
                                filter: i % 2 === 0 ? 'blur(1px)' : 'none',
                                boxShadow: `0 0 20px ${i % 3 === 0 ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.4)'}`,
                                animation: `float ${Math.random() * 10 + 10}s infinite linear`,
                                animationDelay: `-${Math.random() * 20}s`
                            }}
                        />
                    ))}
                    {/* Dynamic Light Rays */}
                    {step >= 3 && (
                        <div className="absolute inset-0 mix-blend-screen opacity-20 animate-in fade-in duration-2000">
                            <div className="absolute inset-x-0 top-0 h-full bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(34,211,238,0.1)_180deg,transparent_360deg)] animate-[spin_20s_linear_infinite]" />
                        </div>
                    )}
                </div>
            </div>

            <div className={`relative w-full max-w-2xl transition-all duration-1000 transform ${step > 0 ? 'scale-100 opacity-100' : 'scale-90 opacity-0 translate-y-12'}`}>

                {/* Advanced Glass Container */}
                <div className="relative bg-[#0F172A]/40 border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden">

                    {/* Inner Highlights */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-primary/5 pointer-events-none" />
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {/* Shine Swipe */}
                    <div className={`absolute top-0 left-[-150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent skew-x-[-35deg] transition-all duration-[1500ms] ${step >= 1 ? 'left-[150%]' : ''}`} />

                    <div className="p-12 text-center relative z-10">
                        {/* Milestone Badge */}
                        <div className={`mb-10 flex justify-center transition-all duration-1000 ${step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <div className="relative group">
                                <div className="absolute inset-0 bg-emerald-500/40 blur-3xl rounded-full scale-150 animate-pulse" />
                                <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 flex items-center justify-center border border-emerald-400/30 relative z-10 shadow-inner">
                                    <span className={`material-symbols-outlined text-[56px] text-emerald-400 transition-transform duration-500 ${step >= 2 ? 'scale-110' : ''}`}>
                                        workspace_premium
                                    </span>
                                </div>
                            </div>
                        </div>

                        <h2 className={`text-5xl font-black tracking-tight text-white mb-3 transition-all duration-1000 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                            {type === 'RANK_UP' ? 'Milestone Cleared' : 'Payout Goal Hit'}
                        </h2>

                        {/* Multi-account progress indicator */}
                        {events.length > 1 && (
                            <div className="flex justify-center gap-2 mb-4">
                                {events.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-white' : i < currentIndex ? 'w-2 bg-emerald-500' : 'w-2 bg-white/10'}`}
                                    />
                                ))}
                            </div>
                        )}

                        <p className={`text-slate-400 font-medium text-lg mb-14 transition-all duration-1000 delay-100 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                            {type === 'RANK_UP' ? (
                                <>Great job! You've successfully outperformed for <span className="text-emerald-400 font-bold">{account.name}</span></>
                            ) : (
                                <>Outstanding performance! You've hit your payout target on <span className="text-amber-400 font-bold">{account.name}</span></>
                            )}
                        </p>

                        {/* RANK UP ANIMATION AREA */}
                        <div className="relative h-40 flex items-center justify-center mb-16">

                            {/* Evaluation Badge (Disappearing - Camera Zoom Effect) */}
                            <div className={`absolute transition-all duration-700 ease-in-out flex flex-col items-center ${step === 1 || step === 2 ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-[4] blur-2xl'}`}>
                                <div className={`px-10 py-3 rounded-2xl border ${type === 'RANK_UP' ? 'border-amber-500/40 bg-amber-500/5 text-amber-500' : 'border-cyan-500/40 bg-cyan-500/5 text-cyan-400'} font-black tracking-[0.4em] text-sm shadow-[0_0_40px_rgba(245,158,11,0.1)] transition-all duration-1000 ${step === 2 ? 'scale-110 shadow-[0_0_60px_rgba(245,158,11,0.3)] bg-amber-500/10' : ''}`}>
                                    {type === 'RANK_UP' ? 'EVALUATION' : 'FUNDED'}
                                </div>
                            </div>

                            {/* Impact Effect during Swap */}
                            {step === 3 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-1 bg-white animate-out fade-out zoom-out duration-1000 shadow-[0_0_150px_white]" />
                                    <div className={`absolute w-60 h-60 ${type === 'RANK_UP' ? 'bg-cyan-400/60' : 'bg-emerald-400/60'} rounded-full animate-[success-burst_0.8s_ease-out_forwards]`} />
                                </div>
                            )}

                            {/* Funded Badge (Appearing with Glory) */}
                            <div className={`absolute transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-center ${step >= 3 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-50 translate-y-20'}`}>
                                <div className="relative">
                                    {/* Glory Glow */}
                                    <div className={`absolute inset-[-40px] ${type === 'RANK_UP' ? 'bg-cyan-400/40' : 'bg-emerald-400/40'} rounded-full animate-[glory-pulse_3s_infinite]`} />

                                    <div className={`px-16 py-8 rounded-[2.5rem] border-2 ${type === 'RANK_UP' ? 'border-cyan-300 bg-cyan-400/20 shadow-[0_0_80px_rgba(34,211,238,0.5),inset_0_0_30px_rgba(255,255,255,0.2)]' : 'border-emerald-300 bg-emerald-400/20 shadow-[0_0_80px_rgba(52,211,153,0.5),inset_0_0_30px_rgba(255,255,255,0.2)]'} text-white text-4xl font-black tracking-[0.3em] relative overflow-hidden uppercase backdrop-blur-md`}>
                                        {type === 'RANK_UP' ? 'FUNDED' : 'PAYOUT'}
                                        {/* Animated inner line */}
                                        <div className="absolute inset-x-0 bottom-0 top-0 w-4 h-full bg-white/30 blur-xl animate-[shimmer_2.5s_infinite]" />
                                    </div>
                                    <div className={`absolute -top-4 -right-4 w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] animate-[scale-bounce_0.6s_ease-out_forwards]`}>
                                        <span className={`material-symbols-outlined ${type === 'RANK_UP' ? 'text-cyan-500' : 'text-emerald-500'} text-xl font-black leading-none`}>check</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-1 mt-8">
                                    <span className={`text-[12px] font-black ${type === 'RANK_UP' ? 'text-cyan-400' : 'text-emerald-400'} tracking-[0.6em] transition-all duration-700 ${step >= 3 ? 'opacity-100 tracking-[1.2em]' : 'opacity-0'}`}>
                                        {type === 'RANK_UP' ? 'LEVEL UP' : 'REWARD UNLOCKED'}
                                    </span>
                                    <div className={`h-px bg-gradient-to-r from-transparent ${type === 'RANK_UP' ? 'via-cyan-400/50' : 'via-emerald-400/50'} to-transparent transition-all duration-1000 delay-300 ${step >= 3 ? 'w-48 opacity-100' : 'w-0 opacity-0'}`} />
                                </div>
                            </div>
                        </div>

                        {/* Performance Details - Staggered Slide In */}
                        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                            <div className={`bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 text-left transition-all duration-700 ${step >= 4 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] block mb-2">PROFIT GENERATED</span>
                                <div className="flex items-end gap-2">
                                    <span className="text-emerald-400 text-3xl font-black">${newStats.totalPnL.toLocaleString()}</span>
                                    <div className="mb-1 bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-400">
                                        <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
                                    </div>
                                </div>
                            </div>
                            <div className={`bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 text-left transition-all duration-700 delay-100 ${step >= 4 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] block mb-2">CLOSING BALANCE</span>
                                <span className="text-white text-3xl font-black">${newStats.balance.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className={`mt-14 space-y-8 transition-all duration-1000 ${step >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <button
                                onClick={() => {
                                    if (type === 'RANK_UP' || type === 'TARGET_HIT') setIsSettingUp(true);
                                    else handleComplete();
                                }}
                                className="group relative w-full inline-flex items-center justify-center px-8 py-6 font-black text-black transition-all duration-200 bg-white hover:bg-slate-100 rounded-[2rem] shadow-xl hover:shadow-white/20 active:scale-[0.98]"
                            >
                                <span className="relative z-10 flex items-center gap-3 text-lg lowercase first-letter:uppercase">
                                    {type === 'RANK_UP' ? 'Activate Funded Account' :
                                        type === 'TARGET_HIT' ? 'Payout & Reset Account' : 'Continue Adventure'}
                                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward_ios</span>
                                </span>
                            </button>

                            {(type === 'RANK_UP' || type === 'TARGET_HIT') && (
                                <button
                                    onClick={() => handleComplete(null)}
                                    className="w-full py-2 text-slate-500 font-bold hover:text-slate-300 transition-colors uppercase tracking-[0.3em] text-[10px]"
                                >
                                    Just Continue (No Effect)
                                </button>
                            )}

                            {firm && (
                                <div className="flex items-center justify-center gap-4 opacity-50 hover:opacity-100 transition-opacity">
                                    <img src={firm.logo} alt="" className={`w-8 h-8 object-cover grayscale brightness-200 ${firm?.className || 'rounded-xl'}`} />
                                    <div className="flex flex-col items-start translate-y-0.5">
                                        <span className="text-[9px] font-black text-white/40 tracking-[0.3em] uppercase leading-none mb-1">Authenticated by</span>
                                        <span className="text-white text-[11px] font-black tracking-widest">{firm.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const BreachModal = ({ data, onClose }) => {
    const { updateAccount } = useData();
    const [step, setStep] = useState(0);
    const [report, setReport] = useState('');

    // Queue Management
    const events = data.events || [data];
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentEvent = events[currentIndex];

    // Reset state for next account
    useEffect(() => {
        setStep(0);
        setReport('');

        // Restart animation sequence
        const timer1 = setTimeout(() => {
            setStep(1);
            soundEngine.playError(); // Low thud for breach
        }, 50);

        const timer2 = setTimeout(() => {
            setStep(2);
            // Optional: Glass crack sound if available, otherwise mute or faint tick
            soundEngine.playPop(100, 0.1, 0.4);
        }, 1500); // Shard collapse

        const timer3 = setTimeout(() => setStep(3), 2500); // Show report field
        return () => [timer1, timer2, timer3].forEach(clearTimeout);
    }, [currentIndex, currentEvent]);

    if (!currentEvent) return null;
    const { account, oldStats, newStats } = currentEvent;
    const isLast = currentIndex === events.length - 1;

    const handleComplete = async () => {
        if (report) {
            await updateAccount({
                ...account,
                breach_report: report
            });
        }

        if (isLast) {
            onClose();
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
            <div className={`absolute inset-0 bg-slate-950/90 backdrop-blur-xl transition-opacity duration-1000 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`} />

            <div className={`relative w-full max-w-2xl transform transition-all duration-1000 ease-out ${step >= 1 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                <div className="text-center space-y-8">
                    <div className="relative flex justify-center py-6">
                        <div className={`absolute inset-0 bg-rose-500/20 blur-[120px] rounded-full transition-all duration-1000 ${step >= 2 ? 'opacity-40 animate-pulse' : 'opacity-0'}`} />
                        <div className={`transition-all duration-700 ${step >= 1 ? 'scale-100' : 'scale-150 opacity-0'}`}>
                            <div className="relative group">
                                <span className={`material-symbols-outlined text-[100px] text-rose-500/30 font-thin transition-all duration-1000 ${step >= 2 ? 'rotate-12 blur-sm scale-90' : ''}`}>
                                    account_balance_wallet
                                </span>
                                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                                    <span className="material-symbols-outlined text-[70px] text-rose-500 font-bold animate-in zoom-in spin-in-12 duration-700">
                                        heart_broken
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className={`text-5xl sm:text-7xl font-black text-white transition-all duration-1000 delay-300 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            BREACHED
                        </h2>
                        <div className={`flex flex-col items-center gap-2 transition-all duration-1000 delay-500 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                            <p className="text-rose-400 font-bold tracking-[0.3em] uppercase">
                                Account Limits Exceeded
                            </p>
                            {/* Multi-account progress indicator */}
                            {events.length > 1 && (
                                <div className="flex justify-center gap-2 mt-2">
                                    {events.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-white' : i < currentIndex ? 'w-2 bg-rose-500' : 'w-2 bg-white/10'}`}
                                        />
                                    ))}
                                </div>
                            )}
                            {events.length > 1 && <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reviewing Account {currentIndex + 1} of {events.length}: {account.name}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className={`bg-rose-500/10 border border-rose-500/20 rounded-[2rem] p-8 transition-all duration-1000 delay-700 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <div className="space-y-1">
                                <span className="text-rose-300/60 text-[10px] font-black uppercase tracking-widest">Final Balance</span>
                                <div className="text-white text-3xl font-black">${newStats.balance.toLocaleString()}</div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-rose-500/10 text-left">
                                <span className="text-rose-300/60 text-[10px] font-black uppercase tracking-widest block mb-2">Breach Stats</span>
                                <div className="text-rose-400 text-sm font-bold">${account.max_loss.toLocaleString()} Loss Limit</div>
                                <div className="text-rose-300/40 text-[10px] mt-1 italic">Date: {new Date().toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className={`space-y-4 transition-all duration-1000 delay-1000 ${step >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                            <div className="text-left">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Breach Report (Mistakes/Emotions)</label>
                                <textarea
                                    value={report}
                                    onChange={(e) => setReport(e.target.value)}
                                    placeholder="What went wrong? How are you feeling right now..."
                                    className="w-full bg-slate-900/50 border border-rose-500/20 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 min-h-[120px] resize-none transition-all"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleComplete}
                                    className="flex-1 py-5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl shadow-2xl shadow-rose-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                >
                                    {isLast ? 'Acknowledge & Close' : 'Acknowledge & Next'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const PayoutGoalModal = ({ data, onClose, updateAccount }) => {
    const [step, setStep] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [newPayoutGoals, setNewPayoutGoals] = useState({});
    const [newBalances, setNewBalances] = useState({});

    useEffect(() => {
        if (!data) return;
        soundEngine.playSuccess(); // Immediate success sound for Payout
        const timer1 = setTimeout(() => setStep(1), 50);
        const timer2 = setTimeout(() => setStep(2), 1500);
        return () => [timer1, timer2].forEach(clearTimeout);
    }, [data]);

    if (!data || !data.accounts || data.accounts.length === 0) return null;

    const currentAccount = data.accounts[currentIndex];
    const isLastAccount = currentIndex === data.accounts.length - 1;
    const totalAccounts = data.accounts.length;
    const accountId = currentAccount.account.id;

    const handleNext = async () => {
        // Prepare updates
        const updates = {
            reset_date: new Date().toISOString(), // Always reset history on payout confirmation
        };

        // Update Payout Goal if provided
        if (newPayoutGoals[accountId]) {
            updates.payout_goal = parseFloat(newPayoutGoals[accountId]);
        }

        // Update Capital (New Balance)
        // logic: Use user input if present, otherwise default to existing capital (Reset to Initial)
        if (newBalances[accountId] !== undefined && newBalances[accountId] !== '') {
            updates.capital = parseFloat(newBalances[accountId]);
        } else {
            // If empty, keep existing capital (effectively resetting balance to initial)
            updates.capital = currentAccount.account.capital;
        }

        await updateAccount({
            ...currentAccount.account,
            ...updates
        });

        if (isLastAccount) {
            onClose();
        } else {
            setCurrentIndex(prev => prev + 1);
            setStep(0);
            setTimeout(() => setStep(1), 50);
            setTimeout(() => setStep(2), 1500);
        }
    };

    const handleSkip = () => {
        if (isLastAccount) {
            onClose();
        } else {
            setCurrentIndex(prev => prev + 1);
            setStep(0);
            setTimeout(() => setStep(1), 50);
            setTimeout(() => setStep(2), 1500);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
            <div className={`absolute inset-0 bg-slate-950/90 backdrop-blur-xl transition-opacity duration-1000 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`} />

            <div className={`relative w-full max-w-2xl transform transition-all duration-1000 ease-out ${step >= 1 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                <div className="text-center space-y-8">
                    <div className="relative flex justify-center py-6">
                        <div className={`absolute inset-0 bg-emerald-500/20 blur-[120px] rounded-full transition-all duration-1000 ${step >= 2 ? 'opacity-40 animate-pulse' : 'opacity-0'}`} />
                        <div className={`transition-all duration-700 ${step >= 1 ? 'scale-100' : 'scale-150 opacity-0'}`}>
                            <span className="material-symbols-outlined text-[120px] text-emerald-400 font-bold animate-in zoom-in duration-700">
                                payments
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h2 className={`text-5xl sm:text-7xl font-black bg-gradient-to-r from-emerald-400 to-primary bg-clip-text text-transparent transition-all duration-1000 delay-300 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                                PAYOUT GOAL!
                            </h2>
                            <p className={`text-emerald-400 font-bold tracking-[0.3em] uppercase transition-all duration-1000 delay-500 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                                {totalAccounts > 1 ? `${totalAccounts} Accounts Ready` : 'Goal Reached'}
                            </p>
                        </div>

                        {totalAccounts > 1 && (
                            <div className={`flex flex-wrap justify-center gap-2 px-4 transition-all duration-1000 delay-500 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                                {data.accounts.map((item, idx) => (
                                    <div
                                        key={item.account.id}
                                        className={`px-4 py-2 rounded-2xl border transition-all duration-500 ${idx === currentIndex
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 scale-105 shadow-lg shadow-emerald-500/20'
                                            : idx < currentIndex
                                                ? 'bg-emerald-500/10 text-emerald-500/60 border-emerald-500/20'
                                                : 'bg-white/5 text-slate-500 border-white/10 opacity-40'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {idx < currentIndex && (
                                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                            )}
                                            <span className="text-xs font-black uppercase tracking-wider">{item.account.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {totalAccounts > 1 && (
                            <p className={`text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-1000 delay-600 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                                Configuring Account {currentIndex + 1} of {totalAccounts}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 items-start">
                        <div className={`bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-8 transition-all duration-1000 delay-700 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <div className="space-y-6">
                                <div className="text-left">
                                    <span className="text-emerald-300/60 text-[10px] font-black uppercase tracking-widest block mb-2">Account</span>
                                    <div className="text-white text-2xl font-black">{currentAccount.account.name}</div>
                                    <div className="text-emerald-400 text-sm mt-1">{currentAccount.account.type}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-left">
                                        <span className="text-emerald-300/60 text-[10px] font-black uppercase tracking-widest block mb-2">Payout Goal</span>
                                        <div className="text-emerald-400 text-xl font-black">${currentAccount.account.payout_goal.toLocaleString()}</div>
                                    </div>
                                    <div className="text-left">
                                        <span className="text-emerald-300/60 text-[10px] font-black uppercase tracking-widest block mb-2">Current P&L</span>
                                        <div className="text-white text-xl font-black">${currentAccount.newPnL.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-emerald-300/60 text-[10px] font-black uppercase tracking-widest block mb-3">
                                            New Payout Goal
                                        </label>
                                        <CurrencyInput
                                            value={newPayoutGoals[accountId] !== undefined ? newPayoutGoals[accountId] : ''}
                                            onChange={(val) => setNewPayoutGoals(prev => ({
                                                ...prev,
                                                [accountId]: val
                                            }))}
                                            placeholder={`Current: $${currentAccount.account.payout_goal}`}
                                            className="w-full bg-white/5 border border-emerald-500/30 rounded-xl px-4 py-3 text-white font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-2">Leave empty to keep current</p>
                                    </div>
                                    <div>
                                        <label className="text-emerald-300/60 text-[10px] font-black uppercase tracking-widest block mb-3">
                                            New Starting Balance
                                        </label>
                                        <CurrencyInput
                                            value={newBalances[accountId] !== undefined ? newBalances[accountId] : currentAccount.account.capital}
                                            onChange={(val) => setNewBalances(prev => ({
                                                ...prev,
                                                [accountId]: val
                                            }))}
                                            placeholder={`Default: $${currentAccount.account.capital.toLocaleString()}`}
                                            className="w-full bg-white/5 border border-emerald-500/30 rounded-xl px-4 py-3 text-white font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-2">Initial Reset or Custom</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`flex gap-4 justify-center transition-all duration-1000 delay-1000 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <button
                                onClick={handleSkip}
                                className="px-8 py-4 text-slate-400 font-bold hover:text-white transition-colors"
                            >
                                {isLastAccount ? 'Close' : 'Skip'}
                            </button>
                            <button
                                onClick={handleNext}
                                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                {isLastAccount
                                    ? 'Confirm Reset & Finish'
                                    : 'Confirm & Next Account →'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
