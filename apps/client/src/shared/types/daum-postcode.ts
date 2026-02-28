/**
 * 카카오 Postcode API 타입 정의
 * @see https://postcode.map.daum.net/guide
 */

/**
 * 주소 데이터 타입
 */
export interface DaumAddressData {
  /** 새 우편번호 (5자리) */
  zonecode: string;
  /** 기본 주소 */
  address: string;
  /** 도로명 주소 */
  roadAddress: string;
  /** 지번 주소 */
  jibunAddress: string;
  /** 건물명 */
  buildingName: string;
  /** 사용자가 선택한 주소 타입 (R: 도로명, J: 지번) */
  userSelectedType: 'R' | 'J';
  /** 영문 주소 */
  addressEnglish: string;
  /** 도로명 주소 (영문) */
  roadAddressEnglish: string;
  /** 지번 주소 (영문) */
  jibunAddressEnglish: string;
  /** 시도 */
  sido: string;
  /** 시군구 */
  sigungu: string;
  /** 시군구 코드 */
  sigunguCode: string;
  /** 법정동/법정리 이름 */
  bname: string;
  /** 법정리의 읍/면 이름 */
  bname1: string;
  /** 도로명 */
  roadname: string;
  /** 도로명 코드 */
  roadnameCode: string;
  /** 주소 타입 (R: 도로명, J: 지번) */
  addressType: 'R' | 'J';
  /** 아파트 여부 (Y/N) */
  apartment: 'Y' | 'N';
  /** 도로명 주소 (자동) */
  autoRoadAddress: string;
  /** 지번 주소 (자동) */
  autoJibunAddress: string;
  /** 건물 관리 번호 */
  buildingCode: string;
  /** 행정동 이름 */
  hname: string;
  /** 선택하지 않음 여부 (Y/N) */
  noSelected: 'Y' | 'N';
  /** 구 우편번호 (6자리, 앞 3자리) */
  postcode: string;
  /** 구 우편번호 (앞 3자리) */
  postcode1: string;
  /** 구 우편번호 (뒤 3자리) */
  postcode2: string;
  /** 우편번호 일련번호 */
  postcodeSeq: string;
  /** 검색 키워드 */
  query: string;
  /** 사용자 언어 타입 (K: 한글, E: 영문) */
  userLanguageType: 'K' | 'E';
}
