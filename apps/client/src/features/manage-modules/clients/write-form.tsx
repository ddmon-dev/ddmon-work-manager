import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientWriteSchema, type ClientWriteInput } from "@work-manager/schemas";
import { FieldGroup } from "@/shared/ui/field";
import { FormTextInput } from "@/shared/ui/form";
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
import { useCreateClient, useUpdateClient } from "./api";
import type { ClientWithMemos } from "./types";

const formDefaultValues: ClientWriteInput = {
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
};

interface WriteFormProps {
  id?: string;
  prevValues: ClientWithMemos | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const sheet = useManageSheet();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const form = useForm<ClientWriteInput>({
    resolver: zodResolver(clientWriteSchema),
    defaultValues: prevValues
      ? {
          companyName: prevValues.companyName,
          contactName: prevValues.contactName ?? "",
          phone: prevValues.phone ?? "",
          email: prevValues.email ?? "",
          address: prevValues.address ?? "",
        }
      : formDefaultValues,
  });

  useFormGuard(form);

  useEffect(() => {
    form.reset(
      prevValues
        ? {
            companyName: prevValues.companyName,
            contactName: prevValues.contactName ?? "",
            phone: prevValues.phone ?? "",
            email: prevValues.email ?? "",
            address: prevValues.address ?? "",
          }
        : formDefaultValues
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  async function onSubmit(values: ClientWriteInput) {
    if (id) {
      await updateClient.mutateAsync({ id, data: values });
    } else {
      await createClient.mutateAsync(values);
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
                name="companyName"
                label="회사명"
                placeholder="회사명을 입력해주세요."
              />
              <FormTextInput
                control={form.control}
                name="contactName"
                label="담당자명"
                placeholder="담당자명을 입력해주세요."
                optional
              />
              <FormTextInput
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
