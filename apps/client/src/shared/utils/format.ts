/**
 * 숫자를 통화 형식으로 포맷팅합니다.
 * ex) 1000000 → 1,000,000
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("ko-KR");
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
