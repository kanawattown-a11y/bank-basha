-- Dual Currency Migration Script
-- Run this AFTER prisma migrate dev to ensure all data is properly migrated

-- ============================================
-- PHASE 1: Add new columns to AgentProfile
-- ============================================

-- Add SYP columns to AgentProfile if they don't exist
ALTER TABLE "AgentProfile" ADD COLUMN IF NOT EXISTS "totalDepositsSYP" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AgentProfile" ADD COLUMN IF NOT EXISTS "totalWithdrawalsSYP" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AgentProfile" ADD COLUMN IF NOT EXISTS "cashCollectedSYP" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AgentProfile" ADD COLUMN IF NOT EXISTS "creditLimitSYP" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "AgentProfile" ADD COLUMN IF NOT EXISTS "currentCreditSYP" DOUBLE PRECISION DEFAULT 0;

-- Add SYP columns to MerchantProfile if they don't exist
ALTER TABLE "MerchantProfile" ADD COLUMN IF NOT EXISTS "totalSalesSYP" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "MerchantProfile" ADD COLUMN IF NOT EXISTS "totalTransactionsSYP" INTEGER DEFAULT 0;

-- ============================================
-- PHASE 2: Migrate existing Wallets
-- ============================================

-- Update existing wallets to explicitly set currency and walletType
UPDATE "Wallet" SET currency = 'USD' WHERE currency IS NULL OR currency = '';
UPDATE "Wallet" SET "walletType" = 'PERSONAL' WHERE "walletType" IS NULL OR "walletType" = '';

-- ============================================
-- PHASE 3: Create SYP wallets for existing users
-- ============================================

-- Create SYP PERSONAL wallets for all users who don't have one
INSERT INTO "Wallet" (id, "userId", balance, "frozenBalance", currency, "walletType", "isActive", "dailyLimit", "monthlyLimit", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    u.id,
    0,
    0,
    'SYP',
    'PERSONAL',
    true,
    1000000,
    10000000,
    NOW(),
    NOW()
FROM "User" u
WHERE NOT EXISTS (
    SELECT 1 FROM "Wallet" w 
    WHERE w."userId" = u.id AND w.currency = 'SYP' AND w."walletType" = 'PERSONAL'
);

-- ============================================
-- PHASE 4: Create business wallets for merchants
-- ============================================

-- Create USD BUSINESS wallets for merchants who don't have one
INSERT INTO "Wallet" (id, "userId", balance, "frozenBalance", currency, "walletType", "isActive", "dailyLimit", "monthlyLimit", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    u.id,
    0,
    0,
    'USD',
    'BUSINESS',
    true,
    1000000,
    10000000,
    NOW(),
    NOW()
FROM "User" u
WHERE u."hasMerchantAccount" = true
AND NOT EXISTS (
    SELECT 1 FROM "Wallet" w 
    WHERE w."userId" = u.id AND w.currency = 'USD' AND w."walletType" = 'BUSINESS'
);

-- Create SYP BUSINESS wallets for merchants who don't have one
INSERT INTO "Wallet" (id, "userId", balance, "frozenBalance", currency, "walletType", "isActive", "dailyLimit", "monthlyLimit", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    u.id,
    0,
    0,
    'SYP',
    'BUSINESS',
    true,
    1000000,
    10000000,
    NOW(),
    NOW()
FROM "User" u
WHERE u."hasMerchantAccount" = true
AND NOT EXISTS (
    SELECT 1 FROM "Wallet" w 
    WHERE w."userId" = u.id AND w.currency = 'SYP' AND w."walletType" = 'BUSINESS'
);

-- ============================================
-- PHASE 5: Add currency column to TransferOTP
-- ============================================

ALTER TABLE "TransferOTP" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';

-- ============================================
-- PHASE 6: Verify migration
-- ============================================

-- Count wallets per type
SELECT 
    currency, 
    "walletType", 
    COUNT(*) as count 
FROM "Wallet" 
GROUP BY currency, "walletType" 
ORDER BY currency, "walletType";

-- Check all users have both personal wallets
SELECT 
    u.id,
    u.phone,
    (SELECT COUNT(*) FROM "Wallet" w WHERE w."userId" = u.id) as wallet_count
FROM "User" u
WHERE (SELECT COUNT(*) FROM "Wallet" w WHERE w."userId" = u.id AND w."walletType" = 'PERSONAL') < 2
LIMIT 10;
