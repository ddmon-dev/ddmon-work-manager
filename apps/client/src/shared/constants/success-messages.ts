import { josa } from 'es-hangul';

// 성공메세지
export const SUCCESS_MESSAGES = {
  CREATE_SUCCESS: (entityName: string = '데이터') =>
    `${josa(entityName, '이/가')} 성공적으로 생성되었습니다.`,
  READ_SUCCESS: (entityName: string = '데이터') =>
    `${josa(entityName, '이/가')} 성공적으로 조회되었습니다.`,
  UPDATE_SUCCESS: (entityName: string = '데이터') =>
    `${josa(entityName, '이/가')} 성공적으로 수정되었습니다.`,
  DELETE_SUCCESS: (entityName: string = '데이터') =>
    `${josa(entityName, '이/가')} 성공적으로 삭제되었습니다.`,
  DOWNLOAD_SUCCESS: (entityName: string = '데이터') =>
    `${josa(entityName, '이/가')} 성공적으로 다운로드되었습니다.`,
} as const;
