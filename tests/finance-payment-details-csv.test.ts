import assert from "node:assert/strict";
import test from "node:test";
import { buildFinancePaymentDetailsCsv } from "../lib/finance-payment-details";

test("finance payment CSV exports visible row fields with Excel-safe escaping", () => {
  const csv = buildFinancePaymentDetailsCsv([
    {
      id: "payment-1",
      paymentDate: new Date("2026-05-19T12:00:00.000Z"),
      paymentStage: "预付款",
      accountType: "公账",
      lingxingContractNo: "合同,一",
      sku: 'SKU "A"',
      productName: "测试品名",
      unit: "瓶",
      quantity: 12.5,
      unitPriceYuan: 3.25,
      totalAmountYuan: 40.63,
      paymentAmountYuan: 20,
      sourceFileName: null,
      paymentProofName: "proof.png",
      paymentProofMimeType: "image/png",
      paymentProofBytes: 1024,
      paymentProofUrl: "/api/admin/finance/payment-details/payment-1/attachment",
      createdAt: new Date("2026-05-19T13:00:00.000Z"),
      updatedAt: new Date("2026-05-19T14:00:00.000Z")
    }
  ]);

  assert.ok(csv.startsWith("\uFEFF日期,预付款/尾款,公账/私账"));
  assert.match(csv, /"合同,一"/);
  assert.match(csv, /"SKU ""A"""/);
  assert.match(csv, /12\.5,3\.25,40\.63,20,proof\.png/);
});
