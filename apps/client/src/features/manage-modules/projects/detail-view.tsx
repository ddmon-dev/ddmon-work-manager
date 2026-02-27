import { useState } from "react";
import { format } from "date-fns";
import { Trash2, Plus } from "lucide-react";
import { SheetFooter, SheetBody, SheetContainer, SheetScrollColumn } from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useConfirm } from "@/shared/ui/confirm-dialog";
import {
  DetailInfoRow,
  ManageSheetClose,
  ManageSheetModeChange,
  MemoSection,
} from "../_base/ui";
import {
  useCreatePayment,
  useDeletePayment,
  useCreateProjectMemo,
  useUpdateProjectMemo,
  useDeleteProjectMemo,
} from "./api";
import { PROJECT_STATUS_LABELS, WORK_PHASE_LABELS, TAX_TYPE_OPTIONS } from "./config";
import { StatusBadge } from "./status-badge";
import { WorkPhaseIndicator } from "./work-phase-indicator";
import type { ProjectWithDetails } from "./types";

interface DetailViewProps {
  data: ProjectWithDetails;
  refetch: () => void;
}

function formatAmount(amount: string | null | undefined): string {
  if (!amount) return "-";
  return Number(amount).toLocaleString("ko-KR") + "원";
}

function PaymentForm({
  projectId,
  onSuccess,
}: {
  projectId: string;
  onSuccess: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const createPayment = useCreatePayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !paidDate) return;
    await createPayment.mutateAsync({
      projectId,
      description,
      amount: Number(amount),
      paidDate,
    });
    setDescription("");
    setAmount("");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-2">
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="설명 (예: 계약금)"
        required
      />
      <div className="flex gap-2">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="금액 (원)"
          required
        />
        <Input
          value={paidDate}
          onChange={(e) => setPaidDate(e.target.value)}
          type="date"
          required
        />
      </div>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={createPayment.isPending}
      >
        <Plus className="size-3.5" />
        등록
      </Button>
    </form>
  );
}

export function DetailView({ data, refetch }: DetailViewProps) {
  const { confirm } = useConfirm();
  const deletePayment = useDeletePayment();
  const createMemo = useCreateProjectMemo();
  const updateMemo = useUpdateProjectMemo();
  const deleteMemo = useDeleteProjectMemo();

  const handleDeletePayment = (paymentId: string) => {
    confirm({
      title: "수금 삭제",
      description: "이 수금 내역을 삭제하시겠습니까?",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deletePayment.mutateAsync({ projectId: data.id, paymentId });
        refetch();
      },
    });
  };

  const handleAddMemo = async (content: string) => {
    await createMemo.mutateAsync({ projectId: data.id, content });
    refetch();
  };

  const handleUpdateMemo = async (memoId: string, content: string) => {
    await updateMemo.mutateAsync({ projectId: data.id, memoId, content });
    refetch();
  };

  const handleDeleteMemo = async (memoId: string) => {
    await deleteMemo.mutateAsync({ projectId: data.id, memoId });
    refetch();
  };

  const taxTypeLabel =
    TAX_TYPE_OPTIONS.find((t) => t.value === data.taxType)?.label ?? "-";
  const contractAmount = data.contractAmount ? Number(data.contractAmount) : null;
  const totalPaid = data.payments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <>
      <SheetBody>
        <SheetScrollColumn>
          {/* 기본 정보 */}
          <SheetContainer>
            <DetailInfoRow label="프로젝트 번호" value={data.projectNumber} />
            <DetailInfoRow label="클라이언트" value={data.client?.companyName} />
            <DetailInfoRow label="견적서 번호" value={data.estimateNumber ?? undefined} />
            <DetailInfoRow
              label="상태"
              value={
                <StatusBadge
                  projectId={data.id}
                  status={data.status}
                />
              }
            />
            <DetailInfoRow
              label="작업단계"
              value={
                <WorkPhaseIndicator
                  projectId={data.id}
                  workPhase={data.workPhase}
                />
              }
            />
          </SheetContainer>

          {/* 날짜 정보 */}
          <SheetContainer>
            <DetailInfoRow label="계약일" value={data.contractDate} />
            <DetailInfoRow label="납품일" value={data.deliveredDate ?? undefined} />
            <DetailInfoRow label="완료일" value={data.completedDate ?? undefined} />
            <DetailInfoRow
              label="등록일"
              value={format(new Date(data.createdAt), "yyyy-MM-dd HH:mm")}
            />
            <DetailInfoRow
              label="수정일"
              value={format(new Date(data.updatedAt), "yyyy-MM-dd HH:mm")}
            />
          </SheetContainer>

          {/* 금액 정보 */}
          <SheetContainer>
            <div className="space-y-1 mb-4">
              <DetailInfoRow label="계약금액" value={formatAmount(data.contractAmount)} />
              <DetailInfoRow label="세금 유형" value={taxTypeLabel} />
              <DetailInfoRow
                label="입금 합계"
                value={totalPaid.toLocaleString("ko-KR") + "원"}
              />
              {contractAmount !== null && (
                <DetailInfoRow
                  label="잔금"
                  value={(contractAmount - totalPaid).toLocaleString("ko-KR") + "원"}
                />
              )}
            </div>

            {/* 수금 내역 */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">수금 내역</p>
              {data.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 수금이 없습니다.</p>
              ) : (
                <div className="space-y-1">
                  {data.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{payment.description}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {payment.paidDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {Number(payment.amount).toLocaleString("ko-KR")}원
                        </span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleDeletePayment(payment.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <PaymentForm projectId={data.id} onSuccess={refetch} />
            </div>
          </SheetContainer>

          {data.notes && (
            <SheetContainer>
              <DetailInfoRow label="비고" value={data.notes} />
            </SheetContainer>
          )}
        </SheetScrollColumn>

        {/* 메모 섹션 */}
        <SheetScrollColumn>
          <SheetContainer>
            <MemoSection
              memos={data.memos}
              onAdd={handleAddMemo}
              onUpdate={handleUpdateMemo}
              onDelete={handleDeleteMemo}
            />
          </SheetContainer>
        </SheetScrollColumn>
      </SheetBody>

      <SheetFooter>
        <ManageSheetClose />
        <ManageSheetModeChange mode="modify" />
      </SheetFooter>
    </>
  );
}
