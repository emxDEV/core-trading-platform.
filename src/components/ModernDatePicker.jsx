import React, { useState, useEffect, useRef } from 'react';

const ModernDatePicker = ({ value, onChange, label, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Simple calendar logic
    const date = value ? new Date(value) : new Date();
    const [viewDate, setViewDate] = useState(date);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const days = [];
    const firstDay = firstDayOfMonth(currentYear, currentMonth);
    const totalDays = daysInMonth(currentYear, currentMonth);

    // Fill empty slots
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSelect = (day) => {
        if (!day) return;
        const newDate = new Date(currentYear, currentMonth, day);
        // Ensure we preserve local date string format YYYY-MM-DD
        const offset = newDate.getTimezoneOffset();
        const localDate = new Date(newDate.getTime() - (offset * 60 * 1000));
        onChange(localDate.toISOString().split('T')[0]);
        setIsOpen(false);
    };

    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div ref={containerRef} className="relative">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">{label}</label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 h-[42px] px-4 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary/50 transition-all ${isOpen ? 'ring-2 ring-primary/50 border-primary/30' : ''} ${error ? 'border-rose-500/50 bg-rose-500/5' : ''}`}
            >
                <span className={`material-symbols-outlined ${error ? 'text-rose-400' : 'text-slate-400'} text-[20px]`}>calendar_today</span>
                <span className={`text-sm font-bold ${error ? 'text-rose-400' : 'dark:text-white'}`}>{formattedDate}</span>
            </div>

            {isOpen && (
                <div className="absolute z-[100] top-full left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 mt-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-4 min-w-[280px] animate-in fade-in zoom-in duration-200 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                        <button type="button" onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                        <span className="text-xs font-black dark:text-white uppercase tracking-[0.2em]">
                            {viewDate.toLocaleString('default', { month: 'short' })} {currentYear}
                        </span>
                        <button type="button" onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <span key={`${d}-${i}`} className="text-[10px] font-black text-slate-500">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                        {days.map((day, i) => {
                            const isToday = day && new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
                            const isSelected = day && date.toDateString() === new Date(currentYear, currentMonth, day).toDateString();

                            return (
                                <div
                                    key={i}
                                    onClick={() => handleSelect(day)}
                                    className={`
                                        h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer
                                        ${!day ? 'pointer-events-none' : ''}
                                        ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' : 'hover:bg-primary/10 dark:text-slate-300'}
                                        ${isToday && !isSelected ? 'text-primary ring-1 ring-primary/30' : ''}
                                    `}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModernDatePicker;
