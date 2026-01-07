-- Seed data for LedgerAccount table (Double-Entry Ledger)
-- Run this SQL directly on production database if API initialization fails

INSERT INTO ledger_accounts (id, code, name, "nameAr", type, balance, "balanceSYP", "isSystem", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid(), 'SYS-RESERVE', 'System Reserve', 'احتياطي النظام', 'LIABILITY', 0, 0, true, NOW(), NOW()),
    (gen_random_uuid(), 'USR-LEDGER', 'Users Ledger', 'سجل المستخدمين', 'LIABILITY', 0, 0, true, NOW(), NOW()),
    (gen_random_uuid(), 'MRC-LEDGER', 'Merchants Ledger', 'سجل التجار', 'LIABILITY', 0, 0, true, NOW(), NOW()),
    (gen_random_uuid(), 'AGT-LEDGER', 'Agents Ledger', 'سجل الوكلاء', 'LIABILITY', 0, 0, true, NOW(), NOW()),
    (gen_random_uuid(), 'SETTLEMENTS', 'Settlements', 'التسويات', 'LIABILITY', 0, 0, true, NOW(), NOW()),
    (gen_random_uuid(), 'FEES-COLLECTED', 'Fees Collected', 'الرسوم', 'REVENUE', 0, 0, true, NOW(), NOW()),
    (gen_random_uuid(), 'SUSPENSE', 'Suspense', 'معلق', 'LIABILITY', 0, 0, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Seed data for InternalAccount table
INSERT INTO internal_accounts (id, code, name, "nameAr", type, balance, "balanceSYP", description, "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid(), 'SYS-RESERVE', 'System Reserve', 'احتياطي النظام', 'SYSTEM_RESERVE', 0, 0, 'Central bank reserve', NOW(), NOW()),
    (gen_random_uuid(), 'USR-LEDGER', 'Users Ledger', 'سجل المستخدمين', 'USERS_LEDGER', 0, 0, 'Aggregate of all user balances', NOW(), NOW()),
    (gen_random_uuid(), 'MRC-LEDGER', 'Merchants Ledger', 'سجل التجار', 'MERCHANTS_LEDGER', 0, 0, 'Aggregate of all merchant balances', NOW(), NOW()),
    (gen_random_uuid(), 'AGT-LEDGER', 'Agents Ledger', 'سجل الوكلاء', 'AGENTS_LEDGER', 0, 0, 'Aggregate of all agent balances', NOW(), NOW()),
    (gen_random_uuid(), 'SETTLEMENTS', 'Settlements Account', 'حساب التسويات', 'SETTLEMENTS', 0, 0, 'Pending settlements', NOW(), NOW()),
    (gen_random_uuid(), 'FEES-COLLECTED', 'Fees Collected', 'العمولات المحصلة', 'FEES', 0, 0, 'All platform fees', NOW(), NOW()),
    (gen_random_uuid(), 'SUSPENSE', 'Suspense Account', 'حساب معلق', 'SUSPENSE', 0, 0, 'Frozen transactions', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
