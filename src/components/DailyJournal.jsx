import React, { useState, useEffect, useMemo } from 'react';
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
        // Debounce actual save to avoid excessive DB writes during typing? 
        // For now direct is okay for small text
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

    if (!isDailyJournalOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Daily Protocol</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">
                            {(() => {
                                const [y, m, d] = activeDate.split('-').map(Number);
                                return new Date(y, m - 1, d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                            })()}
                        </h2>
                    </div>
                    <button
                        onClick={() => setIsDailyJournalOpen(false)}
                        className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar space-y-8">

                    {/* Goals Checklist */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Objectives</h3>
                            <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
                                {currentJournal.goals.length} / 10
                            </span>
                        </div>

                        {/* Add New Goal */}
                        {currentJournal.goals.length < 10 && (
                            <div className="flex gap-3 p-1">
                                <input
                                    type="text"
                                    placeholder="Enter new objective..."
                                    className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                    value={newGoalText}
                                    onChange={(e) => setNewGoalText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                                />
                                <button
                                    onClick={handleAddGoal}
                                    className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center hover:bg-primary-light transition-all shadow-lg active:scale-95"
                                >
                                    <span className="material-symbols-outlined">add</span>
                                </button>
                            </div>
                        )}

                        <div className="grid gap-3">
                            {currentJournal.goals.map((goal) => (
                                <div
                                    key={goal.id}
                                    className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${goal.completed
                                        ? 'bg-emerald-500/[0.03] border-emerald-500/10'
                                        : 'bg-slate-50 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800/50 hover:border-primary/20'
                                        }`}
                                >
                                    <button
                                        onClick={() => handleGoalToggle(goal.id)}
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${goal.completed
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                            }`}
                                    >
                                        {goal.completed && <span className="material-symbols-outlined text-[18px]">check</span>}
                                    </button>

                                    <input
                                        type="text"
                                        className={`text-sm font-bold tracking-tight flex-1 bg-transparent border-none outline-none ${goal.completed ? 'text-emerald-500/50 line-through' : 'text-slate-700 dark:text-slate-200'
                                            }`}
                                        value={goal.text}
                                        onChange={(e) => handleUpdateGoalText(goal.id, e.target.value)}
                                    />

                                    <button
                                        onClick={() => handleDeleteGoal(goal.id)}
                                        className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reflection Area */}
                    <div>
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 px-1">End-of-day Reflection</h3>
                        <textarea
                            className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 text-sm font-medium leading-relaxed italic text-slate-700 dark:text-slate-300 outline-none focus:ring-4 focus:ring-primary/10 transition-all min-h-[160px]"
                            placeholder="How did the market behave today? What were your emotional triggers? What will you do better tomorrow?"
                            value={currentJournal.reflection}
                            onChange={(e) => setCurrentJournal({ ...currentJournal, reflection: e.target.value })}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 pt-0 flex gap-4">
                    <button
                        onClick={() => setIsDailyJournalOpen(false)}
                        className="flex-1 py-5 bg-slate-100 dark:bg-white/5 text-slate-500 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-[9px] uppercase tracking-widest"
                    >
                        Save & Close
                    </button>
                    <button
                        onClick={handleComplete}
                        className={`flex-[2] py-5 font-black rounded-2xl transition-all text-[9px] uppercase tracking-[0.2em] shadow-xl ${currentJournal.is_completed
                            ? 'bg-emerald-500 text-white cursor-default'
                            : 'bg-primary text-white hover:bg-primary-light shadow-primary/20 hover:scale-[1.02] active:scale-95'
                            }`}
                    >
                        {currentJournal.is_completed ? 'Mission Accomplished' : 'Complete Operation'}
                    </button>
                </div>
            </div>
        </div>
    );
}
