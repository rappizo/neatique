ALTER TABLE "FinancePaymentDetail"
ADD COLUMN "paymentProofName" TEXT,
ADD COLUMN "paymentProofMimeType" TEXT,
ADD COLUMN "paymentProofBase64" TEXT,
ADD COLUMN "paymentProofBytes" INTEGER;
