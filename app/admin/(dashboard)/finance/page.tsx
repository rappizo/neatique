import Link from "next/link";
import {
  addFinancePaymentDetailsAction,
  deleteFinancePaymentDetailAction,
  updateFinancePaymentDetailAction
} from "@/app/admin/finance/actions";
import { FinancePaymentDetailForm } from "@/components/admin/finance-payment-detail-form";
import { FinancePaymentProofViewer } from "@/components/admin/finance-payment-proof-viewer";
import {
  FINANCE_ACCOUNT_TYPE_OPTIONS,
  FINANCE_PAYMENT_STAGE_OPTIONS,
  formatFinanceDateInputValue,
  formatFinancePlainNumber,
  formatFinanceYuan,
  getDefaultFinancePaymentFilters,
  getFinancePaymentDetailsPage,
  getFinanceProductOptions,
  getTodayDateInputValue,
  normalizeFinancePaymentSortKey,
  normalizeFinanceSortDirection,
  type FinancePaymentFilters,
  type FinancePaymentSortKey
} from "@/lib/finance-payment-details";

type AdminFinancePageSearchParams = Partial<FinancePaymentFilters> & {
  sort?: string;
  direction?: string;
  status?: string;
  count?: string;
};

type AdminFinancePageProps = {
  searchParams: Promise<AdminFinancePageSearchParams>;
};

const sortHeaders: Array<{ key: FinancePaymentSortKey; label: string; className?: string }> = [
  { key: "paymentDate", label: "日期" },
  { key: "paymentStage", label: "预付款/尾款" },
  { key: "accountType", label: "公账/私账" },
  { key: "lingxingContractNo", label: "领星合同号" },
  { key: "sku", label: "SKU" },
  { key: "productName", label: "品名" },
  { key: "unit", label: "单位" },
  { key: "quantity", label: "数量", className: "finance-table__number" },
  { key: "unitPriceYuan", label: "单价（元）", className: "finance-table__number" },
  { key: "totalAmountYuan", label: "总金额", className: "finance-table__number" },
  { key: "paymentAmountYuan", label: "预付款/尾款付款金额（元）", className: "finance-table__number" }
];

function getStatusMessage(status?: string, count?: string) {
  switch (status) {
    case "payment-details-added":
      return `已添加 ${count || "0"} 行付款明细。`;
    case "payment-detail-updated":
      return "付款明细已更新。";
    case "payment-detail-deleted":
      return "付款明细已删除。";
    case "missing-fields":
      return "付款明细所有字段都是必填项。";
    case "invalid-number":
      return "数量、单价和付款金额必须填写数字。";
    case "missing-payment-proof":
      return "付款截图是必填项。";
    case "missing-payment-row":
      return "没有找到这条付款明细。";
    case "missing-payment-rows":
      return "没有找到可添加的 SKU 行，请选择产品 SKU 或手动填写 SKU。";
    case "save-failed":
      return "付款明细保存失败，请确认数据库迁移已经部署。";
    case "delete-failed":
      return "付款明细删除失败。";
    case "payment-proof-too-large":
      return "付款截图太大，请上传 8MB 以内的图片或 PDF。";
    case "payment-proof-unsupported":
      return "付款截图格式不支持，请上传图片或 PDF。";
    default:
      return status ? `Finance action completed: ${status}.` : "";
  }
}

function buildQuery(filters: FinancePaymentFilters, sortKey: FinancePaymentSortKey, direction: string) {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  query.set("sort", sortKey);
  query.set("direction", direction);
  return query;
}

export default async function AdminFinancePage({ searchParams }: AdminFinancePageProps) {
  const params = await searchParams;
  const filters = getDefaultFinancePaymentFilters({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    paymentStage: params.paymentStage,
    accountType: params.accountType,
    lingxingContractNo: params.lingxingContractNo,
    sku: params.sku,
    productName: params.productName,
    unit: params.unit,
    quantityMin: params.quantityMin,
    quantityMax: params.quantityMax,
    unitPriceMin: params.unitPriceMin,
    unitPriceMax: params.unitPriceMax,
    totalAmountMin: params.totalAmountMin,
    totalAmountMax: params.totalAmountMax,
    paymentAmountMin: params.paymentAmountMin,
    paymentAmountMax: params.paymentAmountMax
  });
  const sortKey = normalizeFinancePaymentSortKey(params.sort);
  const sortDirection = normalizeFinanceSortDirection(params.direction);
  const [paymentPage, productOptions] = await Promise.all([
    getFinancePaymentDetailsPage({
      filters,
      sortKey,
      sortDirection
    }),
    getFinanceProductOptions()
  ]);
  const defaultDate = getTodayDateInputValue();
  const statusMessage = getStatusMessage(params.status, params.count);
  const exportHref = `/api/admin/finance/payment-details/export?${buildQuery(filters, sortKey, sortDirection).toString()}`;

  function buildSortHref(nextSortKey: FinancePaymentSortKey) {
    const nextDirection = sortKey === nextSortKey && sortDirection === "asc" ? "desc" : "asc";
    return `/admin/finance?${buildQuery(filters, nextSortKey, nextDirection).toString()}`;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Finance</p>
        <h1>按 SKU 和付款节点管理供应商付款明细。</h1>
        <p>
          添加单行付款记录并上传付款截图，SKU 可以从产品库选择，也可以临时手动填写。
        </p>
      </div>

      {statusMessage ? <p className="notice">{statusMessage}</p> : null}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>付款明细</h2>
            <p className="form-note">每个 SKU 的每次付款会保存为一行。</p>
          </div>
          <div className="stack-row">
            <span className="pill">{paymentPage.totalCount} rows</span>
            <span className="pill">{formatFinanceYuan(paymentPage.totalPaymentAmountYuan)} paid</span>
            <span className="pill">{productOptions.length} product SKU</span>
          </div>
        </div>
        <FinancePaymentDetailForm
          action={addFinancePaymentDetailsAction}
          defaultDate={defaultDate}
          productOptions={productOptions}
        />
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>筛选</h2>
            <p className="form-note">
              当前总数量 {formatFinancePlainNumber(paymentPage.totalQuantity)}，总金额{" "}
              {formatFinanceYuan(paymentPage.totalAmountYuan)}。
            </p>
          </div>
          <div className="stack-row">
            <a href={exportHref} className="button button--secondary">
              导出 CSV
            </a>
          </div>
        </div>
        <form method="get" className="finance-filter-grid">
          <input type="hidden" name="sort" value={sortKey} />
          <input type="hidden" name="direction" value={sortDirection} />
          <div className="field">
            <label htmlFor="dateFrom">日期开始</label>
            <input id="dateFrom" name="dateFrom" type="date" defaultValue={filters.dateFrom} />
          </div>
          <div className="field">
            <label htmlFor="dateTo">日期结束</label>
            <input id="dateTo" name="dateTo" type="date" defaultValue={filters.dateTo} />
          </div>
          <div className="field">
            <label htmlFor="filterPaymentStage">预付款/尾款</label>
            <select id="filterPaymentStage" name="paymentStage" defaultValue={filters.paymentStage}>
              <option value="">全部</option>
              {FINANCE_PAYMENT_STAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filterAccountType">公账/私账</label>
            <select id="filterAccountType" name="accountType" defaultValue={filters.accountType}>
              <option value="">全部</option>
              {FINANCE_ACCOUNT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filterLingxingContractNo">领星合同号</label>
            <input id="filterLingxingContractNo" name="lingxingContractNo" defaultValue={filters.lingxingContractNo} />
          </div>
          <div className="field">
            <label htmlFor="filterSku">SKU</label>
            <input id="filterSku" name="sku" defaultValue={filters.sku} />
          </div>
          <div className="field">
            <label htmlFor="filterProductName">品名</label>
            <input id="filterProductName" name="productName" defaultValue={filters.productName} />
          </div>
          <div className="field">
            <label htmlFor="filterUnit">单位</label>
            <input id="filterUnit" name="unit" defaultValue={filters.unit} />
          </div>
          <div className="field">
            <label>数量</label>
            <div className="finance-range">
              <input name="quantityMin" inputMode="decimal" placeholder="最小" defaultValue={filters.quantityMin} />
              <input name="quantityMax" inputMode="decimal" placeholder="最大" defaultValue={filters.quantityMax} />
            </div>
          </div>
          <div className="field">
            <label>单价（元）</label>
            <div className="finance-range">
              <input name="unitPriceMin" inputMode="decimal" placeholder="最小" defaultValue={filters.unitPriceMin} />
              <input name="unitPriceMax" inputMode="decimal" placeholder="最大" defaultValue={filters.unitPriceMax} />
            </div>
          </div>
          <div className="field">
            <label>总金额</label>
            <div className="finance-range">
              <input name="totalAmountMin" inputMode="decimal" placeholder="最小" defaultValue={filters.totalAmountMin} />
              <input name="totalAmountMax" inputMode="decimal" placeholder="最大" defaultValue={filters.totalAmountMax} />
            </div>
          </div>
          <div className="field">
            <label>预付款/尾款付款金额（元）</label>
            <div className="finance-range">
              <input name="paymentAmountMin" inputMode="decimal" placeholder="最小" defaultValue={filters.paymentAmountMin} />
              <input name="paymentAmountMax" inputMode="decimal" placeholder="最大" defaultValue={filters.paymentAmountMax} />
            </div>
          </div>
          <div className="finance-filter-grid__actions">
            <button type="submit" className="button button--primary">
              应用筛选
            </button>
            <Link href="/admin/finance" className="button button--secondary">
              重置
            </Link>
          </div>
        </form>
      </section>

      <section className="admin-table admin-table--scroll finance-table">
        <table>
          <thead>
            <tr>
              {sortHeaders.map((header) => (
                <th key={header.key} className={header.className}>
                  <Link href={buildSortHref(header.key)}>
                    {header.label}
                    {sortKey === header.key ? (
                      <span aria-hidden="true">{sortDirection === "asc" ? " ↑" : " ↓"}</span>
                    ) : null}
                  </Link>
                </th>
              ))}
              <th>付款信息</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {paymentPage.rows.length > 0 ? (
              paymentPage.rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatFinanceDateInputValue(row.paymentDate)}</td>
                  <td>{row.paymentStage}</td>
                  <td>{row.accountType}</td>
                  <td>{row.lingxingContractNo || <span className="admin-table__empty">-</span>}</td>
                  <td>{row.sku}</td>
                  <td>{row.productName || <span className="admin-table__empty">-</span>}</td>
                  <td>{row.unit}</td>
                  <td className="finance-table__number">{formatFinancePlainNumber(row.quantity)}</td>
                  <td className="finance-table__number">{formatFinancePlainNumber(row.unitPriceYuan)}</td>
                  <td className="finance-table__number">{formatFinanceYuan(row.totalAmountYuan)}</td>
                  <td className="finance-table__number">{formatFinanceYuan(row.paymentAmountYuan)}</td>
                  <td>
                    <FinancePaymentProofViewer
                      attachmentUrl={row.paymentProofUrl}
                      fileName={row.paymentProofName}
                      mimeType={row.paymentProofMimeType}
                    />
                  </td>
                  <td>
                    <div className="finance-row-actions">
                      <details className="finance-row-editor">
                        <summary className="button button--secondary button--compact">编辑</summary>
                        <form
                          action={updateFinancePaymentDetailAction}
                          className="finance-row-editor__form"
                          encType="multipart/form-data"
                        >
                          <input type="hidden" name="id" value={row.id} />
                          <div className="field">
                            <label htmlFor={`finance-payment-date-${row.id}`}>日期</label>
                            <input
                              id={`finance-payment-date-${row.id}`}
                              name="paymentDate"
                              type="date"
                              defaultValue={formatFinanceDateInputValue(row.paymentDate)}
                              required
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`finance-payment-stage-${row.id}`}>预付款/尾款</label>
                            <select
                              id={`finance-payment-stage-${row.id}`}
                              name="paymentStage"
                              defaultValue={row.paymentStage}
                              required
                            >
                              {FINANCE_PAYMENT_STAGE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`finance-account-type-${row.id}`}>公账/私账</label>
                            <select
                              id={`finance-account-type-${row.id}`}
                              name="accountType"
                              defaultValue={row.accountType}
                              required
                            >
                              {FINANCE_ACCOUNT_TYPE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`finance-contract-${row.id}`}>领星合同号</label>
                            <input
                              id={`finance-contract-${row.id}`}
                              name="lingxingContractNo"
                              defaultValue={row.lingxingContractNo ?? ""}
                              required
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`finance-sku-${row.id}`}>SKU</label>
                            <input id={`finance-sku-${row.id}`} name="sku" defaultValue={row.sku} required />
                          </div>
                          <div className="field">
                            <label htmlFor={`finance-product-name-${row.id}`}>品名</label>
                            <input
                              id={`finance-product-name-${row.id}`}
                              name="productName"
                              defaultValue={row.productName}
                              required
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`finance-unit-${row.id}`}>单位</label>
                            <input id={`finance-unit-${row.id}`} name="unit" defaultValue={row.unit} required />
                          </div>
                          <div className="field">
                            <label htmlFor={`finance-quantity-${row.id}`}>数量</label>
                            <input
                              id={`finance-quantity-${row.id}`}
                              name="quantity"
                              inputMode="decimal"
                              defaultValue={String(row.quantity)}
                              required
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`finance-unit-price-${row.id}`}>单价（元）</label>
                            <input
                              id={`finance-unit-price-${row.id}`}
                              name="unitPriceYuan"
                              inputMode="decimal"
                              defaultValue={String(row.unitPriceYuan)}
                              required
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`finance-payment-amount-${row.id}`}>预付款/尾款付款金额（元）</label>
                            <input
                              id={`finance-payment-amount-${row.id}`}
                              name="paymentAmountYuan"
                              inputMode="decimal"
                              defaultValue={String(row.paymentAmountYuan)}
                              required
                            />
                          </div>
                          <div className="field finance-row-editor__wide">
                            <label htmlFor={`finance-payment-proof-${row.id}`}>付款截图</label>
                            <input
                              id={`finance-payment-proof-${row.id}`}
                              name="paymentProofFile"
                              type="file"
                              accept="image/*,.pdf"
                              required={!row.paymentProofUrl}
                            />
                          </div>
                          <div className="finance-row-editor__actions">
                            <button type="submit" className="button button--primary button--compact">
                              保存修改
                            </button>
                          </div>
                        </form>
                      </details>
                      <form action={deleteFinancePaymentDetailAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <button type="submit" className="button button--ghost button--compact">
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={sortHeaders.length + 2} className="admin-table__empty">
                  暂无付款明细。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
