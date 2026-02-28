import { useRef, useState } from 'react';
import { Trash2, File as FileIcon, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/utils/classnames';
import { mbToBytes, formatFileSize, truncateFileName } from '@/shared/utils/format';
import { downloadBlob } from '@/shared/utils/download';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group';
import { FILE_ERRORS } from '@/shared/constants/error-messages';

/**
 * 기존 파일 (서버에 저장된 파일)
 */
export type ExistingFile = {
  type: 'existing';
  url: string;
  originalName: string;
  markedForDeletion?: boolean;
};

/**
 * 새로 업로드할 파일
 */
export type NewFile = {
  type: 'new';
  file: File;
};

/**
 * 파일 업로드 값 타입
 */
export type FormFileValue = ExistingFile | NewFile | null;

/**
 * 파일 확장자 프리셋
 */
export const fileAcceptPresets = {
  images: 'image/*',
  documents: 'pdf,doc,docx,txt,xls,xlsx,ppt,pptx,hwp',
  zips: 'zip,rar,7z,tar,gz',
  videos: 'video/*',
  audios: 'audio/*',
} as const;

export type FileAcceptPreset = keyof typeof fileAcceptPresets;

/**
 * accept 문자열을 정규화 (확장자에 . 자동 추가)
 * 예: 'pdf,doc' → '.pdf,.doc'
 * 예: '.pdf,doc' → '.pdf,.doc'
 * 예: 'image/*' → 'image/*' (그대로 유지)
 */
export function normalizeAccept(accept: string): string {
  return accept
    .split(',')
    .map(t => t.trim())
    .map(t => {
      // MIME 타입이거나 이미 .으로 시작하면 그대로
      if (t.includes('/') || t.startsWith('.')) {
        return t;
      }
      // 확장자만 있으면 . 추가
      return `.${t}`;
    })
    .join(',');
}

interface MultiFileUploadProps {
  value?: FormFileValue[];
  onValueChange?: (value: FormFileValue[]) => void;
  onError?: (message: string | null) => void;
  accept?: string;
  acceptPreset?: FileAcceptPreset;
  /** 최대 파일 크기 (MB 단위) */
  maxSize?: number;
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  'aria-invalid'?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

export function MultiFileUpload({
  value = [],
  onValueChange,
  onError,
  accept: acceptProp,
  acceptPreset,
  maxSize: maxSizeMB,
  max,
  disabled = false,
  placeholder = '파일을 선택하세요...',
  className,
  'aria-invalid': ariaInvalid,
  ref,
}: MultiFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const rawAccept = acceptPreset ? fileAcceptPresets[acceptPreset] : acceptProp;
  const accept = rawAccept ? normalizeAccept(rawAccept) : undefined;
  const maxSize = maxSizeMB ? mbToBytes(maxSizeMB) : undefined;

  const validFiles = value.filter(f => f && !(f.type === 'existing' && f.markedForDeletion));
  const canAddMore = !max || validFiles.length < max;

  const validateFile = (file: File): boolean => {
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const isValid = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else if (type.endsWith('/*')) {
          const baseType = type.slice(0, -2);
          return file.type.startsWith(baseType);
        } else {
          return file.type === type;
        }
      });

      if (!isValid) {
        onError?.(FILE_ERRORS.INVALID_FILE(accept));
        return false;
      }
    }

    if (maxSize && file.size > maxSize) {
      onError?.(FILE_ERRORS.SIZE_EXCEEDED(formatFileSize(maxSize)));
      return false;
    }

    return true;
  };

  const handleFiles = (files: FileList) => {
    const newFiles: FormFileValue[] = [...value];
    let addedCount = 0;
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      if (max && validFiles.length + addedCount >= max) {
        onError?.(FILE_ERRORS.MAX_FILES_EXCEEDED(max));
        hasError = true;
        break;
      }

      const file = files[i];
      if (validateFile(file)) {
        newFiles.push({ type: 'new', file });
        addedCount++;
      } else {
        hasError = true;
      }
    }

    if (addedCount > 0) {
      onValueChange?.(newFiles);
      if (!hasError) {
        onError?.(null);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && canAddMore) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || !canAddMore) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    const file = value[index];
    if (!file) return;

    if (file.type === 'existing') {
      const newFiles = [...value];
      newFiles[index] = { ...file, markedForDeletion: true };
      onValueChange?.(newFiles);
    } else {
      const newFiles = value.filter((_, i) => i !== index);
      onValueChange?.(newFiles);
    }
  };

  const handleRestoreFile = (index: number) => {
    const file = value[index];
    if (file?.type === 'existing') {
      const newFiles = [...value];
      newFiles[index] = { ...file, markedForDeletion: false };
      onValueChange?.(newFiles);
    }
  };

  const handleBrowseClick = () => {
    if (!disabled && canAddMore) {
      inputRef.current?.click();
    }
  };

  const handleFileDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      downloadBlob(blob, fileName);
    } catch {
      toast.error(FILE_ERRORS.DOWNLOAD_FAILED);
    }
  };

  return (
    <div
      ref={ref}
      className={cn('w-full', className)}
      data-slot='multi-file-upload'
      tabIndex={-1}
    >
      <input
        ref={inputRef}
        type='file'
        accept={accept}
        disabled={disabled}
        onChange={handleInputChange}
        className='sr-only'
        aria-invalid={ariaInvalid}
        multiple
      />

      <InputGroup
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-disabled={disabled}
        className={cn(
          isDragging && 'border-primary ring-primary/50 ring-[3px]',
          disabled && 'opacity-50 cursor-not-allowed',
          !canAddMore && 'opacity-50'
        )}
      >
        <InputGroupAddon
          align='inline-start'
          className='pl-1.5'
        >
          <div className='flex size-8 md:size-7 items-center justify-center rounded-full bg-secondary'>
            <FileIcon className='h-3.5 w-3.5' />
          </div>
        </InputGroupAddon>
        <InputGroupInput
          value=''
          placeholder={canAddMore ? placeholder : '최대 파일 개수에 도달했습니다'}
          readOnly
          onClick={canAddMore ? handleBrowseClick : undefined}
          className={cn('text-sm', canAddMore && 'cursor-pointer')}
          aria-invalid={ariaInvalid}
          disabled={disabled || !canAddMore}
        />
        <InputGroupAddon align='inline-end'>
          <InputGroupButton
            size='icon-xs'
            variant='black'
            onClick={handleBrowseClick}
            disabled={disabled || !canAddMore}
            className='rounded-full'
          >
            <Plus className='size-4' />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      {value.length > 0 && (
        <ul className='mt-2 space-y-1'>
          {value.map((file, index) => {
            if (!file) return null;

            const isExisting = file.type === 'existing';
            const isDeleted = isExisting && file.markedForDeletion;
            const fileName = isExisting
              ? truncateFileName(file.originalName, 30)
              : truncateFileName(file.file.name, 30);
            const fileSize = isExisting ? null : formatFileSize(file.file.size);

            const Comp = () => (
              <>
                {isExisting && <span className='mr-1'>(기존)</span>}
                <span className={isDeleted ? 'line-through text-destructive/70' : 'truncate'}>
                  {fileName}
                </span>
                {fileSize && <span className='ml-1 text-muted-foreground'>({fileSize})</span>}
                {isDeleted && <span className='ml-1 text-destructive'>(삭제)</span>}
              </>
            );

            return (
              <li
                key={index}
                className={cn(
                  'flex items-center justify-between rounded-md bg-secondary/70 px-3 py-1.5 text-sm',
                  isDeleted && 'opacity-50'
                )}
              >
                {isExisting ? (
                  <button
                    onClick={() => handleFileDownload(file.url, file.originalName)}
                    className='truncate hover:underline cursor-pointer text-left'
                    type='button'
                  >
                    <Comp />
                  </button>
                ) : (
                  <span className='truncate'>
                    <Comp />
                  </span>
                )}
                <div className='flex gap-0.5 ml-2'>
                  {isDeleted ? (
                    <InputGroupButton
                      size='icon-xs'
                      variant='ghost'
                      onClick={() => handleRestoreFile(index)}
                      disabled={disabled}
                    >
                      <RefreshCw />
                    </InputGroupButton>
                  ) : (
                    <InputGroupButton
                      size='icon-xs'
                      variant='ghost'
                      onClick={() => handleRemoveFile(index)}
                      disabled={disabled}
                    >
                      <Trash2 />
                    </InputGroupButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
