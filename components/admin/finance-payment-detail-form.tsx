"use client";

import { useMemo, useState } from "react";
import type { FinanceProductOption } from "@/lib/finance-payment-details";

const paymentStageOptions = ["预付款", "尾款"] as const;
const accountTypeOptions = ["公账", "私账"] as const;

type FinancePaymentDetailFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaultDate: string;
  productOptions: FinanceProductOption[];
};

type SkuMode = "catalog" | "manual";

export function FinancePaymentDetailForm({
  action,
  defaultDate,
  productOptions
}: FinancePaymentDetailFormProps) {
  const firstSku = productOptions[0]?.sku ?? "";
  const [skuMode, setSkuMode] = useState<SkuMode>(firstSku ? "catalog" : "manual");
  const [selectedSku, setSelectedSku] = useState(firstSku);
  const productBySku = useMemo(
    () => new Map(productOptions.map((product) => [product.sku, product])),
    [productOptions]
  );
  const selectedProduct = productBySku.get(selectedSku) ?? null;

  return (
    <form action={action} className="finance-payment-form" encType="multipart/form-data">
      <div className="finance-payment-form__grid">
        <div className="field finance-payment-form__file">
          <label htmlFor="paymentProofFile">付款截图</label>
          <input id="paymentProofFile" name="paymentProofFile" type="file" accept="image/*,.pdf" required />
        </div>
        <div className="field">
          <label htmlFor="paymentDate">日期</label>
          <input id="paymentDate" name="paymentDate" type="date" defaultValue={defaultDate} required />
        </div>
        <div className="field">
          <label htmlFor="paymentStage">预付款/尾款</label>
          <select id="paymentStage" name="paymentStage" defaultValue="预付款" required>
            {paymentStageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="accountType">公账/私账</label>
          <select id="accountType" name="accountType" defaultValue="公账" required>
            {accountTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lingxingContractNo">领星合同号</label>
          <input id="lingxingContractNo" name="lingxingContractNo" required />
        </div>

        <fieldset className="field finance-sku-mode">
          <legend>SKU 来源</legend>
          <label className="choice-pill">
            <input
              type="radio"
              name="skuMode"
              value="catalog"
              checked={skuMode === "catalog"}
              onChange={() => setSkuMode("catalog")}
              disabled={productOptions.length === 0}
            />
            <span>产品库选择</span>
          </label>
          <label className="choice-pill">
            <input
              type="radio"
              name="skuMode"
              value="manual"
              checked={skuMode === "manual"}
              onChange={() => setSkuMode("manual")}
            />
            <span>手动填写</span>
          </label>
        </fieldset>

        {skuMode === "catalog" ? (
          <>
            <div className="field">
              <label htmlFor="catalogSku">SKU</label>
              <select
                id="catalogSku"
                name="sku"
                value={selectedSku}
                onChange={(event) => setSelectedSku(event.target.value)}
                required
              >
                {productOptions.map((product) => (
                  <option key={product.sku} value={product.sku}>
                    {product.sku} - {product.productName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="catalogProductName">品名</label>
              <input
                id="catalogProductName"
                value={selectedProduct?.productName ?? ""}
                readOnly
              />
              <input type="hidden" name="productName" value={selectedProduct?.productName ?? ""} />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="manualSku">SKU</label>
              <input id="manualSku" name="sku" required />
            </div>
            <div className="field">
              <label htmlFor="manualProductName">品名</label>
              <input id="manualProductName" name="productName" required />
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="unit">单位</label>
          <input id="unit" name="unit" defaultValue="瓶" required />
        </div>
        <div className="field">
          <label htmlFor="quantity">数量</label>
          <input id="quantity" name="quantity" inputMode="decimal" required />
        </div>
        <div className="field">
          <label htmlFor="unitPriceYuan">单价（元）</label>
          <input id="unitPriceYuan" name="unitPriceYuan" inputMode="decimal" required />
        </div>
        <div className="field">
          <label htmlFor="paymentAmountYuan">预付款/尾款付款金额（元）</label>
          <input id="paymentAmountYuan" name="paymentAmountYuan" inputMode="decimal" required />
        </div>
      </div>
      <button type="submit" className="button button--primary">
        添加付款明细
      </button>
    </form>
  );
}
