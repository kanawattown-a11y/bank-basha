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

    // Localization
    labels: {
        title: string;
        period: string;
        openingBalance: string;
        closingBalance: string;
        incoming: string;
        outgoing: string;
        fees: string;
        transactions: string;
        transactionHistory: string;
        generated: string;
        page: string;
        bankName: string;
        bankSlogan: string;
        phone: string;
        business: string;
        merchantCode: string;
        agentCode: string;
        table: {
            date: string;
            reference: string;
            type: string;
            description: string;
            amount: string;
            balance: string;
        };
        types: Record<string, string>;
    };
}

// Font cache
let fontCache: { regular: string | null; bold: string | null } = {
    regular: null,
    bold: null,
};

async function loadFonts() {
    if (fontCache.regular && fontCache.bold) return fontCache;

    console.log('Starting font load...');
    try {
        // Try obtaining the font from multiple reliable CDNs
        const urls = [
            'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf',
            'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf'
        ];

        const urlsBold = [
            'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Bold.ttf',
            'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Bold.ttf'
        ];

        // Helper to try fetch
        const fetchFont = async (urlList: string[]) => {
            for (const url of urlList) {
                try {
                    console.log(`Fetching font from ${url}`);
                    const res = await fetch(url);
                    if (res.ok) return await res.arrayBuffer();
                } catch (e) {
                    console.warn(`Failed to fetch font from ${url}`, e);
                }
            }
            throw new Error('Could not fetch font from any source');
        };

        const [regularBuf, boldBuf] = await Promise.all([
            fetchFont(urls),
            fetchFont(urlsBold)
        ]);

        console.log('Fonts fetched successfully');
        fontCache.regular = Buffer.from(regularBuf).toString('base64');
        fontCache.bold = Buffer.from(boldBuf).toString('base64');

        return fontCache;
    } catch (error) {
        console.error('CRITICAL: Error loading fonts:', error);
        return null;
    }
}

export async function generateStatement(data: StatementData): Promise<Uint8Array> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    // Load and add Arabic fonts
    const fonts = await loadFonts();
    if (fonts && fonts.regular && fonts.bold) {
        doc.addFileToVFS('Amiri-Regular.ttf', fonts.regular);
        doc.addFileToVFS('Amiri-Bold.ttf', fonts.bold);

        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');

        doc.setFont('Amiri'); // Set as default
    } else {
        console.warn('Could not load Arabic fonts, falling back to Helvetica');
    }

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
        return data.labels.types[type] || type;
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
    doc.setFont('Amiri');
    // generate... code continues...
    // Actually, I can't replace all in one block indiscriminately if there are different styles.
    // I will use multi_replace for specific lines or just assume 'Amiri' handles styles if added correctly.
    // But doc.setFont accepts (fontName, fontStyle).
    // Since I added 'normal' and 'bold', calling doc.setFont('Amiri', 'bold') works.
    // So I just need to replace 'helvetica' with 'Amiri'.

    doc.text(data.labels.bankName, pageWidth / 2, 15, { align: 'center' });

    // Statement Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.labels.title, pageWidth / 2, 25, { align: 'center' });

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
    doc.setFont('Amiri');
    // generate... code continues...
    // Actually, I can't replace all in one block indiscriminately if there are different styles.
    // I will use multi_replace for specific lines or just assume 'Amiri' handles styles if added correctly.
    // But doc.setFont accepts (fontName, fontStyle).
    // Since I added 'normal' and 'bold', calling doc.setFont('Amiri', 'bold') works.
    // So I just need to replace 'helvetica' with 'Amiri'.


    // Left side - User info
    doc.text(data.fullName, margin + 5, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(9);
    doc.text(`${data.labels.phone}: ${data.phone}`, margin + 5, y + 17);

    if (data.businessName) {
        doc.text(`${data.labels.business}: ${data.businessName}`, margin + 5, y + 24);
    }

    if (data.merchantCode) {
        doc.setTextColor(254, 192, 15);
        doc.text(`${data.labels.merchantCode}: ${data.merchantCode}`, margin + 5, y + 31);
    } else if (data.agentCode) {
        doc.setTextColor(254, 192, 15);
        doc.text(`${data.labels.agentCode}: ${data.agentCode}`, margin + 5, y + 31);
    }

    // Right side - Balances
    const rightCol = pageWidth - margin - 60;
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text(data.labels.openingBalance, rightCol, y + 8);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`$${formatAmount(data.openingBalance)}`, rightCol, y + 15);

    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text(data.labels.closingBalance, rightCol + 35, y + 8);
    doc.setTextColor(16, 185, 129); // Success green
    doc.setFontSize(12);
    doc.setFont('Amiri');
    // generate... code continues...
    // Actually, I can't replace all in one block indiscriminately if there are different styles.
    // I will use multi_replace for specific lines or just assume 'Amiri' handles styles if added correctly.
    // But doc.setFont accepts (fontName, fontStyle).
    // Since I added 'normal' and 'bold', calling doc.setFont('Amiri', 'bold') works.
    // So I just need to replace 'helvetica' with 'Amiri'.

    doc.text(`$${formatAmount(data.closingBalance)}`, rightCol + 35, y + 16);

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY BOXES
    // ═══════════════════════════════════════════════════════════════

    y = 90;
    const boxWidth = (pageWidth - 2 * margin - 10) / 4;

    const summaryBoxes = [
        { label: data.labels.incoming, value: data.totalIncoming, color: [16, 185, 129] },
        { label: data.labels.outgoing, value: data.totalOutgoing, color: [239, 68, 68] },
        { label: data.labels.fees, value: data.totalFees, color: [156, 163, 175] },
        { label: data.labels.transactions, value: data.transactionCount, color: [59, 130, 246], isCount: true },
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
        doc.setFont('Amiri', 'bold');

        const valueText = box.isCount ? String(box.value) : `$${formatAmount(box.value)}`;
        doc.text(valueText, x + boxWidth / 2, y + 16, { align: 'center' });
    });

    // ═══════════════════════════════════════════════════════════════
    // TRANSACTIONS TABLE
    // ═══════════════════════════════════════════════════════════════

    y = 120;

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('Amiri');
    // generate... code continues...
    // Actually, I can't replace all in one block indiscriminately if there are different styles.
    // I will use multi_replace for specific lines or just assume 'Amiri' handles styles if added correctly.
    // But doc.setFont accepts (fontName, fontStyle).
    // Since I added 'normal' and 'bold', calling doc.setFont('Amiri', 'bold') works.
    // So I just need to replace 'helvetica' with 'Amiri'.

    doc.text(data.labels.transactionHistory, margin, y);

    y += 5;

    // Prepare table data
    const tableData = data.transactions.map(tx => [
        formatDate(tx.date),
        tx.referenceNumber,
        getTypeLabel(tx.type),
        tx.description || '',
        tx.isIncoming ? `+$${formatAmount(tx.amount)}` : `-$${formatAmount(tx.amount)}`,
        `$${formatAmount(tx.balance)}`,
    ]);

    doc.autoTable({
        startY: y,
        head: [[
            data.labels.table.date,
            data.labels.table.reference,
            data.labels.table.type,
            data.labels.table.description,
            data.labels.table.amount,
            data.labels.table.balance
        ]],
        body: tableData,
        theme: 'plain',
        styles: {
            fillColor: [21, 21, 32],
            textColor: [255, 255, 255],
            fontSize: 8,
            cellPadding: 3,
            lineColor: [42, 42, 58],
            lineWidth: 0.1,
            // Use Amiri to support both Arabic and English text correctly
            font: 'Amiri',
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
            1: { cellWidth: 30 },
            2: { cellWidth: 25 },
            3: { cellWidth: 'auto' }, // Allow description to take remaining space
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
    doc.text(`${data.labels.generated}: ${now.toLocaleDateString('en-US')} ${now.toLocaleTimeString('en-US')}`, margin, footerY);

    // Bank info
    doc.text(`${data.labels.bankSlogan}`, pageWidth / 2, footerY, { align: 'center' });

    // Page number
    doc.text(`${data.labels.page} 1 of 1`, pageWidth - margin, footerY, { align: 'right' });

    // ═══════════════════════════════════════════════════════════════
    // WATERMARK
    // ═══════════════════════════════════════════════════════════════

    doc.setTextColor(254, 192, 15);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
    doc.text(data.labels.bankName, pageWidth / 2, pageHeight / 2, {
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
