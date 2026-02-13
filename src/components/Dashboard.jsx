import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/TradeContext';
import ViewHeader from './ViewHeader';
import { useNotifications } from '../context/NotificationContext';
import OverviewStats from './OverviewStats';
import RecentTrades from './RecentTrades';
import AnalyticsCharts from './AnalyticsCharts';
import AccountsList from './AccountsList';
import TotalRiskOverlay from './TotalRiskOverlay';

const WIDGET_COMPONENTS = {
    totalRisk: TotalRiskOverlay,
    overviewStats: OverviewStats,
    accountsList: AccountsList,
    recentTrades: RecentTrades,
    analyticsCharts: AnalyticsCharts,
};

const WIDGET_NAMES = {
    totalRisk: 'Risk Intelligence',
    overviewStats: 'Strategic Analytics',
    accountsList: 'Fleet Command',
    recentTrades: 'Mission History',
    analyticsCharts: 'Vector Analysis',
};

export default function Dashboard() {
    const { userProfile, updateUserProfile, openModal, t } = useData();
    const { confirm } = useNotifications();
    const [isEditing, setIsEditing] = useState(false);

    // Drag and Drop State
    const [draggedId, setDraggedId] = useState(null);
    const [dragOrder, setDragOrder] = useState([]);
    const dragNode = useRef(null);
    const containerRef = useRef(null);

    const config = useMemo(() => {
        return userProfile.dashboardConfig || {
            active: [
                { id: 'totalRisk', visible: true, order: 0 },
                { id: 'overviewStats', visible: true, order: 1 },
                { id: 'accountsList', visible: true, order: 2 },
                { id: 'recentTrades', visible: true, order: 3 },
                { id: 'analyticsCharts', visible: true, order: 4 }
            ],
            templates: {}
        };
    }, [userProfile.dashboardConfig]);

    // Initialize dragOrder from config
    useEffect(() => {
        setDragOrder([...config.active].sort((a, b) => a.order - b.order));
    }, [config.active]);

    const activeWidgets = useMemo(() => {
        return dragOrder;
    }, [dragOrder]);

    const toggleVisibility = (id) => {
        const newActive = config.active.map(w =>
            w.id === id ? { ...w, visible: !w.visible } : w
        );
        updateUserProfile({ dashboardConfig: { ...config, active: newActive } });
    };

    const handleDragStart = (e, id) => {
        if (!isEditing) return;
        setDraggedId(id);

        // Disable text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
    };

    const handleDragOver = (e, targetId) => {
        if (!draggedId || draggedId === targetId) return;

        // Threshold-based swap detection (optional but helpful for smoothness)
        // Here we just use the indices for a clean swap.

        const draggedIndex = dragOrder.findIndex(w => w.id === draggedId);
        const targetIndex = dragOrder.findIndex(w => w.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            const newOrder = [...dragOrder];
            const [removed] = newOrder.splice(draggedIndex, 1);
            newOrder.splice(targetIndex, 0, removed);

            // Re-assign orders
            const reordered = newOrder.map((w, idx) => ({ ...w, order: idx }));

            // Smooth View Transition
            if (document.startViewTransition) {
                document.startViewTransition(() => {
                    setDragOrder(reordered);
                });
            } else {
                setDragOrder(reordered);
            }
        }
    };

    const handleDragEnd = () => {
        if (!draggedId) return;

        // Final Save with potential transition
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                updateUserProfile({
                    dashboardConfig: {
                        ...config,
                        active: dragOrder
                    }
                });
                setDraggedId(null);
            });
        } else {
            updateUserProfile({
                dashboardConfig: {
                    ...config,
                    active: dragOrder
                }
            });
            setDraggedId(null);
        }

        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    };

    // Attach global mouseup to ensure drag ends even if released outside widget
    useEffect(() => {
        if (draggedId) {
            window.addEventListener('mouseup', handleDragEnd);
            return () => window.removeEventListener('mouseup', handleDragEnd);
        }
    }, [draggedId, dragOrder]);

    const resetToStandard = () => {
        const standard = [
            { id: 'totalRisk', visible: true, order: 0 },
            { id: 'overviewStats', visible: true, order: 1 },
            { id: 'accountsList', visible: true, order: 2 },
            { id: 'recentTrades', visible: true, order: 3 },
            { id: 'analyticsCharts', visible: true, order: 4 }
        ];
        setDragOrder(standard);
        updateUserProfile({
            dashboardConfig: {
                ...config,
                active: standard
            }
        });
    };

    const saveTemplate = (slot) => {
        const newTemplates = { ...config.templates, [slot]: JSON.parse(JSON.stringify(config.active)) };
        updateUserProfile({ dashboardConfig: { ...config, templates: newTemplates } });
    };

    const deleteTemplate = (slot) => {
        const newTemplates = { ...config.templates };
        delete newTemplates[slot];
        updateUserProfile({ dashboardConfig: { ...config, templates: newTemplates } });
    };

    const loadTemplate = (slot) => {
        if (config.templates[slot]) {
            const templateOrder = JSON.parse(JSON.stringify(config.templates[slot]));
            setDragOrder(templateOrder);
            updateUserProfile({ dashboardConfig: { ...config, active: templateOrder } });
        }
    };

    return (
        <div className="relative space-y-10 pb-20" ref={containerRef}>
            <ViewHeader
                title="Journal Overview"
                accent="Dashboard"
                subtitle="Tactical mission command & multi-unit synchronization"
                icon="dashboard"
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 hover:shadow-lg hover:shadow-primary/20 transition-all font-bold"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        {t('new_trade')}
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-6 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 ${isEditing
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.07]'
                            }`}
                    >
                        <span className={`material-symbols-outlined text-base ${isEditing ? 'animate-spin-slow' : ''}`}>{isEditing ? 'settings_suggest' : 'dashboard_customize'}</span>
                        {isEditing ? 'Confirm Setup' : 'Tactical Editor'}
                    </button>
                </div>
            </ViewHeader>

            {/* Editor Overlay */}
            {isEditing && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-[#161B30]/90 backdrop-blur-2xl border border-white/10 px-8 py-6 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center gap-10 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="flex items-center gap-4 border-r border-white/10 pr-10">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mr-2">Modules</span>
                        {[...config.active].sort((a, b) => a.id.localeCompare(b.id)).map(w => (
                            <button
                                key={w.id}
                                onClick={() => toggleVisibility(w.id)}
                                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${w.visible
                                    ? 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                    : 'bg-white/5 border-white/10 text-slate-600'
                                    }`}
                                title={WIDGET_NAMES[w.id]}
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {w.id === 'totalRisk' ? 'security' : w.id === 'overviewStats' ? 'query_stats' : w.id === 'accountsList' ? 'leaderboard' : w.id === 'recentTrades' ? 'history' : 'bar_chart'}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 border-r border-white/10 pr-10">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mr-2">Templates</span>
                        {[1, 2, 3, 4, 5].map(slot => (
                            <div key={slot} className="flex flex-col items-center gap-1">
                                <button
                                    onClick={() => loadTemplate(slot)}
                                    onContextMenu={async (e) => {
                                        e.preventDefault();
                                        if (config.templates[slot]) {
                                            const confirmed = await confirm({
                                                title: 'Purge Template',
                                                message: `Are you sure you want to permanently delete Strategic Template T${slot}? This action cannot be undone.`,
                                                confirmText: 'Purge Slot',
                                                cancelText: 'Abort',
                                                type: 'danger'
                                            });
                                            if (confirmed) {
                                                deleteTemplate(slot);
                                            }
                                        }
                                    }}
                                    className={`w-10 py-1.5 rounded-lg border text-[9px] font-black tracking-widest uppercase transition-all ${config.templates[slot] ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 cursor-help' : 'bg-white/5 border-white/10 text-slate-600'}`}
                                    title={config.templates[slot] ? 'Left click to load / Right click to delete' : 'Empty slot'}
                                >
                                    T{slot}
                                </button>
                                <button
                                    onClick={() => saveTemplate(slot)}
                                    className="text-[7px] font-black text-slate-600 hover:text-white uppercase tracking-tighter transition-all"
                                >
                                    Save
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={resetToStandard}
                        className="text-[10px] font-black text-rose-500 hover:text-rose-400 uppercase tracking-[0.2em] italic transition-all"
                    >
                        Hard Reset
                    </button>
                </div>
            )}

            {/* Dynamic Content */}
            <div className="space-y-6">
                {activeWidgets.filter(w => w.visible).map((w, index) => {
                    const Component = WIDGET_COMPONENTS[w.id];
                    if (!Component) return null;
                    const isDragged = draggedId === w.id;

                    return (
                        <div
                            key={w.id}
                            onMouseEnter={(e) => isEditing && draggedId && handleDragOver(e, w.id)}
                            className={`relative transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isEditing ? 'group' : ''}`}
                            style={{ viewTransitionName: `widget-${w.id}` }}
                        >
                            {/* Component Container */}
                            <div
                                className={`transition-all duration-500 ${isEditing ? 'p-1 rounded-[3rem]' : ''} ${isDragged
                                    ? 'scale-[1.02] shadow-[0_40px_80px_rgba(0,0,0,0.6)] z-[60] opacity-30 ring-2 ring-primary/40 -translate-y-2 pointer-events-none grayscale'
                                    : isEditing
                                        ? 'opacity-80 grayscale-[0.2] ring-1 ring-white/5 hover:opacity-100 hover:grayscale-0'
                                        : ''
                                    }`}
                                style={{ transformOrigin: 'center' }}
                            >
                                {isEditing && (
                                    <div
                                        onMouseDown={(e) => handleDragStart(e, w.id)}
                                        className={`absolute top-8 left-8 w-14 h-14 rounded-2xl bg-[#0F172A]/80 backdrop-blur-xl border border-white/20 flex items-center justify-center cursor-grab active:cursor-grabbing z-[70] transition-all hover:bg-primary/20 hover:border-primary/40 shadow-2xl ${isDragged ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
                                    >
                                        <div className="flex flex-col gap-1 items-center justify-center">
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                                            </div>
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                                            </div>
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <Component />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
