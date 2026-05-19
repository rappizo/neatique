import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  buildFinancePaymentDetailsCsv,
  getDefaultFinancePaymentFilters,
  getFinancePaymentDetailsPage,
  getTodayDateInputValue,
  normalizeFinancePaymentSortKey,
  normalizeFinanceSortDirection
} from "@/lib/finance-payment-details";

export async function GET(request: NextRequest) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const filters = getDefaultFinancePaymentFilters({
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
    paymentStage: params.get("paymentStage") ?? undefined,
    accountType: params.get("accountType") ?? undefined,
    lingxingContractNo: params.get("lingxingContractNo") ?? undefined,
    sku: params.get("sku") ?? undefined,
    productName: params.get("productName") ?? undefined,
    unit: params.get("unit") ?? undefined,
    quantityMin: params.get("quantityMin") ?? undefined,
    quantityMax: params.get("quantityMax") ?? undefined,
    unitPriceMin: params.get("unitPriceMin") ?? undefined,
    unitPriceMax: params.get("unitPriceMax") ?? undefined,
    totalAmountMin: params.get("totalAmountMin") ?? undefined,
    totalAmountMax: params.get("totalAmountMax") ?? undefined,
    paymentAmountMin: params.get("paymentAmountMin") ?? undefined,
    paymentAmountMax: params.get("paymentAmountMax") ?? undefined
  });
  const sortKey = normalizeFinancePaymentSortKey(params.get("sort") ?? undefined);
  const sortDirection = normalizeFinanceSortDirection(params.get("direction") ?? undefined);
  const paymentPage = await getFinancePaymentDetailsPage({
    filters,
    sortKey,
    sortDirection
  });
  const csv = buildFinancePaymentDetailsCsv(paymentPage.rows);
  const filename = `finance-payment-details-${getTodayDateInputValue()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
