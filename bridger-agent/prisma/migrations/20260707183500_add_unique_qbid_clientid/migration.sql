-- CreateIndex
CREATE UNIQUE INDEX "Account_qbId_clientId_key" ON "Account"("qbId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_qbId_key" ON "Client"("qbId");

-- CreateIndex
CREATE UNIQUE INDEX "QbCategory_qbId_clientId_key" ON "QbCategory"("qbId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "QbPayee_qbId_clientId_key" ON "QbPayee"("qbId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_qbId_clientId_key" ON "Transaction"("qbId", "clientId");

