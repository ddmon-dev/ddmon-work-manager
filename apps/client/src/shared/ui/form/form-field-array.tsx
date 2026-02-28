import { ReactElement, ReactNode, useEffect } from 'react';
import { useFieldArray, useFormState, Controller, type Control } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { FieldSet, FieldLegend, FieldContent, FieldDescription, FieldError } from '../field';

export type FormFieldArrayProps = {
  control: Control<any>;
  name: string;
  label: ReactNode;
  description?: ReactNode;
  min?: number;
  max?: number;
  addButtonText?: string;
  defaultValue?: any;
  /** 비활성화 */
  disabled?: boolean;
  children: (props: { index: number; name: string; control: Control<any>; disabled?: boolean }) => ReactNode;
};

/**
 * 동적 필드 배열 컴포넌트
 *
 * @example
 * ```tsx
 * // 단일 필드
 * <FormFieldArray
 *   control={form.control}
 *   name="emails"
 *   label="이메일 목록"
 *   min={2}
 *   max={5}
 *   defaultValue=""
 * >
 *   {({ name, control }) => (
 *     <FormEmailInput
 *       control={control}
 *       name={name}
 *       label=""
 *       placeholder="이메일 입력"
 *     />
 *   )}
 * </FormFieldArray>
 *
 * // 다중 필드
 * <FormFieldArray
 *   control={form.control}
 *   name="contacts"
 *   label="연락처 목록"
 *   defaultValue={{ name: '', phone: '' }}
 * >
 *   {({ index, control }) => (
 *     <div className="grid grid-cols-2 gap-2">
 *       <FormTextInput
 *         control={control}
 *         name={`contacts.${index}.name`}
 *         label=""
 *         placeholder="이름"
 *       />
 *       <FormPhoneInput
 *         control={control}
 *         name={`contacts.${index}.phone`}
 *         label=""
 *         placeholder="전화번호"
 *       />
 *     </div>
 *   )}
 * </FormFieldArray>
 * ```
 */
export const FormFieldArray = ({
  control,
  name,
  label,
  description,
  min = 1,
  max,
  addButtonText = '추가',
  defaultValue = '',
  disabled = false,
  children,
}: FormFieldArrayProps): ReactElement => {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  // 배열 필드의 루트 에러 가져오기
  const { errors } = useFormState({ control });
  const rootError = errors[name]?.['root'];

  // fields가 로드된 후 min보다 적으면 자동으로 추가
  useEffect(() => {
    if (fields.length < min) {
      const toAdd = min - fields.length;
      for (let i = 0; i < toAdd; i++) {
        append(defaultValue as any, { shouldFocus: false });
      }
    }
  }, [fields.length, min, append, defaultValue]);

  const handleAdd = () => {
    if (max === undefined || fields.length < max) {
      append(defaultValue as any);
    }
  };

  const handleRemove = (index: number) => {
    if (fields.length > min) {
      remove(index);
    }
  };

  const canRemove = fields.length > min;
  const canAdd = max === undefined || fields.length < max;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref } }) => (
        <FieldSet className='gap-3'>
          <FieldContent>
            <FieldLegend
              variant='label'
              className='flex mb-0'
            >
              {label}
            </FieldLegend>
            {description && <FieldDescription>{description}</FieldDescription>}
          </FieldContent>

          {/* Field Array */}
          <div className='space-y-2'>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className='flex items-start gap-1'
                ref={index === 0 ? ref : undefined}
                tabIndex={index === 0 ? -1 : undefined}
              >
                {/* 필드 콘텐츠 */}
                <div className='flex-1'>
                  {children({
                    index,
                    name: `${name}.${index}`,
                    control,
                    disabled,
                  })}
                </div>

                {/* 제거 버튼 */}
                <Button
                  type='button'
                  variant='secondary'
                  size='icon'
                  onClick={() => handleRemove(index)}
                  disabled={disabled || !canRemove}
                  className='shrink-0'
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>

          {rootError && <FieldError errors={[rootError]} />}

          {/* Add Button */}
          <Button
            type='button'
            variant='black'
            onClick={handleAdd}
            disabled={disabled || !canAdd}
            className='w-full'
          >
            <Plus />
            {addButtonText}
            {max !== undefined && ` (${fields.length}/${max})`}
          </Button>
        </FieldSet>
      )}
    />
  );
};
