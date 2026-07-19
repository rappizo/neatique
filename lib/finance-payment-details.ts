import { Prisma } from "@prisma/client";
import { hasValidPostgresDatabaseUrl } from "@/lib/database-config";
import { prisma } from "@/lib/db";

export const FINANCE_PAYMENT_STAGE_OPTIONS = ["预付款", "尾款"] as const;
export const FINANCE_ACCOUNT_TYPE_OPTIONS = ["公账", "私账"] as const;

export type FinancePaymentStage = (typeof FINANCE_PAYMENT_STAGE_OPTIONS)[number];
export type FinanceAccountType = (typeof FINANCE_ACCOUNT_TYPE_OPTIONS)[number];

export type FinancePaymentSortKey =
  | "paymentDate"
  | "paymentStage"
  | "accountType"
  | "lingxingContractNo"
  | "sku"
  | "productName"
  | "unit"
  | "quantity"
  | "unitPriceYuan"
  | "totalAmountYuan"
  | "paymentAmountYuan";

export type FinanceSortDirection = "asc" | "desc";

export type FinancePaymentFilters = {
  dateFrom: string;
  dateTo: string;
  paymentStage: string;
  accountType: string;
  lingxingContractNo: string;
  sku: string;
  productName: string;
  unit: string;
  quantityMin: string;
  quantityMax: string;
  unitPriceMin: string;
  unitPriceMax: string;
  totalAmountMin: string;
  totalAmountMax: string;
  paymentAmountMin: string;
  paymentAmountMax: string;
};

export type FinancePaymentDetailRecord = {
  id: string;
  paymentDate: Date;
  paymentStage: FinancePaymentStage;
  accountType: FinanceAccountType;
  lingxingContractNo: string | null;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPriceYuan: number;
  totalAmountYuan: number;
  paymentAmountYuan: number;
  sourceFileName: string | null;
  paymentProofName: string | null;
  paymentProofMimeType: string | null;
  paymentProofBytes: number | null;
  paymentProofUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FinancePaymentDetailsPageRecord = {
  rows: FinancePaymentDetailRecord[];
  totalCount: number;
  totalQuantity: number;
  totalAmountYuan: number;
  totalPaymentAmountYuan: number;
  filters: FinancePaymentFilters;
  sortKey: FinancePaymentSortKey;
  sortDirection: FinanceSortDirection;
};

export type FinanceProductOption = {
  sku: string;
  productName: string;
  productShortName: string | null;
  status: string;
};

export type FinancePaymentInput = {
  paymentDate?: unknown;
  paymentStage?: unknown;
  accountType?: unknown;
  lingxingContractNo?: unknown;
  sku?: unknown;
  productName?: unknown;
  unit?: unknown;
  quantity?: unknown;
  unitPriceYuan?: unknown;
  paymentAmountYuan?: unknown;
};

type FinanceColumnKey = keyof FinancePaymentInput | "totalAmountYuan";

const DEFAULT_FILTERS: FinancePaymentFilters = {
  dateFrom: "",
  dateTo: "",
  paymentStage: "",
  accountType: "",
  lingxingContractNo: "",
  sku: "",
  productName: "",
  unit: "",
  quantityMin: "",
  quantityMax: "",
  unitPriceMin: "",
  unitPriceMax: "",
  totalAmountMin: "",
  totalAmountMax: "",
  paymentAmountMin: "",
  paymentAmountMax: ""
};

const SORT_KEYS = new Set<FinancePaymentSortKey>([
  "paymentDate",
  "paymentStage",
  "accountType",
  "lingxingContractNo",
  "sku",
  "productName",
  "unit",
  "quantity",
  "unitPriceYuan",
  "totalAmountYuan",
  "paymentAmountYuan"
]);

export function getDefaultFinancePaymentFilters(
  input: Partial<Record<keyof FinancePaymentFilters, string | undefined>>
): FinancePaymentFilters {
  return {
    ...DEFAULT_FILTERS,
    ...Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
    )
  };
}

export function normalizeFinancePaymentSortKey(value: string | undefined): FinancePaymentSortKey {
  return value && SORT_KEYS.has(value as FinancePaymentSortKey) ? (value as FinancePaymentSortKey) : "paymentDate";
}

export function normalizeFinanceSortDirection(value: string | undefined): FinanceSortDirection {
  return value === "asc" ? "asc" : "desc";
}

export function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseFinanceNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value ?? "")
    .replace(/[￥¥,\s]/g, "")
    .replace(/元/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatFinancePlainNumber(value: number, maximumFractionDigits = 4) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(value);
}

export function formatFinanceYuan(value: number) {
  return `￥${new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
}

export function formatFinanceDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function escapeFinanceCsvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatFinanceCsvNumber(value: number, fractionDigits: number) {
  return value.toFixed(fractionDigits).replace(/\.?0+$/, "");
}

export function buildFinancePaymentDetailsCsv(rows: FinancePaymentDetailRecord[]) {
  const header = [
    "日期",
    "预付款/尾款",
    "公账/私账",
    "领星合同号",
    "SKU",
    "品名",
    "单位",
    "数量",
    "单价（元）",
    "总金额",
    "预付款/尾款付款金额（元）",
    "付款信息",
    "创建时间",
    "更新时间"
  ];
  const csvRows = rows.map((row) => [
    formatFinanceDateInputValue(row.paymentDate),
    row.paymentStage,
    row.accountType,
    row.lingxingContractNo ?? "",
    row.sku,
    row.productName,
    row.unit,
    formatFinanceCsvNumber(row.quantity, 4),
    formatFinanceCsvNumber(row.unitPriceYuan, 4),
    formatFinanceCsvNumber(row.totalAmountYuan, 2),
    formatFinanceCsvNumber(row.paymentAmountYuan, 2),
    row.paymentProofName ?? "",
    row.createdAt.toISOString(),
    row.updatedAt.toISOString()
  ]);
  const lines = [header, ...csvRows].map((row) => row.map(escapeFinanceCsvCell).join(","));

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizePaymentStage(value: unknown, fallback: FinancePaymentStage = "预付款"): FinancePaymentStage {
  const text = toText(value || fallback);
  return text.includes("尾") ? "尾款" : "预付款";
}

function normalizeAccountType(value: unknown, fallback: FinanceAccountType = "公账"): FinanceAccountType {
  const text = toText(value || fallback);
  return text.includes("私") ? "私账" : "公账";
}

function buildUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function parseDateText(value: string) {
  const normalized = value
    .trim()
    .replace(/[年月.]/g, "-")
    .replace(/日/g, "")
    .replace(/\//g, "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return buildUtcDate(year, month, day);
}

function parsePaymentDate(value: unknown, fallbackDate: string) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return buildUtcDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsed = new Date(excelEpoch + Math.floor(value) * 24 * 60 * 60 * 1000);
    return buildUtcDate(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }

  const text = toText(value);
  const parsedText = text ? parseDateText(text) : null;
  const parsedFallback = parseDateText(fallbackDate);
  return parsedText ?? parsedFallback ?? buildUtcDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
}

function toDecimal(value: number, places: number) {
  return new Prisma.Decimal(value.toFixed(places));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildCreateInput(
  input: FinancePaymentInput,
  options: {
    fallbackDate: string;
    fallbackPaymentStage: FinancePaymentStage;
    fallbackAccountType: FinanceAccountType;
    sourceFileName?: string | null;
  }
): Prisma.FinancePaymentDetailCreateManyInput | null {
  const sku = toText(input.sku);

  if (!sku) {
    return null;
  }

  const quantity = parseFinanceNumber(input.quantity) ?? 0;
  const unitPriceYuan = parseFinanceNumber(input.unitPriceYuan) ?? 0;
  const paymentAmountYuan = parseFinanceNumber(input.paymentAmountYuan) ?? 0;
  const totalAmountYuan = roundMoney(quantity * unitPriceYuan);

  return {
    paymentDate: parsePaymentDate(input.paymentDate, options.fallbackDate),
    paymentStage: normalizePaymentStage(input.paymentStage, options.fallbackPaymentStage),
    accountType: normalizeAccountType(input.accountType, options.fallbackAccountType),
    lingxingContractNo: toText(input.lingxingContractNo) || null,
    sku,
    productName: toText(input.productName),
    unit: toText(input.unit) || "瓶",
    quantity: toDecimal(quantity, 4),
    unitPriceYuan: toDecimal(unitPriceYuan, 4),
    totalAmountYuan: toDecimal(totalAmountYuan, 2),
    paymentAmountYuan: toDecimal(paymentAmountYuan, 2),
    sourceFileName: options.sourceFileName || null
  };
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[：:（）()，,、/\s_-]/g, "");
}

function detectFinanceColumn(value: unknown): FinanceColumnKey | null {
  const header = normalizeHeader(value);

  if (!header) {
    return null;
  }

  if (header === "日期" || header === "date") {
    return "paymentDate";
  }

  if (header === "预付款尾款付款金额" || header === "付款金额" || header === "预付款付款金额" || header === "尾款付款金额") {
    return "paymentAmountYuan";
  }

  if (header === "预付款尾款" || header === "款项类型" || header === "付款类型") {
    return "paymentStage";
  }

  if (header === "公账私账" || header === "账户类型") {
    return "accountType";
  }

  if (header === "领星合同编号" || header === "领星合同号" || header === "合同编号") {
    return "lingxingContractNo";
  }

  if (header === "sku") {
    return "sku";
  }

  if (header === "品名" || header === "产品名称" || header === "商品名称") {
    return "productName";
  }

  if (header === "单位") {
    return "unit";
  }

  if (header === "数量") {
    return "quantity";
  }

  if (header === "单价元" || header === "单价") {
    return "unitPriceYuan";
  }

  if (header === "总金额" || header === "总金额元") {
    return "totalAmountYuan";
  }

  return null;
}

function findHeaderRow(rows: unknown[][]) {
  return rows.findIndex((row) => {
    const columns = new Set(row.map(detectFinanceColumn).filter(Boolean));
    return columns.has("sku") && columns.has("quantity") && columns.has("unitPriceYuan");
  });
}

function buildHeaderMap(headerRow: unknown[]) {
  const map = new Map<FinanceColumnKey, number>();

  headerRow.forEach((cell, index) => {
    const column = detectFinanceColumn(cell);
    if (column && !map.has(column)) {
      map.set(column, index);
    }
  });

  return map;
}

function getCell(row: unknown[], headerMap: Map<FinanceColumnKey, number>, key: FinanceColumnKey) {
  const index = headerMap.get(key);
  return typeof index === "number" ? row[index] : "";
}

export function buildManualFinancePaymentDetailInput(input: FinancePaymentInput) {
  const fallbackDate = toText(input.paymentDate) || getTodayDateInputValue();
  return buildCreateInput(input, {
    fallbackDate,
    fallbackPaymentStage: normalizePaymentStage(input.paymentStage),
    fallbackAccountType: normalizeAccountType(input.accountType)
  });
}

function mapFinancePaymentDetail(row: any): FinancePaymentDetailRecord {
  return {
    id: row.id,
    paymentDate: new Date(row.paymentDate),
    paymentStage: normalizePaymentStage(row.paymentStage),
    accountType: normalizeAccountType(row.accountType),
    lingxingContractNo: row.lingxingContractNo ?? null,
    sku: row.sku,
    productName: row.productName,
    unit: row.unit,
    quantity: Number(row.quantity),
    unitPriceYuan: Number(row.unitPriceYuan),
    totalAmountYuan: Number(row.totalAmountYuan),
    paymentAmountYuan: Number(row.paymentAmountYuan),
    sourceFileName: row.sourceFileName ?? null,
    paymentProofName: row.paymentProofName ?? null,
    paymentProofMimeType: row.paymentProofMimeType ?? null,
    paymentProofBytes: row.paymentProofBytes ?? null,
    paymentProofUrl: row.paymentProofMimeType ? `/api/admin/finance/payment-details/${row.id}/attachment` : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  };
}

function buildDateRangeFilter(dateFrom: string, dateTo: string) {
  const range: Prisma.DateTimeFilter = {};
  const parsedFrom = parseDateText(dateFrom);
  const parsedTo = parseDateText(dateTo);

  if (parsedFrom) {
    range.gte = new Date(Date.UTC(parsedFrom.getUTCFullYear(), parsedFrom.getUTCMonth(), parsedFrom.getUTCDate(), 0, 0, 0, 0));
  }

  if (parsedTo) {
    range.lte = new Date(Date.UTC(parsedTo.getUTCFullYear(), parsedTo.getUTCMonth(), parsedTo.getUTCDate(), 23, 59, 59, 999));
  }

  return Object.keys(range).length > 0 ? range : undefined;
}

function buildDecimalRangeFilter(minValue: string, maxValue: string) {
  const range: Prisma.DecimalFilter = {};
  const min = parseFinanceNumber(minValue);
  const max = parseFinanceNumber(maxValue);

  if (typeof min === "number") {
    range.gte = new Prisma.Decimal(min);
  }

  if (typeof max === "number") {
    range.lte = new Prisma.Decimal(max);
  }

  return Object.keys(range).length > 0 ? range : undefined;
}

function buildFinanceWhere(filters: FinancePaymentFilters): Prisma.FinancePaymentDetailWhereInput {
  const where: Prisma.FinancePaymentDetailWhereInput = {};
  const paymentDate = buildDateRangeFilter(filters.dateFrom, filters.dateTo);
  const quantity = buildDecimalRangeFilter(filters.quantityMin, filters.quantityMax);
  const unitPriceYuan = buildDecimalRangeFilter(filters.unitPriceMin, filters.unitPriceMax);
  const totalAmountYuan = buildDecimalRangeFilter(filters.totalAmountMin, filters.totalAmountMax);
  const paymentAmountYuan = buildDecimalRangeFilter(filters.paymentAmountMin, filters.paymentAmountMax);

  if (paymentDate) {
    where.paymentDate = paymentDate;
  }

  if (filters.paymentStage) {
    where.paymentStage = normalizePaymentStage(filters.paymentStage);
  }

  if (filters.accountType) {
    where.accountType = normalizeAccountType(filters.accountType);
  }

  if (filters.lingxingContractNo) {
    where.lingxingContractNo = {
      contains: filters.lingxingContractNo,
      mode: "insensitive"
    };
  }

  if (filters.sku) {
    where.sku = {
      contains: filters.sku,
      mode: "insensitive"
    };
  }

  if (filters.productName) {
    where.productName = {
      contains: filters.productName,
      mode: "insensitive"
    };
  }

  if (filters.unit) {
    where.unit = {
      contains: filters.unit,
      mode: "insensitive"
    };
  }

  if (quantity) {
    where.quantity = quantity;
  }

  if (unitPriceYuan) {
    where.unitPriceYuan = unitPriceYuan;
  }

  if (totalAmountYuan) {
    where.totalAmountYuan = totalAmountYuan;
  }

  if (paymentAmountYuan) {
    where.paymentAmountYuan = paymentAmountYuan;
  }

  return where;
}

function getEmptyFinancePaymentDetailsPage(
  filters: FinancePaymentFilters,
  sortKey: FinancePaymentSortKey,
  sortDirection: FinanceSortDirection
): FinancePaymentDetailsPageRecord {
  return {
    rows: [],
    totalCount: 0,
    totalQuantity: 0,
    totalAmountYuan: 0,
    totalPaymentAmountYuan: 0,
    filters,
    sortKey,
    sortDirection
  };
}

export async function getFinancePaymentDetailsPage(input: {
  filters: FinancePaymentFilters;
  sortKey: FinancePaymentSortKey;
  sortDirection: FinanceSortDirection;
}): Promise<FinancePaymentDetailsPageRecord> {
  const { filters, sortKey, sortDirection } = input;

  if (!hasValidPostgresDatabaseUrl()) {
    return getEmptyFinancePaymentDetailsPage(filters, sortKey, sortDirection);
  }

  const where = buildFinanceWhere(filters);
  const orderBy = [
    { [sortKey]: sortDirection },
    { createdAt: "desc" }
  ] as Prisma.FinancePaymentDetailOrderByWithRelationInput[];

  try {
    const [rows, totalCount, totals] = await Promise.all([
      prisma.financePaymentDetail.findMany({
        where,
        orderBy,
        select: {
          id: true,
          paymentDate: true,
          paymentStage: true,
          accountType: true,
          lingxingContractNo: true,
          sku: true,
          productName: true,
          unit: true,
          quantity: true,
          unitPriceYuan: true,
          totalAmountYuan: true,
          paymentAmountYuan: true,
          sourceFileName: true,
          paymentProofName: true,
          paymentProofMimeType: true,
          paymentProofBytes: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.financePaymentDetail.count({ where }),
      prisma.financePaymentDetail.aggregate({
        where,
        _sum: {
          quantity: true,
          totalAmountYuan: true,
          paymentAmountYuan: true
        }
      })
    ]);

    return {
      rows: rows.map(mapFinancePaymentDetail),
      totalCount,
      totalQuantity: Number(totals._sum.quantity ?? 0),
      totalAmountYuan: Number(totals._sum.totalAmountYuan ?? 0),
      totalPaymentAmountYuan: Number(totals._sum.paymentAmountYuan ?? 0),
      filters,
      sortKey,
      sortDirection
    };
  } catch (error) {
    console.error("Finance payment details query failed:", error);
    return getEmptyFinancePaymentDetailsPage(filters, sortKey, sortDirection);
  }
}

export async function getFinanceProductOptions(): Promise<FinanceProductOption[]> {
  if (!hasValidPostgresDatabaseUrl()) {
    return [];
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        productCode: {
          not: null
        }
      },
      select: {
        productCode: true,
        productShortName: true,
        name: true,
        status: true
      },
      orderBy: [{ productCode: "asc" }, { createdAt: "desc" }]
    });

    return products
      .filter((product): product is typeof product & { productCode: string } => Boolean(product.productCode))
      .map((product) => ({
        sku: product.productCode,
        productName: product.name,
        productShortName: product.productShortName ?? null,
        status: product.status
      }));
  } catch (error) {
    console.error("Finance product options query failed:", error);
    return [];
  }
}
