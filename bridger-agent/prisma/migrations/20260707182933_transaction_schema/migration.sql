-- CreateTable
CREATE TABLE "Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qbId" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qbId" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Account_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amount" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "bankDescription" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "qbId" TEXT NOT NULL,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionLabel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payeeId" INTEGER NOT NULL,
    "txPaidId" INTEGER,
    "isCorrect" BOOLEAN,
    "incorrectReason" TEXT,
    "correctedLabelId" INTEGER,
    CONSTRAINT "TransactionLabel_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "QbPayee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransactionLabel_txPaidId_fkey" FOREIGN KEY ("txPaidId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransactionLabel_correctedLabelId_fkey" FOREIGN KEY ("correctedLabelId") REFERENCES "TransactionLabel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryLabel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qbCategoryId" INTEGER NOT NULL,
    "transactionLabelId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "CategoryLabel_qbCategoryId_fkey" FOREIGN KEY ("qbCategoryId") REFERENCES "QbCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CategoryLabel_transactionLabelId_fkey" FOREIGN KEY ("transactionLabelId") REFERENCES "TransactionLabel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QbCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qbId" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "QbCategory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QbPayee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qbId" TEXT,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "QbPayee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_qbId_key" ON "Client"("qbId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_qbId_clientId_key" ON "Account"("qbId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_qbId_clientId_key" ON "Transaction"("qbId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "QbCategory_qbId_clientId_key" ON "QbCategory"("qbId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "QbPayee_qbId_clientId_key" ON "QbPayee"("qbId", "clientId");

