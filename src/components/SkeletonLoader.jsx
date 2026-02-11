import React from 'react';

/**
 * Tactical Shimmer Components
 * Premium skeleton loaders for mxm-ops.
 */

export const SkeletonBox = ({ className = '', height = '20px', width = '100%' }) => (
    <div
        className={`skeleton-shimmer rounded-lg ${className}`}
        style={{ height, width }}
    />
);

export const SkeletonAccountCard = () => (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
                <SkeletonBox height="32px" width="32px" className="rounded-lg" />
                <div className="space-y-1.5">
                    <SkeletonBox height="14px" width="80px" />
                    <SkeletonBox height="10px" width="50px" />
                </div>
            </div>
            <SkeletonBox height="20px" width="45px" />
        </div>
        <div className="space-y-2">
            <SkeletonBox height="28px" width="120px" />
            <SkeletonBox height="14px" width="60px" />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <SkeletonBox height="40px" className="rounded-lg" />
            <SkeletonBox height="40px" className="rounded-lg" />
        </div>
        <div className="space-y-1">
            <div className="flex justify-between">
                <SkeletonBox height="8px" width="40px" />
                <SkeletonBox height="8px" width="40px" />
            </div>
            <SkeletonBox height="6px" />
        </div>
    </div>
);

export const SkeletonChart = () => (
    <div className="bg-white dark:bg-surface-dark p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
            <SkeletonBox height="14px" width="100px" />
            <div className="flex gap-1">
                <SkeletonBox height="6px" width="6px" className="rounded-full" />
                <SkeletonBox height="6px" width="6px" className="rounded-full" />
            </div>
        </div>
        <div className="flex-1 flex items-end justify-between gap-1 h-32">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                <SkeletonBox
                    key={i}
                    height={`${Math.random() * 50 + 20}%`}
                    className="flex-1 rounded-t-lg"
                />
            ))}
        </div>
        <div className="mt-6 flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <SkeletonBox height="8px" width="60px" />
            <SkeletonBox height="8px" width="60px" />
        </div>
    </div>
);
