import { ReactElement, useRef, type RefObject } from 'react';
import { type Control, type FieldValues, useController } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from '@/shared/ui/input-group';
import { Input } from '@/shared/ui/input';
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldError,
} from '@/shared/ui/field';
import type { ExcludedFormProps } from './types';
import type { DaumAddressData } from '@/shared/types/daum-postcode';
import type { ReactNode } from 'react';

export type FormAddressInputProps<V extends FieldValues = FieldValues> = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  ExcludedFormProps
> & {
  control: Control<V>;
  // 필드명 접두어 (optional) - 예: 'shipping' → shippingZipCode, shippingAddress, shippingAddressDetail
  namePrefix?: string;
  label?: ReactNode;
  description?: ReactNode;
  orientation?: 'vertical' | 'horizontal' | 'responsive';
  optional?: boolean;
  // 커스텀 주소 검색 API 함수 (Kakao 대신 사용)
  onCustomSearch?: () => Promise<{ zipCode: string; address: string }>;
  /** 비활성화 */
  disabled?: boolean;
};

/**
 * 주소 입력 컴포넌트
 *
 * Kakao 주소 API 기반:
 * - 우편번호 + 주소찾기 버튼 (InputGroup)
 * - 주소 (readOnly)
 * - 상세주소 (직접 입력)
 *
 * 독립된 필드로 관리:
 * - {namePrefix}ZipCode (또는 zipCode)
 * - {namePrefix}Address (또는 address)
 * - {namePrefix}AddressDetail (또는 addressDetail)
 *
 * namePrefix:
 * - 필드명 접두어 (optional) - 예: 'shipping' → shippingZipCode, shippingAddress, shippingAddressDetail
 */
export const FormAddressInput = <V extends FieldValues = FieldValues>(
  props: FormAddressInputProps<V>
): ReactElement => {
  const {
    control,
    namePrefix,
    label,
    description,
    orientation,
    optional,
    onCustomSearch,
    disabled = false,
    ...inputProps
  } = props;
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  // 필드명 생성
  const zipCodeName = (namePrefix ? `${namePrefix}ZipCode` : 'zipCode') as any;
  const addressName = (namePrefix ? `${namePrefix}Address` : 'address') as any;
  const addressDetailName = (namePrefix ? `${namePrefix}AddressDetail` : 'addressDetail') as any;

  // useController로 3개 필드 제어
  const zipCode = useController({
    control,
    name: zipCodeName,
  });
  const address = useController({ control, name: addressName });
  const addressDetail = useController({ control, name: addressDetailName });

  // zipCode의 ref를 주소찾기 버튼에 연결 (RefCallback 타입)
  const setZipCodeRef = (element: HTMLButtonElement | null) => {
    searchButtonRef.current = element;
    if (typeof zipCode.field.ref === 'function') {
      zipCode.field.ref(element);
    }
  };

  // 3개 필드 중 하나라도 에러가 있는지 확인
  const hasError =
    zipCode.fieldState.invalid || address.fieldState.invalid || addressDetail.fieldState.invalid;

  // 3개 필드 값
  const zipCodeValue = zipCode.field.value || '';
  const addressValue = address.field.value || '';
  const addressDetailValue = addressDetail.field.value || '';

  // Kakao 주소 API 팝업
  const openDaumPostcode = useDaumPostcodePopup();

  const handleComplete = (data: DaumAddressData) => {
    const selectedAddress = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;

    // 3개 필드에 각각 값 설정
    zipCode.field.onChange(data.zonecode);
    address.field.onChange(selectedAddress);
    addressDetail.field.onChange('');

    // 상세주소 입력창 포커스
    setTimeout(() => {
      const ref = addressDetail.field.ref as unknown as RefObject<HTMLInputElement>;
      ref.current?.focus();
    }, 100);
  };

  const handleSearch = async () => {
    if (onCustomSearch) {
      const result = await onCustomSearch();
      zipCode.field.onChange(result.zipCode);
      address.field.onChange(result.address);
      addressDetail.field.onChange('');
      setTimeout(() => {
        const ref = addressDetail.field.ref as unknown as RefObject<HTMLInputElement>;
        ref.current?.focus();
      }, 100);
    } else {
      openDaumPostcode({ onComplete: handleComplete as any });
    }
  };

  return (
    <Field
      data-invalid={hasError}
      orientation={orientation}
    >
      {/* Label & Description */}
      {(label || description) && (
        <FieldContent>
          {label && (
            <FieldLabel className={optional ? 'w-full' : ''}>
              {label}{' '}
              {optional && <span className='ml-auto text-muted-foreground text-xs'>(선택)</span>}
            </FieldLabel>
          )}
          {description && <FieldDescription>{description}</FieldDescription>}
        </FieldContent>
      )}

      {/* Input Fields */}
      <FieldGroup className='gap-y-2'>
        {/* 주소찾기 버튼 + 우편번호 + 주소 */}
        <div className='flex gap-1.5 flex-col sm:flex-row'>
          <InputGroup className='w-auto shrink-0'>
            <InputGroupAddon
              align='inline-start'
              className='-ml-2!'
            >
              <InputGroupButton
                ref={setZipCodeRef}
                size='xs'
                onClick={handleSearch}
                variant='secondary'
                type='button'
                disabled={disabled}
              >
                <MapPin className='h-4 w-4' />
                <span className='text-xs'>주소찾기</span>
              </InputGroupButton>
            </InputGroupAddon>
            <InputGroupInput
              {...inputProps}
              value={zipCodeValue}
              placeholder='우편번호'
              readOnly
              disabled={disabled}
              aria-invalid={hasError}
              className='w-20 pl-3!'
            />
          </InputGroup>
          <Input
            value={addressValue}
            placeholder='주소'
            readOnly
            disabled={disabled}
            aria-invalid={hasError}
            className='sm:flex-1'
          />
        </div>

        {/* 상세주소 */}
        <Input
          ref={addressDetail.field.ref}
          value={addressDetailValue}
          onChange={e => addressDetail.field.onChange(e.target.value)}
          placeholder='상세주소를 입력하세요'
          disabled={disabled}
          aria-invalid={hasError}
        />
      </FieldGroup>

      {/* 통합 에러 메시지 */}
      {hasError && <FieldError>주소를 입력해주세요</FieldError>}
    </Field>
  );
};
