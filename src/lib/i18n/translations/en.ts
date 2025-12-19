// English Translations (Secondary Language)
import type { Translations } from './ar';

export const en: Translations = {
    // Navigation
    nav: {
        home: 'Home',
        login: 'Login',
        register: 'Register',
        dashboard: 'Dashboard',
        settings: 'Settings',
        logout: 'Logout',
    },

    // Common
    common: {
        loading: 'Loading...',
        error: 'Error occurred',
        success: 'Operation successful',
        cancel: 'Cancel',
        save: 'Save',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        close: 'Close',
        search: 'Search',
        noData: 'No data available',
        yes: 'Yes',
        no: 'No',
        edit: 'Edit',
        delete: 'Delete',
        add: 'Add',
        submit: 'Submit',
        arabic: 'العربية',
        english: 'English',
    },

    // Auth
    auth: {
        phone: 'Phone Number',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        fullName: 'Full Name',
        email: 'Email',
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
        forgotPassword: 'Forgot Password?',
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        loginNow: 'Login Now',
        registerNow: 'Register Now',
        welcomeBack: 'Welcome Back!',
        createAccount: 'Create New Account',
        phoneRequired: 'Phone number is required',
        passwordRequired: 'Password is required',
        invalidCredentials: 'Invalid credentials',
    },

    // Dashboard
    dashboard: {
        title: 'Dashboard',
        balance: 'Balance',
        availableBalance: 'Available Balance',
        frozenBalance: 'Frozen Balance',
        totalBalance: 'Total Balance',
        quickActions: 'Quick Actions',
        recentTransactions: 'Recent Transactions',
        noTransactions: 'No transactions',
        viewAll: 'View All',
        transfer: 'Transfer',
        deposit: 'Deposit',
        withdraw: 'Withdraw',
        pay: 'Pay',
        services: 'Services',
        notifications: 'Notifications',
        settings: 'Settings',
    },

    // Transfer
    transfer: {
        title: 'Transfer Money',
        recipient: 'Recipient',
        recipientPhone: 'Recipient Phone Number',
        amount: 'Amount',
        note: 'Note',
        noteOptional: 'Note (optional)',
        enterAmount: 'Enter Amount',
        confirmTransfer: 'Confirm Transfer',
        transferSuccess: 'Transfer Successful!',
        transferFailed: 'Transfer Failed',
        insufficientBalance: 'Insufficient Balance',
        recipientNotFound: 'Recipient not found',
        enterOtp: 'Enter Verification Code',
        otpSent: 'Verification code sent',
    },

    // Deposit
    deposit: {
        title: 'Deposit Money',
        selectAgent: 'Select Agent',
        nearbyAgents: 'Nearby Agents',
        agentCode: 'Agent Code',
        depositInstructions: 'Deposit Instructions',
    },

    // Withdraw
    withdraw: {
        title: 'Withdraw Money',
        withdrawAmount: 'Withdrawal Amount',
        confirmWithdraw: 'Confirm Withdrawal',
    },

    // Services
    services: {
        title: 'Services',
        allServices: 'All Services',
        categories: {
            recharge: 'Mobile Recharge',
            bill: 'Bill Payment',
            subscription: 'Subscriptions',
            other: 'Other',
        },
        purchase: 'Purchase',
        confirmPurchase: 'Confirm Purchase',
        price: 'Price',
        flexiblePrice: 'Flexible Price',
        minPrice: 'Minimum',
        maxPrice: 'Maximum',
        phoneNumber: 'Phone Number',
        enterPhone: 'Enter phone number',
        purchaseSuccess: 'Purchase Successful!',
    },

    // Settings
    settings: {
        title: 'Settings',
        account: 'Account',
        profile: 'Profile',
        phoneNumber: 'Phone Number',
        kyc: 'Verification (KYC)',
        verified: 'Verified ✓',
        notVerified: 'Not Verified',
        security: 'Security',
        appLock: 'App Lock PIN',
        paymentPin: 'Payment PIN',
        changePassword: 'Change Password',
        twoFactor: 'Two-Factor Authentication',
        enabled: 'Enabled',
        disabled: 'Disabled',
        preferences: 'Preferences',
        language: 'Language',
        notifications: 'Notifications',
        market: 'Market',
        myServices: 'My Services',
        sellServices: 'Sell Your Services',
    },

    // Merchant
    merchant: {
        title: 'Merchant Dashboard',
        businessAccount: 'Business Account',
        receivedPayments: 'Received Payments',
        qrCode: 'QR Code',
        downloadQr: 'Download QR',
        merchantCode: 'Merchant Code',
        totalSales: 'Total Sales',
        todaySales: "Today's Sales",
    },

    // Agent
    agent: {
        title: 'Agent Dashboard',
        agentCode: 'Agent Code',
        cashCollected: 'Cash Collected',
        creditLimit: 'Credit Limit',
        currentCredit: 'Current Credit',
        depositForUser: 'Deposit for User',
        withdrawForUser: 'Withdraw for User',
    },

    // Admin
    admin: {
        title: 'Admin Dashboard',
        users: 'Users',
        transactions: 'Transactions',
        services: 'Services',
        merchants: 'Merchants',
        agents: 'Agents',
        settings: 'System Settings',
        pendingRequests: 'Pending Requests',
        approve: 'Approve',
        reject: 'Reject',
        block: 'Block',
        unblock: 'Unblock',
    },

    // Notifications
    notifications: {
        title: 'Notifications',
        markAllRead: 'Mark All as Read',
        noNotifications: 'No notifications',
        transferReceived: 'Transfer Received',
        transferSent: 'Transfer Sent',
        depositSuccess: 'Deposit Successful',
        withdrawSuccess: 'Withdrawal Successful',
    },

    // Home Page
    home: {
        heroTitle: 'Your Digital Wallet',
        heroSubtitle: 'The fastest and easiest way to pay and transfer',
        getStarted: 'Get Started',
        features: {
            fast: 'Fast & Secure',
            fastDesc: 'Instant transfers with the highest security standards',
            easy: 'Easy to Use',
            easyDesc: 'Simple interface for all users',
            secure: 'Advanced Protection',
            secureDesc: 'High-level encryption to protect your money',
        },
    },

    // Errors
    errors: {
        networkError: 'Network Error',
        serverError: 'Server Error',
        unauthorized: 'Unauthorized',
        notFound: 'Not Found',
        validation: 'Invalid Data',
        tryAgain: 'Try Again',
    },

    // Time
    time: {
        justNow: 'Just now',
        minutesAgo: 'minutes ago',
        hoursAgo: 'hours ago',
        daysAgo: 'days ago',
        today: 'Today',
        yesterday: 'Yesterday',
    },
};
