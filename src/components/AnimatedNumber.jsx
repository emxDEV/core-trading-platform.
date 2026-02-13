import React, { useState, useEffect, useRef } from 'react';

/**
 * AnimatedNumber Component
 * Smoothly interpolates from a previous value to a new value.
 * @param {number} value - The target number to display.
 * @param {number} duration - Animation duration in ms (default 1000).
 * @param {function} formatter - Function to format the number (e.g., currency, percentage).
 * @param {string} className - Addition CSS classes.
 */
export default function AnimatedNumber({ value, duration = 2000, formatter = (n) => n, className = "" }) {
    const targetValue = Number(value) || 0;
    const [displayValue, setDisplayValue] = useState(targetValue);
    const startValue = useRef(targetValue);
    const startTime = useRef(null);
    const requestRef = useRef(null);

    useEffect(() => {
        // Prepare for the next animation
        startValue.current = displayValue;
        startTime.current = null;

        const animate = (time) => {
            if (!startTime.current) startTime.current = time;
            const progress = Math.min((time - startTime.current) / duration, 1);

            // Power-of-10 out for extreme "long tail" deceleration
            const easeOut = 1 - Math.pow(1 - progress, 10);

            const current = startValue.current + (targetValue - startValue.current) * easeOut;
            setDisplayValue(current);

            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(requestRef.current);
    }, [targetValue, duration]);

    const safeDisplayValue = Number.isFinite(displayValue) ? displayValue : 0;

    return (
        <span className={className}>
            {formatter(safeDisplayValue)}
        </span>
    );
}
