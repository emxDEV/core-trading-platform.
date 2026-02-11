import React, { useState, useEffect } from 'react';

const CurrencyInput = ({ value, onChange, className, placeholder, name, required, autoFocus, style }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [displayValue, setDisplayValue] = useState('');

    const format = (val) => {
        if (val === '' || val === null || val === undefined) return '';
        const num = parseFloat(val);
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num) + '$';
    };

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(format(value));
        } else if (displayValue === '' && value !== '') {
            // Initial focus shift
            setDisplayValue(String(value));
        }
    }, [isFocused, value]);

    const handleBlur = () => {
        setIsFocused(false);
        const numericValue = parseFloat(displayValue);
        const finalValue = isNaN(numericValue) ? '' : numericValue;

        if (name) {
            onChange({ target: { name, value: finalValue } });
        } else {
            onChange(finalValue);
        }
    };

    return (
        <input
            type="text"
            className={className}
            style={style}
            placeholder={placeholder}
            required={required}
            autoFocus={autoFocus}
            value={displayValue}
            onFocus={() => {
                setIsFocused(true);
                setDisplayValue(value === '' ? '' : String(value));
            }}
            onBlur={handleBlur}
            onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.-]/g, '');
                if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                    setDisplayValue(val);
                    const num = parseFloat(val);
                    const reactiveVal = isNaN(num) ? (val === '-' ? '-' : '') : num;
                    if (name) {
                        onChange({ target: { name, value: reactiveVal } });
                    } else {
                        onChange(reactiveVal);
                    }
                }
            }}
        />
    );
};

export default CurrencyInput;
