import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/TradeContext';

// --- Date Helpers ---
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const daysShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
};

const isBetween = (date, start, end) => {
    if (!date || !start || !end) return false;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return d > s && d < e;
};

const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const addMonths = (date, n) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + n);
    return d;
};

// --- Presets ---
const getPresets = () => {
    const today = new Date();
    const presets = [
        {
            label: 'All time',
            getRange: () => ({ start: null, end: null })
        },
        {
            label: 'Today',
            getRange: () => ({ start: today, end: today })
        },
        {
            label: 'This week',
            getRange: () => {
                const start = new Date(today);
                start.setDate(today.getDate() - today.getDay()); // Sunday
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                return { start, end };
            }
        },
        {
            label: 'This month',
            getRange: () => {
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                return { start, end };
            }
        },
        {
            label: 'Last 30 days',
            getRange: () => {
                const end = new Date(today);
                const start = new Date(today);
                start.setDate(today.getDate() - 30);
                return { start, end };
            }
        },
        {
            label: 'Last month',
            getRange: () => {
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                return { start, end };
            }
        },
        {
            label: 'This quarter',
            getRange: () => {
                const currMonth = today.getMonth();
                const startMonth = Math.floor(currMonth / 3) * 3;
                const start = new Date(today.getFullYear(), startMonth, 1);
                const end = new Date(today.getFullYear(), startMonth + 3, 0);
                return { start, end };
            }
        },
        {
            label: 'YTD (Year to date)',
            getRange: () => {
                const start = new Date(today.getFullYear(), 0, 1);
                const end = today;
                return { start, end };
            }
        }
    ];
    return presets;
};

const CalendarGrid = ({ year, month, startDate, endDate, hoverDate, onDateClick, onHover }) => {
    const days = [];
    const firstDay = getFirstDayOfMonth(year, month);
    const totalDays = getDaysInMonth(year, month);
    // Previous month filler
    for (let i = 0; i < firstDay; i++) days.push(null);
    // Current month days
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));

    return (
        <div className="p-3">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="font-bold text-white text-xs">
                    {months[month]} {year}
                </span>
            </div>
            <div className="grid grid-cols-7 gap-y-1 mb-1">
                {daysShort.map(d => (
                    <div key={d} className="text-center text-[10px] uppercase font-bold text-slate-500">
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((date, i) => {
                    if (!date) return <div key={i} />;

                    const isStart = isSameDay(date, startDate);
                    const isEnd = isSameDay(date, endDate);

                    // Logic for range highlighting (including hover)
                    // Efficiently determine strictly visually implied 'end' for hover
                    const effectiveEnd = endDate || (hoverDate && hoverDate > startDate ? hoverDate : null);
                    const isInRange = isBetween(date, startDate, effectiveEnd);

                    return (
                        <div
                            key={i}
                            onMouseEnter={() => onHover(date)}
                            onClick={() => onDateClick(date)}
                            className="relative h-7 flex items-center justify-center cursor-pointer group"
                        >
                            {/* Background Range Strip */}
                            {(isInRange || isStart || isEnd) && (
                                <div
                                    className={`absolute inset-y-0 bg-indigo-500/20 
                                    ${isStart && effectiveEnd ? 'left-1/2 right-0 rounded-l-full' : ''}
                                    ${isEnd && startDate ? 'left-0 right-1/2 rounded-r-full' : ''}
                                    ${isInRange ? 'left-0 right-0' : ''}
                                    ${isStart && !effectiveEnd ? 'hidden' : ''} 
                                    `}
                                />
                            )}

                            {/* The Circle/Number */}
                            <div
                                className={`relative z-10 w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-all
                                ${isStart || isEnd
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                                    }
                                ${!isStart && !isEnd && isInRange ? 'text-indigo-200' : ''}
                                `}
                            >
                                {date.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function DateRangePicker({ isOpen, onClose }) {
    const { dateFilter, setDateFilter } = useData();
    const [viewDate, setViewDate] = useState(new Date());
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [hoverDate, setHoverDate] = useState(null);
    const containerRef = useRef(null);

    // Initialize state from global filter when opening
    useEffect(() => {
        if (isOpen) {
            if (dateFilter.startDate) setStartDate(new Date(dateFilter.startDate));
            if (dateFilter.endDate) setEndDate(new Date(dateFilter.endDate));
            // Set view to start date if exists, otherwise today
            if (dateFilter.startDate) setViewDate(new Date(dateFilter.startDate));
            else setViewDate(new Date());
        }
    }, [isOpen, dateFilter]);

    // Handle Closing (Click Outside)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleDateClick = (date) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(date);
            setEndDate(null);
        } else {
            // Picking end date
            if (date < startDate) {
                setStartDate(date);
            } else {
                setEndDate(date);
                setDateFilter({
                    type: 'custom',
                    startDate: startDate,
                    endDate: date
                });
            }
        }
    };

    const handlePresetClick = (preset) => {
        const { start, end } = preset.getRange();
        setStartDate(start);
        setEndDate(end);

        if (preset.label === 'All time') {
            setDateFilter({ type: 'all', startDate: null, endDate: null });
        } else {
            setDateFilter({
                type: preset.label === 'Today' ? 'today' : 'custom',
                startDate: start,
                endDate: end
            });
        }
    };

    const nextMonth = addMonths(viewDate, 1);

    return (
        <div
            ref={containerRef}
            className="absolute top-full right-0 mt-2 z-50 bg-[#1e1e2e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-max origin-top-right animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#181825]">
                <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
                    <span className={`${startDate ? 'text-white' : 'text-slate-500'}`}>
                        {startDate ? formatDate(startDate) : 'Select Start'}
                    </span>
                    <span className="material-symbols-outlined text-slate-600 text-[16px]">arrow_right_alt</span>
                    <span className={`${endDate ? 'text-white' : 'text-slate-500'}`}>
                        {endDate ? formatDate(endDate) : 'Select End'}
                    </span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row">
                {/* Calendars Area */}
                <div className="p-3 relative">
                    {/* Navigation Arrows */}
                    <div className="absolute top-4 left-3 z-10">
                        <button onClick={() => setViewDate(prev => addMonths(prev, -1))} className="p-1 hover:bg-white/10 rounded-full text-white transition-colors">
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                    </div>
                    <div className="absolute top-4 right-3 z-10">
                        <button onClick={() => setViewDate(prev => addMonths(prev, 1))} className="p-1 hover:bg-white/10 rounded-full text-white transition-colors">
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <CalendarGrid
                            year={viewDate.getFullYear()}
                            month={viewDate.getMonth()}
                            startDate={startDate}
                            endDate={endDate}
                            hoverDate={hoverDate}
                            onDateClick={handleDateClick}
                            onHover={setHoverDate}
                        />
                        <div className="hidden md:block w-px bg-white/5 mx-1"></div>
                        <CalendarGrid
                            year={nextMonth.getFullYear()}
                            month={nextMonth.getMonth()}
                            startDate={startDate}
                            endDate={endDate}
                            hoverDate={hoverDate}
                            onDateClick={handleDateClick}
                            onHover={setHoverDate}
                        />
                    </div>
                </div>

                {/* Sidebar Presets */}
                <div className="bg-[#181825] border-t md:border-t-0 md:border-l border-white/5 p-2 w-full md:w-40 flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-1 mb-0.5">Presets</span>
                    {getPresets().map(preset => (
                        <button
                            key={preset.label}
                            onClick={() => handlePresetClick(preset)}
                            className="text-left px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-all font-medium"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer / Actions */}
            <div className="p-3 border-t border-white/5 bg-[#181825] flex justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-slate-400 hover:text-white font-bold text-[10px] uppercase tracking-wide transition-colors"
                >
                    Close
                </button>
                <button
                    onClick={onClose}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wide rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
                >
                    Apply
                </button>
            </div>
        </div>
    );
}
