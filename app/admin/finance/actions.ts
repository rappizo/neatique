"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import {
  buildManualFinancePaymentDetailInput,
  parseFinanceNumber,
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

function getFinanceRedirect(status: string) {
  return `/admin/finance?status=${status}`;
}

function toRequiredString(value: unknown) {
  return String(value ?? "").trim();
}

function validatePaymentDefaults(input: FinancePaymentInput) {
  const requiredText = [
    input.paymentDate,
    input.paymentStage,
    input.accountType,
    input.lingxingContractNo,
    input.sku,
    input.productName,
    input.unit
  ];
  const requiredNumbers = [input.quantity, input.unitPriceYuan, input.paymentAmountYuan];

  if (requiredText.some((value) => !toRequiredString(value)) || requiredNumbers.some((value) => !toRequiredString(value))) {
    return "missing-fields";
  }

  if (
    parseFinanceNumber(input.quantity) === null ||
    parseFinanceNumber(input.unitPriceYuan) === null ||
    parseFinanceNumber(input.paymentAmountYuan) === null
  ) {
    return "invalid-number";
  }

  return null;
}

async function buildPaymentProofPayload(formData: FormData) {
  const file = getUploadedPaymentProofFile(formData);

  if (!file) {
    return null;
  }

  if (file.size > MAX_PAYMENT_PROOF_BYTES) {
    redirect(getFinanceRedirect("payment-proof-too-large"));
  }

  if (!PAYMENT_PROOF_MIME_TYPES.has(file.type)) {
    redirect(getFinanceRedirect("payment-proof-unsupported"));
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
  const validationError = validatePaymentDefaults(defaults);
  if (validationError) {
    redirect(getFinanceRedirect(validationError));
  }

  const paymentProofPayload = await buildPaymentProofPayload(formData);
  if (!paymentProofPayload) {
    redirect(getFinanceRedirect("missing-payment-proof"));
  }

  let rowsToCreate: Prisma.FinancePaymentDetailCreateManyInput[] = [];
  const manualRow = buildManualFinancePaymentDetailInput(defaults);
  rowsToCreate = manualRow ? [manualRow] : [];

  if (rowsToCreate.length === 0) {
    redirect(getFinanceRedirect("missing-payment-rows"));
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
    redirect(getFinanceRedirect("save-failed"));
  }

  revalidatePath("/admin/finance");
  redirect(`/admin/finance?status=payment-details-added&count=${rowsToCreate.length}`);
}

export async function updateFinancePaymentDetailAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const defaults = getPaymentDefaults(formData);
  const validationError = validatePaymentDefaults(defaults);

  if (!id) {
    redirect(getFinanceRedirect("missing-payment-row"));
  }

  if (validationError) {
    redirect(getFinanceRedirect(validationError));
  }

  const existing = await prisma.financePaymentDetail.findUnique({
    where: { id },
    select: {
      id: true,
      paymentProofMimeType: true
    }
  });

  if (!existing) {
    redirect(getFinanceRedirect("missing-payment-row"));
  }

  const paymentProofPayload = await buildPaymentProofPayload(formData);
  if (!existing.paymentProofMimeType && !paymentProofPayload) {
    redirect(getFinanceRedirect("missing-payment-proof"));
  }

  const manualRow = buildManualFinancePaymentDetailInput(defaults);
  if (!manualRow) {
    redirect(getFinanceRedirect("missing-payment-rows"));
  }

  const [rowToUpdate] = await applyProductNamesFromSku([manualRow]);

  if (!rowToUpdate) {
    redirect(getFinanceRedirect("missing-payment-rows"));
  }

  try {
    await prisma.financePaymentDetail.update({
      where: { id },
      data: {
        paymentDate: rowToUpdate.paymentDate,
        paymentStage: rowToUpdate.paymentStage,
        accountType: rowToUpdate.accountType,
        lingxingContractNo: rowToUpdate.lingxingContractNo,
        sku: rowToUpdate.sku,
        productName: rowToUpdate.productName,
        unit: rowToUpdate.unit,
        quantity: rowToUpdate.quantity,
        unitPriceYuan: rowToUpdate.unitPriceYuan,
        totalAmountYuan: rowToUpdate.totalAmountYuan,
        paymentAmountYuan: rowToUpdate.paymentAmountYuan,
        ...(paymentProofPayload ?? {})
      }
    });
  } catch (error) {
    console.error("Finance payment detail update failed:", error);
    redirect(getFinanceRedirect("save-failed"));
  }

  revalidatePath("/admin/finance");
  redirect(getFinanceRedirect("payment-detail-updated"));
}

export async function deleteFinancePaymentDetailAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));

  if (!id) {
    redirect(getFinanceRedirect("missing-payment-row"));
  }

  try {
    await prisma.financePaymentDetail.delete({
      where: { id }
    });
  } catch (error) {
    console.error("Finance payment detail delete failed:", error);
    redirect(getFinanceRedirect("delete-failed"));
  }

  revalidatePath("/admin/finance");
  redirect(getFinanceRedirect("payment-detail-deleted"));
}
