import React from 'react';

const ViewHeader = ({
    title,
    accent,
    subtitle,
    icon,
    iconColor = "text-primary",
    iconBg = "bg-primary/20",
    iconBorder = "border-primary/30",
    children
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 mb-8">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-[1.25rem] ${iconBg} border ${iconBorder} flex items-center justify-center shadow-lg shadow-primary/10`}>
                    <span className={`material-symbols-outlined ${iconColor} text-[28px]`}>{icon}</span>
                </div>
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                        {title} <span className={`${iconColor} text-xl not-italic ml-2 opacity-50 tracking-widest uppercase`}>{accent}</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-1.5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-0.5">{subtitle}</p>
                        <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Cmd + K</span>
                            <span className="material-symbols-outlined text-[10px] text-slate-500">terminal</span>
                        </div>
                    </div>
                </div>
            </div>

            {children && (
                <div className="flex items-center gap-4">
                    {children}
                </div>
            )}
        </div>
    );
};

export default ViewHeader;
