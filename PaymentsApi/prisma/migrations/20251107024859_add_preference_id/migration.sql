-- DropIndex
DROP INDEX "public"."Payment_orderId_idx";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerPreferenceId" TEXT;

-- CreateIndex
CREATE INDEX "Payment_providerRef_idx" ON "Payment"("providerRef");

-- CreateIndex
CREATE INDEX "Payment_providerPreferenceId_idx" ON "Payment"("providerPreferenceId");

-- CreateIndex
CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");
