-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "depositFeePercent" REAL NOT NULL DEFAULT 1.0,
    "withdrawalFeePercent" REAL NOT NULL DEFAULT 1.5,
    "transferFeePercent" REAL NOT NULL DEFAULT 0.5,
    "qrPaymentFeePercent" REAL NOT NULL DEFAULT 0.5,
    "agentCommissionPercent" REAL NOT NULL DEFAULT 50.0,
    "dailyTransactionLimit" REAL NOT NULL DEFAULT 10000.0,
    "weeklyTransactionLimit" REAL NOT NULL DEFAULT 50000.0,
    "monthlyTransactionLimit" REAL NOT NULL DEFAULT 200000.0,
    "minTransactionAmount" REAL NOT NULL DEFAULT 1.0,
    "maxTransactionAmount" REAL NOT NULL DEFAULT 50000.0,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "senderId" TEXT,
    "receiverId" TEXT,
    "agentId" TEXT,
    "amount" REAL NOT NULL,
    "fee" REAL NOT NULL DEFAULT 0,
    "platformFee" REAL NOT NULL DEFAULT 0,
    "agentFee" REAL NOT NULL DEFAULT 0,
    "netAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "descriptionAr" TEXT,
    "metadata" TEXT,
    "receiptUrl" TEXT,
    "receiptHash" TEXT,
    "ledgerEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Transaction_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("agentFee", "agentId", "amount", "completedAt", "createdAt", "currency", "description", "descriptionAr", "fee", "id", "ledgerEntryId", "metadata", "netAmount", "platformFee", "receiptHash", "receiptUrl", "receiverId", "referenceNumber", "senderId", "status", "type") SELECT "agentFee", "agentId", "amount", "completedAt", "createdAt", "currency", "description", "descriptionAr", "fee", "id", "ledgerEntryId", "metadata", "netAmount", "platformFee", "receiptHash", "receiptUrl", "receiverId", "referenceNumber", "senderId", "status", "type" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_referenceNumber_key" ON "Transaction"("referenceNumber");
CREATE INDEX "Transaction_referenceNumber_idx" ON "Transaction"("referenceNumber");
CREATE INDEX "Transaction_senderId_idx" ON "Transaction"("senderId");
CREATE INDEX "Transaction_receiverId_idx" ON "Transaction"("receiverId");
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");
CREATE TABLE "new_Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "frozenBalance" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimit" REAL NOT NULL DEFAULT 1000000,
    "monthlyLimit" REAL NOT NULL DEFAULT 10000000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Wallet" ("balance", "createdAt", "currency", "dailyLimit", "frozenBalance", "id", "isActive", "monthlyLimit", "updatedAt", "userId") SELECT "balance", "createdAt", "currency", "dailyLimit", "frozenBalance", "id", "isActive", "monthlyLimit", "updatedAt", "userId" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
