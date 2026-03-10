import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import { formatCurrency, formatPhoneNumber, formatBizNumber } from '@/shared/utils/format';
import {
  calculateTotal,
  calculateGroupSubtotal,
  buildPriceSummaryDisplay,
} from '@packages/utils';
import { registerFonts } from './register-fonts';
import type { EstimateWithDetails } from '../types';

registerFonts();

export interface EstimateDocumentData {
  title: string;
  description?: string;
  clientName?: string;
  estimateNumber?: string;
  version?: number;
  versionLabel?: string;
  issuedDate?: string;
  validUntil?: string;
  // 발행자 정보 (publisher_info 스냅샷)
  issuer?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  // 사업자 정보
  bizName?: string;
  ceo?: string;
  bizNumber?: string;
  bizAddress?: string;
  taxType: string;
  showTaxAmount: boolean;
  discountType: string;
  discountValue: number;
  notes?: string;
  groups: Array<{
    name: string;
    items: Array<{
      name: string;
      quantity: number;
      unit: string;
      amount: number;
    }>;
  }>;
}

const C = {
  black: '#18181b',
  text: '#3f3f46',
  label: '#71717a',
  muted: '#a1a1aa',
  rule: '#d4d4d8',
  ruleLight: '#e4e4e7',
  bg: '#f4f4f5',
  white: '#ffffff',
  red: '#b91c1c',
};

/** 라벨 글자 균등 배분 */
function spread(text: string, target = 4): string {
  const chars = [...text];
  if (chars.length >= target) return text;
  const gaps = chars.length - 1;
  if (gaps <= 0) return text;
  const total = target - chars.length;
  const per = Math.ceil(total / gaps);
  return chars.join('\u2002'.repeat(per));
}

const META_LABEL_W = 44;
const COL = { qty: 34, unit: 44, amt: 72 };
const GROUP_W = 100;

const s = StyleSheet.create({
  page: {
    fontFamily: 'Pretendard',
    fontSize: 8,
    color: C.text,
    paddingTop: 42,
    paddingBottom: 36,
    paddingHorizontal: 42,
  },

  /* -- Header -- */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 10,
    borderBottomWidth: 1.2,
    borderBottomColor: C.black,
    marginBottom: 16,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.black,
    letterSpacing: 0.8,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  headerEstimateNumber: {
    fontSize: 7.5,
    color: C.text,
  },
  headerDate: {
    fontSize: 7,
    color: C.muted,
  },

  /* -- Meta -- */
  meta: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  metaLeft: {
    flex: 1,
    paddingRight: 18,
  },
  metaRight: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3.5,
  },
  metaLabel: {
    width: META_LABEL_W,
    fontSize: 7,
    color: C.label,
    paddingTop: 1,
  },
  metaValue: {
    flex: 1,
    fontSize: 8,
    color: C.black,
  },
  metaValueBold: {
    flex: 1,
    fontSize: 8.5,
    fontWeight: 'bold',
    color: C.black,
  },
  metaDesc: {
    fontSize: 7.5,
    color: C.label,
    marginTop: 1.5,
    marginLeft: META_LABEL_W,
    lineHeight: 1.4,
  },

  /* -- Table -- */
  table: {
    marginBottom: 8,
  },
  tHead: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 5,
    backgroundColor: C.bg,
    borderBottomWidth: 0.7,
    borderBottomColor: C.rule,
  },
  thGroup: { width: GROUP_W, fontSize: 6.5, color: C.label, fontWeight: 'medium' },
  thName: { flex: 1, fontSize: 6.5, color: C.label, paddingRight: 8 },
  thQty: { width: COL.qty, fontSize: 6.5, color: C.label, textAlign: 'right' },
  thUnit: { width: COL.unit, fontSize: 6.5, color: C.label, textAlign: 'center' },
  thAmt: { width: COL.amt, fontSize: 6.5, color: C.label, textAlign: 'right' },

  /* Group */
  groupContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  groupContent: {
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  groupLabel: {
    width: GROUP_W,
    paddingRight: 8,
    paddingTop: 4.5,
  },
  groupText: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: C.black,
    lineHeight: 1.5,
    marginTop: 1.5,
  },
  groupItems: {
    flex: 1,
  },

  /* Item rows */
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4.5,
    paddingHorizontal: 5,
    marginHorizontal: -5,
    alignItems: 'center',
  },
  itemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.ruleLight,
  },
  tdName: { flex: 1, fontSize: 7.5, color: C.text, paddingRight: 8, lineHeight: 1.5, marginTop: 1.5 },
  tdQty: { width: COL.qty, fontSize: 7.5, color: C.text, textAlign: 'right', lineHeight: 1.5, marginTop: 1.5 },
  tdUnit: { width: COL.unit, fontSize: 7.5, color: C.text, textAlign: 'center', lineHeight: 1.5, marginTop: 1.5 },
  tdAmt: { width: COL.amt, fontSize: 7.5, color: C.text, textAlign: 'right', lineHeight: 1.5, marginTop: 1.5 },

  /* Group subtotal */
  subtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderTopWidth: 0.5,
    borderTopColor: C.ruleLight,
    paddingVertical: 3.5,
    paddingHorizontal: 5,
  },
  subtotalSpacer: { flex: 1 },
  subtotalLabel: {
    width: COL.unit,
    fontSize: 6.5,
    color: C.label,
    textAlign: 'center',
  },
  subtotalVal: {
    width: COL.amt,
    fontSize: 7.5,
    fontWeight: 'bold',
    color: C.black,
    textAlign: 'right',
  },

  /* -- Summary -- */
  summary: {
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 18,
  },
  summaryBox: {
    width: 165,
    borderBottomWidth: 1.2,
    borderBottomColor: C.black,
    paddingBottom: 6,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
  },
  sumLabel: {
    fontSize: 7,
    color: C.label,
  },
  sumVal: {
    fontSize: 7.5,
    color: C.text,
  },
  sumDiscount: {
    fontSize: 7.5,
    color: C.red,
  },
  sumTotalRule: {
    borderTopWidth: 0.7,
    borderTopColor: C.rule,
    marginTop: 6,
    paddingTop: 6,
  },
  sumTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sumTotalLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: C.black,
  },
  sumTotalVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.black,
  },

  /* -- Notes -- */
  notes: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
  },
  notesLabel: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: C.muted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  notesItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 2,
  },
  notesBullet: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: C.text,
    width: 8,
  },
  notesBody: {
    fontSize: 7.5,
    color: C.text,
    lineHeight: 1.6,
    flex: 1,
  },

  /* -- Footer -- */
  footer: {
    position: 'absolute',
    left: 42,
    right: 42,
    bottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: C.ruleLight,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6.5,
    color: C.muted,
  },
});

export function EstimateDocument({ data }: { data: EstimateDocumentData }) {
  const totals = calculateTotal(
    data.groups,
    data.taxType,
    data.discountType,
    data.discountValue
  );

  const estimateLabel = data.estimateNumber || '';

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* -- Header -- */}
        <View style={s.header} fixed>
          <Text style={s.docTitle}>견적서</Text>
          <View style={s.headerRight}>
            {estimateLabel && (
              <Text style={s.headerEstimateNumber}>{estimateLabel}</Text>
            )}
            {data.issuedDate && (
              <Text style={s.headerDate}>{data.issuedDate}</Text>
            )}
          </View>
        </View>

        {/* -- Meta -- */}
        <View style={s.meta}>
          <View style={s.metaLeft}>
            {data.clientName && (
              <View style={s.metaRow}>
                <Text style={[s.metaLabel, { fontWeight: 'medium' }]}>{spread('수신')}</Text>
                <Text style={s.metaValueBold}>{data.clientName} 귀하</Text>
              </View>
            )}
            <View style={s.metaRow}>
              <Text style={[s.metaLabel, { fontWeight: 'medium' }]}>{spread('건명')}</Text>
              <Text style={s.metaValueBold}>{data.title}</Text>
            </View>
            {data.description && (
              <Text style={s.metaDesc}>{data.description}</Text>
            )}
          </View>
          <View style={s.metaRight}>
            {data.issuer && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>{spread('발신인')}</Text>
                <Text style={s.metaValue}>{data.issuer}</Text>
              </View>
            )}
            {data.validUntil && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>{spread('유효기간')}</Text>
                <Text style={s.metaValue}>{data.validUntil}</Text>
              </View>
            )}
          </View>
        </View>

        {/* -- Table -- */}
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={s.thGroup}>{spread('구분')}</Text>
            <Text style={s.thName}>{spread('항목')}</Text>
            <Text style={s.thQty}>{spread('수량')}</Text>
            <Text style={s.thUnit}>{spread('단위')}</Text>
            <Text style={s.thAmt}>{spread('금액')}</Text>
          </View>

          {data.groups.map((group, gi) => {
            const sub = calculateGroupSubtotal(group.items);
            return (
              <View key={gi} style={s.groupContainer} wrap={false}>
                <View style={s.groupContent}>
                  <View style={s.groupLabel}>
                    <Text style={s.groupText}>
                      {group.name || `그룹 ${gi + 1}`}
                    </Text>
                  </View>
                  <View style={s.groupItems}>
                    {group.items.map((item, ii) => (
                      <View
                        key={ii}
                        style={[
                          s.itemRow,
                          ...(ii < group.items.length - 1 ? [s.itemBorder] : []),
                        ]}
                      >
                        <Text style={s.tdName}>{item.name}</Text>
                        <Text style={s.tdQty}>{item.quantity}</Text>
                        <Text style={s.tdUnit}>{item.unit}</Text>
                        <Text style={s.tdAmt}>{formatCurrency(item.amount)}원</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 소계 */}
                <View style={s.subtotalRow}>
                  <View style={{ width: GROUP_W }} />
                  <View style={s.subtotalSpacer} />
                  <View style={{ width: COL.qty }} />
                  <Text style={s.subtotalLabel}>{spread('소계')}</Text>
                  <Text style={s.subtotalVal}>{formatCurrency(sub)}원</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* -- Summary -- */}
        {(() => {
          const { hasDiscount, showTaxRows, hasDetails, totalLabel, totalValue } =
            buildPriceSummaryDisplay(totals, data.taxType, data.showTaxAmount);

          return (
            <View style={s.summary} wrap={false}>
              <View style={s.summaryBox}>
                {hasDetails ? (
                  <>
                    {hasDiscount && (
                      <>
                        <View style={s.sumRow}>
                          <Text style={s.sumLabel}>{spread('합계')}</Text>
                          <Text style={s.sumVal}>{formatCurrency(totals.subtotal)}원</Text>
                        </View>
                        <View style={s.sumRow}>
                          <Text style={s.sumLabel}>{spread('할인')}</Text>
                          <Text style={s.sumDiscount}>-{formatCurrency(totals.discountAmount)}원</Text>
                        </View>
                      </>
                    )}
                    {showTaxRows && (
                      <>
                        <View style={s.sumRow}>
                          <Text style={s.sumLabel}>{spread('공급가액')}</Text>
                          <Text style={s.sumVal}>{formatCurrency(totals.supplyAmount)}원</Text>
                        </View>
                        <View style={s.sumRow}>
                          <Text style={s.sumLabel}>{spread('부가세')}</Text>
                          <Text style={s.sumVal}>{formatCurrency(totals.taxAmount)}원</Text>
                        </View>
                      </>
                    )}
                    <View style={s.sumTotalRule}>
                      <View style={s.sumTotalRow}>
                        <Text style={s.sumTotalLabel}>{spread(totalLabel)}</Text>
                        <Text style={s.sumTotalVal}>{formatCurrency(totalValue)}원</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={s.sumTotalRow}>
                    <Text style={s.sumTotalLabel}>{spread(totalLabel)}</Text>
                    <Text style={s.sumTotalVal}>{formatCurrency(totalValue)}원</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* -- Notes -- */}
        {data.notes && (
          <View style={s.notes} wrap={false}>
            <Text style={s.notesLabel}>{spread('비고')}</Text>
            {data.notes!.split("\n").filter(line => line.trim()).map((line, i) => (
              <View key={i} style={s.notesItem}>
                <Text style={s.notesBullet}>*</Text>
                <Text style={s.notesBody}>{line.trim()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* -- Footer -- */}
        <View style={s.footer} fixed>
          <View style={{ gap: 2 }}>
            {(data.bizName || data.ceo || data.bizNumber) && (
              <Text style={s.footerText}>
                {[data.bizName, data.ceo && `대표 ${data.ceo}`, data.bizNumber && formatBizNumber(data.bizNumber)]
                  .filter(Boolean)
                  .join(' \u00B7 ')}
              </Text>
            )}
            {(data.issuerPhone || data.issuerEmail) && (
              <Text style={s.footerText}>
                {[data.issuerPhone && `TEL: ${formatPhoneNumber(data.issuerPhone)}`, data.issuerEmail && `EMAIL: ${data.issuerEmail}`]
                  .filter(Boolean)
                  .join('  ')}
              </Text>
            )}
          </View>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}

/** EstimateWithDetails -> EstimateDocumentData 변환 */
export function toDocumentData(estimate: EstimateWithDetails): EstimateDocumentData {
  const pub = estimate.publisherInfo;
  return {
    title: estimate.title,
    description: estimate.description || undefined,
    clientName: estimate.client?.companyName || undefined,
    estimateNumber: estimate.estimateNumber,
    version: estimate.version,
    versionLabel: estimate.versionLabel || undefined,
    issuedDate: estimate.issuedDate || undefined,
    validUntil: estimate.validUntil || undefined,
    issuer: pub?.issuer || undefined,
    issuerPhone: pub?.phone || undefined,
    issuerEmail: pub?.email || undefined,
    bizName: pub?.bizName || undefined,
    ceo: pub?.ceo || undefined,
    bizNumber: pub?.bizNumber || undefined,
    bizAddress: pub?.address || undefined,
    taxType: estimate.taxType,
    showTaxAmount: estimate.showTaxAmount ?? true,
    discountType: estimate.discountType,
    discountValue: Number(estimate.discountValue) || 0,
    notes: estimate.notes || undefined,
    groups: estimate.groups.map(g => ({
      name: g.name,
      items: g.items.map(item => ({
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit ?? '',
        amount: Number(item.amount),
      })),
    })),
  };
}

/** EstimateWithDetails -> PDF Blob 생성 */
export async function generateEstimatePdfBlob(estimate: EstimateWithDetails): Promise<Blob> {
  const data = toDocumentData(estimate);
  const { pdf } = await import('@react-pdf/renderer');
  return pdf(<EstimateDocument data={data} />).toBlob();
}

/** EstimateDocumentData -> PDF Blob 생성 (폼 미리보기용) */
export async function generateEstimateDocumentPdfBlob(data: EstimateDocumentData): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer');
  return pdf(<EstimateDocument data={data} />).toBlob();
}
