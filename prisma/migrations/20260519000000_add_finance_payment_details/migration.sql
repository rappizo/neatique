CREATE TABLE "FinancePaymentDetail" (
    "id" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentStage" TEXT NOT NULL DEFAULT '预付款',
    "accountType" TEXT NOT NULL DEFAULT '公账',
    "lingxingContractNo" TEXT,
    "sku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '瓶',
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitPriceYuan" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmountYuan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentAmountYuan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sourceFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancePaymentDetail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancePaymentDetail_paymentDate_idx" ON "FinancePaymentDetail"("paymentDate");
CREATE INDEX "FinancePaymentDetail_paymentStage_paymentDate_idx" ON "FinancePaymentDetail"("paymentStage", "paymentDate");
CREATE INDEX "FinancePaymentDetail_accountType_paymentDate_idx" ON "FinancePaymentDetail"("accountType", "paymentDate");
CREATE INDEX "FinancePaymentDetail_lingxingContractNo_idx" ON "FinancePaymentDetail"("lingxingContractNo");
CREATE INDEX "FinancePaymentDetail_sku_idx" ON "FinancePaymentDetail"("sku");
