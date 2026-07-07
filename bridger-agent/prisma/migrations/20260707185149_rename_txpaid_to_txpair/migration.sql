-- Rename TransactionLabel.txPaidId to txPairId, preserving existing values.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TransactionLabel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payeeId" INTEGER NOT NULL,
    "txPairId" INTEGER,
    "isCorrect" BOOLEAN,
    "incorrectReason" TEXT,
    "correctedLabelId" INTEGER,
    CONSTRAINT "TransactionLabel_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "QbPayee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransactionLabel_txPairId_fkey" FOREIGN KEY ("txPairId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransactionLabel_correctedLabelId_fkey" FOREIGN KEY ("correctedLabelId") REFERENCES "TransactionLabel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TransactionLabel" ("correctedLabelId", "id", "incorrectReason", "isCorrect", "payeeId", "txPairId") SELECT "correctedLabelId", "id", "incorrectReason", "isCorrect", "payeeId", "txPaidId" FROM "TransactionLabel";
DROP TABLE "TransactionLabel";
ALTER TABLE "new_TransactionLabel" RENAME TO "TransactionLabel";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
