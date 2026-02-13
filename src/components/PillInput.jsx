import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/TradeContext';

const COLOR_OPTIONS = ['primary', 'emerald', 'rose', 'amber', 'violet', 'sky', 'pink', 'lime'];

const COLOR_MAP = {
    primary: {
        pill: 'bg-primary/15 text-primary border-primary/20',
        hover: 'hover:bg-primary/10',
        dot: 'bg-primary',
        swatch: 'bg-primary'
    },
    emerald: {
        pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        hover: 'hover:bg-emerald-500/10',
        dot: 'bg-emerald-500',
        swatch: 'bg-emerald-500'
    },
    rose: {
        pill: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
        hover: 'hover:bg-rose-500/10',
        dot: 'bg-rose-500',
        swatch: 'bg-rose-500'
    },
    amber: {
        pill: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        hover: 'hover:bg-amber-500/10',
        dot: 'bg-amber-500',
        swatch: 'bg-amber-500'
    },
    violet: {
        pill: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
        hover: 'hover:bg-violet-500/10',
        dot: 'bg-violet-500',
        swatch: 'bg-violet-500'
    },
    sky: {
        pill: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
        hover: 'hover:bg-sky-500/10',
        dot: 'bg-sky-500',
        swatch: 'bg-sky-500'
    },
    pink: {
        pill: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
        hover: 'hover:bg-pink-500/10',
        dot: 'bg-pink-500',
        swatch: 'bg-pink-500'
    },
    lime: {
        pill: 'bg-lime-500/15 text-lime-400 border-lime-500/20',
        hover: 'hover:bg-lime-500/10',
        dot: 'bg-lime-500',
        swatch: 'bg-lime-500'
    }
};

/**
 * PillInput — Reusable pill/tag selector with persistent color picking.
 */
export default function PillInput({
    value,
    onChange,
    suggestions = [],
    placeholder = 'Type or select...',
    defaultColor = 'primary',
    category = 'default',
    allowMultiple = false,
    className = ''
}) {
    const { getPillColor, savePillColor } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [colorPickerFor, setColorPickerFor] = useState(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    const selectedValues = allowMultiple
        ? (value ? value.split(',').map(v => v.trim()).filter(Boolean) : [])
        : [];

    const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(search.toLowerCase()) &&
        (allowMultiple ? !selectedValues.includes(s) : s !== value)
    );

    useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setColorPickerFor(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const getColor = (val) => {
        const saved = getPillColor(category, val);
        return COLOR_MAP[saved] || COLOR_MAP[defaultColor] || COLOR_MAP.primary;
    };

    const getColorKey = (val) => {
        return getPillColor(category, val) || defaultColor;
    };

    const selectValue = (val) => {
        if (allowMultiple) {
            const newValues = [...selectedValues, val];
            onChange(newValues.join(', '));
        } else {
            onChange(val);
        }
        setSearch('');
        // Removed setIsOpen(false) to only close on outside click
    };

    const removeValue = (val) => {
        if (allowMultiple) {
            const newValues = selectedValues.filter(v => v !== val);
            onChange(newValues.join(', '));
        } else {
            onChange('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (search.trim()) {
                selectValue(search.trim());
            }
        }
        if (e.key === 'Backspace' && !search && allowMultiple && selectedValues.length > 0) {
            removeValue(selectedValues[selectedValues.length - 1]);
        }
        if (e.key === 'Escape') {
            setIsOpen(false);
            setColorPickerFor(null);
        }
    };

    const handleColorChange = (val, newColor) => {
        savePillColor(category, val, newColor);
        setColorPickerFor(null);
    };

    const renderPill = (val, removable = true) => {
        const colors = getColor(val);
        return (
            <span key={val} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${colors.pill}`}>
                {/* Color dot — click to open color picker */}
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setColorPickerFor(colorPickerFor === val ? null : val); }}
                    className={`w-2.5 h-2.5 rounded-full ${colors.dot} hover:ring-2 hover:ring-white/30 transition-all cursor-pointer`}
                    title="Change color"
                ></button>
                {val}
                {removable && (
                    <button
                        type="button"
                        onClick={() => removeValue(val)}
                        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                    >
                        ×
                    </button>
                )}
                {/* Inline Color Picker */}
                {colorPickerFor === val && (
                    <div
                        className="absolute z-[60] top-full mt-1 left-0 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 flex gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {COLOR_OPTIONS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => handleColorChange(val, c)}
                                className={`w-5 h-5 rounded-full ${COLOR_MAP[c].swatch} transition-all hover:scale-125 ${getColorKey(val) === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                            />
                        ))}
                    </div>
                )}
            </span>
        );
    };

    // Single value mode: show pill if value is set
    if (!allowMultiple && value) {
        return (
            <div ref={containerRef} className="relative flex items-center gap-2">
                {renderPill(value, true)}
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className={`flex flex-wrap items-center gap-2 min-h-[58px] bg-slate-900/40 border border-white/10 rounded-2xl px-5 py-2.5 focus-within:ring-4 focus-within:ring-primary/10 transition-all backdrop-blur-md shadow-inner ${isOpen ? 'ring-4 ring-primary/10 border-primary/30' : ''}`}>
                {allowMultiple && selectedValues.map((val) => renderPill(val, true))}
                {!allowMultiple && value ? (
                    <div className="flex items-center gap-2">
                        {renderPill(value, true)}
                    </div>
                ) : (
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        onBlur={() => {
                            if (search.trim()) {
                                selectValue(search.trim());
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={allowMultiple && selectedValues.length > 0 ? 'Add more...' : placeholder}
                        className="flex-1 min-w-[120px] bg-transparent focus:outline-none text-sm text-white font-bold tracking-tight placeholder-slate-600"
                    />
                )}
            </div>

            {isOpen && (filtered.length > 0 || search.trim()) && (
                <div className="absolute z-50 top-full left-0 right-0 mt-3 bg-slate-900/90 border border-white/10 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden max-h-64 overflow-y-auto backdrop-blur-[45px] animate-in fade-in zoom-in-95 duration-200">
                    {/* Glass Reflection Highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                    <div className="px-5 py-4 border-b border-white/5 bg-white/5 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Suggested Identifiers</span>
                    </div>

                    <div className="relative z-10">
                        {filtered.map((suggestion) => {
                            const colors = getColor(suggestion);
                            return (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => selectValue(suggestion)}
                                    className={`w-full text-left px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all flex items-center justify-between group`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${colors.dot} shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:scale-125 transition-transform`}></span>
                                        {suggestion}
                                    </div>
                                    <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-40 transition-opacity">add_circle</span>
                                </button>
                            );
                        })}
                        {search.trim() && !suggestions.includes(search.trim()) && (
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectValue(search.trim())}
                                className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all flex items-center gap-3 border-t border-white/5"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_task</span>
                                Commit "{search.trim()}" to Repository
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
