import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { partnerWriteSchema, type PartnerWriteInput } from "@packages/schemas";
import { PARTNER_SPECIALTIES } from "@packages/types";
import { FieldGroup } from "@/shared/ui/field";
import { FormTextInput, FormPhoneInput } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import {
  SheetFooter,
  SheetBody,
  SheetContainer,
} from "@/shared/ui/sheet";
import {
  useManageSheet,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreatePartner, useUpdatePartner } from "./api";
import type { PartnerWithMemos } from "./types";

const formDefaultValues: PartnerWriteInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  residentNumber: "",
  bankName: "",
  bankAccount: "",
  accountHolder: "",
  specialties: [],
  notes: "",
};

function parseSpecialties(specialties: string[] | null | undefined) {
  const predefined: string[] = [];
  let customValue = "";

  if (specialties) {
    for (const s of specialties) {
      if ((PARTNER_SPECIALTIES as readonly string[]).includes(s)) {
        predefined.push(s);
      } else {
        customValue = s;
      }
    }
  }

  return { predefined, hasCustom: !!customValue, customValue };
}

function buildSpecialties(predefined: string[], hasCustom: boolean, customValue: string) {
  const result = [...predefined];
  if (hasCustom && customValue.trim()) {
    result.push(customValue.trim());
  }
  return result.length > 0 ? result : undefined;
}

interface WriteFormProps {
  id?: string;
  prevValues: PartnerWithMemos | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const sheet = useManageSheet();
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();

  const initial = parseSpecialties(prevValues?.specialties);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(initial.predefined);
  const [hasCustom, setHasCustom] = useState(initial.hasCustom);
  const [customValue, setCustomValue] = useState(initial.customValue);

  const toFormValues = (data: PartnerWithMemos | null): PartnerWriteInput =>
    data
      ? {
          name: data.name,
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          residentNumber: data.residentNumber ?? "",
          bankName: data.bankName ?? "",
          bankAccount: data.bankAccount ?? "",
          accountHolder: data.accountHolder ?? "",
          specialties: data.specialties ?? [],
          notes: data.notes ?? "",
        }
      : formDefaultValues;

  const form = useForm<PartnerWriteInput>({
    resolver: zodResolver(partnerWriteSchema),
    defaultValues: toFormValues(prevValues),
  });

  useFormGuard(form);

  useEffect(() => {
    form.reset(toFormValues(prevValues));
    const parsed = parseSpecialties(prevValues?.specialties);
    setSelectedSpecialties(parsed.predefined);
    setHasCustom(parsed.hasCustom);
    setCustomValue(parsed.customValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  };

  async function onSubmit(values: PartnerWriteInput) {
    const specialties = buildSpecialties(selectedSpecialties, hasCustom, customValue);
    const payload = { ...values, specialties };

    if (id) {
      await updatePartner.mutateAsync({ id, data: payload });
    } else {
      await createPartner.mutateAsync(payload);
    }
    sheet.close();
  }

  return (
    <SheetBody>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="divide-y">
          <SheetContainer>
            <FieldGroup>
              <FormTextInput
                control={form.control}
                name="name"
                label="이름"
                placeholder="이름을 입력해주세요."
              />
              <FormPhoneInput
                control={form.control}
                name="phone"
                label="연락처"
                placeholder="010-1234-5678"
                optional
              />
              <FormTextInput
                control={form.control}
                name="email"
                label="이메일"
                placeholder="이메일을 입력해주세요."
                optional
              />
              <FormTextInput
                control={form.control}
                name="address"
                label="주소"
                placeholder="주소를 입력해주세요."
                optional
              />
            </FieldGroup>
          </SheetContainer>

          <SheetContainer>
            <FieldGroup>
              <FormTextInput
                control={form.control}
                name="residentNumber"
                label="주민등록번호"
                placeholder="000000-0000000"
                optional
              />
              <FormTextInput
                control={form.control}
                name="bankName"
                label="은행명"
                placeholder="은행명을 입력해주세요."
                optional
              />
              <FormTextInput
                control={form.control}
                name="bankAccount"
                label="계좌번호"
                placeholder="계좌번호를 입력해주세요."
                optional
              />
              <FormTextInput
                control={form.control}
                name="accountHolder"
                label="예금주"
                placeholder="예금주를 입력해주세요."
                optional
              />
            </FieldGroup>
          </SheetContainer>

          <SheetContainer>
            <FieldGroup>
              <div className="space-y-3">
                <Label>전문분야</Label>
                <div className="flex flex-wrap gap-2">
                  {PARTNER_SPECIALTIES.map((specialty) => (
                    <label
                      key={specialty}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedSpecialties.includes(specialty)}
                        onCheckedChange={() => toggleSpecialty(specialty)}
                      />
                      <span className="text-sm">{specialty}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={hasCustom}
                      onCheckedChange={(checked) => {
                        setHasCustom(!!checked);
                        if (!checked) setCustomValue("");
                      }}
                    />
                    <span className="text-sm">기타</span>
                  </label>
                </div>
                {hasCustom && (
                  <Input
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="기타 전문분야를 입력해주세요."
                  />
                )}
              </div>
              <FormTextInput
                control={form.control}
                name="notes"
                label="비고"
                placeholder="비고를 입력해주세요."
                optional
              />
            </FieldGroup>
          </SheetContainer>
        </div>

        <SheetFooter>
          <ManageSheetClose />
          {id && <ManageSheetModeChange mode="view" />}
          <ManageFormSubmit isLoading={form.formState.isSubmitting} />
        </SheetFooter>
      </form>
    </SheetBody>
  );
}
