import React, { useState, useEffect } from 'react';

const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        icon: 'rocket_launch',
        title: 'Welcome to CORE',
        subtitle: 'Your Trading Intelligence Platform',
        description: 'CORE is your personal command center for tracking, analyzing, and mastering your trading performance. Let\'s take a quick tour.',
        gradient: 'from-primary to-violet-600',
        color: 'text-primary',
        bg: 'bg-primary/10',
        visual: 'monitoring'
    },
    {
        id: 'journal',
        icon: 'edit_note',
        title: 'Trade Journal',
        subtitle: 'Log Every Trade',
        description: 'Your journal is the heart of CORE. Every trade gets logged with details like entry signal, confluences, bias, PnL, session, and psychological notes. Build your edge through data.',
        gradient: 'from-emerald-500 to-teal-500',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        visual: 'assignment',
        features: ['Log trades with rich metadata', 'Track PnL per trade', 'Add execution screenshots', 'Tag entry signals & confluences']
    },
    {
        id: 'accounts',
        icon: 'account_balance',
        title: 'Account Management',
        subtitle: 'Track All Your Accounts',
        description: 'Manage multiple trading accounts — evaluation, funded, or personal. Track individual account performance, drawdown limits, and profit targets all in one dashboard.',
        gradient: 'from-amber-500 to-orange-500',
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        visual: 'credit_card',
        features: ['Evaluation & Funded accounts', 'Goal tracking & progress bars', 'Breach detection alerts', 'Account upgrade flow']
    },
    {
        id: 'analytics',
        icon: 'insights',
        title: 'Deep Analytics',
        subtitle: 'Data-Driven Decisions',
        description: 'Understand your trading edge with comprehensive analytics. Win rates, profit factors, session breakdowns, equity curves, and pattern recognition — all visualized beautifully.',
        gradient: 'from-cyan-500 to-blue-500',
        color: 'text-cyan-500',
        bg: 'bg-cyan-500/10',
        visual: 'analytics',
        features: ['Equity curve & drawdown chart', 'Session & symbol heatmaps', 'Win rate by model & bias', 'Performance streaks analysis']
    },
    {
        id: 'calendar',
        icon: 'calendar_month',
        title: 'Calendar View',
        subtitle: 'Visualize Your Trading Days',
        description: 'See your entire trading history mapped on a calendar. Green and red days at a glance, daily trade counts, and click any day to see the trades you took.',
        gradient: 'from-rose-500 to-pink-500',
        color: 'text-rose-500',
        bg: 'bg-rose-500/10',
        visual: 'date_range',
        features: ['Color-coded profit/loss days', 'Daily PnL summaries', 'Click to view day details', 'Monthly performance overview']
    },
    {
        id: 'copycockpit',
        icon: 'content_copy',
        title: 'Copy Cockpit',
        subtitle: 'Manage Copy Trading',
        description: 'Group your accounts for copy trading. When you take a trade on one account, easily replicate it across linked accounts with the copy cockpit.',
        gradient: 'from-violet-500 to-purple-500',
        color: 'text-violet-500',
        bg: 'bg-violet-500/10',
        visual: 'hub',
        features: ['Link accounts together', 'Copy trades across groups', 'Track group performance', 'Master/slave account setup']
    },
    {
        id: 'profile',
        icon: 'military_tech',
        title: 'Rank & Profile',
        subtitle: 'Level Up Your Trading',
        description: 'Every trade earns XP. Level up through 8 ranks from Rookie to Apex. Set missions, track your mastery, and build your trading identity.',
        gradient: 'from-amber-400 to-yellow-500',
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
        visual: 'emoji_events',
        features: ['XP earned from trading', '8 tier rank system', 'Mission objectives tracker', 'Personal trading DNA']
    },
    {
        id: 'sync',
        icon: 'cloud_sync',
        title: 'Cloud Sync',
        subtitle: 'Your Data, Everywhere',
        description: 'With Neural Sync enabled, your data automatically backs up to the cloud. Log in on any device and import your data. Never lose a trade again.',
        gradient: 'from-sky-500 to-indigo-500',
        color: 'text-sky-500',
        bg: 'bg-sky-500/10',
        visual: 'cloud_done',
        features: ['Automatic cloud backup', 'Cross-device sync', 'End-to-end encryption', 'Import on new devices']
    },
    {
        id: 'ready',
        icon: 'verified',
        title: 'You\'re All Set!',
        subtitle: 'Start Trading with Precision',
        description: 'Your terminal is configured and ready for deployment. Click the + button or press Ctrl+N to log your first trade. Welcome to the elite.',
        gradient: 'from-emerald-500 to-primary',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        visual: 'check_circle',
        tip: 'Pro tip: Use keyboard shortcuts for maximum speed. Press Ctrl+K to access the command center anytime.'
    },
];

export default function AppTutorial({ onComplete, userName }) {
    const [step, setStep] = useState(0);
    const [animating, setAnimating] = useState(false);
    const [fadeIn, setFadeIn] = useState(true);

    const current = TUTORIAL_STEPS[step];
    const progress = ((step + 1) / TUTORIAL_STEPS.length) * 100;
    const isLast = step === TUTORIAL_STEPS.length - 1;

    useEffect(() => {
        setFadeIn(true);
    }, [step]);

    const handleNext = () => {
        if (animating) return;
        if (isLast) {
            onComplete();
            return;
        }
        setAnimating(true);
        setFadeIn(false);
        setTimeout(() => {
            setStep(s => s + 1);
            setAnimating(false);
            setFadeIn(true);
        }, 300);
    };

    const handleBack = () => {
        if (animating || step === 0) return;
        setAnimating(true);
        setFadeIn(false);
        setTimeout(() => {
            setStep(s => s - 1);
            setAnimating(false);
            setFadeIn(true);
        }, 300);
    };

    const handleSkip = () => {
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-background-dark/98 backdrop-blur-3xl flex items-center justify-center overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full blur-[140px] transition-all duration-[2s] ${current.bg} opacity-40`} />
                <div className={`absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full blur-[140px] transition-all duration-[2s] bg-violet-600/10`} />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[180px] transition-all duration-[2s] ${current.bg} opacity-20`} />

                {/* Grid */}
                <div className="absolute inset-0 opacity-[0.015]" style={{
                    backgroundImage: `
                        linear-gradient(rgba(124,93,250,0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(124,93,250,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px'
                }} />

                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className={`absolute w-1 h-1 rounded-full ${current.bg.replace('/10', '/40')} animate-pulse`}
                        style={{
                            top: `${15 + i * 15}%`,
                            left: `${10 + i * 14}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${2 + i * 0.3}s`
                        }}
                    />
                ))}
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-3xl mx-6">
                {/* Skip button */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleSkip}
                        className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] hover:text-slate-400 transition-colors px-4 py-2"
                    >
                        Skip Tour
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-1.5 mb-8 px-2">
                    {TUTORIAL_STEPS.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => {
                                if (i === step || animating) return;
                                setAnimating(true);
                                setFadeIn(false);
                                setTimeout(() => {
                                    setStep(i);
                                    setAnimating(false);
                                    setFadeIn(true);
                                }, 300);
                            }}
                            className={`flex-1 h-1 rounded-full transition-all duration-700 cursor-pointer ${i <= step
                                    ? `bg-gradient-to-r ${current.gradient} shadow-sm`
                                    : 'bg-white/5 hover:bg-white/10'
                                }`}
                        />
                    ))}
                </div>

                {/* Main Card */}
                <div
                    className={`bg-surface-dark/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-300 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    {/* Card Header Gradient */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${current.gradient}`} />

                    <div className="p-12">
                        {/* Step Number & Icon */}
                        <div className="flex items-start gap-6 mb-10">
                            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${current.gradient} flex items-center justify-center shadow-2xl flex-shrink-0 transition-transform duration-700 ${fadeIn ? 'scale-100 rotate-0' : 'scale-75 -rotate-12'}`}>
                                <span className="material-symbols-outlined text-white text-[40px]">{current.visual}</span>
                            </div>
                            <div className="flex-1 pt-1">
                                <div className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 ${current.color}`}>
                                    {step === 0 ? `Welcome, ${userName || 'Operator'}` : `Feature ${step} of ${TUTORIAL_STEPS.length - 2}`}
                                </div>
                                <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-2">
                                    {current.title}
                                </h2>
                                <p className="text-sm text-slate-500 font-bold tracking-wide">
                                    {current.subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-base text-slate-400 font-medium leading-relaxed mb-10 max-w-2xl">
                            {current.description}
                        </p>

                        {/* Feature List */}
                        {current.features && (
                            <div className="grid grid-cols-2 gap-3 mb-10">
                                {current.features.map((feature, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center gap-3 p-4 bg-white/[0.03] border border-white/5 rounded-2xl transition-all duration-500 ${fadeIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                                            }`}
                                        style={{ transitionDelay: `${idx * 100 + 200}ms` }}
                                    >
                                        <div className={`w-8 h-8 rounded-lg ${current.bg} flex items-center justify-center flex-shrink-0`}>
                                            <span className={`material-symbols-outlined text-[16px] ${current.color}`}>check</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-300 tracking-wide">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pro Tip */}
                        {current.tip && (
                            <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-4 mb-10">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-1">Pro Tip</div>
                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{current.tip}</p>
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                            {step > 0 && (
                                <button
                                    onClick={handleBack}
                                    className="px-6 py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className={`flex-1 py-4 bg-gradient-to-r ${current.gradient} text-white rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-3`}
                            >
                                {isLast ? (
                                    <>
                                        <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                        Enter Terminal
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Step Counter */}
                <p className="text-center mt-6 text-[10px] text-slate-700 font-bold uppercase tracking-[0.3em]">
                    {step + 1} / {TUTORIAL_STEPS.length}
                </p>
            </div>
        </div>
    );
}
