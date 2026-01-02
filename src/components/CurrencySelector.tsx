'use client';

import { useState } from 'react';

export type Currency = 'USD' | 'SYP';

interface CurrencySelectorProps {
    value: Currency;
    onChange: (currency: Currency) => void;
    balances?: { USD: number; SYP: number };
    showBalances?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const CURRENCY_INFO = {
    USD: {
        symbol: '$',
        name: 'دولار',
        icon: '💵',
        color: 'green',
    },
    SYP: {
        symbol: 'ل.س',
        name: 'ليرة سورية',
        icon: '🇸🇾',
        color: 'primary',
    },
} as const;

export function formatCurrencyAmount(amount: number, currency: Currency): string {
    if (currency === 'SYP') {
        return `${Math.round(amount).toLocaleString('ar-SY')} ل.س`;
    }
    return `$${amount.toFixed(2)}`;
}

export default function CurrencySelector({
    value,
    onChange,
    balances,
    showBalances = true,
    disabled = false,
    size = 'md',
}: CurrencySelectorProps) {
    const sizeClasses = {
        sm: 'p-2 text-sm',
        md: 'p-4',
        lg: 'p-6 text-lg',
    };

    return (
        <div className="flex gap-3">
            {(['USD', 'SYP'] as const).map((currency) => {
                const info = CURRENCY_INFO[currency];
                const isSelected = value === currency;
                const balance = balances?.[currency];

                return (
                    <button
                        key={currency}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(currency)}
                        className={`
                            flex-1 rounded-xl border-2 transition-all duration-200
                            ${sizeClasses[size]}
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            ${isSelected
                                ? currency === 'USD'
                                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                                    : 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20'
                                : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                            }
                        `}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-2xl">{info.icon}</span>
                            <span className={`font-bold ${isSelected ? 'text-white' : 'text-dark-300'}`}>
                                {info.name}
                            </span>
                            {showBalances && balance !== undefined && (
                                <span className={`text-sm ${isSelected ? 'text-dark-200' : 'text-dark-400'}`}>
                                    رصيدك: {formatCurrencyAmount(balance, currency)}
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// Compact inline version for forms
export function CurrencyToggle({
    value,
    onChange,
    disabled = false,
}: {
    value: Currency;
    onChange: (currency: Currency) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex rounded-lg overflow-hidden border border-dark-700">
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange('USD')}
                className={`
                    px-4 py-2 text-sm font-medium transition-colors
                    ${value === 'USD'
                        ? 'bg-green-500 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                💵 USD
            </button>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange('SYP')}
                className={`
                    px-4 py-2 text-sm font-medium transition-colors
                    ${value === 'SYP'
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                🇸🇾 SYP
            </button>
        </div>
    );
}

// Display component for showing balances
export function DualBalanceDisplay({
    balances,
    variant = 'cards',
}: {
    balances: { USD: number; SYP: number };
    variant?: 'cards' | 'inline' | 'compact';
}) {
    if (variant === 'inline') {
        return (
            <div className="flex items-center gap-4 text-lg">
                <span className="text-green-400">
                    💵 {formatCurrencyAmount(balances.USD, 'USD')}
                </span>
                <span className="text-dark-600">|</span>
                <span className="text-primary-400">
                    🇸🇾 {formatCurrencyAmount(balances.SYP, 'SYP')}
                </span>
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div className="flex flex-col gap-1 text-sm">
                <span className="text-green-400">{formatCurrencyAmount(balances.USD, 'USD')}</span>
                <span className="text-primary-400">{formatCurrencyAmount(balances.SYP, 'SYP')}</span>
            </div>
        );
    }

    // Cards variant (default)
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/10 rounded-xl p-4 border border-green-800/30">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💵</span>
                    <span className="text-dark-400 text-sm">دولار أمريكي</span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                    {formatCurrencyAmount(balances.USD, 'USD')}
                </div>
            </div>
            <div className="bg-gradient-to-br from-primary-900/30 to-primary-800/10 rounded-xl p-4 border border-primary-800/30">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🇸🇾</span>
                    <span className="text-dark-400 text-sm">ليرة سورية</span>
                </div>
                <div className="text-2xl font-bold text-primary-400">
                    {formatCurrencyAmount(balances.SYP, 'SYP')}
                </div>
            </div>
        </div>
    );
}
