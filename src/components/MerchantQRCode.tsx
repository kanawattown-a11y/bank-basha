'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';

interface Props {
    value: string;
    size?: number;
    showLogo?: boolean;
    businessName?: string;
    merchantCode?: string;
}

export default function MerchantQRCode({
    value,
    size = 200,
    showLogo = true,
    businessName,
    merchantCode
}: Props) {
    const t = useTranslations();

    return (
        <div className="flex flex-col items-center bg-white p-6 rounded-3xl shadow-2xl border border-dark-800/10">
            {/* Main QR Container */}
            <div className="p-4 bg-white rounded-2xl relative">
                <QRCodeSVG
                    value={value}
                    size={size}
                    level="H" // High error correction
                    bgColor="#FFFFFF"
                    fgColor="#0F0F0F"
                    marginSize={1}
                    imageSettings={showLogo ? {
                        src: '/wallet.png',
                        height: size * 0.22,
                        width: size * 0.22,
                        excavate: true,
                    } : undefined}
                />
            </div>

            {/* Branding & Info */}
            <div className="mt-4 text-center">
                <div className="text-sm font-bold text-dark-900 tracking-widest uppercase">BANK BASHA</div>
                {businessName && (
                    <div className="text-xs font-semibold text-dark-500 mt-1">{businessName}</div>
                )}
            </div>

            {/* Merchant Code Badge */}
            <div className="mt-6 w-full">
                <div className="bg-dark-950 py-3 px-6 rounded-2xl flex flex-col items-center justify-center border border-dark-800 hover:border-primary-500/50 transition-colors">
                    <span className="text-[10px] text-dark-500 font-bold uppercase tracking-widest mb-1">{t('merchant.qr.merchantCode')}</span>
                    <span className="text-xl font-mono font-bold text-white tracking-wider">
                        {merchantCode || value}
                    </span>
                </div>
            </div>

            <div className="mt-4 text-[10px] text-dark-400 font-medium uppercase tracking-widest">
                {t('merchant.qr.scanToPay')}
            </div>
        </div>
    );
}
