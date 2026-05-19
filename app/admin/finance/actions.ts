"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import {
  buildManualFinancePaymentDetailInput,
  parseFinancePaymentDetailsWorkbook,
  type FinancePaymentInput
} from "@/lib/finance-payment-details";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { toPlainString } from "@/lib/utils";

const MAX_PAYMENT_PROOF_BYTES = 8 * 1024 * 1024;
const PAYMENT_PROOF_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf"
]);

function getPaymentDefaults(formData: FormData): FinancePaymentInput {
  return {
    paymentDate: toPlainString(formData.get("paymentDate")),
    paymentStage: toPlainString(formData.get("paymentStage")),
    accountType: toPlainString(formData.get("accountType")),
    lingxingContractNo: toPlainString(formData.get("lingxingContractNo")),
    sku: toPlainString(formData.get("sku")),
    productName: toPlainString(formData.get("productName")),
    unit: toPlainString(formData.get("unit")),
    quantity: toPlainString(formData.get("quantity")),
    unitPriceYuan: toPlainString(formData.get("unitPriceYuan")),
    paymentAmountYuan: toPlainString(formData.get("paymentAmountYuan"))
  };
}

function getUploadedPaymentFile(formData: FormData) {
  const value = formData.get("paymentFile");

  if (
    value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    "size" in value &&
    typeof value.size === "number" &&
    value.size > 0
  ) {
    return value as File;
  }

  return null;
}

function getUploadedPaymentProofFile(formData: FormData) {
  const value = formData.get("paymentProofFile");

  if (
    value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    "size" in value &&
    typeof value.size === "number" &&
    value.size > 0
  ) {
    return value as File;
  }

  return null;
}

async function buildPaymentProofPayload(formData: FormData) {
  const file = getUploadedPaymentProofFile(formData);

  if (!file) {
    return null;
  }

  if (file.size > MAX_PAYMENT_PROOF_BYTES) {
    redirect("/admin/finance?status=payment-proof-too-large");
  }

  if (!PAYMENT_PROOF_MIME_TYPES.has(file.type)) {
    redirect("/admin/finance?status=payment-proof-unsupported");
  }

  return {
    paymentProofName: file.name || "payment-proof",
    paymentProofMimeType: file.type,
    paymentProofBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    paymentProofBytes: file.size
  } satisfies Pick<
    Prisma.FinancePaymentDetailCreateManyInput,
    "paymentProofName" | "paymentProofMimeType" | "paymentProofBase64" | "paymentProofBytes"
  >;
}

async function applyProductNamesFromSku(rows: Prisma.FinancePaymentDetailCreateManyInput[]) {
  const skus = Array.from(
    new Set(
      rows
        .map((row) => String(row.sku || "").trim())
        .filter(Boolean)
    )
  );

  if (skus.length === 0) {
    return rows;
  }

  const products = await prisma.product.findMany({
    where: {
      productCode: {
        in: skus
      }
    },
    select: {
      productCode: true,
      name: true
    }
  });
  const nameBySku = new Map(
    products
      .filter((product): product is typeof product & { productCode: string } => Boolean(product.productCode))
      .map((product) => [product.productCode, product.name])
  );

  return rows.map((row) => {
    const sku = String(row.sku || "").trim();
    const productName = nameBySku.get(sku);
    return productName ? { ...row, productName } : row;
  });
}

export async function addFinancePaymentDetailsAction(formData: FormData) {
  await requireAdminSession();

  const defaults = getPaymentDefaults(formData);
  const uploadedFile = getUploadedPaymentFile(formData);
  const paymentProofPayload = await buildPaymentProofPayload(formData);
  let rowsToCreate: Prisma.FinancePaymentDetailCreateManyInput[] = [];

  if (uploadedFile) {
    try {
      const buffer = Buffer.from(await uploadedFile.arrayBuffer());
      rowsToCreate = parseFinancePaymentDetailsWorkbook(buffer, defaults, uploadedFile.name);
    } catch (error) {
      console.error("Finance payment upload parse failed:", error);
      redirect("/admin/finance?status=upload-parse-failed");
    }
  } else {
    const manualRow = buildManualFinancePaymentDetailInput(defaults);
    rowsToCreate = manualRow ? [manualRow] : [];
  }

  if (rowsToCreate.length === 0) {
    redirect("/admin/finance?status=missing-payment-rows");
  }

  rowsToCreate = await applyProductNamesFromSku(rowsToCreate);
  if (paymentProofPayload) {
    rowsToCreate = rowsToCreate.map((row) => ({
      ...row,
      ...paymentProofPayload
    }));
  }

  try {
    await prisma.financePaymentDetail.createMany({
      data: rowsToCreate
    });
  } catch (error) {
    console.error("Finance payment detail save failed:", error);
    redirect("/admin/finance?status=save-failed");
  }

  revalidatePath("/admin/finance");
  redirect(`/admin/finance?status=payment-details-added&count=${rowsToCreate.length}`);
}
