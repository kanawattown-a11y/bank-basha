// Arabic Translations (Primary Language)
export const ar = {
    // Navigation
    nav: {
        home: 'الرئيسية',
        login: 'تسجيل الدخول',
        register: 'تسجيل جديد',
        dashboard: 'لوحة التحكم',
        settings: 'الإعدادات',
        logout: 'تسجيل الخروج',
    },

    // Common
    common: {
        loading: 'جاري التحميل...',
        error: 'حدث خطأ',
        success: 'تمت العملية بنجاح',
        cancel: 'إلغاء',
        save: 'حفظ',
        confirm: 'تأكيد',
        back: 'رجوع',
        next: 'التالي',
        close: 'إغلاق',
        search: 'بحث',
        noData: 'لا توجد بيانات',
        yes: 'نعم',
        no: 'لا',
        edit: 'تعديل',
        delete: 'حذف',
        add: 'إضافة',
        submit: 'إرسال',
        arabic: 'العربية',
        english: 'English',
    },

    // Auth
    auth: {
        phone: 'رقم الهاتف',
        password: 'كلمة المرور',
        confirmPassword: 'تأكيد كلمة المرور',
        fullName: 'الاسم الكامل',
        email: 'البريد الإلكتروني',
        login: 'تسجيل الدخول',
        register: 'تسجيل جديد',
        logout: 'تسجيل الخروج',
        forgotPassword: 'نسيت كلمة المرور؟',
        noAccount: 'ليس لديك حساب؟',
        hasAccount: 'لديك حساب؟',
        loginNow: 'سجل الدخول الآن',
        registerNow: 'سجل الآن',
        welcomeBack: 'أهلاً بعودتك!',
        createAccount: 'إنشاء حساب جديد',
        phoneRequired: 'رقم الهاتف مطلوب',
        passwordRequired: 'كلمة المرور مطلوبة',
        invalidCredentials: 'بيانات الدخول غير صحيحة',
    },

    // Dashboard
    dashboard: {
        title: 'لوحة التحكم',
        balance: 'الرصيد',
        availableBalance: 'الرصيد المتاح',
        frozenBalance: 'الرصيد المجمد',
        totalBalance: 'إجمالي الرصيد',
        quickActions: 'الإجراءات السريعة',
        recentTransactions: 'آخر المعاملات',
        noTransactions: 'لا توجد معاملات',
        viewAll: 'عرض الكل',
        transfer: 'تحويل',
        deposit: 'إيداع',
        withdraw: 'سحب',
        pay: 'دفع',
        services: 'الخدمات',
        notifications: 'الإشعارات',
        settings: 'الإعدادات',
    },

    // Transfer
    transfer: {
        title: 'تحويل أموال',
        recipient: 'المستلم',
        recipientPhone: 'رقم هاتف المستلم',
        amount: 'المبلغ',
        note: 'ملاحظة',
        noteOptional: 'ملاحظة (اختياري)',
        enterAmount: 'أدخل المبلغ',
        confirmTransfer: 'تأكيد التحويل',
        transferSuccess: 'تم التحويل بنجاح!',
        transferFailed: 'فشل التحويل',
        insufficientBalance: 'الرصيد غير كافي',
        recipientNotFound: 'المستلم غير موجود',
        enterOtp: 'أدخل رمز التأكيد',
        otpSent: 'تم إرسال رمز التأكيد',
    },

    // Deposit
    deposit: {
        title: 'إيداع أموال',
        selectAgent: 'اختر الوكيل',
        nearbyAgents: 'الوكلاء القريبين',
        agentCode: 'كود الوكيل',
        depositInstructions: 'تعليمات الإيداع',
    },

    // Withdraw
    withdraw: {
        title: 'سحب أموال',
        withdrawAmount: 'مبلغ السحب',
        confirmWithdraw: 'تأكيد السحب',
    },

    // Services
    services: {
        title: 'الخدمات',
        allServices: 'جميع الخدمات',
        categories: {
            recharge: 'شحن رصيد',
            bill: 'دفع فواتير',
            subscription: 'اشتراكات',
            other: 'أخرى',
        },
        purchase: 'شراء',
        confirmPurchase: 'تأكيد الشراء',
        price: 'السعر',
        flexiblePrice: 'السعر مفتوح',
        minPrice: 'الحد الأدنى',
        maxPrice: 'الحد الأقصى',
        phoneNumber: 'رقم الهاتف',
        enterPhone: 'أدخل رقم الهاتف',
        purchaseSuccess: 'تم الشراء بنجاح!',
    },

    // Settings
    settings: {
        title: 'الإعدادات',
        account: 'الحساب',
        profile: 'الملف الشخصي',
        phoneNumber: 'رقم الهاتف',
        kyc: 'التوثيق (KYC)',
        verified: 'موثق ✓',
        notVerified: 'غير موثق',
        security: 'الأمان',
        appLock: 'رمز فتح التطبيق',
        paymentPin: 'رمز الدفع',
        changePassword: 'تغيير كلمة المرور',
        twoFactor: 'التحقق بخطوتين',
        enabled: 'مفعل',
        disabled: 'غير مفعل',
        preferences: 'التفضيلات',
        language: 'اللغة',
        notifications: 'الإشعارات',
        market: 'السوق',
        myServices: 'خدماتي',
        sellServices: 'بيع خدماتك',
    },

    // Merchant
    merchant: {
        title: 'لوحة التاجر',
        businessAccount: 'حساب البزنس',
        receivedPayments: 'المدفوعات المستلمة',
        qrCode: 'رمز QR',
        downloadQr: 'تحميل QR',
        merchantCode: 'كود التاجر',
        totalSales: 'إجمالي المبيعات',
        todaySales: 'مبيعات اليوم',
    },

    // Agent
    agent: {
        title: 'لوحة الوكيل',
        agentCode: 'كود الوكيل',
        cashCollected: 'النقد المحصل',
        creditLimit: 'حد الائتمان',
        currentCredit: 'الائتمان الحالي',
        depositForUser: 'إيداع للمستخدم',
        withdrawForUser: 'سحب للمستخدم',
    },

    // Admin
    admin: {
        title: 'لوحة الإدارة',
        users: 'المستخدمون',
        transactions: 'المعاملات',
        services: 'الخدمات',
        merchants: 'التجار',
        agents: 'الوكلاء',
        settings: 'إعدادات النظام',
        pendingRequests: 'الطلبات المعلقة',
        approve: 'موافقة',
        reject: 'رفض',
        block: 'حظر',
        unblock: 'إلغاء الحظر',
    },

    // Notifications
    notifications: {
        title: 'الإشعارات',
        markAllRead: 'تحديد الكل كمقروء',
        noNotifications: 'لا توجد إشعارات',
        transferReceived: 'تحويل وارد',
        transferSent: 'تحويل صادر',
        depositSuccess: 'إيداع ناجح',
        withdrawSuccess: 'سحب ناجح',
    },

    // Home Page
    home: {
        heroTitle: 'محفظتك الرقمية',
        heroSubtitle: 'أسرع وأسهل طريقة للدفع والتحويل',
        getStarted: 'ابدأ الآن',
        features: {
            fast: 'سريع وآمن',
            fastDesc: 'تحويلات فورية بأعلى معايير الأمان',
            easy: 'سهل الاستخدام',
            easyDesc: 'واجهة بسيطة لجميع المستخدمين',
            secure: 'حماية متقدمة',
            secureDesc: 'تشفير عالي المستوى لحماية أموالك',
        },
    },

    // Errors
    errors: {
        networkError: 'خطأ في الاتصال',
        serverError: 'خطأ في الخادم',
        unauthorized: 'غير مصرح',
        notFound: 'غير موجود',
        validation: 'بيانات غير صحيحة',
        tryAgain: 'حاول مرة أخرى',
    },

    // Time
    time: {
        justNow: 'الآن',
        minutesAgo: 'دقائق',
        hoursAgo: 'ساعات',
        daysAgo: 'أيام',
        today: 'اليوم',
        yesterday: 'أمس',
    },
};

export type Translations = typeof ar;
