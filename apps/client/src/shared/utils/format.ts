/**
 * 숫자를 통화 형식으로 포맷팅합니다.
 * ex) 1000000 → 1,000,000
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("ko-KR");
}

/**
 * MB를 Bytes로 변환
 * @param mb - 메가바이트 단위 크기
 * @returns 바이트 단위 크기
 */
export const mbToBytes = (mb: number): number => mb * 1024 * 1024;

/**
 * Bytes를 MB로 변환 (에러 메시지용)
 * @param bytes - 바이트 단위 크기
 * @returns 메가바이트 단위 크기
 */
export const bytesToMB = (bytes: number): number => bytes / (1024 * 1024);

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 * @param bytes - 바이트 단위 파일 크기
 * @returns 포맷된 파일 크기 문자열 (예: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 긴 파일명을 중간에 '...'으로 축약
 * @param fileName - 원본 파일명
 * @param maxLength - 최대 길이 (기본값: 40)
 * @returns 축약된 파일명
 */
export function truncateFileName(fileName: string, maxLength: number = 40): string {
  if (fileName.length <= maxLength) return fileName;

  const lastDotIndex = fileName.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0;

  if (!hasExtension) {
    const halfLength = Math.floor((maxLength - 3) / 2);
    return fileName.slice(0, halfLength) + '...' + fileName.slice(-halfLength);
  }

  const extension = fileName.slice(lastDotIndex);
  const nameWithoutExt = fileName.slice(0, lastDotIndex);

  const availableLength = maxLength - extension.length - 3;
  if (availableLength <= 0) return fileName;

  const halfLength = Math.floor(availableLength / 2);
  return (
    nameWithoutExt.slice(0, halfLength) + '...' + nameWithoutExt.slice(-halfLength) + extension
  );
}

/**
 * 전화번호를 한국 형식으로 포맷팅합니다.
 * ex) 01012345678 → 010-1234-5678
 */
export function formatPhoneNumber(value: string): string {
  const numbersOnly = value.replace(/\D/g, "");

  if (numbersOnly.startsWith("02")) {
    // 서울 (02-XXX-XXXX or 02-XXXX-XXXX)
    if (numbersOnly.length <= 9) {
      return numbersOnly.replace(/(\d{2})(\d{0,3})(\d{0,4})/, (_, p1, p2, p3) =>
        [p1, p2, p3].filter(Boolean).join("-")
      );
    } else {
      return numbersOnly
        .slice(0, 10)
        .replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, p1, p2, p3) =>
          [p1, p2, p3].filter(Boolean).join("-")
        );
    }
  } else if (numbersOnly.startsWith("010") || numbersOnly.startsWith("070")) {
    // 휴대폰/인터넷전화 (010-XXXX-XXXX, 070-XXXX-XXXX)
    if (numbersOnly.length <= 11) {
      return numbersOnly.replace(/(\d{3})(\d{0,4})(\d{0,4})/, (_, p1, p2, p3) =>
        [p1, p2, p3].filter(Boolean).join("-")
      );
    } else {
      return numbersOnly
        .slice(0, 11)
        .replace(/(\d{3})(\d{0,4})(\d{0,4})/, (_, p1, p2, p3) =>
          [p1, p2, p3].filter(Boolean).join("-")
        );
    }
  } else {
    // 일반 지역번호 (0XX-XXX-XXXX)
    if (numbersOnly.length <= 10) {
      return numbersOnly.replace(/(\d{3})(\d{0,3})(\d{0,4})/, (_, p1, p2, p3) =>
        [p1, p2, p3].filter(Boolean).join("-")
      );
    } else {
      return numbersOnly
        .slice(0, 10)
        .replace(/(\d{3})(\d{0,3})(\d{0,4})/, (_, p1, p2, p3) =>
          [p1, p2, p3].filter(Boolean).join("-")
        );
    }
  }
}
