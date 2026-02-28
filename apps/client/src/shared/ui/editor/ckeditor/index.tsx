import { cn } from '@/shared/utils/classnames';
import { CKEditor as _CKEditor } from '@ckeditor/ckeditor5-react';
import translations from 'ckeditor5/translations/ko.js';
import {
  ClassicEditor,
  AccessibilityHelp,
  Alignment,
  AutoImage,
  AutoLink,
  Autosave,
  Bold,
  Essentials,
  FontBackgroundColor,
  FontColor,
  FontSize,
  ImageBlock,
  ImageCaption,
  ImageInline,
  ImageInsert,
  ImageInsertViaUrl,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  LinkImage,
  List,
  ListProperties,
  MediaEmbed,
  MediaEmbedToolbar,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  SelectAll,
  Strikethrough,
  Table,
  TableCaption,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  TextTransformation,
  Underline,
  Undo,
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';
import './theme.css';
import { CustomUploadAdapterPlugin } from './custom-upload-adapter';
import { generateUploadPath } from './utils';

interface CKEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** 업로드 폴더 경로 (우선순위 1: 명시적 경로) */
  uploadFolder?: string;
  /** 엔티티명 (우선순위 2: 자동 경로 생성용, 예: 'notices') */
  entity?: string;
  /** 최대 이미지 크기 (MB 단위, 기본값: 2) */
  maxImageSizeMB?: number;
  /** 허용되는 이미지 형식 (기본값: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) */
  acceptedImageFormats?: string[];
  ref?: React.Ref<any>;
}

export function CKEditor({
  content = '',
  onChange,
  placeholder = '내용을 입력하세요...',
  disabled = false,
  className,
  uploadFolder,
  entity,
  maxImageSizeMB,
  acceptedImageFormats,
  ref,
}: CKEditorProps) {
  const finalUploadFolder = generateUploadPath(uploadFolder, entity);

  return (
    <div
      ref={ref}
      className={cn('w-full', className)}
      tabIndex={-1}
    >
      <_CKEditor
        editor={ClassicEditor}
        data={content}
        disabled={disabled}
        onReady={editor => {
          // 커스텀 업로드 어댑터 등록
          CustomUploadAdapterPlugin({
            folder: finalUploadFolder,
            maxSizeMB: maxImageSizeMB,
            acceptedFormats: acceptedImageFormats,
          })(editor);
        }}
        config={{
          licenseKey: 'GPL',
          translations: [translations],
          toolbar: {
            items: [
              'fontSize',
              'fontColor',
              'fontBackgroundColor',
              '|',
              'bold',
              'italic',
              'underline',
              'strikethrough',
              '|',
              'link',
              'insertImage',
              'mediaEmbed',
              'insertTable',
              '|',
              'alignment',
              '|',
              'bulletedList',
              'numberedList',
              '|',
              'outdent',
              'indent',
              '|',
              'undo',
              'redo',
            ],
            shouldNotGroupWhenFull: false,
          },
          plugins: [
            AccessibilityHelp,
            Alignment,
            AutoImage,
            AutoLink,
            Autosave,
            Bold,
            Essentials,
            FontBackgroundColor,
            FontColor,
            FontSize,
            ImageBlock,
            ImageCaption,
            ImageInline,
            ImageInsert,
            ImageInsertViaUrl,
            ImageResize,
            ImageStyle,
            ImageToolbar,
            ImageUpload,
            Indent,
            IndentBlock,
            Italic,
            Link,
            LinkImage,
            List,
            ListProperties,
            MediaEmbed,
            MediaEmbedToolbar,
            Paragraph,
            PasteFromOffice,
            RemoveFormat,
            SelectAll,
            Strikethrough,
            Table,
            TableCaption,
            TableCellProperties,
            TableColumnResize,
            TableProperties,
            TableToolbar,
            TextTransformation,
            Underline,
            Undo,
          ],
          fontSize: {
            options: [10, 12, 14, 'default', 18, 20, 22, 24, 26, 28, 30],
            supportAllValues: true,
          },
          image: {
            toolbar: [
              'imageTextAlternative',
              'toggleImageCaption',
              '|',
              'imageStyle:inline',
              'imageStyle:wrapText',
              'imageStyle:breakText',
              '|',
              'resizeImage',
            ],
          },
          link: {
            addTargetToExternalLinks: true,
            defaultProtocol: 'https://',
            decorators: {
              toggleDownloadable: {
                mode: 'manual',
                label: '다운로드 가능',
                attributes: {
                  download: 'file',
                },
              },
            },
          },
          list: {
            properties: {
              styles: true,
              startIndex: true,
              reversed: true,
            },
          },
          placeholder,
          table: {
            contentToolbar: [
              'tableColumn',
              'tableRow',
              'mergeTableCells',
              'tableProperties',
              'tableCellProperties',
            ],
          },
        }}
        onChange={(_event, editor) => {
          const data = editor.getData();
          onChange?.(data);
        }}
      />
    </div>
  );
}
