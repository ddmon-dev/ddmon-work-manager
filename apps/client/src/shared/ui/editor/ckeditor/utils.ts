import { UPLOAD_CONFIG } from './config';

/**
 * 환경변수에서 에디터 업로드 루트 폴더 가져오기
 */
export function getEditorUploadRoot(): string {
  return UPLOAD_CONFIG.uploadFolder;
}

/**
 * 업로드 경로 생성
 *
 * @param uploadFolder - 명시적 업로드 폴더 (우선순위 1)
 * @param entity - 엔티티명 (우선순위 2, 자동 경로 생성용)
 * @returns 최종 업로드 경로
 *
 * @example
 * generateUploadPath('custom/path', 'notices') // 'custom/path'
 * generateUploadPath(undefined, 'notices') // 'editor/notices/20251122'
 * generateUploadPath() // 'editor'
 */
export function generateUploadPath(uploadFolder?: string, entity?: string): string {
  // 1순위: 명시적 uploadFolder
  if (uploadFolder) {
    return uploadFolder;
  }

  // 2순위: entity 기반 자동 생성
  if (entity) {
    const rootFolder = getEditorUploadRoot();
    const dateString = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `${rootFolder}/${entity}/${dateString}`;
  }

  // 3순위: 기본 폴더
  return UPLOAD_CONFIG.uploadFolder;
}
