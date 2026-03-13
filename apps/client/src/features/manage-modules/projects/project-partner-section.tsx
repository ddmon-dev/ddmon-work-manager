import { useState } from "react";
import { useForm, FormProvider, useController, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PencilIcon, PlusIcon, Trash2Icon, UserIcon } from "lucide-react";
import { PARTNER_SPECIALTIES } from "@packages/types";
import { formatCurrency } from "@/shared/utils/format";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { ButtonGroup } from "@/shared/ui/button-group";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/ui/tooltip";
import { useDialog } from "@/shared/ui/app-dialog";
import { FormNumberInput } from "@/shared/ui/form";
import { InlineEmpty } from "@/shared/ui/inline-empty";
import { DetailSectionTitle } from "../_base/ui";
import { PartnerSelect } from "../_base/ui/partner-select";
import { useAddProjectPartner, useUpdateProjectPartner, useRemoveProjectPartner } from "./api";
import type { ProjectPartnerDTO } from "./types";

// ── 폼 스키마 ───────────────────────────────────────────────

const partnerFormSchema = z.object({
  partnerId: z.string().optional(),
  roles: z.array(z.string()).default([]),
  customRole: z.string().default(""),
  hasCustomRole: z.boolean().default(false),
  amount: z.number().optional(),
});
type PartnerFormValues = z.infer<typeof partnerFormSchema>;

function parseInitialValues(assignment?: ProjectPartnerDTO): PartnerFormValues {
  if (!assignment) {
    return { partnerId: "", roles: [], customRole: "", hasCustomRole: false, amount: undefined };
  }
  const allRoles = assignment.roles ?? [];
  const predefined = allRoles.filter((r) => (PARTNER_SPECIALTIES as readonly string[]).includes(r));
  const custom = allRoles.filter((r) => !(PARTNER_SPECIALTIES as readonly string[]).includes(r));
  return {
    partnerId: assignment.partnerId,
    roles: predefined,
    customRole: custom.join(", "),
    hasCustomRole: custom.length > 0,
    amount: assignment.amount ? Number(assignment.amount) : undefined,
  };
}

// ── 역할 체크박스 (RHF 연동) ────────────────────────────────

function RolesField({ control }: { control: PartnerFormValues extends infer T ? import("react-hook-form").Control<T & PartnerFormValues> : never }) {
  const { field: rolesField } = useController({ control, name: "roles" });
  const { field: hasCustomField } = useController({ control, name: "hasCustomRole" });
  const { field: customField } = useController({ control, name: "customRole" });

  const toggleRole = (role: string) => {
    const prev = rolesField.value as string[];
    rolesField.onChange(
      prev.includes(role) ? prev.filter((r: string) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">역할</span>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {PARTNER_SPECIALTIES.map((role) => (
          <label key={role} className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={(rolesField.value as string[]).includes(role)}
              onCheckedChange={() => toggleRole(role)}
            />
            <span className="text-sm">{role}</span>
          </label>
        ))}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={hasCustomField.value as boolean}
            onCheckedChange={(checked) => {
              hasCustomField.onChange(!!checked);
              if (!checked) customField.onChange("");
            }}
          />
          <span className="text-sm">기타</span>
        </label>
      </div>
      {hasCustomField.value && (
        <Input
          value={customField.value as string}
          onChange={(e) => customField.onChange(e.target.value)}
          placeholder="기타 역할"
        />
      )}
    </div>
  );
}

// ── 통합 배치 폼 (추가/수정 겸용) ──────────────────────────

interface PartnerFormProps {
  projectId: string;
  assignment?: ProjectPartnerDTO;
  excludeIds?: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

function PartnerForm({ projectId, assignment, excludeIds = [], onSuccess, onCancel }: PartnerFormProps) {
  const isEdit = !!assignment;
  const addPartner = useAddProjectPartner();
  const updatePartner = useUpdateProjectPartner();

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema) as Resolver<PartnerFormValues>,
    defaultValues: parseInitialValues(assignment),
  });

  const isPending = isEdit ? updatePartner.isPending : addPartner.isPending;

  const handleSubmit = async (values: PartnerFormValues) => {
    const roles = [...values.roles];
    if (values.hasCustomRole && values.customRole.trim()) roles.push(values.customRole.trim());

    if (isEdit) {
      await updatePartner.mutateAsync({
        projectId,
        assignmentId: assignment.id,
        roles: roles.length > 0 ? roles : undefined,
        amount: values.amount,
      });
    } else {
      if (!values.partnerId) return;
      await addPartner.mutateAsync({
        projectId,
        partnerId: values.partnerId,
        roles: roles.length > 0 ? roles : undefined,
        amount: values.amount,
        taxType: "withholding",
      });
    }
    onSuccess();
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3!">
        {isEdit ? (
          <div className="flex items-center gap-2 py-1">
            <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
              <UserIcon className="size-3 text-primary" />
            </div>
            <span className="text-sm font-medium">{assignment.partner.name}</span>
          </div>
        ) : (
          <PartnerSelect
            value={form.watch("partnerId") ?? ""}
            onValueChange={(v) => form.setValue("partnerId", v)}
            excludeIds={excludeIds}
          />
        )}
        <RolesField control={form.control} />
        <FormNumberInput
          control={form.control}
          name="amount"
          placeholder="비용"
          thousandSeparator
          suffix="원"
          disableError
        />
        <div className="flex justify-end gap-1.5">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            취소
          </Button>
          <LoadingButton
            type="submit"
            size="sm"
            isLoading={isPending}
            disabled={!isEdit && !form.watch("partnerId")}
          >
            {isEdit ? "저장" : "배치"}
          </LoadingButton>
        </div>
      </form>
    </FormProvider>
  );
}

// ── 파트너 아이템 ───────────────────────────────────────────

interface PartnerItemProps {
  projectId: string;
  assignment: ProjectPartnerDTO;
  onRemove: () => void;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  refetch: () => void;
}

const TAX_SHORT_LABELS: Record<string, string> = {
  withholding: "3.3%",
  vat: "VAT",
};

function PartnerItem({ projectId, assignment, onRemove, editOpen, onEditOpenChange, refetch }: PartnerItemProps) {
  const { partner, roles, amount, taxType } = assignment;

  return (
    <li className="group flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-accent/30 hover:mx-0 transition-all duration-200 ease-out">
      <div className="shrink-0 size-7 rounded-full bg-primary/10 flex items-center justify-center">
        <UserIcon className="size-3.5 text-primary" />
      </div>

      <span className="font-medium text-sm shrink-0">{partner.name}</span>

      {roles && roles.length > 0 && (
        <div className="flex items-center gap-1 min-w-0">
          {roles.slice(0, 2).map((r) => (
            <Badge key={r} variant="outline" className="text-[11px] px-1.5 py-0 h-[18px] leading-none shrink-0">
              {r}
            </Badge>
          ))}
          {roles.length > 2 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  +{roles.length - 2}
                </span>
              </TooltipTrigger>
              <TooltipContent className="pointer-events-none">{roles.join(", ")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      <div className="flex items-baseline gap-1.5 ml-auto shrink-0">
        {amount && (
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(Number(amount))}원
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {TAX_SHORT_LABELS[taxType] ?? taxType}
        </span>
      </div>

      <ButtonGroup className="shrink-0">
        <Popover open={editOpen} onOpenChange={onEditOpenChange}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon-xs">
              <PencilIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <PartnerForm
              projectId={projectId}
              assignment={assignment}
              onSuccess={() => { onEditOpenChange(false); refetch(); }}
              onCancel={() => onEditOpenChange(false)}
            />
          </PopoverContent>
        </Popover>
        <Button type="button" variant="outline" size="icon-xs" onClick={onRemove}>
          <Trash2Icon />
        </Button>
      </ButtonGroup>
    </li>
  );
}

// ── 메인 섹션 ───────────────────────────────────────────────

interface ProjectPartnerSectionProps {
  projectId: string;
  partners: ProjectPartnerDTO[];
  refetch: () => void;
}

export function ProjectPartnerSection({ projectId, partners, refetch }: ProjectPartnerSectionProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dialog = useDialog();
  const removePartner = useRemoveProjectPartner();

  const existingPartnerIds = partners.map((p) => p.partnerId);

  const handleRemove = (assignment: ProjectPartnerDTO) => {
    dialog.confirm({
      title: "파트너 배치 해제",
      description: `${assignment.partner.name} 파트너를 이 프로젝트에서 해제하시겠습니까?`,
      variant: "destructive",
      confirmText: "해제",
      onConfirm: async () => {
        await removePartner.mutateAsync({ projectId, assignmentId: assignment.id });
        refetch();
      },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <DetailSectionTitle className="mb-0!">파트너</DetailSectionTitle>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="xs">
              <PlusIcon className="size-3.5" />
              추가
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <PartnerForm
              projectId={projectId}
              excludeIds={existingPartnerIds}
              onSuccess={() => { setPopoverOpen(false); refetch(); }}
              onCancel={() => setPopoverOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {partners.length > 0 ? (
        <ul className="mt-2">
          {partners.map((pp) => (
            <PartnerItem
              key={pp.id}
              projectId={projectId}
              assignment={pp}
              onRemove={() => handleRemove(pp)}
              editOpen={editingId === pp.id}
              onEditOpenChange={(open) => setEditingId(open ? pp.id : null)}
              refetch={refetch}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-2">
          <InlineEmpty message="배치된 파트너가 없습니다." />
        </div>
      )}
    </div>
  );
}
