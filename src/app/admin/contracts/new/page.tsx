'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
    ArrowRightIcon,
    ArrowLeftIcon,
    DocumentTextIcon,
    UserIcon,
    CalendarIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    PlusIcon,
    TrashIcon,
    ArrowUpTrayIcon,
    DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';

interface Agent {
    id: string;
    agentCode: string;
    businessName: string;
    businessNameAr: string | null;
    depositCommission: number | null;
    withdrawCommission: number | null;
    creditLimit: number;
    user: {
        id: string;
        fullName: string;
        fullNameAr: string | null;
        phone: string;
    };
}

interface Clause {
    title: string;
    titleAr: string;
    content: string;
    contentAr: string;
}

const DEFAULT_CLAUSES: Clause[] = [
    {
        title: 'Parties',
        titleAr: 'الأطراف',
        content: 'This agreement is entered into between Bank Basha ("The Bank") and the Agent ("The Agent") as identified in this contract.',
        contentAr: 'يُبرم هذا الاتفاق بين بنك باشا ("البنك") والوكيل ("الوكيل") كما هو محدد في هذا العقد.',
    },
    {
        title: 'Subject Matter',
        titleAr: 'موضوع العقد',
        content: 'The Bank authorizes the Agent to perform deposit and withdrawal operations on behalf of customers using the Bank Basha digital platform.',
        contentAr: 'يُخول البنك الوكيل بتنفيذ عمليات الإيداع والسحب نيابةً عن العملاء باستخدام منصة بنك باشا الرقمية.',
    },
    {
        title: 'Agent Obligations',
        titleAr: 'التزامات الوكيل',
        content: 'The Agent shall: maintain adequate cash reserves, provide excellent customer service, protect customer data confidentiality, and comply with all regulatory requirements.',
        contentAr: 'يلتزم الوكيل بـ: الحفاظ على احتياطي نقدي كافٍ، تقديم خدمة عملاء ممتازة، حماية سرية بيانات العملاء، والامتثال لجميع المتطلبات التنظيمية.',
    },
    {
        title: 'Bank Obligations',
        titleAr: 'التزامات البنك',
        content: 'The Bank shall: provide digital credit to the Agent, pay commissions as agreed, provide technical support, and maintain the platform functionality.',
        contentAr: 'يلتزم البنك بـ: توفير الرصيد الرقمي للوكيل، دفع العمولات كما هو متفق عليه، توفير الدعم الفني، والحفاظ على عمل المنصة.',
    },
    {
        title: 'Commissions',
        titleAr: 'العمولات',
        content: 'The Agent shall receive commissions on each deposit and withdrawal transaction as specified in the financial terms section of this contract.',
        contentAr: 'يستلم الوكيل عمولات على كل عملية إيداع وسحب كما هو محدد في قسم الشروط المالية من هذا العقد.',
    },
    {
        title: 'Confidentiality',
        titleAr: 'السرية',
        content: 'The Agent shall maintain strict confidentiality of all customer information and Bank proprietary data during and after the term of this agreement.',
        contentAr: 'يلتزم الوكيل بالسرية التامة لجميع معلومات العملاء وبيانات البنك الخاصة أثناء وبعد مدة هذا الاتفاق.',
    },
    {
        title: 'Termination',
        titleAr: 'الإنهاء',
        content: 'Either party may terminate this agreement with 30 days written notice. The Bank may terminate immediately in case of breach of terms.',
        contentAr: 'يجوز لأي طرف إنهاء هذا الاتفاق بإشعار كتابي قبل 30 يوماً. يجوز للبنك الإنهاء فوراً في حالة خرق الشروط.',
    },
    {
        title: 'Dispute Resolution',
        titleAr: 'حل النزاعات',
        content: 'Any disputes arising from this agreement shall be resolved through arbitration in accordance with the applicable laws.',
        contentAr: 'يتم حل أي نزاعات ناشئة عن هذا الاتفاق من خلال التحكيم وفقاً للقوانين المعمول بها.',
    },
];

export default function NewContractPage() {
    const t = useTranslations();
    const router = useRouter();
    const currentLocale = useLocale();
    const isRtl = currentLocale === 'ar';

    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loadingAgents, setLoadingAgents] = useState(true);

    // Form state
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [contractType, setContractType] = useState('AGENT_AGREEMENT');
    const [title, setTitle] = useState('عقد وكالة بنك باشا');
    const [titleAr, setTitleAr] = useState('عقد وكالة بنك باشا');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [depositCommission, setDepositCommission] = useState<string>('');
    const [withdrawCommission, setWithdrawCommission] = useState<string>('');
    const [creditLimit, setCreditLimit] = useState<string>('');
    const [clauses, setClauses] = useState<Clause[]>(DEFAULT_CLAUSES);
    const [customTerms, setCustomTerms] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('DRAFT');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        setLoadingAgents(true);
        try {
            const res = await fetch('/api/admin/agents');
            const data = await res.json();
            setAgents(data.agents || []);
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
        setLoadingAgents(false);
    };

    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedAgentId) {
            alert('يرجى اختيار الوكيل');
            return;
        }

        setLoading(true);
        try {
            // 1. Upload PDF if exists
            let fileUrl = null;
            if (pdfFile) {
                setUploading(true);
                const formData = new FormData();
                formData.append('file', pdfFile);
                formData.append('folder', 'contracts');

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    fileUrl = uploadData.url;
                } else {
                    alert('فشل رفع الملف');
                    setLoading(false);
                    setUploading(false);
                    return;
                }
                setUploading(false);
            }

            // 2. Create contract
            const res = await fetch('/api/admin/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: selectedAgentId,
                    type: contractType,
                    title,
                    titleAr,
                    startDate,
                    endDate: endDate || null,
                    depositCommission: depositCommission ? parseFloat(depositCommission) : null,
                    withdrawCommission: withdrawCommission ? parseFloat(withdrawCommission) : null,
                    creditLimit: creditLimit ? parseFloat(creditLimit) : null,
                    clauses,
                    customTerms,
                    notes,
                    status,
                    fileUrl,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                router.push(`/admin/contracts/${data.contract.id}`);
            } else {
                alert(data.error || 'حدث خطأ');
            }
        } catch (error) {
            console.error('Error creating contract:', error);
            alert('حدث خطأ في إنشاء العقد');
        }
        setLoading(false);
    };

    const addClause = () => {
        setClauses([...clauses, {
            title: '',
            titleAr: '',
            content: '',
            contentAr: '',
        }]);
    };

    const removeClause = (index: number) => {
        setClauses(clauses.filter((_, i) => i !== index));
    };

    const updateClause = (index: number, field: keyof Clause, value: string) => {
        const newClauses = [...clauses];
        newClauses[index] = { ...newClauses[index], [field]: value };
        setClauses(newClauses);
    };

    if (!mounted) return null;

    const BackIcon = isRtl ? ArrowRightIcon : ArrowLeftIcon;

    return (
        <div className="min-h-screen bg-dark-950 pt-16 lg:pt-0">
            {/* Header */}
            <header className="bg-dark-900/50 backdrop-blur-xl border-b border-dark-800 sticky top-16 lg:top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/contracts" className="btn-ghost btn-icon">
                            <BackIcon className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                <DocumentTextIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">إنشاء عقد جديد</h1>
                                <p className="text-dark-400 text-sm">عقد قانوني للوكيل</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Agent Selection */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-primary-500" />
                            اختيار الوكيل
                        </h2>

                        {loadingAgents ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="spinner w-8 h-8"></div>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                <select
                                    value={selectedAgentId}
                                    onChange={(e) => setSelectedAgentId(e.target.value)}
                                    className="input"
                                    required
                                >
                                    <option value="">-- اختر الوكيل --</option>
                                    {agents.map(agent => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.user.fullNameAr || agent.user.fullName} - {agent.agentCode} - {agent.businessNameAr || agent.businessName}
                                        </option>
                                    ))}
                                </select>

                                {selectedAgent && (
                                    <div className="bg-dark-800/50 rounded-xl p-4">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-dark-400">الاسم</p>
                                                <p className="text-white font-medium">{selectedAgent.user.fullNameAr || selectedAgent.user.fullName}</p>
                                            </div>
                                            <div>
                                                <p className="text-dark-400">النشاط</p>
                                                <p className="text-white font-medium">{selectedAgent.businessNameAr || selectedAgent.businessName}</p>
                                            </div>
                                            <div>
                                                <p className="text-dark-400">الهاتف</p>
                                                <p className="text-white font-mono">{selectedAgent.user.phone}</p>
                                            </div>
                                            <div>
                                                <p className="text-dark-400">الكود</p>
                                                <p className="text-white font-mono">{selectedAgent.agentCode}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Contract Info */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <DocumentTextIcon className="w-5 h-5 text-primary-500" />
                            معلومات العقد
                        </h2>

                        <div className="grid gap-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-dark-400 text-sm mb-2">نوع العقد</label>
                                    <select
                                        value={contractType}
                                        onChange={(e) => setContractType(e.target.value)}
                                        className="input w-full"
                                    >
                                        <option value="AGENT_AGREEMENT">عقد وكالة</option>
                                        <option value="NDA">اتفاقية سرية (NDA)</option>
                                        <option value="SERVICE_AGREEMENT">اتفاقية خدمة</option>
                                        <option value="AMENDMENT">ملحق تعديل</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-dark-400 text-sm mb-2">حالة العقد</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="input w-full"
                                    >
                                        <option value="DRAFT">مسودة</option>
                                        <option value="PENDING_SIGNATURE">بانتظار التوقيع</option>
                                        <option value="ACTIVE">نشط (موقع)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-dark-400 text-sm mb-2">عنوان العقد (عربي)</label>
                                    <input
                                        type="text"
                                        value={titleAr}
                                        onChange={(e) => setTitleAr(e.target.value)}
                                        className="input w-full"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-dark-400 text-sm mb-2">عنوان العقد (إنجليزي)</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="input w-full"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary-500" />
                            مدة العقد
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">تاريخ البداية</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">تاريخ الانتهاء (اختياري)</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Terms */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <CurrencyDollarIcon className="w-5 h-5 text-primary-500" />
                            الشروط المالية
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">عمولة الإيداع (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={depositCommission}
                                    onChange={(e) => setDepositCommission(e.target.value)}
                                    className="input w-full"
                                    placeholder={selectedAgent?.depositCommission?.toString() || 'الافتراضي'}
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">عمولة السحب (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={withdrawCommission}
                                    onChange={(e) => setWithdrawCommission(e.target.value)}
                                    className="input w-full"
                                    placeholder={selectedAgent?.withdrawCommission?.toString() || 'الافتراضي'}
                                />
                            </div>
                            <div>
                                <label className="block text-dark-400 text-sm mb-2">حد الائتمان ($)</label>
                                <input
                                    type="number"
                                    value={creditLimit}
                                    onChange={(e) => setCreditLimit(e.target.value)}
                                    className="input w-full"
                                    placeholder={selectedAgent?.creditLimit?.toString() || '0'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contract Clauses */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5 text-primary-500" />
                                بنود العقد
                            </h2>
                            <button
                                type="button"
                                onClick={addClause}
                                className="btn-ghost text-sm flex items-center gap-1"
                            >
                                <PlusIcon className="w-4 h-4" />
                                إضافة بند
                            </button>
                        </div>

                        <div className="space-y-4">
                            {clauses.map((clause, index) => (
                                <div key={index} className="bg-dark-800/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-primary-500 font-medium">البند {index + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeClause(index)}
                                            className="btn-ghost btn-icon text-red-500"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid gap-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                value={clause.titleAr}
                                                onChange={(e) => updateClause(index, 'titleAr', e.target.value)}
                                                className="input"
                                                placeholder="عنوان البند (عربي)"
                                            />
                                            <input
                                                type="text"
                                                value={clause.title}
                                                onChange={(e) => updateClause(index, 'title', e.target.value)}
                                                className="input"
                                                placeholder="Clause Title (English)"
                                            />
                                        </div>
                                        <textarea
                                            value={clause.contentAr}
                                            onChange={(e) => updateClause(index, 'contentAr', e.target.value)}
                                            className="input min-h-[80px]"
                                            placeholder="نص البند (عربي)"
                                        />
                                        <textarea
                                            value={clause.content}
                                            onChange={(e) => updateClause(index, 'content', e.target.value)}
                                            className="input min-h-[80px]"
                                            placeholder="Clause Content (English)"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">ملاحظات إضافية</h2>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="input w-full min-h-[100px]"
                            placeholder="ملاحظات داخلية (لن تظهر في العقد)"
                        />
                    </div>

                    {/* PDF Upload */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <DocumentArrowUpIcon className="w-5 h-5 text-primary-500" />
                            رفع نسخة PDF (اختياري)
                        </h2>
                        <p className="text-dark-400 text-sm mb-4">
                            يمكنك رفع نسخة PDF جاهزة من العقد الموقع
                        </p>

                        <div className="border-2 border-dashed border-dark-700 rounded-xl p-8 text-center hover:border-primary-500/50 transition-colors">
                            <input
                                type="file"
                                id="pdfUpload"
                                accept=".pdf"
                                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                            <label
                                htmlFor="pdfUpload"
                                className="cursor-pointer flex flex-col items-center gap-3"
                            >
                                <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center">
                                    <ArrowUpTrayIcon className="w-8 h-8 text-primary-500" />
                                </div>
                                {pdfFile ? (
                                    <div>
                                        <p className="text-white font-medium">{pdfFile.name}</p>
                                        <p className="text-dark-400 text-sm">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setPdfFile(null); }}
                                            className="text-red-500 text-sm mt-2 hover:underline"
                                        >
                                            إزالة الملف
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-white">اضغط لاختيار ملف PDF</p>
                                        <p className="text-dark-400 text-sm">أو اسحب الملف هنا</p>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-end gap-4">
                        <Link href="/admin/contracts" className="btn-ghost">
                            إلغاء
                        </Link>
                        <button
                            type="submit"
                            disabled={loading || !selectedAgentId}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? (
                                <div className="spinner w-5 h-5"></div>
                            ) : (
                                <CheckCircleIcon className="w-5 h-5" />
                            )}
                            إنشاء العقد
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
