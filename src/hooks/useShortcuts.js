import { useEffect } from 'react';

/**
 * Tactical Shortcut System
 * Handles global keybindings for mxm-ops.
 */
export function useShortcuts(handlers, enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e) => {
            // ignore if user is typing in an input or textarea
            if (
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.isContentEditable
            ) {
                // Allow Escape even in inputs
                if (e.key === 'Escape') {
                    handlers.onEscape?.();
                }
                return;
            }

            const key = e.key.toLowerCase();
            const cmdOrCtrl = e.metaKey || e.ctrlKey;

            // N -> New Trade
            if (key === 'n' && !cmdOrCtrl) {
                e.preventDefault();
                handlers.onNewTrade?.();
            }

            // 1-4 -> View Switching
            if (!cmdOrCtrl && ['1', '2', '3', '4'].includes(key)) {
                e.preventDefault();
                const views = ['journal', 'copy', 'analytics', 'calendar'];
                handlers.onViewSwitch?.(views[parseInt(key) - 1]);
            }

            // S -> Settings
            if (key === 's' && !cmdOrCtrl) {
                e.preventDefault();
                handlers.onSettings?.();
            }

            // Escape -> Close Modals
            if (e.key === 'Escape') {
                handlers.onEscape?.();
            }

            // Cmd+K -> Command Center (Placeholder for future)
            if (key === 'k' && cmdOrCtrl) {
                e.preventDefault();
                handlers.onCommandCenter?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers, enabled]);
}
