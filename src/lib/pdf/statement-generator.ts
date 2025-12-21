import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF with autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: { finalY: number };
    }
}

// Bank Basha Colors
const COLORS = {
    primary: '#FEC00F',      // Gold
    primaryDark: '#E5AD0E',
    dark: '#0a0a0f',
    darkCard: '#151520',
    darkBorder: '#2a2a3a',
    text: '#ffffff',
    textMuted: '#9ca3af',
    success: '#10B981',
    error: '#EF4444',
};

export interface StatementData {
    // User Info
    userId: string;
    fullName: string;
    fullNameAr?: string;
    phone: string;
    email?: string;
    userType: 'USER' | 'MERCHANT' | 'AGENT';

    // Business Info (for merchants/agents)
    businessName?: string;
    businessNameAr?: string;
    merchantCode?: string;
    agentCode?: string;

    // Period
    month: number;
    year: number;

    // Balance
    openingBalance: number;
    closingBalance: number;

    // Transactions
    transactions: Array<{
        id: string;
        referenceNumber: string;
        date: Date;
        type: string;
        description: string;
        amount: number;
        fee: number;
        isIncoming: boolean;
        balance: number;
    }>;

    // Summary
    totalIncoming: number;
    totalOutgoing: number;
    totalFees: number;
    transactionCount: number;
}

export async function generateStatement(data: StatementData): Promise<Uint8Array> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Helper functions
    const formatAmount = (amount: number) =>
        new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const getMonthName = (month: number) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1];
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'DEPOSIT': 'Deposit',
            'WITHDRAW': 'Withdrawal',
            'TRANSFER': 'Transfer',
            'QR_PAYMENT': 'QR Payment',
            'SERVICE_PURCHASE': 'Service',
            'CREDIT_GRANT': 'Credit',
            'REFUND': 'Refund',
        };
        return labels[type] || type;
    };

    // ═══════════════════════════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════════════════════════

    // Gold header bar
    doc.setFillColor(254, 192, 15); // Primary Gold
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Bank Name
    doc.setTextColor(10, 10, 15); // Dark
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('BANK BASHA', pageWidth / 2, 15, { align: 'center' });

    // Statement Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Monthly Account Statement', pageWidth / 2, 25, { align: 'center' });

    // Period
    doc.setFontSize(10);
    doc.text(`${getMonthName(data.month)} ${data.year}`, pageWidth / 2, 32, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════
    // ACCOUNT INFO
    // ═══════════════════════════════════════════════════════════════

    let y = 45;

    // Dark card background
    doc.setFillColor(21, 21, 32); // darkCard
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    // Left side - User info
    doc.text(data.fullName, margin + 5, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(9);
    doc.text(`Phone: ${data.phone}`, margin + 5, y + 17);

    if (data.businessName) {
        doc.text(`Business: ${data.businessName}`, margin + 5, y + 24);
    }

    if (data.merchantCode) {
        doc.setTextColor(254, 192, 15);
        doc.text(`Merchant Code: ${data.merchantCode}`, margin + 5, y + 31);
    } else if (data.agentCode) {
        doc.setTextColor(254, 192, 15);
        doc.text(`Agent Code: ${data.agentCode}`, margin + 5, y + 31);
    }

    // Right side - Balances
    const rightCol = pageWidth - margin - 60;
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text('Opening Balance', rightCol, y + 8);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`$${formatAmount(data.openingBalance)}`, rightCol, y + 15);

    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text('Closing Balance', rightCol + 35, y + 8);
    doc.setTextColor(16, 185, 129); // Success green
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${formatAmount(data.closingBalance)}`, rightCol + 35, y + 16);

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY BOXES
    // ═══════════════════════════════════════════════════════════════

    y = 90;
    const boxWidth = (pageWidth - 2 * margin - 10) / 4;

    const summaryBoxes = [
        { label: 'Incoming', value: data.totalIncoming, color: [16, 185, 129] },
        { label: 'Outgoing', value: data.totalOutgoing, color: [239, 68, 68] },
        { label: 'Fees', value: data.totalFees, color: [156, 163, 175] },
        { label: 'Transactions', value: data.transactionCount, color: [59, 130, 246], isCount: true },
    ];

    summaryBoxes.forEach((box, i) => {
        const x = margin + i * (boxWidth + 3);

        doc.setFillColor(21, 21, 32);
        doc.roundedRect(x, y, boxWidth, 22, 2, 2, 'F');

        doc.setTextColor(156, 163, 175);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(box.label, x + boxWidth / 2, y + 7, { align: 'center' });

        doc.setTextColor(box.color[0], box.color[1], box.color[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const valueText = box.isCount ? String(box.value) : `$${formatAmount(box.value)}`;
        doc.text(valueText, x + boxWidth / 2, y + 16, { align: 'center' });
    });

    // ═══════════════════════════════════════════════════════════════
    // TRANSACTIONS TABLE
    // ═══════════════════════════════════════════════════════════════

    y = 120;

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction History', margin, y);

    y += 5;

    // Prepare table data
    const tableData = data.transactions.map(tx => [
        formatDate(tx.date),
        tx.referenceNumber,
        getTypeLabel(tx.type),
        tx.description.substring(0, 25) + (tx.description.length > 25 ? '...' : ''),
        tx.isIncoming ? `+$${formatAmount(tx.amount)}` : `-$${formatAmount(tx.amount)}`,
        `$${formatAmount(tx.balance)}`,
    ]);

    doc.autoTable({
        startY: y,
        head: [['Date', 'Reference', 'Type', 'Description', 'Amount', 'Balance']],
        body: tableData,
        theme: 'plain',
        styles: {
            fillColor: [21, 21, 32],
            textColor: [255, 255, 255],
            fontSize: 8,
            cellPadding: 3,
            lineColor: [42, 42, 58],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [42, 42, 58],
            textColor: [254, 192, 15],
            fontStyle: 'bold',
            fontSize: 8,
        },
        alternateRowStyles: {
            fillColor: [26, 26, 38],
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 28 },
            2: { cellWidth: 22 },
            3: { cellWidth: 48 },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'right' },
        },
        didParseCell: function (data: any) {
            // Color amounts
            if (data.column.index === 4 && data.cell.text[0]) {
                if (data.cell.text[0].startsWith('+')) {
                    data.cell.styles.textColor = [16, 185, 129];
                } else if (data.cell.text[0].startsWith('-')) {
                    data.cell.styles.textColor = [239, 68, 68];
                }
            }
        },
        margin: { left: margin, right: margin },
    });

    // ═══════════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════════

    const footerY = pageHeight - 15;

    // Footer line
    doc.setDrawColor(42, 42, 58);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    doc.setTextColor(156, 163, 175);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    // Generated date
    const now = new Date();
    doc.text(`Generated: ${now.toLocaleDateString('en-US')} ${now.toLocaleTimeString('en-US')}`, margin, footerY);

    // Bank info
    doc.text('Bank Basha - Your Digital Financial Partner', pageWidth / 2, footerY, { align: 'center' });

    // Page number
    doc.text(`Page 1 of 1`, pageWidth - margin, footerY, { align: 'right' });

    // ═══════════════════════════════════════════════════════════════
    // WATERMARK
    // ═══════════════════════════════════════════════════════════════

    doc.setTextColor(254, 192, 15);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
    doc.text('BANK BASHA', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45
    });

    return doc.output('arraybuffer') as unknown as Uint8Array;
}

export function getStatementFilename(data: StatementData): string {
    const monthStr = String(data.month).padStart(2, '0');
    const userType = data.userType.toLowerCase();
    return `BankBasha_Statement_${userType}_${data.year}_${monthStr}.pdf`;
}
