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
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }
  return phone;
}
