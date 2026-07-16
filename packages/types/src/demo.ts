/**
 * 데모 모드 메시지 SSOT
 * 서버(demo-guard)가 이 문구로 응답하고, 클라이언트는 기존 에러 toast 경로로 그대로 표시한다.
 */
export const DEMO_MESSAGES = {
  DELETE_BLOCKED: "데모 환경에서는 삭제 기능이 제한됩니다.",
  PASSWORD_BLOCKED: "데모 환경에서는 비밀번호를 변경할 수 없습니다.",
  UPLOAD_EXTENSION_BLOCKED:
    "데모 환경에서 허용되지 않는 파일 형식입니다. (허용: 이미지 jpg·png·gif·webp / 문서 pdf·doc·xls·ppt·txt·csv·json / zip·mp4·mp3)",
} as const;
