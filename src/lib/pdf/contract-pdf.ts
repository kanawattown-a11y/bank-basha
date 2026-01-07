'use client';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ContractData {
    contractNumber: string;
    title: string;
    titleAr: string | null;
    type: string;
    startDate: string;
    endDate: string | null;
    status: string;
    depositCommission: number | null;
    withdrawCommission: number | null;
    creditLimit: number | null;
    clauses: string | null;
    agent?: {
        agentCode: string;
        businessName: string;
        businessNameAr: string | null;
        user?: {
            fullName: string;
            fullNameAr: string | null;
            phone: string;
        };
    };
    signedByAdmin: boolean;
    signedByAgent: boolean;
    adminSignedAt: string | null;
    agentSignedAt: string | null;
    createdAt: string;
}

interface Clause {
    title: string;
    titleAr: string;
    content: string;
    contentAr: string;
}

const getTypeLabelAr = (type: string): string => {
    const labels: Record<string, string> = {
        AGENT_AGREEMENT: 'عقد وكالة',
        NDA: 'اتفاقية عدم الإفصاح',
        SERVICE_AGREEMENT: 'اتفاقية خدمات',
        AMENDMENT: 'ملحق تعديل العقد',
    };
    return labels[type] || type;
};

const formatDateAr = (dateString: string): string => {
    const date = new Date(dateString);
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}م`;
};

// Bank Basha Brand Colors (from tailwind.config.ts)
const BRAND = {
    primary: '#FEC00F',      // Main yellow/gold
    primaryDark: '#E5AD0E',
    dark: '#0d0d0d',
    darkCard: '#1a1a1a',
    gray: '#888888',
    white: '#ffffff',
    green: '#10B981',
};

export async function generateContractPDF(contract: ContractData): Promise<void> {
    // Parse clauses
    let clauses: Clause[] = [];
    if (contract.clauses) {
        try {
            clauses = JSON.parse(contract.clauses);
        } catch {
            clauses = [];
        }
    }

    const agentName = contract.agent?.user?.fullNameAr || contract.agent?.user?.fullName || 'الوكيل';
    const businessName = contract.agent?.businessNameAr || contract.agent?.businessName || '';
    const titleAr = contract.titleAr || getTypeLabelAr(contract.type);

    // Create HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Cairo', 'Tahoma', sans-serif;
                background: ${BRAND.dark};
                color: ${BRAND.white};
                direction: rtl;
                padding: 0;
            }
            .page {
                width: 210mm;
                min-height: 297mm;
                padding: 15mm;
                background: ${BRAND.dark};
                margin: 0 auto;
            }
            .header {
                background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%);
                padding: 30px;
                border-radius: 16px;
                text-align: center;
                margin-bottom: 25px;
            }
            .logo {
                font-size: 36px;
                font-weight: 800;
                color: ${BRAND.dark};
                margin-bottom: 5px;
            }
            .logo-sub {
                font-size: 14px;
                color: ${BRAND.dark};
                opacity: 0.8;
            }
            .contract-title {
                background: ${BRAND.darkCard};
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                margin-bottom: 25px;
                border: 1px solid #333;
            }
            .contract-title h1 {
                font-size: 28px;
                font-weight: 700;
                color: ${BRAND.primary};
                margin-bottom: 8px;
            }
            .contract-title .type {
                font-size: 14px;
                color: ${BRAND.gray};
            }
            .contract-number {
                display: inline-block;
                background: ${BRAND.primary};
                color: ${BRAND.dark};
                padding: 8px 24px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                margin-top: 10px;
            }
            .section {
                background: ${BRAND.darkCard};
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid #333;
            }
            .section-title {
                font-size: 16px;
                font-weight: 700;
                color: ${BRAND.primary};
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid ${BRAND.primary};
            }
            .parties-grid {
                display: flex;
                gap: 20px;
            }
            .party-box {
                flex: 1;
                background: ${BRAND.dark};
                border-radius: 10px;
                padding: 15px;
                border: 2px solid;
            }
            .party-box.first {
                border-color: ${BRAND.primary};
            }
            .party-box.second {
                border-color: ${BRAND.green};
            }
            .party-label {
                font-size: 12px;
                margin-bottom: 8px;
            }
            .party-box.first .party-label {
                color: ${BRAND.primary};
            }
            .party-box.second .party-label {
                color: ${BRAND.green};
            }
            .party-name {
                font-size: 18px;
                font-weight: 700;
                color: ${BRAND.white};
                margin-bottom: 5px;
            }
            .party-detail {
                font-size: 13px;
                color: ${BRAND.gray};
            }
            .details-grid {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }
            .detail-item {
                flex: 1;
                min-width: 150px;
                background: ${BRAND.dark};
                padding: 12px;
                border-radius: 8px;
            }
            .detail-label {
                font-size: 11px;
                color: ${BRAND.gray};
                margin-bottom: 5px;
            }
            .detail-value {
                font-size: 14px;
                color: ${BRAND.white};
                font-weight: 600;
            }
            .financial-box {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
                border: 1px solid ${BRAND.green};
                border-radius: 10px;
                padding: 15px;
                margin-top: 15px;
            }
            .financial-title {
                color: ${BRAND.green};
                font-size: 13px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .financial-grid {
                display: flex;
                gap: 20px;
            }
            .financial-item {
                text-align: center;
            }
            .financial-value {
                font-size: 20px;
                font-weight: 700;
                color: ${BRAND.white};
            }
            .financial-label {
                font-size: 11px;
                color: ${BRAND.gray};
            }
            .clause {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #333;
            }
            .clause:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .clause-number {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                background: ${BRAND.primary};
                color: ${BRAND.dark};
                border-radius: 50%;
                font-weight: 700;
                font-size: 14px;
                margin-left: 10px;
            }
            .clause-title {
                font-size: 15px;
                font-weight: 700;
                color: ${BRAND.white};
                display: inline;
            }
            .clause-content {
                font-size: 13px;
                color: ${BRAND.gray};
                line-height: 1.8;
                margin-top: 10px;
                padding-right: 38px;
            }
            .signatures-grid {
                display: flex;
                gap: 20px;
            }
            .signature-box {
                flex: 1;
                background: ${BRAND.dark};
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                border: 2px solid;
            }
            .signature-box.first {
                border-color: ${BRAND.primary};
            }
            .signature-box.second {
                border-color: ${BRAND.green};
            }
            .signature-party {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            .signature-box.first .signature-party {
                color: ${BRAND.primary};
            }
            .signature-box.second .signature-party {
                color: ${BRAND.green};
            }
            .signature-name {
                font-size: 16px;
                font-weight: 700;
                color: ${BRAND.white};
                margin-bottom: 15px;
            }
            .signature-line {
                border-top: 1px dashed ${BRAND.gray};
                padding-top: 10px;
                margin-top: 20px;
            }
            .signed-badge {
                display: inline-block;
                background: ${BRAND.green};
                color: ${BRAND.dark};
                padding: 8px 20px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
            }
            .pending-badge {
                color: ${BRAND.gray};
                font-size: 12px;
            }
            .signature-date {
                font-size: 11px;
                color: ${BRAND.gray};
                margin-top: 8px;
            }
            .footer {
                text-align: center;
                padding-top: 20px;
                margin-top: 20px;
                border-top: 1px solid #333;
            }
            .footer-text {
                font-size: 11px;
                color: ${BRAND.gray};
            }
        </style>
    </head>
    <body>
        <div class="page" id="contract-page">
            <!-- Header -->
            <div class="header">
                <div class="logo">بنك باشا</div>
                <div class="logo-sub">Bank Basha - منصة الخدمات المصرفية الرقمية</div>
            </div>

            <!-- Contract Title -->
            <div class="contract-title">
                <h1>${titleAr}</h1>
                <div class="type">${getTypeLabelAr(contract.type)}</div>
                <div class="contract-number">رقم العقد: ${contract.contractNumber}</div>
            </div>

            <!-- Parties Section -->
            <div class="section">
                <div class="section-title">أطراف العقد</div>
                <div class="parties-grid">
                    <div class="party-box first">
                        <div class="party-label">الطرف الأول</div>
                        <div class="party-name">بنك باشا</div>
                        <div class="party-detail">منصة الخدمات المصرفية الرقمية</div>
                    </div>
                    <div class="party-box second">
                        <div class="party-label">الطرف الثاني (الوكيل)</div>
                        <div class="party-name">${agentName}</div>
                        <div class="party-detail">${businessName} | ${contract.agent?.agentCode || ''}</div>
                    </div>
                </div>
            </div>

            <!-- Contract Details -->
            <div class="section">
                <div class="section-title">تفاصيل العقد</div>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">تاريخ بداية العقد</div>
                        <div class="detail-value">${formatDateAr(contract.startDate)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">تاريخ انتهاء العقد</div>
                        <div class="detail-value">${contract.endDate ? formatDateAr(contract.endDate) : 'غير محدد (مفتوح)'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">تاريخ التحرير</div>
                        <div class="detail-value">${formatDateAr(contract.createdAt)}</div>
                    </div>
                </div>
                ${(contract.depositCommission !== null || contract.withdrawCommission !== null || contract.creditLimit !== null) ? `
                <div class="financial-box">
                    <div class="financial-title">الشروط المالية</div>
                    <div class="financial-grid">
                        ${contract.depositCommission !== null ? `
                        <div class="financial-item">
                            <div class="financial-value">${contract.depositCommission}%</div>
                            <div class="financial-label">عمولة الإيداع</div>
                        </div>
                        ` : ''}
                        ${contract.withdrawCommission !== null ? `
                        <div class="financial-item">
                            <div class="financial-value">${contract.withdrawCommission}%</div>
                            <div class="financial-label">عمولة السحب</div>
                        </div>
                        ` : ''}
                        ${contract.creditLimit !== null ? `
                        <div class="financial-item">
                            <div class="financial-value">$${contract.creditLimit.toLocaleString()}</div>
                            <div class="financial-label">حد الائتمان</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            </div>

            ${clauses.length > 0 ? `
            <!-- Clauses -->
            <div class="section">
                <div class="section-title">بنود وشروط العقد</div>
                ${clauses.map((clause, index) => `
                <div class="clause">
                    <span class="clause-number">${index + 1}</span>
                    <span class="clause-title">${clause.titleAr || clause.title}</span>
                    <div class="clause-content">${clause.contentAr || clause.content}</div>
                </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- Signatures -->
            <div class="section">
                <div class="section-title">التوقيعات</div>
                <div class="signatures-grid">
                    <div class="signature-box first">
                        <div class="signature-party">الطرف الأول</div>
                        <div class="signature-name">بنك باشا</div>
                        ${contract.signedByAdmin ? `
                        <div class="signed-badge">✓ تم التوقيع</div>
                        ${contract.adminSignedAt ? `<div class="signature-date">${formatDateAr(contract.adminSignedAt)}</div>` : ''}
                        ` : `
                        <div class="signature-line">
                            <div class="pending-badge">بانتظار التوقيع</div>
                        </div>
                        `}
                    </div>
                    <div class="signature-box second">
                        <div class="signature-party">الطرف الثاني</div>
                        <div class="signature-name">${agentName}</div>
                        ${contract.signedByAgent ? `
                        <div class="signed-badge">✓ تم التوقيع</div>
                        ${contract.agentSignedAt ? `<div class="signature-date">${formatDateAr(contract.agentSignedAt)}</div>` : ''}
                        ` : `
                        <div class="signature-line">
                            <div class="pending-badge">بانتظار التوقيع</div>
                        </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <div class="footer-text">تم إنشاء هذا العقد بواسطة منصة بنك باشا الرقمية | Bank Basha Digital Platform</div>
                <div class="footer-text">العقد رقم: ${contract.contractNumber}</div>
            </div>
        </div>
    </body>
    </html>
    `;

    // Create a hidden container
    const container = document.createElement('div');
    container.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 210mm;';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Wait for fonts to load
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const element = container.querySelector('#contract-page') as HTMLElement;

        // Create canvas from HTML
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: BRAND.dark,
        });

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const ratio = pdfWidth / (imgWidth / 2); // /2 because scale is 2
        const scaledHeight = (imgHeight / 2) * ratio;

        // Add pages as needed
        let yOffset = 0;
        while (yOffset < scaledHeight) {
            if (yOffset > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'JPEG', 0, -yOffset, pdfWidth, scaledHeight);
            yOffset += pdfHeight;
        }

        // Save PDF
        const fileName = `عقد_${contract.contractNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

    } finally {
        // Clean up
        document.body.removeChild(container);
    }
}
