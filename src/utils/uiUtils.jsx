import React, { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Observer System to prevent UI elements from being cut off
export const useBoundaryObserver = (coords, padding = 16) => {
    const [adjustedStyles, setAdjustedStyles] = useState({
        position: 'fixed',
        top: coords?.y || 0,
        left: coords?.x || 0,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 99999,
    });
    const ref = useRef(null);

    useLayoutEffect(() => {
        if (!coords || !ref.current) return;

        const element = ref.current;
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let { x, y } = coords;
        let finalX = x;
        let finalY = y;

        // Horizontal check
        if (x + rect.width > viewportWidth - padding) {
            // If it's a context menu or right-aligned popup, flip to left of anchor if possible
            if (coords.anchorSide === 'right') {
                finalX = x - rect.width - (coords.anchorGap || 24);
            } else {
                finalX = viewportWidth - rect.width - padding;
            }
        }
        if (finalX < padding) finalX = padding;

        // Vertical check — Strictly "drop down" (pin top to y, shrink height if needed)
        finalY = y;
        let elementMaxHeight = '90vh'; // Default high limit

        const availableBelow = viewportHeight - y - padding;

        if (rect.height > availableBelow) {
            // If it doesn't fit below, and we want to stay "underneath", we must constrain height
            // BUT if available space is too tiny (e.g. < 120px), then we allow it to shift up as fallback
            if (availableBelow > 120) {
                elementMaxHeight = `${availableBelow}px`;
            } else {
                // Fallback: limited space below, shift up so it's visible elsewhere
                finalY = Math.max(padding, viewportHeight - rect.height - padding);
            }
        }

        setAdjustedStyles({
            position: 'fixed',
            top: finalY,
            left: finalX,
            maxHeight: elementMaxHeight,
            opacity: 1,
            zIndex: 99999,
            overflowY: 'auto',
            pointerEvents: 'auto',
            transition: 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'scale(1)',
            transformOrigin: 'top left'
        });
    }, [coords, padding]);

    return { ref, style: adjustedStyles };
};

export const SmartPortal = ({ coords, children, padding = 16, className = "" }) => {
    const { ref, style } = useBoundaryObserver(coords, padding);
    return createPortal(
        <div ref={ref} style={style} className={className} onMouseDown={e => e.stopPropagation()}>
            {children}
        </div>,
        document.body
    );
};

export const ValidationTooltip = ({ message, isVisible, anchorRef }) => {
    const [coords, setCoords] = useState(null);

    useLayoutEffect(() => {
        if (isVisible && anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setCoords({
                x: rect.left + rect.width / 2,
                y: rect.top - 8,
            });
        }
    }, [isVisible, anchorRef]);

    if (!isVisible || !coords) return null;

    return createPortal(
        <div
            className="fixed z-[200000] -translate-x-1/2 -translate-y-full pointer-events-none animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300"
            style={{ left: coords.x, top: coords.y }}
        >
            <div className="bg-rose-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xl flex items-center gap-2 whitespace-nowrap">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {message}
                <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-rose-500"></div>
            </div>
        </div>,
        document.body
    );
};

