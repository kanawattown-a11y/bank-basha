-- Manual migration to add SystemSettings table
-- Run this SQL in your database

CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    depositFeePercent REAL NOT NULL DEFAULT 1.0,
    withdrawalFeePercent REAL NOT NULL DEFAULT 1.5,
    transferFeePercent REAL NOT NULL DEFAULT 0.5,
    qrPaymentFeePercent REAL NOT NULL DEFAULT 0.5,
    agentCommissionPercent REAL NOT NULL DEFAULT 50.0,
    dailyTransactionLimit REAL NOT NULL DEFAULT 10000.0,
    weeklyTransactionLimit REAL NOT NULL DEFAULT 50000.0,
    monthlyTransactionLimit REAL NOT NULL DEFAULT 200000.0,
    minTransactionAmount REAL NOT NULL DEFAULT 1.0,
    maxTransactionAmount REAL NOT NULL DEFAULT 50000.0,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedBy TEXT
);

-- Insert default settings
INSERT INTO system_settings (id, depositFeePercent, withdrawalFeePercent, transferFeePercent, qrPaymentFeePercent, agentCommissionPercent, dailyTransactionLimit, weeklyTransactionLimit, monthlyTransactionLimit, minTransactionAmount, maxTransactionAmount, updatedAt)
VALUES (
    lower(hex(randomblob(16))),
    1.0,
    1.5,
    0.5,
    0.5,
    50.0,
    10000.0,
    50000.0,
    200000.0,
    1.0,
    50000.0,
    CURRENT_TIMESTAMP
);
