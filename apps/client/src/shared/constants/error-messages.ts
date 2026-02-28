import { josa } from 'es-hangul';

// ============================================================
// 인증 에러
// ============================================================
export const AUTH_ERRORS = {
  CREDENTIALS_SIGNIN: '아이디 또는 비밀번호가 일치하지 않습니다.',
  LOGIN_ERROR: '로그인에 실패했습니다.',
  UNKNOWN_ERROR: '로그인 중 오류가 발생했습니다.',
  UNAUTHORIZED: '로그인이 필요합니다.',
  FORBIDDEN: '권한이 없습니다.',
  SUPER_REQUIRED: '슈퍼 관리자 권한이 필요합니다.',
  SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
} as const;

// ============================================================
// 검증 에러
// ============================================================
export const VALIDATION_ERRORS = {
  NO_ID: 'ID값이 없습니다.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  REQUIRED_FIELD: (fieldName: string) =>
    `${josa(fieldName, '은/는')} 필수 입력값입니다.`,
  INVALID_FORMAT: (fieldName: string) =>
    `${fieldName}의 형식이 올바르지 않습니다.`,
  TOO_LONG: (fieldName: string, maxLength: number) =>
    `${josa(fieldName, '은/는')} ${maxLength}자 이하여야 합니다.`,
  TOO_SHORT: (fieldName: string, minLength: number) =>
    `${josa(fieldName, '은/는')} ${minLength}자 이상이어야 합니다.`,
} as const;

// ============================================================
// CRUD 에러
// ============================================================
export const CRUD_ERRORS = {
  CREATE_FAILED: (entityName: string = '데이터') =>
    `${josa(entityName, '을/를')} 생성하는 중 오류가 발생했습니다.`,
  READ_FAILED: (entityName: string = '데이터') =>
    `${josa(entityName, '을/를')} 조회하는 중 오류가 발생했습니다.`,
  UPDATE_FAILED: (entityName: string = '데이터') =>
    `${josa(entityName, '을/를')} 수정하는 중 오류가 발생했습니다.`,
  DELETE_FAILED: (entityName: string = '데이터') =>
    `${josa(entityName, '을/를')} 삭제하는 중 오류가 발생했습니다.`,
  NOT_FOUND: (entityName: string) =>
    `${josa(entityName, '을/를')} 찾을 수 없습니다.`,
  DUPLICATE: (fieldName: string) => `이미 존재하는 ${fieldName}입니다.`,
  ALREADY_EXISTS: (fieldName: string) => `이미 사용된 ${fieldName}입니다.`,
  SWAP_FAILED: '순서 변경에 실패했습니다.',
} as const;

// ============================================================
// 파일 에러
// ============================================================
export const FILE_ERRORS = {
  UPLOAD_FAILED: '파일 업로드 중 오류가 발생했습니다.',
  DELETE_FAILED: '파일 삭제 중 오류가 발생했습니다.',
  SIZE_EXCEEDED: (maxSize: string) => `파일 크기는 ${maxSize} 이하여야 합니다.`,
  INVALID_FILE: (allowedTypes: string) =>
    `허용되지 않는 파일 형식입니다. (허용: ${allowedTypes})`,
  PRESIGNED_URL_FAILED: 'Presigned URL 발급에 실패했습니다.',
  REQUIRED_FILES: '파일을 업로드해주세요.',
  MIN_FILES_REQUIRED: (min: number) =>
    `최소 ${min}개 이상의 파일을 업로드해주세요.`,
  MAX_FILES_EXCEEDED: (max: number) => `최대 ${max}개까지 업로드 가능합니다.`,
  UPLOAD_TIMEOUT: '업로드 시간이 초과되었습니다.',
  DOWNLOAD_FAILED: '다운로드에 실패했습니다.',
  FILE_DELETE_FAILED: '파일 삭제에 실패했습니다.',
  FOLDER_DELETE_FAILED: '폴더 삭제에 실패했습니다.',
} as const;

// ============================================================
// 일반 에러
// ============================================================
export const GENERAL_ERRORS = {
  UNEXPECTED: '예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  NETWORK: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  SERVER: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  DATABASE: '데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  PLEASE_TRY_AGAIN: '잠시 후 다시 시도해주세요.',
} as const;
