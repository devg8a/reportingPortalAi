// helper/StyledCurrency.tsx

import React, { CSSProperties } from 'react';

interface StyledCurrencyProps {
    value: string;

    // Font weights
    symbolWeight?: number;
    valueWeight?: number;

    // Font sizes
    fontSize?: string | number;      // 👈 Overall font size
    symbolSize?: string | number;    // 👈 Only symbol size (optional override)

    // Colors
    symbolColor?: string;
    valueColor?: string;

    // Other
    className?: string;
    style?: CSSProperties;
}

export const StyledCurrency: React.FC<StyledCurrencyProps> = ({
    value,
    symbolWeight = 400,
    valueWeight = 400,
    fontSize,           // 👈 NEW: overall size
    symbolSize,         // 👈 NEW: symbol specific size
    symbolColor = "#A1A1AA",
    valueColor,
    className = 'valueclass',
    style = {}
}) => {
    if (value === null || value === undefined) {
        return <span className={className} style={style}>-</span>;
    }

    const stringValue = String(value);

    const currencySymbols = ['$', '€', '£', '¥', '₹'];
    const firstChar = stringValue.charAt(0);
    const hasCurrencySymbol = currencySymbols.includes(firstChar);

    if (hasCurrencySymbol) {
        const symbol = firstChar;
        const number = stringValue.slice(1);

        // Symbol styles
        const symbolStyle: CSSProperties = {
            fontWeight: symbolWeight,
            fontSize: symbolSize || fontSize,  // symbol size or inherit overall
            ...(symbolColor && { color: symbolColor }),
            paddingRight: "2px",
        };

        // Container/value styles
        const containerStyle: CSSProperties = {
            ...style,
            fontWeight: valueWeight,
            ...(fontSize && { fontSize }),
            ...(valueColor && { color: valueColor }),

        };

        return (
            <span className={className} style={containerStyle}>
                <span style={symbolStyle}>{symbol}</span>
                {number}
            </span>
        );
    }

    // No currency symbol
    return (
        <span
            className={className}
            style={{
                ...style,
                fontWeight: valueWeight,
                ...(fontSize && { fontSize }),
                ...(valueColor && { color: valueColor }),

            }}
        >
            {stringValue}
        </span>
    );
};