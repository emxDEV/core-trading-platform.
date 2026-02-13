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
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2.5 px-1 block">{label}</label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-4 h-[58px] px-6 bg-slate-900/40 border border-white/10 rounded-2xl cursor-pointer hover:border-white/20 transition-all backdrop-blur-md shadow-inner relative group ${isOpen ? 'ring-4 ring-primary/10 border-primary/30' : ''} ${error ? 'border-rose-500/50 bg-rose-500/10' : ''}`}
            >
                <span className={`material-symbols-outlined ${error ? 'text-rose-400' : 'text-slate-500 group-hover:text-primary transition-colors'} text-[22px]`}>calendar_today</span>
                <span className={`text-sm font-black tracking-tight ${error ? 'text-rose-400' : 'text-white'}`}>{formattedDate}</span>
                <span className="material-symbols-outlined text-slate-600 ml-auto group-hover:text-slate-400 transition-colors">expand_more</span>
            </div>

            {isOpen && (
                <div className="absolute z-[100] top-full left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 mt-3 bg-slate-900/90 border border-white/10 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-6 min-w-[300px] animate-in fade-in zoom-in-95 duration-200 backdrop-blur-[45px] overflow-hidden">
                    {/* Glass Reflection Highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <button type="button" onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10 active:scale-95">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.25em] italic">
                            {viewDate.toLocaleString('default', { month: 'long' })} {currentYear}
                        </span>
                        <button type="button" onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10 active:scale-95">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-4 relative z-10">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <span key={`${d}-${i}`} className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center relative z-10">
                        {days.map((day, i) => {
                            const isToday = day && new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
                            const isSelected = day && date.toDateString() === new Date(currentYear, currentMonth, day).toDateString();

                            return (
                                <div
                                    key={i}
                                    onClick={() => handleSelect(day)}
                                    className={`
                                        h-10 flex items-center justify-center rounded-xl text-[11px] font-black transition-all cursor-pointer transform active:scale-90
                                        ${!day ? 'pointer-events-none' : ''}
                                        ${isSelected ? 'bg-primary text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110' : 'hover:bg-white/10 text-slate-400 hover:text-white'}
                                        ${isToday && !isSelected ? 'text-primary' : ''}
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
