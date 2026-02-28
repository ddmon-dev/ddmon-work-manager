/**
 * 에디터 이미지 업로드 설정 타입
 */
export interface UploadConfig {
  /** 업로드 폴더 */
  uploadFolder: string;
  /** 최대 파일 크기 (MB 단위) */
  imageMaxSizeMb: number;
  /** 허용되는 이미지 형식 (MIME 타입) */
  acceptedFormats: string[];
  /** 업로드 타임아웃 (ms) */
  uploadTimeoutMS: number;
}

/**
 * 기본 이미지 업로드 설정
 */
export const UPLOAD_CONFIG: UploadConfig = {
  uploadFolder: 'editor',
  imageMaxSizeMb: 2,
  acceptedFormats: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  uploadTimeoutMS: 30000,
};
