import assert from "node:assert/strict";
import { test } from "node:test";
import { getEstimateDocumentKey, type EstimateDocumentData } from "../src/features/manage-modules/estimates/pdf/document-data";
const data: EstimateDocumentData = {
  title: "검증 견적서", taxType: "vat", showTaxAmount: true, discountType: "none", discountValue: 0,
  groups: [{ name: "개발", items: [{ name: "구현", quantity: 1, unit: "식", amount: 1000 }] }],
};
test("상세와 폼의 객체 순서, 빈 값, PDF에 없는 버전 정보는 재생성을 유발하지 않는다", () => {
  const reordered = Object.fromEntries(Object.entries(data).reverse()) as unknown as EstimateDocumentData;
  assert.equal(getEstimateDocumentKey(data), getEstimateDocumentKey({ ...reordered, description: "", version: 2, versionLabel: "수정", bizAddress: "주소" }));
});
test("출력되는 제목과 항목 금액 변경은 다른 PDF로 구분한다", () => {
  assert.notEqual(getEstimateDocumentKey(data), getEstimateDocumentKey({ ...data, title: "새 제목" }));
  assert.notEqual(getEstimateDocumentKey(data), getEstimateDocumentKey({ ...data, groups: [{ name: "개발", items: [{ name: "구현", quantity: 1, unit: "식", amount: 2000 }] }] }));
});
