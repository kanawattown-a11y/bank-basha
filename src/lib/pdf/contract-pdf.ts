'use client';

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

const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
        AGENT_AGREEMENT: 'Agent Agreement',
        NDA: 'Non-Disclosure Agreement',
        SERVICE_AGREEMENT: 'Service Agreement',
        AMENDMENT: 'Contract Amendment',
    };
    return labels[type] || type;
};

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
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatDateEn = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Bank Basha Brand Colors
const BRAND = {
    primary: [59, 130, 246] as [number, number, number],      // #3B82F6 - Blue
    primaryDark: [37, 99, 235] as [number, number, number],   // #2563EB
    dark: [15, 23, 42] as [number, number, number],           // #0F172A - Dark background
    darkCard: [30, 41, 59] as [number, number, number],       // #1E293B
    gray: [100, 116, 139] as [number, number, number],        // #64748B
    white: [255, 255, 255] as [number, number, number],
    green: [16, 185, 129] as [number, number, number],        // #10B981
    gold: [245, 158, 11] as [number, number, number],         // #F59E0B
};

export async function generateContractPDF(contract: ContractData): Promise<void> {
    // Create PDF document (A4 size)
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Helper function to add new page if needed
    const checkNewPage = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - margin - 15) {
            // Add footer before new page
            addFooter();
            doc.addPage();
            y = margin + 10;
            addHeader();
            return true;
        }
        return false;
    };

    // Add header to each page
    const addHeader = () => {
        // Top gradient bar
        doc.setFillColor(...BRAND.primary);
        doc.rect(0, 0, pageWidth, 8, 'F');

        // Bank name on top right
        doc.setFontSize(10);
        doc.setTextColor(...BRAND.gray);
        doc.text('Bank Basha', pageWidth - margin, 15, { align: 'right' });
    };

    // Add footer to each page
    const addFooter = () => {
        const footerY = pageHeight - 10;
        doc.setDrawColor(...BRAND.gray);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        doc.setFontSize(8);
        doc.setTextColor(...BRAND.gray);
        doc.text(`Bank Basha | Contract #${contract.contractNumber}`, margin, footerY);
        doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - margin, footerY, { align: 'right' });
    };

    // =====================
    // COVER PAGE
    // =====================

    // Top gradient bar
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Logo / Brand Name
    doc.setFontSize(36);
    doc.setTextColor(...BRAND.white);
    doc.text('Bank Basha', pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(12);
    doc.text('Digital Banking Platform', pageWidth / 2, 40, { align: 'center' });

    y = 70;

    // Contract Type Badge
    doc.setFillColor(...BRAND.darkCard);
    doc.roundedRect(pageWidth / 2 - 40, y, 80, 12, 6, 6, 'F');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.primary);
    doc.text(getTypeLabel(contract.type), pageWidth / 2, y + 8, { align: 'center' });
    y += 25;

    // Contract Title (Arabic)
    const titleAr = contract.titleAr || getTypeLabelAr(contract.type);
    doc.setFontSize(24);
    doc.setTextColor(...BRAND.dark);
    doc.text(titleAr, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Contract Title (English)
    const titleEn = contract.title || getTypeLabel(contract.type);
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.gray);
    doc.text(titleEn, pageWidth / 2, y, { align: 'center' });
    y += 25;

    // Contract Number Box
    doc.setFillColor(...BRAND.primary);
    doc.roundedRect(pageWidth / 2 - 35, y, 70, 10, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.white);
    doc.text(`#${contract.contractNumber}`, pageWidth / 2, y + 7, { align: 'center' });
    y += 25;

    // =====================
    // PARTIES SECTION
    // =====================

    // Section header
    doc.setFillColor(...BRAND.darkCard);
    doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.white);
    doc.text('PARTIES | Taraflar', margin + 5, y + 7);
    y += 18;

    // First Party Box
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentWidth / 2 - 5, 35, 3, 3, 'S');

    doc.setFontSize(9);
    doc.setTextColor(...BRAND.primary);
    doc.text('FIRST PARTY', margin + 5, y + 8);
    doc.setTextColor(...BRAND.gray);
    doc.text('Taraf al-Awwal', margin + 35, y + 8);

    doc.setFontSize(12);
    doc.setTextColor(...BRAND.dark);
    doc.text('Bank Basha', margin + 5, y + 20);

    doc.setFontSize(9);
    doc.setTextColor(...BRAND.gray);
    doc.text('Digital Banking Platform', margin + 5, y + 28);

    // Second Party Box
    const secondBoxX = margin + contentWidth / 2 + 5;
    doc.setDrawColor(...BRAND.gold);
    doc.roundedRect(secondBoxX, y, contentWidth / 2 - 5, 35, 3, 3, 'S');

    doc.setFontSize(9);
    doc.setTextColor(...BRAND.gold);
    doc.text('SECOND PARTY', secondBoxX + 5, y + 8);
    doc.setTextColor(...BRAND.gray);
    doc.text('Taraf al-Thani', secondBoxX + 42, y + 8);

    doc.setFontSize(12);
    doc.setTextColor(...BRAND.dark);
    const agentName = contract.agent?.user?.fullNameAr || contract.agent?.user?.fullName || 'Agent';
    doc.text(agentName, secondBoxX + 5, y + 20);

    doc.setFontSize(9);
    doc.setTextColor(...BRAND.gray);
    const businessName = contract.agent?.businessNameAr || contract.agent?.businessName || '';
    doc.text(`${businessName} | ${contract.agent?.agentCode || ''}`, secondBoxX + 5, y + 28);

    y += 45;

    // =====================
    // CONTRACT DETAILS
    // =====================

    // Section header
    doc.setFillColor(...BRAND.darkCard);
    doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.white);
    doc.text('CONTRACT DETAILS | Tafasil al-Aqd', margin + 5, y + 7);
    y += 18;

    // Details Grid
    const detailsData = [
        { label: 'Contract Date', labelAr: 'Tarikh al-Aqd', value: formatDateEn(contract.startDate), valueAr: formatDateAr(contract.startDate) },
        { label: 'Expiry Date', labelAr: 'Tarikh al-Intihaa', value: contract.endDate ? formatDateEn(contract.endDate) : 'Open-ended', valueAr: contract.endDate ? formatDateAr(contract.endDate) : 'Maftuh' },
    ];

    detailsData.forEach((detail, idx) => {
        const boxX = margin + (idx % 2) * (contentWidth / 2);
        const boxWidth = contentWidth / 2 - 5;

        doc.setFillColor(245, 247, 250);
        doc.roundedRect(boxX, y, boxWidth, 18, 2, 2, 'F');

        doc.setFontSize(8);
        doc.setTextColor(...BRAND.gray);
        doc.text(`${detail.label} | ${detail.labelAr}`, boxX + 5, y + 6);

        doc.setFontSize(11);
        doc.setTextColor(...BRAND.dark);
        doc.text(detail.value, boxX + 5, y + 14);
    });

    y += 25;

    // Financial Terms (if any)
    if (contract.depositCommission !== null || contract.withdrawCommission !== null || contract.creditLimit !== null) {
        doc.setFillColor(236, 253, 245); // Light green
        doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F');

        doc.setFontSize(9);
        doc.setTextColor(...BRAND.green);
        doc.text('FINANCIAL TERMS | Shurut Maliya', margin + 5, y + 8);

        doc.setFontSize(10);
        doc.setTextColor(...BRAND.dark);

        let finX = margin + 5;
        if (contract.depositCommission !== null) {
            doc.text(`Deposit: ${contract.depositCommission}%`, finX, y + 18);
            finX += 45;
        }
        if (contract.withdrawCommission !== null) {
            doc.text(`Withdraw: ${contract.withdrawCommission}%`, finX, y + 18);
            finX += 50;
        }
        if (contract.creditLimit !== null) {
            doc.text(`Credit Limit: $${contract.creditLimit.toLocaleString()}`, finX, y + 18);
        }

        y += 32;
    }

    // =====================
    // CLAUSES
    // =====================

    let clauses: Clause[] = [];
    if (contract.clauses) {
        try {
            clauses = JSON.parse(contract.clauses);
        } catch {
            clauses = [];
        }
    }

    if (clauses.length > 0) {
        checkNewPage(40);

        // Section header
        doc.setFillColor(...BRAND.darkCard);
        doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');
        doc.setFontSize(11);
        doc.setTextColor(...BRAND.white);
        doc.text('CONTRACT CLAUSES | Bunud al-Aqd', margin + 5, y + 7);
        y += 18;

        clauses.forEach((clause, index) => {
            checkNewPage(35);

            // Clause number badge
            doc.setFillColor(...BRAND.primary);
            doc.circle(margin + 5, y + 3, 4, 'F');
            doc.setFontSize(8);
            doc.setTextColor(...BRAND.white);
            doc.text(`${index + 1}`, margin + 5, y + 4.5, { align: 'center' });

            // Clause title
            doc.setFontSize(11);
            doc.setTextColor(...BRAND.dark);
            const clauseTitle = clause.titleAr || clause.title;
            doc.text(clauseTitle, margin + 12, y + 5);
            y += 10;

            // Clause content
            doc.setFontSize(9);
            doc.setTextColor(...BRAND.gray);

            const content = clause.contentAr || clause.content || '';
            const lines = doc.splitTextToSize(content, contentWidth - 15);

            lines.forEach((line: string) => {
                if (checkNewPage(8)) {
                    y += 3;
                }
                doc.text(line, margin + 12, y);
                y += 5;
            });

            y += 8;
        });
    }

    // =====================
    // SIGNATURES
    // =====================

    // Make sure signatures are at bottom or on new page
    if (y > pageHeight - 80) {
        addFooter();
        doc.addPage();
        y = margin + 10;
        addHeader();
    }

    y = Math.max(y + 10, pageHeight - 75);

    // Section header
    doc.setFillColor(...BRAND.darkCard);
    doc.roundedRect(margin, y, contentWidth, 10, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.white);
    doc.text('SIGNATURES | Tawqiat', margin + 5, y + 7);
    y += 18;

    // Signature boxes
    const sigBoxWidth = (contentWidth - 10) / 2;

    // Bank Signature
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(1.5);
    doc.roundedRect(margin, y, sigBoxWidth, 45, 3, 3, 'S');

    doc.setFontSize(10);
    doc.setTextColor(...BRAND.primary);
    doc.text('Bank Basha', margin + 5, y + 10);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.gray);
    doc.text('First Party | Taraf al-Awwal', margin + 5, y + 17);

    if (contract.signedByAdmin) {
        doc.setFillColor(...BRAND.green);
        doc.roundedRect(margin + 5, y + 25, 40, 8, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(...BRAND.white);
        doc.text('SIGNED', margin + 25, y + 30.5, { align: 'center' });
        if (contract.adminSignedAt) {
            doc.setFontSize(7);
            doc.setTextColor(...BRAND.gray);
            doc.text(formatDateEn(contract.adminSignedAt), margin + 5, y + 40);
        }
    } else {
        doc.setDrawColor(...BRAND.gray);
        doc.setLineWidth(0.5);
        doc.line(margin + 10, y + 35, margin + sigBoxWidth - 10, y + 35);
        doc.setFontSize(8);
        doc.setTextColor(...BRAND.gray);
        doc.text('Signature pending...', margin + sigBoxWidth / 2, y + 42, { align: 'center' });
    }

    // Agent Signature
    const agentBoxX = margin + sigBoxWidth + 10;
    doc.setDrawColor(...BRAND.gold);
    doc.roundedRect(agentBoxX, y, sigBoxWidth, 45, 3, 3, 'S');

    doc.setFontSize(10);
    doc.setTextColor(...BRAND.gold);
    doc.text(agentName, agentBoxX + 5, y + 10);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.gray);
    doc.text('Second Party | Taraf al-Thani', agentBoxX + 5, y + 17);

    if (contract.signedByAgent) {
        doc.setFillColor(...BRAND.green);
        doc.roundedRect(agentBoxX + 5, y + 25, 40, 8, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(...BRAND.white);
        doc.text('SIGNED', agentBoxX + 25, y + 30.5, { align: 'center' });
        if (contract.agentSignedAt) {
            doc.setFontSize(7);
            doc.setTextColor(...BRAND.gray);
            doc.text(formatDateEn(contract.agentSignedAt), agentBoxX + 5, y + 40);
        }
    } else {
        doc.setDrawColor(...BRAND.gray);
        doc.setLineWidth(0.5);
        doc.line(agentBoxX + 10, y + 35, agentBoxX + sigBoxWidth - 10, y + 35);
        doc.setFontSize(8);
        doc.setTextColor(...BRAND.gray);
        doc.text('Signature pending...', agentBoxX + sigBoxWidth / 2, y + 42, { align: 'center' });
    }

    // Final footer
    addFooter();

    // Save the PDF
    const fileName = `Contract_${contract.contractNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
