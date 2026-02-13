import React, { useState, useEffect } from 'react';
import { useData } from '../context/TradeContext';
import { useNotifications } from '../context/NotificationContext';

export default function DailyJournal() {
    const {
        dailyJournals,
        saveDailyJournal,
        isDailyJournalOpen,
        setIsDailyJournalOpen,
        userProfile
    } = useData();

    const { showSuccess, showInfo } = useNotifications();
    const today = new Date().toISOString().split('T')[0];

    // Use the date from context OR today
    const activeDate = typeof isDailyJournalOpen === 'string' ? isDailyJournalOpen : today;

    const [currentJournal, setCurrentJournal] = useState({
        date: activeDate,
        goals: [],
        reflection: '',
        is_completed: false
    });

    const DEFAULT_GOALS = [
        "Plan tomorrow's trades before bed",
        "Wait for your setup - don't chase",
        "Maintain proper position sizing",
        "Check economic calendar for high impact news",
        "Review losers and identify errors",
        "Take a break after a winning trade",
        "Control emotions during drawdowns",
        "Log every trade with confluences",
        "Stick to the daily loss limit",
        "Stay hydrated and focused"
    ];

    const [newGoalText, setNewGoalText] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isDailyJournalOpen) {
            setIsVisible(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => setIsVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isDailyJournalOpen]);

    useEffect(() => {
        const journal = dailyJournals.find(j => j.date === activeDate);
        if (journal) {
            setCurrentJournal({
                ...journal,
                goals: typeof journal.goals === 'string' ? JSON.parse(journal.goals) : (journal.goals || [])
            });
        } else {
            // New journal for the selected date
            setCurrentJournal({
                date: activeDate,
                goals: DEFAULT_GOALS.map((text, i) => ({ id: Date.now() + i, text, completed: false })),
                reflection: '',
                is_completed: false
            });
        }
    }, [dailyJournals, activeDate]);

    const handleGoalToggle = (id) => {
        const updatedGoals = currentJournal.goals.map(g =>
            g.id === id ? { ...g, completed: !g.completed } : g
        );
        setCurrentJournal({ ...currentJournal, goals: updatedGoals });
        saveDailyJournal({ ...currentJournal, goals: updatedGoals });
    };

    const handleAddGoal = () => {
        if (!newGoalText.trim()) return;
        if (currentJournal.goals.length >= 10) {
            showInfo("Maximum limit of 10 goals reached for this protocol.");
            return;
        }

        const newGoal = {
            id: Date.now(),
            text: newGoalText.trim(),
            completed: false
        };

        const updatedGoals = [...currentJournal.goals, newGoal];
        setCurrentJournal({ ...currentJournal, goals: updatedGoals });
        saveDailyJournal({ ...currentJournal, goals: updatedGoals });
        setNewGoalText('');
    };

    const handleDeleteGoal = (id) => {
        const updatedGoals = currentJournal.goals.filter(g => g.id !== id);
        setCurrentJournal({ ...currentJournal, goals: updatedGoals });
        saveDailyJournal({ ...currentJournal, goals: updatedGoals });
    };

    const handleUpdateGoalText = (id, text) => {
        const updatedGoals = currentJournal.goals.map(g =>
            g.id === id ? { ...g, text } : g
        );
        setCurrentJournal({ ...currentJournal, goals: updatedGoals });
        saveDailyJournal({ ...currentJournal, goals: updatedGoals });
    };

    const handleComplete = () => {
        if (!currentJournal.reflection.trim()) {
            showInfo("Please add a short reflection before completing the day.");
            return;
        }

        const updated = { ...currentJournal, is_completed: true };
        setCurrentJournal(updated);
        saveDailyJournal(updated);
        showSuccess("Day marked as complete! Journal archived.");
        setIsDailyJournalOpen(false);
    };

    if (!isVisible) return null;

    const formattedDate = (() => {
        const [y, m, d] = activeDate.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    })();

    return (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-6 sm:p-12 lg:p-24 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isAnimating ? 'bg-slate-950/80 backdrop-blur-xl opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={() => setIsDailyJournalOpen(false)}>
            <div className={`bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[3rem] w-full max-w-3xl h-full max-h-[900px] flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform relative overflow-hidden ${isAnimating ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-[0.9] translate-y-20 opacity-0 blur-2xl'}`} onClick={e => e.stopPropagation()}>

                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-500 to-transparent opacity-20" />
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 blur-[120px] rounded-full animate-pulse pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/10 blur-[120px] rounded-full animate-pulse pointer-events-none" />

                {/* Header */}
                <div className="p-12 pb-8 flex items-start justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/40 blur-md rounded-full animate-ping" />
                                <span className="relative w-2.5 h-2.5 rounded-full bg-primary block shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                            </div>
                            <span className="text-[11px] font-black text-primary uppercase tracking-[0.5em] leading-none">Journal Protocol</span>
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl">
                            {formattedDate}
                        </h2>
                    </div>
                    <button
                        onClick={() => setIsDailyJournalOpen(false)}
                        className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/20 transition-all border border-white/10 hover:border-rose-500/30 group active:scale-90"
                    >
                        <span className="material-symbols-outlined text-3xl group-hover:rotate-180 transition-transform duration-500">close</span>
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-12 pt-4 custom-scrollbar space-y-16 relative z-10">

                    {/* Objectives Section */}
                    <div className="space-y-10">
                        <div className="flex items-end justify-between px-2">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Operational Checklist</h3>
                                <p className="text-xs font-bold text-slate-400 italic tracking-tight">Maintain discipline through high-fidelity execution.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-black text-emerald-400 italic tracking-tighter leading-none block drop-shadow-glow">
                                    {Math.round((currentJournal.goals.filter(g => g.completed).length / (currentJournal.goals.length || 1)) * 100)}%
                                </span>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mt-2">Mission Integrity</span>
                            </div>
                        </div>

                        {/* Professional Goal Input */}
                        {currentJournal.goals.length < 10 && (
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none z-20">
                                    <span className="material-symbols-outlined text-slate-500 group-focus-within/input:text-primary transition-colors">add_task</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Define new operational objective..."
                                    className="w-full bg-slate-100/5 dark:bg-white/[0.03] border border-white/10 rounded-[2rem] pl-16 pr-32 py-6 text-sm font-black text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-600 italic tracking-tight relative z-10"
                                    value={newGoalText}
                                    onChange={(e) => setNewGoalText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                                />
                                <button
                                    onClick={handleAddGoal}
                                    className="absolute right-3 top-3 bottom-3 px-6 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-2 z-20"
                                >
                                    Deploy <span className="material-symbols-outlined text-base">rocket_launch</span>
                                </button>
                            </div>
                        )}

                        <div className="grid gap-5">
                            {currentJournal.goals.map((goal) => (
                                <div
                                    key={goal.id}
                                    className={`group flex items-center gap-6 p-6 rounded-[2rem] border transition-all duration-700 relative overflow-hidden ${goal.completed
                                        ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                                        : 'bg-white/[0.02] border-white/10 hover:border-primary/30 hover:bg-white/[0.04]'
                                        }`}
                                >
                                    {/* Glass Reflection Highlight */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                                    {/* Completion Marker */}
                                    <button
                                        onClick={() => handleGoalToggle(goal.id)}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-700 relative z-10 ${goal.completed
                                            ? 'bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                                            : 'bg-white/5 text-slate-500 border border-white/10 hover:border-primary/30'
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined text-2xl transition-all duration-700 ${goal.completed ? 'scale-110 drop-shadow-glow' : 'scale-90 opacity-30 group-hover:opacity-60'}`}>
                                            {goal.completed ? 'check_circle' : 'circle'}
                                        </span>
                                    </button>

                                    {/* Text Content */}
                                    <div className="flex-1 min-w-0 relative z-10">
                                        <input
                                            type="text"
                                            className={`w-full text-sm font-black tracking-tight bg-transparent border-none outline-none transition-all duration-700 ${goal.completed
                                                ? 'text-emerald-500/50 line-through italic'
                                                : 'text-slate-200'
                                                }`}
                                            value={goal.text}
                                            onChange={(e) => handleUpdateGoalText(goal.id, e.target.value)}
                                        />
                                    </div>

                                    {/* Action - Delete */}
                                    <button
                                        onClick={() => handleDeleteGoal(goal.id)}
                                        className="opacity-0 group-hover:opacity-100 w-12 h-12 rounded-xl text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all flex items-center justify-center relative z-10"
                                    >
                                        <span className="material-symbols-outlined text-2xl">delete_sweep</span>
                                    </button>

                                    {/* Background Decor */}
                                    {goal.completed && (
                                        <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mission Log / Reflection Section */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Post-Mortem Analysis</h3>
                                <p className="text-xs font-bold text-slate-400 italic tracking-tight">Synthesize market behavior and tactical responses.</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                                <span className="material-symbols-outlined text-primary text-2xl animate-pulse">history_edu</span>
                            </div>
                        </div>
                        <div className="relative group/reflection">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-emerald-500/5 to-primary/10 rounded-[2.5rem] blur opacity-0 group-focus-within/reflection:opacity-100 transition duration-1000" />
                            <textarea
                                className="relative w-full bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-10 text-sm font-black leading-relaxed text-slate-200 outline-none focus:border-primary/30 backdrop-blur-md transition-all min-h-[250px] custom-scrollbar italic placeholder:text-slate-700 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
                                placeholder="Describe the market environment, execution quality, and psychological state today..."
                                value={currentJournal.reflection}
                                onChange={(e) => setCurrentJournal({ ...currentJournal, reflection: e.target.value })}
                            />
                            {/* Reflection Glass Highlight */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-[2.5rem]" />
                        </div>
                    </div>
                </div>

                {/* Tactical Footer Actions */}
                <div className="p-12 pt-6 flex gap-8 relative z-10 border-t border-white/5 bg-slate-900/40 backdrop-blur-md">
                    <button
                        onClick={() => setIsDailyJournalOpen(false)}
                        className="flex-1 py-6 bg-white/5 text-slate-500 font-black rounded-2xl hover:bg-white/10 hover:text-white transition-all text-[11px] uppercase tracking-[0.3em] border border-white/10 active:scale-95 shadow-inner"
                    >
                        Suspend Session
                    </button>
                    <button
                        onClick={handleComplete}
                        className={`flex-[2.5] py-6 font-black rounded-2xl transition-all text-[11px] uppercase tracking-[0.4em] shadow-2xl relative overflow-hidden group/submit ${currentJournal.is_completed
                            ? 'bg-emerald-500 text-white cursor-default shadow-emerald-500/30'
                            : 'bg-primary text-white hover:bg-primary-light shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                    >
                        <div className="relative z-10 flex items-center justify-center gap-4">
                            {currentJournal.is_completed ? (
                                <>Mission Finalized <span className="material-symbols-outlined text-xl">inventory</span></>
                            ) : (
                                <>Archive Protocol <span className="material-symbols-outlined text-xl group-hover:translate-x-2 transition-transform duration-500">send</span></>
                            )}
                        </div>
                        {!currentJournal.is_completed && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
