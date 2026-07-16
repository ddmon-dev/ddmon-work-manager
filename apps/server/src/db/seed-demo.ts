import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { calculateTotal, type TotalCalculation } from "@packages/utils";
import {
  TAX_TYPE,
  DISCOUNT_TYPE,
  PAYMENT_TYPE,
  PROJECT_STATUS,
  WORK_PHASE,
  PARTNER_SPECIALTIES,
  type TaxType,
  type DiscountType,
  type PaymentType,
  type ProjectStatus,
  type WorkPhase,
} from "@packages/types";
import { db } from "./index";
import { user } from "./schema";
import {
  businessInfo,
  clients,
  clientMemos,
  partners,
  partnerMemos,
  estimateSeries,
  estimates,
  estimateItemGroups,
  estimateItems,
  projects,
  projectInvoices,
  projectCollections,
  projectExpenses,
  partnerPayments,
  projectPartners,
  projectMemos,
  projectScheduleLanes,
  projectSchedules,
  schedules,
  todos,
  todoTimeBlocks,
  memos,
  clientEnvironments,
  files,
} from "./schema";
import { auth } from "../auth";
import { uploadFile } from "../lib/storage";

// ────────────────────────────────────────────────────────────
// 의사난수 & 날짜/숫자 헬퍼 (Math.random 사용 금지, 고정 시드로 재현 가능)
// ────────────────────────────────────────────────────────────

const SEED = 20260716;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(SEED);

/** min~max 포함 정수 */
function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)] as T;
}

function chance(p: number): boolean {
  return rng() < p;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleUnique<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)));
}

const NOW = new Date();

/** n일 전 날짜 (n이 음수면 |n|일 후 미래) */
function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** 로컬 타임존 기준 YYYY-MM-DD (UTC 변환으로 인한 날짜 밀림 방지) */
function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function roundToUnit(amount: number, unit: number): number {
  return Math.round(amount / unit) * unit;
}

function randomAmount(min: number, max: number, unit: number): number {
  const steps = Math.floor((max - min) / unit);
  return min + randInt(0, steps) * unit;
}

/** createdAt 등 timestamp 필드용: 날짜에 임의의 업무 시간대를 부여 */
function withRandomTime(d: Date): Date {
  const result = new Date(d);
  result.setHours(randInt(8, 20), randInt(0, 59), randInt(0, 59), 0);
  return result;
}

function isPastDate(d: Date): boolean {
  return dateStr(d) < dateStr(NOW);
}

function isThisOrLastMonth(d: Date): boolean {
  const cur = NOW.getFullYear() * 12 + NOW.getMonth();
  const dm = d.getFullYear() * 12 + d.getMonth();
  return cur - dm >= 0 && cur - dm <= 1;
}

function weekBounds(d: Date): [Date, Date] {
  const day = d.getDay(); // 0=일 ~ 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDays(d, diffToMonday);
  const sunday = addDays(monday, 6);
  return [monday, sunday];
}

/** 총액을 비율(splits, 합계 100)에 따라 분할, 반올림 오차는 마지막 항목에 흡수 */
function splitAmounts(total: number, splits: number[]): number[] {
  const amounts = splits.map((pct) => roundToUnit((total * pct) / 100, 1000));
  const sum = amounts.reduce((a, b) => a + b, 0);
  amounts[amounts.length - 1] += total - sum;
  return amounts;
}

/** start~end 구간에 n개 날짜를 대략 균등 분산 (지터 포함) */
function distributeDates(start: Date, end: Date, n: number): Date[] {
  const span = Math.max(diffDays(start, end), n * 3);
  const dates: Date[] = [];
  for (let i = 0; i < n; i++) {
    const base = Math.round(((i + 1) / (n + 1)) * span);
    const jitter = randInt(-2, 2);
    let d = addDays(start, Math.max(1, base + jitter));
    if (d.getTime() > end.getTime()) d = new Date(end);
    dates.push(d);
  }
  return dates;
}

async function insertChunked<T extends PgTable>(
  table: T,
  rows: InferInsertModel<T>[],
  chunkSize = 500
) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await db.insert(table).values(rows.slice(i, i + chunkSize));
  }
}

// ────────────────────────────────────────────────────────────
// 정적 데이터 풀
// ────────────────────────────────────────────────────────────

const COMPANY_POOL = [
  { name: "그린랩스토어", slug: "greenlab" },
  { name: "메이플제과", slug: "mapleconfect" },
  { name: "한빛출판미디어", slug: "hanbitpub" },
  { name: "블루문스튜디오", slug: "bluemoonstudio" },
  { name: "리버사이드호텔", slug: "riversidehotel" },
  { name: "누리여행사", slug: "nuritravel" },
  { name: "코지하우스가구", slug: "cozyhouse" },
  { name: "새벽마켓", slug: "dawnmarket" },
  { name: "테라피트니스", slug: "terrafitness" },
  { name: "달빛서점", slug: "moonlightbooks" },
  { name: "모모피자", slug: "momopizza" },
  { name: "퍼플웨딩홀", slug: "purplewedding" },
  { name: "스마일치과의원", slug: "smiledental" },
  { name: "그램커피로스터스", slug: "gramcoffee" },
  { name: "바다마루수산", slug: "badamaru" },
  { name: "라온뮤직아카데미", slug: "raonmusic" },
  { name: "노을사진관", slug: "noeulphoto" },
  { name: "시그널광고기획", slug: "signalads" },
  { name: "파인트리조경", slug: "pinetree" },
  { name: "온새미로한식당", slug: "onsaemiro" },
  { name: "청춘어학원", slug: "cheongchun" },
  { name: "소소한공방", slug: "sosohan" },
  { name: "늘봄약국", slug: "neulbom" },
  { name: "하늘가온플라워", slug: "skyflower" },
  { name: "오늘의세탁소", slug: "todaylaundry" },
] as const;

const SURNAMES: [string, string][] = [
  ["김", "kim"], ["이", "lee"], ["박", "park"], ["최", "choi"], ["정", "jung"],
  ["강", "kang"], ["조", "cho"], ["윤", "yoon"], ["장", "jang"], ["임", "lim"],
];

const GIVEN_NAMES: [string, string][] = [
  ["민준", "minjun"], ["서연", "seoyeon"], ["도윤", "doyoon"], ["지우", "jiwoo"], ["하은", "haeun"],
  ["준서", "junseo"], ["수아", "sua"], ["예준", "yejun"], ["서윤", "seoyoon"], ["시우", "siwoo"],
  ["다은", "daeun"], ["지호", "jiho"], ["유진", "yujin"], ["은서", "eunseo"], ["현우", "hyunwoo"],
  ["소율", "soyul"], ["재현", "jaehyun"], ["나윤", "nayoon"], ["동현", "donghyun"], ["혜인", "hyein"],
];

const POSITIONS = ["팀장", "과장", "대리", "주임", "실장", "매니저", "이사", "부장"];

function randomContact() {
  const [sk, sr] = pick(SURNAMES);
  const [gk, gr] = pick(GIVEN_NAMES);
  return { display: `${sk}${gk} ${pick(POSITIONS)}`, roman: `${sr}.${gr}` };
}

const STREET_POOL = [
  "서울특별시 강남구 테헤란로",
  "서울특별시 마포구 월드컵북로",
  "서울특별시 성동구 성수이로",
  "서울특별시 영등포구 여의대로",
  "서울특별시 종로구 종로",
  "서울특별시 송파구 올림픽로",
  "경기도 성남시 분당구 판교역로",
  "경기도 고양시 일산동구 중앙로",
  "서울특별시 서초구 서초대로",
  "경기도 수원시 영통구 광교로",
];

function randomAddress(): string {
  const street = pick(STREET_POOL);
  return `${street}${randInt(1, 300)}길 ${randInt(1, 40)}, ${randInt(2, 15)}층`;
}

// 개인정보성 번호는 랜덤 생성 대신 전부 0 마스킹 패턴으로 고정
function maskedPhone(): string {
  return "010-0000-0000";
}

const CLIENT_MEMO_TEMPLATES: { type: "strategy" | "log"; content: string }[] = [
  { type: "log", content: "결제는 월말 일괄 처리 선호" },
  { type: "log", content: "담당자 회신 느린 편, 유선 병행" },
  { type: "strategy", content: "견적 문의 시 항상 세금계산서 요청함" },
  { type: "log", content: "디자인 시안은 2회 이상 수정 요청 잦음" },
  { type: "log", content: "주말 연락 지양 요청" },
  { type: "strategy", content: "신규 프로젝트 논의 중, 다음 분기 예상" },
  { type: "log", content: "메신저보다 이메일 소통 선호" },
  { type: "strategy", content: "이전 외주 업체와 마찰 있었음, 커뮤니케이션 신중히" },
  { type: "log", content: "정기 유지보수 계약 갱신 예정" },
  { type: "strategy", content: "제안서는 PDF로만 전달 요청, 초안 공유는 지양" },
];

const PARTNER_POOL = [
  { name: "강태윤", roman: "kangtaeyoon" },
  { name: "오하늘", roman: "ohaneul" },
  { name: "백지민", roman: "baekjimin" },
  { name: "서준혁", roman: "seojunhyuk" },
  { name: "윤소민", roman: "yoonsomin" },
  { name: "한도경", roman: "handogyeong" },
  { name: "임서준", roman: "limseojun" },
  { name: "고은채", roman: "koeunchae" },
  { name: "문지호", roman: "moonjiho" },
  { name: "배수현", roman: "baesuhyun" },
];

const BANKS = ["국민은행", "신한은행", "우리은행", "하나은행", "카카오뱅크", "토스뱅크", "농협은행", "기업은행"];

const PARTNER_MEMO_TEMPLATES = [
  "일정 여유있게 요청하면 퀄리티 좋음",
  "주말 작업 요청 시 단가 협의 필요",
  "커뮤니케이션은 메신저보다 통화 선호",
  "최근 단가 인상 요청함",
  "마감 임박 건 선호하지 않음",
  "포트폴리오 최신화 요청 필요",
  "세금계산서 발행 요청 시 익월 초 처리",
];

const TITLE_TYPES = [
  "홈페이지 구축", "홈페이지 리뉴얼", "반응형 웹사이트 제작", "브랜드 사이트 구축",
  "쇼핑몰 구축", "랜딩페이지 제작", "예약 시스템 개발", "관리자 시스템 구축",
  "사내 인트라넷 구축", "프로모션 페이지 제작", "멤버십 페이지 개편", "다국어 사이트 구축",
];

const GROUP_NAME_POOL = ["기획", "디자인", "개발", "퍼블리싱", "운영 준비"];

const ITEM_NAME_POOL = [
  "요구사항 분석 및 정보구조 설계", "메인 페이지 디자인", "서브 페이지 디자인", "반응형 퍼블리싱",
  "게시판 기능 개발", "관리자 페이지 개발", "예약 기능 개발", "호스팅 셋업 및 배포", "도메인·SSL 설정",
  "결제 모듈 연동", "SEO 기본 설정", "다국어 페이지 구성", "회원 관리 기능 개발", "이벤트 팝업 제작",
  "UI 스타일가이드 제작", "QA 및 버그 수정", "콘텐츠 이관 작업", "유지보수 정책 안내",
];

// PDF 템플릿이 각 행에 "*"를 붙이므로 프리픽스 없이 작성
const ESTIMATE_NOTES_POOL = [
  "상세 개발 범위는 협의된 기획서 기준으로 함\n기획 변동 시 추가 비용 발생 가능\n제작 일정은 착수 후 별도 협의",
  "디자인 시안 확정 후 퍼블리싱 진행\n시안 수정은 최대 2회까지 포함\n텍스트/이미지 단순 교체 1회 포함",
  "견적 유효기간 이후 재문의 시 금액 변동 가능\n부가세 별도 표기 여부는 세금 유형에 따름\n계약금 입금 후 작업 착수",
];

const PROJECT_DESCRIPTIONS = ["1차 미팅 후 범위 확정", "기존 사이트 리브랜딩 포함", "긴급 대응 건"];
const PROJECT_NOTES = [
  "담당자 변경으로 소통 채널 재확인 필요",
  "세금계산서 발행일 별도 안내 예정",
  "완료 후 3개월 무상 A/S 포함",
];

const PROJECT_MEMO_TEMPLATES = [
  "다음 미팅에서 잔금 일정 확정 예정",
  "고객 요청으로 납기 1주 연장",
  "세금계산서 발행 항목 재확인 필요",
  "리뉴얼 2차 논의 가능성 있음",
  "완료 후 유지보수 계약 제안 예정",
  "디자인 시안 컨펌 지연 중",
  "결제 조건 변경 요청 있었음",
  "내부 리소스 조정으로 일정 재검토",
];

const EXPENSE_DESCRIPTIONS = ["폰트 라이선스 구매", "스톡 이미지 구독", "서버 호스팅 비용", "유료 플러그인 구매", "외부 미팅 교통비"];
const PARTNER_PAYMENT_DESCRIPTIONS = ["외주 디자인비", "퍼블리싱 외주비", "일러스트 작업비", "영상 편집비", "백엔드 개발 외주비"];

const INVOICE_PATTERNS: { splits: number[]; types: PaymentType[]; descriptions: string[] }[] = [
  { splits: [50, 50], types: [PAYMENT_TYPE.DEPOSIT, PAYMENT_TYPE.BALANCE], descriptions: ["계약금", "잔금"] },
  {
    splits: [30, 40, 30],
    types: [PAYMENT_TYPE.DEPOSIT, PAYMENT_TYPE.INTERIM, PAYMENT_TYPE.BALANCE],
    descriptions: ["계약금", "중도금", "잔금"],
  },
  { splits: [100], types: [PAYMENT_TYPE.BALANCE], descriptions: ["잔금"] },
];

const LANE_TITLES = ["기획", "디자인", "개발", "검수/QA"];
const PRESET_CATEGORIES = ["planning", "design", "development", "revision", "delivery"];
const CUSTOM_CATEGORY_POOL = [
  { label: "협의", color: "#14b8a6" },
  { label: "확인", color: "#f97316" },
  { label: "대기", color: "#8b5cf6" },
];

const SCHEDULE_TITLE_TEMPLATES: ((company: string) => string)[] = [
  (c) => `${c} 미팅`,
  () => "시안 전달",
  (c) => `${c} 오픈`,
  () => "부가세 신고",
  () => "검수 피드백 정리",
  () => "정기 유지보수 점검",
  () => "월간 결산",
  () => "세금계산서 발행",
];
const SCHEDULE_COLORS = ["default", "red", "orange", "yellow", "green", "blue", "purple", "pink", "gray"];
const TIME_SLOTS = ["09:30", "10:00", "11:00", "14:00", "15:00", "16:00"];

const TODO_CONTENT_POOL = [
  "시안 2차 수정", "견적서 발송", "미팅 자료 준비", "테스트 서버 배포", "계산서 발행 확인",
  "파트너 정산 요청", "도메인 갱신 확인", "반응형 QA 체크", "고객 피드백 회신", "백업 스크립트 점검",
  "SNS 홍보 이미지 제작", "월간 리포트 작성",
];
const TODO_COLORS = ["slate", "red", "orange", "yellow", "green", "blue", "purple", "pink"];

const WIDGET_MEMO_CONTENTS = [
  "호스팅 갱신 8월 말",
  "다음 미팅 전 포트폴리오 링크 정리",
  "명함 재주문 필요",
  "이번 달 세금계산서 발행 목록 확인",
  "신규 문의 3건 회신 대기",
  "노션 프로젝트 보드 정리",
  "파트너 계약서 템플릿 업데이트",
  "다음 분기 견적 단가표 점검",
];

const HOSTING_PROVIDERS = ["카페24", "가비아", "AWS Lightsail", "닷홈"];
const REGISTRARS = ["가비아", "후이즈", "카페24", "닷홈"];
const ENV_NOTES = ["초기 세팅 시 SSL 자동 갱신 설정 완료", "이관 예정, 신규 호스팅사 협의 중", "백업 주기 매주 일요일 새벽"];

function fakePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[randInt(0, chars.length - 1)];
  const symbol = pick(["!", "#", "$", "%", "*"]);
  return `${s.slice(0, 2)}${randInt(1, 9)}${symbol}${s.slice(2)}`;
}

// ────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────

interface ClientPlan {
  id: string;
  slug: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  createdAt: Date;
}

interface PartnerPlan {
  id: string;
  name: string;
  email: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  specialties: string[];
  createdAt: Date;
}

interface ItemGroupPlan {
  name: string;
  items: { name: string; quantity: string; unit: string; amount: number }[];
}

interface EstimateVersionPlan {
  id: string;
  version: number;
  versionLabel: string;
  issuedDate: Date;
  validUntil: Date;
  groups: ItemGroupPlan[];
  taxType: TaxType;
  discountType: DiscountType;
  discountValue: number;
  totals: TotalCalculation;
  notes: string;
}

interface EstimateSeriesPlan {
  estimateNumber: string;
  clientId: string;
  title: string;
  targetStatus: "contracted" | "pending" | "expired";
  baseIssuedDate: Date;
  versions: EstimateVersionPlan[];
}

interface ProjectPlan {
  id: string;
  clientId: string;
  estimateNumber: string | null;
  projectNumber: string;
  name: string;
  status: ProjectStatus;
  workPhase: WorkPhase;
  contractDate: Date;
  completedDate: Date | null;
  deliveredDate: Date | null;
  contractAmount: number;
  taxType: TaxType;
  description?: string;
  notes?: string;
}

interface InvoicePlan {
  id: string;
  projectId: string;
  paymentType: PaymentType;
  description: string;
  amount: number;
  issueDate: Date;
}

interface CollectionPlan {
  id: string;
  projectId: string;
  invoiceId: string | null;
  amount: number;
  paidDate: Date;
  paymentType: PaymentType;
  description: string;
}

interface PartnerPaymentPlan {
  id: string;
  projectId: string;
  partnerId: string;
  description: string;
  amount: number;
  paidDate: Date;
  withholdingReported: boolean;
  withholdingReportedDate: Date | null;
}

interface LanePlan {
  id: string;
  projectId: string;
  title: string;
  sortOrder: number;
}

interface SchedulePlan {
  id: string;
  projectId: string;
  laneId: string;
  category: string;
  categoryColor: string | null;
  startDate: Date;
  endDate: Date;
  sortOrder: number;
}

// ────────────────────────────────────────────────────────────
// 메인 시드 로직
// ────────────────────────────────────────────────────────────

async function seed() {
  console.log("데모 데이터 시딩 시작...");

  // ── 1. 계정 ─────────────────────────────────────────────

  async function ensureAccount(opts: { name: string; email: string; username: string; password: string }) {
    try {
      await auth.api.signUpEmail({ body: opts });
      console.log(`${opts.name} 계정 생성 완료.`);
    } catch {
      console.log(`${opts.name} 계정이 이미 존재하여 건너뜁니다.`);
    }
    const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, opts.email)).limit(1);
    return row.id;
  }

  const demoUsername = process.env.DEMO_USERNAME ?? "demo";
  const demoPassword = process.env.DEMO_PASSWORD ?? "demo1234";

  const demoId = await ensureAccount({
    name: "데모 관리자",
    email: "demo@example.com",
    username: demoUsername,
    password: demoPassword,
  });
  await db.update(user).set({ superAdmin: true, phone: "010-0000-0000" }).where(eq(user.id, demoId));

  const jiwonId = await ensureAccount({
    name: "한지원",
    email: "jiwon@example.com",
    username: "jiwon",
    password: "jiwon1234",
  });

  function randomAuthor(): string {
    return chance(0.8) ? demoId : jiwonId;
  }

  console.log("계정 세팅 완료.");

  // ── 2. 사업자 정보 ────────────────────────────────────────

  await db.insert(businessInfo).values({
    name: "리틀어썸",
    nameEn: "LittleAwesome",
    ceo: "홍길동",
    bizNumber: "000-00-00000",
    address: "서울특별시 마포구 월드컵북로 000, 5층",
    bankName: "국민은행",
    bankAccount: "000000-00-000000",
    accountHolder: "홍길동",
    bizType: "정보통신업",
    bizItem: "소프트웨어 개발 및 공급",
  });

  const PUBLISHER_INFO = { issuer: "홍길동", email: "hello@littleawesome.example", phone: "010-0000-0000" };

  console.log("사업자 정보 등록 완료.");

  // ── 3. 클라이언트 (25) + 메모 ────────────────────────────

  const clientPlans: ClientPlan[] = COMPANY_POOL.map((c) => {
    const contact = randomContact();
    return {
      id: randomUUID(),
      slug: c.slug,
      companyName: c.name,
      contactName: contact.display,
      email: `${contact.roman}@${c.slug}.example`,
      phone: maskedPhone(),
      address: randomAddress(),
      createdAt: withRandomTime(daysAgo(randInt(0, 365))),
    };
  });

  await insertChunked(
    clients,
    clientPlans.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactName: c.contactName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      author: randomAuthor(),
      createdAt: c.createdAt,
    }))
  );

  const clientMemoRows: InferInsertModel<typeof clientMemos>[] = [];
  for (const c of clientPlans) {
    const count = randInt(0, 3);
    const templates = sampleUnique(CLIENT_MEMO_TEMPLATES, count);
    for (const t of templates) {
      const rawDate = withRandomTime(addDays(c.createdAt, randInt(1, 90)));
      const createdAt = rawDate.getTime() > NOW.getTime() ? NOW : rawDate;
      clientMemoRows.push({
        id: randomUUID(),
        parentId: c.id,
        type: t.type,
        content: t.content,
        author: randomAuthor(),
        createdAt,
      });
    }
  }
  await insertChunked(clientMemos, clientMemoRows);

  console.log(`클라이언트 ${clientPlans.length}개, 메모 ${clientMemoRows.length}개 삽입 완료.`);

  // ── 4. 파트너 (10) + 메모 ────────────────────────────────

  const partnerPlans: PartnerPlan[] = PARTNER_POOL.map((p) => ({
    id: randomUUID(),
    name: p.name,
    email: `${p.roman}@partner.example`,
    phone: maskedPhone(),
    bankName: pick(BANKS),
    bankAccount: "000-000-000000",
    specialties: sampleUnique(PARTNER_SPECIALTIES, randInt(1, 2)),
    createdAt: withRandomTime(daysAgo(randInt(30, 365))),
  }));

  await insertChunked(
    partners,
    partnerPlans.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      bankName: p.bankName,
      bankAccount: p.bankAccount,
      accountHolder: p.name,
      residentNumber: null,
      specialties: p.specialties,
      author: demoId,
      createdAt: p.createdAt,
    }))
  );

  const partnerMemoRows: InferInsertModel<typeof partnerMemos>[] = [];
  for (const p of partnerPlans) {
    const count = randInt(0, 2);
    const templates = sampleUnique(PARTNER_MEMO_TEMPLATES, count);
    for (const content of templates) {
      partnerMemoRows.push({
        id: randomUUID(),
        parentId: p.id,
        content,
        author: randomAuthor(),
        createdAt: withRandomTime(addDays(p.createdAt, randInt(1, 60))),
      });
    }
  }
  await insertChunked(partnerMemos, partnerMemoRows);

  console.log(`파트너 ${partnerPlans.length}개, 메모 ${partnerMemoRows.length}개 삽입 완료.`);

  // ── 5. 견적서 계열 50건 ───────────────────────────────────

  function generateItemGroups(): ItemGroupPlan[] {
    const groupNames = sampleUnique(GROUP_NAME_POOL, randInt(1, 3));
    return groupNames.map((name) => ({
      name,
      items: sampleUnique(ITEM_NAME_POOL, randInt(2, 5)).map((itemName) => ({
        name: itemName,
        quantity: "1",
        unit: "식",
        amount: randomAmount(300000, 2500000, 50000),
      })),
    }));
  }

  function varyItemGroups(base: ItemGroupPlan[]): ItemGroupPlan[] {
    return base.map((group) => ({
      name: group.name,
      items: group.items.map((item) => ({
        ...item,
        amount: roundToUnit(item.amount * (0.9 + rng() * 0.25), 50000),
      })),
    }));
  }

  const STATUS_POOL: EstimateSeriesPlan["targetStatus"][] = [
    ...Array(22).fill("contracted" as const),
    ...Array(18).fill("pending" as const),
    ...Array(10).fill("expired" as const),
  ];
  const shuffledStatuses = shuffle(STATUS_POOL);

  const VERSION_COUNT_POOL: number[] = [...Array(30).fill(1), ...Array(15).fill(2), ...Array(5).fill(3)];
  const shuffledVersionCounts = shuffle(VERSION_COUNT_POOL);

  const seriesPlans: EstimateSeriesPlan[] = [];
  for (let i = 0; i < 50; i++) {
    const client = pick(clientPlans);
    const typeLabel = pick(TITLE_TYPES);
    const title = `${client.companyName} ${typeLabel}`;
    const targetStatus = shuffledStatuses[i];
    const versionCount = shuffledVersionCounts[i];
    const baseIssuedDate = daysAgo(randInt(0, 365));
    const ageDays = diffDays(baseIssuedDate, NOW);
    const taxType: TaxType = chance(ageDays > 270 ? 0.35 : 0.08) ? TAX_TYPE.WITHHOLDING : TAX_TYPE.VAT;

    let discountType: DiscountType = DISCOUNT_TYPE.NONE;
    let discountValue = 0;
    if (chance(0.2)) {
      if (chance(0.5)) {
        discountType = DISCOUNT_TYPE.AMOUNT;
        discountValue = randomAmount(100000, 500000, 50000);
      } else {
        discountType = DISCOUNT_TYPE.PERCENTAGE;
        discountValue = pick([5, 10]);
      }
    }

    const baseGroups = generateItemGroups();
    const versions: EstimateVersionPlan[] = [];
    let cursorDate = baseIssuedDate;
    for (let v = 1; v <= versionCount; v++) {
      const issuedDate = v === 1 ? baseIssuedDate : addDays(cursorDate, randInt(3, 10));
      cursorDate = issuedDate;
      const groups = v === 1 ? baseGroups : varyItemGroups(baseGroups);
      const totals = calculateTotal(
        groups.map((g) => ({ items: g.items.map((it) => ({ amount: it.amount })) })),
        taxType,
        discountType,
        discountValue
      );
      const versionLabel =
        versionCount === 1 ? "초안" : v === 1 ? "초안" : v === versionCount ? "최종안" : "수정안";
      versions.push({
        id: randomUUID(),
        version: v,
        versionLabel,
        issuedDate,
        validUntil: addDays(issuedDate, 30),
        groups,
        taxType,
        discountType,
        discountValue,
        totals,
        notes: pick(ESTIMATE_NOTES_POOL),
      });
    }

    seriesPlans.push({ estimateNumber: "", clientId: client.id, title, targetStatus, baseIssuedDate, versions });
  }

  // 연도별 순번 부여 (issuedDate 기준 정렬)
  const orderedForNumbering = [...seriesPlans].sort((a, b) => a.baseIssuedDate.getTime() - b.baseIssuedDate.getTime());
  const estimateYearCounters = new Map<number, number>();
  for (const plan of orderedForNumbering) {
    const year = plan.baseIssuedDate.getFullYear();
    const next = (estimateYearCounters.get(year) ?? 0) + 1;
    estimateYearCounters.set(year, next);
    plan.estimateNumber = `EST-${year}-${String(next).padStart(3, "0")}`;
  }

  // 5-1. estimateSeries phase1: contracted 예정 계열만 pending으로 임시 삽입, 나머지는 최종 상태 직삽입
  await insertChunked(
    estimateSeries,
    seriesPlans.map((p) => ({
      estimateNumber: p.estimateNumber,
      status: p.targetStatus === "expired" ? "expired" : "pending",
      finalEstimateId: null,
    }))
  );

  // 5-2. estimates + groups + items
  const estimateRows: InferInsertModel<typeof estimates>[] = [];
  const groupRows: InferInsertModel<typeof estimateItemGroups>[] = [];
  const itemRows: InferInsertModel<typeof estimateItems>[] = [];

  for (const plan of seriesPlans) {
    for (const v of plan.versions) {
      estimateRows.push({
        id: v.id,
        clientId: plan.clientId,
        estimateNumber: plan.estimateNumber,
        title: plan.title,
        issuedDate: dateStr(v.issuedDate),
        validUntil: dateStr(v.validUntil),
        taxType: v.taxType,
        discountType: v.discountType,
        discountValue: String(v.discountValue),
        totalAmount: String(v.totals.total),
        discountAmount: String(v.totals.discountAmount),
        showTaxAmount: true,
        versionLabel: v.versionLabel,
        notes: v.notes,
        author: demoId,
        publisherInfo: PUBLISHER_INFO,
        version: v.version,
        createdAt: withRandomTime(v.issuedDate),
      });
      v.groups.forEach((g, gi) => {
        const groupId = randomUUID();
        groupRows.push({ id: groupId, estimateId: v.id, name: g.name, sortOrder: gi });
        g.items.forEach((it, ii) => {
          itemRows.push({
            id: randomUUID(),
            groupId,
            name: it.name,
            quantity: it.quantity,
            unit: it.unit,
            amount: String(it.amount),
            sortOrder: ii,
          });
        });
      });
    }
  }

  await insertChunked(estimates, estimateRows);
  await insertChunked(estimateItemGroups, groupRows);
  await insertChunked(estimateItems, itemRows);

  // 5-3. estimateSeries phase2: contracted 계열만 UPDATE
  const contractedPlans = seriesPlans.filter((p) => p.targetStatus === "contracted");
  for (const plan of contractedPlans) {
    const finalVersion = plan.versions[plan.versions.length - 1];
    await db
      .update(estimateSeries)
      .set({ status: "contracted", finalEstimateId: finalVersion.id })
      .where(eq(estimateSeries.estimateNumber, plan.estimateNumber));
  }

  console.log(
    `견적서 계열 ${seriesPlans.length}개(contracted ${contractedPlans.length}), 견적서 ${estimateRows.length}개, 그룹 ${groupRows.length}개, 항목 ${itemRows.length}개 삽입 완료.`
  );

  // ── 6. 프로젝트 40건 ──────────────────────────────────────

  const projectPlansFromEstimates: ProjectPlan[] = contractedPlans.map((plan) => {
    const finalVersion = plan.versions[plan.versions.length - 1];
    const contractDate = addDays(finalVersion.issuedDate, randInt(3, 14));
    const contractAmount =
      finalVersion.taxType === TAX_TYPE.VAT ? finalVersion.totals.afterDiscount : finalVersion.totals.total;
    return {
      id: randomUUID(),
      clientId: plan.clientId,
      estimateNumber: plan.estimateNumber,
      projectNumber: "",
      name: plan.title,
      status: PROJECT_STATUS.PENDING,
      workPhase: WORK_PHASE.PREPARING,
      contractDate,
      completedDate: null,
      deliveredDate: null,
      contractAmount,
      taxType: finalVersion.taxType,
    };
  });

  const independentPlans: ProjectPlan[] = Array.from({ length: 18 }).map(() => {
    const client = pick(clientPlans);
    const typeLabel = pick(TITLE_TYPES);
    return {
      id: randomUUID(),
      clientId: client.id,
      estimateNumber: null,
      projectNumber: "",
      name: `${client.companyName} ${typeLabel}`,
      status: PROJECT_STATUS.PENDING,
      workPhase: WORK_PHASE.PREPARING,
      contractDate: daysAgo(randInt(0, 365)),
      completedDate: null,
      deliveredDate: null,
      contractAmount: randomAmount(1500000, 30000000, 100000),
      taxType: chance(0.85) ? TAX_TYPE.VAT : TAX_TYPE.WITHHOLDING,
    };
  });

  const allProjects: ProjectPlan[] = [...projectPlansFromEstimates, ...independentPlans];

  // 상태 분포: 최근 계약일수록 active/pending, 오래될수록 completed 위주
  const sortedByDate = [...allProjects].sort((a, b) => a.contractDate.getTime() - b.contractDate.getTime());
  const n = sortedByDate.length;
  const recent12 = shuffle(sortedByDate.slice(n - 12));
  recent12.slice(0, 7).forEach((p) => (p.status = PROJECT_STATUS.ACTIVE));
  recent12.slice(7, 12).forEach((p) => (p.status = PROJECT_STATUS.PENDING));
  sortedByDate.slice(n - 16, n - 12).forEach((p) => (p.status = PROJECT_STATUS.SETTLING));
  const restShuffled = shuffle(sortedByDate.slice(0, n - 16));
  restShuffled.slice(0, 2).forEach((p) => (p.status = PROJECT_STATUS.DISCARDED));
  restShuffled.slice(2).forEach((p) => (p.status = PROJECT_STATUS.COMPLETED));

  for (const p of allProjects) {
    if (p.status === PROJECT_STATUS.COMPLETED) {
      p.workPhase = WORK_PHASE.DELIVERED;
      let completed = addDays(p.contractDate, randInt(30, 90));
      if (completed.getTime() > NOW.getTime()) completed = new Date(NOW);
      p.completedDate = completed;
      p.deliveredDate = completed;
    } else if (p.status === PROJECT_STATUS.SETTLING) {
      p.workPhase = WORK_PHASE.DELIVERED;
    } else if (p.status === PROJECT_STATUS.ACTIVE) {
      p.workPhase = pick([WORK_PHASE.WORKING, WORK_PHASE.REVIEWING]);
    } else {
      // pending, discarded
      p.workPhase = WORK_PHASE.PREPARING;
    }
    if (chance(0.3)) p.description = pick(PROJECT_DESCRIPTIONS);
    if (chance(0.3)) p.notes = pick(PROJECT_NOTES);
  }

  // 연도별 순번 부여 (contractDate 기준 정렬)
  const orderedForProjectNumbering = [...allProjects].sort(
    (a, b) => a.contractDate.getTime() - b.contractDate.getTime()
  );
  const projectYearCounters = new Map<number, number>();
  for (const p of orderedForProjectNumbering) {
    const year = p.contractDate.getFullYear();
    const next = (projectYearCounters.get(year) ?? 0) + 1;
    projectYearCounters.set(year, next);
    p.projectNumber = `PRJ-${year}-${String(next).padStart(3, "0")}`;
  }

  await insertChunked(
    projects,
    allProjects.map((p) => ({
      id: p.id,
      clientId: p.clientId,
      estimateNumber: p.estimateNumber,
      projectNumber: p.projectNumber,
      name: p.name,
      status: p.status,
      workPhase: p.workPhase,
      contractDate: dateStr(p.contractDate),
      completedDate: p.completedDate ? dateStr(p.completedDate) : null,
      deliveredDate: p.deliveredDate ? dateStr(p.deliveredDate) : null,
      description: p.description ?? null,
      notes: p.notes ?? null,
      contractAmount: String(p.contractAmount),
      taxType: p.taxType,
      author: randomAuthor(),
      createdAt: withRandomTime(p.contractDate),
    }))
  );

  console.log(`프로젝트 ${allProjects.length}개 삽입 완료.`);

  // ── 7. 계산서 · 수금 · 지출 · 파트너 지급 (pending/discarded 제외) ──

  const billableProjects = allProjects.filter(
    (p) => p.status !== PROJECT_STATUS.PENDING && p.status !== PROJECT_STATUS.DISCARDED
  );

  const invoicePlans: InvoicePlan[] = [];
  const collectionPlans: CollectionPlan[] = [];
  const expenseRows: InferInsertModel<typeof projectExpenses>[] = [];

  for (const p of billableProjects) {
    const start = p.contractDate;
    const end = p.completedDate ?? NOW;
    const fullyPaid = p.status === PROJECT_STATUS.COMPLETED ? chance(0.8) : false;
    const pattern = pick(INVOICE_PATTERNS);
    const dates = distributeDates(start, end, pattern.splits.length);

    if (p.taxType === TAX_TYPE.VAT) {
      const totalBilled = Math.round(p.contractAmount * 1.1);
      const amounts = splitAmounts(totalBilled, pattern.splits);
      const invIds: string[] = [];
      pattern.splits.forEach((_, idx) => {
        const invId = randomUUID();
        invIds.push(invId);
        invoicePlans.push({
          id: invId,
          projectId: p.id,
          paymentType: pattern.types[idx],
          description: pattern.descriptions[idx],
          amount: amounts[idx],
          issueDate: dates[idx],
        });
      });
      const collectCount = fullyPaid ? invIds.length : Math.max(0, invIds.length - 1);
      for (let idx = 0; idx < collectCount; idx++) {
        collectionPlans.push({
          id: randomUUID(),
          projectId: p.id,
          invoiceId: invIds[idx],
          amount: amounts[idx],
          paidDate: addDays(dates[idx], randInt(5, 30)),
          paymentType: pattern.types[idx],
          description: pattern.descriptions[idx],
        });
      }
    } else {
      const amounts = splitAmounts(p.contractAmount, pattern.splits);
      const collectCount = fullyPaid ? amounts.length : Math.max(0, amounts.length - 1);
      for (let idx = 0; idx < collectCount; idx++) {
        collectionPlans.push({
          id: randomUUID(),
          projectId: p.id,
          invoiceId: null,
          amount: amounts[idx],
          paidDate: addDays(dates[idx], randInt(5, 30)),
          paymentType: pattern.types[idx],
          description: pattern.descriptions[idx],
        });
      }
    }

    const expenseCount = randInt(0, 3);
    for (let i = 0; i < expenseCount; i++) {
      expenseRows.push({
        id: randomUUID(),
        projectId: p.id,
        description: pick(EXPENSE_DESCRIPTIONS),
        amount: String(randomAmount(30000, 400000, 10000)),
        expenseDate: dateStr(addDays(start, randInt(0, Math.max(1, diffDays(start, end))))),
      });
    }
  }

  // 최소 2건은 이번 달 또는 지난달 issueDate를 갖도록 보정 (정산 화면 표시용)
  const collectedInvoiceIds = new Set(collectionPlans.filter((c) => c.invoiceId).map((c) => c.invoiceId));
  const collectedInvoices = invoicePlans.filter((inv) => collectedInvoiceIds.has(inv.id));
  const recentCollectedCount = collectedInvoices.filter((inv) => isThisOrLastMonth(inv.issueDate)).length;
  if (recentCollectedCount < 2 && collectedInvoices.length > 0) {
    const need = 2 - recentCollectedCount;
    const targets = collectedInvoices.filter((inv) => !isThisOrLastMonth(inv.issueDate)).slice(0, need);
    for (const inv of targets) {
      const newIssueDate = daysAgo(randInt(0, 55));
      inv.issueDate = newIssueDate;
      const col = collectionPlans.find((c) => c.invoiceId === inv.id);
      if (col) col.paidDate = addDays(newIssueDate, randInt(5, 15));
    }
  }

  await insertChunked(
    projectInvoices,
    invoicePlans.map((inv) => ({
      id: inv.id,
      projectId: inv.projectId,
      paymentType: inv.paymentType,
      description: inv.description,
      amount: String(inv.amount),
      issueDate: dateStr(inv.issueDate),
    }))
  );
  await insertChunked(
    projectCollections,
    collectionPlans.map((c) => ({
      id: c.id,
      projectId: c.projectId,
      invoiceId: c.invoiceId,
      amount: String(c.amount),
      paidDate: dateStr(c.paidDate),
      paymentType: c.paymentType,
      description: c.description,
    }))
  );
  await insertChunked(projectExpenses, expenseRows);

  console.log(
    `계산서 ${invoicePlans.length}개, 수금 ${collectionPlans.length}개, 지출 ${expenseRows.length}개 삽입 완료.`
  );

  // 파트너 지급 (15건 내외 프로젝트에 1~2건씩)
  const partnerPaymentProjects = sampleUnique(billableProjects, Math.min(15, billableProjects.length));
  const partnerPaymentPlans: PartnerPaymentPlan[] = [];
  const projectPartnerAgg = new Map<string, Map<string, { roles: string[]; amount: number }>>();

  for (const p of partnerPaymentProjects) {
    const start = p.contractDate;
    const end = p.completedDate ?? NOW;
    const paymentCount = randInt(1, 2);
    for (let i = 0; i < paymentCount; i++) {
      const partner = pick(partnerPlans);
      const paidDate = addDays(start, randInt(0, Math.max(1, diffDays(start, end))));
      const ageDays = diffDays(paidDate, NOW);
      const reported = ageDays > 60 ? chance(0.85) : false;
      const amount = randomAmount(200000, 2000000, 50000);
      partnerPaymentPlans.push({
        id: randomUUID(),
        projectId: p.id,
        partnerId: partner.id,
        description: pick(PARTNER_PAYMENT_DESCRIPTIONS),
        amount,
        paidDate,
        withholdingReported: reported,
        withholdingReportedDate: reported ? addDays(paidDate, randInt(5, 20)) : null,
      });

      const projMap = projectPartnerAgg.get(p.id) ?? new Map<string, { roles: string[]; amount: number }>();
      const existing = projMap.get(partner.id) ?? {
        roles: sampleUnique(partner.specialties, randInt(1, partner.specialties.length)),
        amount: 0,
      };
      existing.amount += amount;
      projMap.set(partner.id, existing);
      projectPartnerAgg.set(p.id, projMap);
    }
  }

  // 최근 2개월 건 중 최소 3건은 미신고 상태로 유지
  const recentUnreportedCount = partnerPaymentPlans.filter(
    (r) => diffDays(r.paidDate, NOW) <= 60 && !r.withholdingReported
  ).length;
  if (recentUnreportedCount < 3) {
    let need = 3 - recentUnreportedCount;
    for (const r of partnerPaymentPlans) {
      if (need <= 0) break;
      if (diffDays(r.paidDate, NOW) > 60 || r.withholdingReported) {
        r.paidDate = daysAgo(randInt(1, 55));
        r.withholdingReported = false;
        r.withholdingReportedDate = null;
        need--;
      }
    }
  }

  await insertChunked(
    partnerPayments,
    partnerPaymentPlans.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      partnerId: r.partnerId,
      description: r.description,
      amount: String(r.amount),
      paidDate: dateStr(r.paidDate),
      taxType: TAX_TYPE.WITHHOLDING,
      withholdingReported: r.withholdingReported,
      withholdingReportedDate: r.withholdingReportedDate ? dateStr(r.withholdingReportedDate) : null,
    }))
  );

  const projectPartnerRows: InferInsertModel<typeof projectPartners>[] = [];
  for (const [projectId, partnerMap] of projectPartnerAgg.entries()) {
    for (const [partnerId, agg] of partnerMap.entries()) {
      projectPartnerRows.push({
        id: randomUUID(),
        projectId,
        partnerId,
        roles: agg.roles,
        amount: String(agg.amount),
        taxType: TAX_TYPE.WITHHOLDING,
      });
    }
  }
  await insertChunked(projectPartners, projectPartnerRows);

  console.log(
    `파트너 지급 ${partnerPaymentPlans.length}개, 프로젝트-파트너 배치 ${projectPartnerRows.length}개 삽입 완료.`
  );

  // 프로젝트 메모 (전체 40건 대상, 0~2개)
  const projectMemoRows: InferInsertModel<typeof projectMemos>[] = [];
  for (const p of allProjects) {
    const count = randInt(0, 2);
    const templates = sampleUnique(PROJECT_MEMO_TEMPLATES, count);
    for (const content of templates) {
      projectMemoRows.push({
        id: randomUUID(),
        parentId: p.id,
        content,
        author: randomAuthor(),
        createdAt: withRandomTime(addDays(p.contractDate, randInt(1, 30))),
      });
    }
  }
  await insertChunked(projectMemos, projectMemoRows);

  console.log(`프로젝트 메모 ${projectMemoRows.length}개 삽입 완료.`);

  // ── 8. 프로젝트 일정 (간트) ────────────────────────────────

  const completedProjects = allProjects.filter((p) => p.status === PROJECT_STATUS.COMPLETED);
  const recentCompleted5 = [...completedProjects]
    .sort((a, b) => (b.completedDate as Date).getTime() - (a.completedDate as Date).getTime())
    .slice(0, 5);
  const activeProjects = allProjects.filter((p) => p.status === PROJECT_STATUS.ACTIVE);
  const settlingProjects = allProjects.filter((p) => p.status === PROJECT_STATUS.SETTLING);
  const ganttProjects = [...activeProjects, ...settlingProjects, ...recentCompleted5];

  const lanePlans: LanePlan[] = [];
  const schedulePlans: SchedulePlan[] = [];

  for (const p of ganttProjects) {
    const start = p.contractDate;
    const end = p.completedDate ?? addDays(NOW, randInt(20, 50));
    const laneCount = randInt(2, 4);
    const laneTitles = LANE_TITLES.slice(0, laneCount);
    const totalSpan = Math.max(diffDays(start, end), laneCount * 6);

    const projectSchedulePlans: SchedulePlan[] = [];

    laneTitles.forEach((title, li) => {
      const laneId = randomUUID();
      lanePlans.push({ id: laneId, projectId: p.id, title, sortOrder: li });

      let segStart = addDays(start, Math.floor(((totalSpan * li) / laneCount) * 0.85));
      const segEndBound = addDays(start, Math.floor(((totalSpan * (li + 1)) / laneCount) * 1.05));
      const segEnd = segEndBound.getTime() > end.getTime() ? end : segEndBound;
      if (segStart.getTime() > segEnd.getTime()) segStart = segEnd;

      const barCount = randInt(1, 3);
      let cursor = segStart;
      for (let bi = 0; bi < barCount; bi++) {
        const duration = randInt(2, 10);
        const barStart = cursor;
        let barEnd = addDays(barStart, duration);
        if (barEnd.getTime() > segEnd.getTime()) barEnd = segEnd;
        if (barEnd.getTime() < barStart.getTime()) barEnd = barStart;

        let category: string;
        let categoryColor: string | null = null;
        if (chance(0.2)) {
          const custom = pick(CUSTOM_CATEGORY_POOL);
          category = custom.label;
          categoryColor = custom.color;
        } else {
          category = PRESET_CATEGORIES[Math.min(li, PRESET_CATEGORIES.length - 1)];
        }

        const bar: SchedulePlan = {
          id: randomUUID(),
          projectId: p.id,
          laneId,
          category,
          categoryColor,
          startDate: barStart,
          endDate: barEnd,
          sortOrder: bi,
        };
        schedulePlans.push(bar);
        projectSchedulePlans.push(bar);

        cursor = addDays(barEnd, randInt(0, 3));
      }
    });

    if (p.status === PROJECT_STATUS.ACTIVE) {
      const coversToday = projectSchedulePlans.some(
        (b) => b.startDate.getTime() <= NOW.getTime() && b.endDate.getTime() >= NOW.getTime()
      );
      if (!coversToday && projectSchedulePlans.length > 0) {
        const target = pick(projectSchedulePlans);
        target.startDate = addDays(NOW, -randInt(1, 10));
        target.endDate = addDays(NOW, randInt(1, 10));
      }
    }
  }

  // 대기중 프로젝트도 오버뷰(진행중 탭)에 노출되므로 기본 레인 + 준비 단계 바를 심는다
  const pendingProjects = allProjects.filter((p) => p.status === PROJECT_STATUS.PENDING);
  for (const p of pendingProjects) {
    const laneId = randomUUID();
    lanePlans.push({ id: laneId, projectId: p.id, title: "기획", sortOrder: 0 });
    if (chance(0.6)) {
      const barStart = addDays(NOW, randInt(2, 10));
      schedulePlans.push({
        id: randomUUID(),
        projectId: p.id,
        laneId,
        category: "planning",
        categoryColor: null,
        startDate: barStart,
        endDate: addDays(barStart, randInt(3, 8)),
        sortOrder: 0,
      });
    }
  }

  await insertChunked(
    projectScheduleLanes,
    lanePlans.map((l) => ({ id: l.id, projectId: l.projectId, title: l.title, sortOrder: l.sortOrder }))
  );
  await insertChunked(
    projectSchedules,
    schedulePlans.map((s) => ({
      id: s.id,
      projectId: s.projectId,
      laneId: s.laneId,
      category: s.category,
      categoryColor: s.categoryColor,
      startDate: dateStr(s.startDate),
      endDate: dateStr(s.endDate),
      sortOrder: s.sortOrder,
      author: demoId,
    }))
  );

  console.log(`간트 레인 ${lanePlans.length}개, 일정 바 ${schedulePlans.length}개 삽입 완료.`);

  // ── 9. 캘린더 일정 (40) ────────────────────────────────────

  const scheduleInsertRows: InferInsertModel<typeof schedules>[] = [];

  function buildSchedule(dateOverride?: Date) {
    const title = pick(SCHEDULE_TITLE_TEMPLATES)(pick(clientPlans).companyName);
    const startDate = dateOverride ?? daysAgo(randInt(-45, 60));
    const isAllDay = chance(0.7);
    const endDate = chance(0.15) ? addDays(startDate, randInt(1, 3)) : null;
    let startTime: string | null = null;
    let endTime: string | null = null;
    if (!isAllDay) {
      startTime = pick(TIME_SLOTS);
      const [h, m] = startTime.split(":").map(Number);
      endTime = `${String(h + randInt(1, 2)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    scheduleInsertRows.push({
      id: randomUUID(),
      title,
      description: null,
      startDate: dateStr(startDate),
      endDate: endDate ? dateStr(endDate) : null,
      startTime,
      endTime,
      color: pick(SCHEDULE_COLORS),
      recurrenceType: title === "월간 결산" ? "monthly" : "none",
      author: randomAuthor(),
      createdAt: withRandomTime(addDays(startDate, -randInt(1, 20))),
    });
  }

  // 오늘 2건 + 이번 주(오늘 제외) 1건 강제 보장
  buildSchedule(new Date(NOW));
  buildSchedule(new Date(NOW));
  const [weekStart, weekEnd] = weekBounds(NOW);
  let otherDay = addDays(NOW, chance(0.5) ? 1 : -1);
  if (otherDay.getTime() < weekStart.getTime() || otherDay.getTime() > weekEnd.getTime()) {
    otherDay = weekStart;
  }
  buildSchedule(otherDay);
  for (let i = 0; i < 37; i++) buildSchedule();

  await insertChunked(schedules, scheduleInsertRows);

  console.log(`캘린더 일정 ${scheduleInsertRows.length}개 삽입 완료.`);

  // ── 10. 할일 (30) + 타임블록 ────────────────────────────────

  const todoRows: InferInsertModel<typeof todos>[] = [];
  const todoDateForId = new Map<string, Date>();
  const sortOrderByDate = new Map<string, number>();

  function addTodo(date: Date) {
    const key = dateStr(date);
    const sortOrder = sortOrderByDate.get(key) ?? 0;
    sortOrderByDate.set(key, sortOrder + 1);
    const completed = isPastDate(date) ? chance(0.7) : false;
    const id = randomUUID();
    todoDateForId.set(id, date);
    todoRows.push({
      id,
      userId: demoId,
      content: pick(TODO_CONTENT_POOL),
      completed,
      todoDate: key,
      sortOrder,
      color: pick(TODO_COLORS),
    });
  }

  const todayCount = randInt(4, 6);
  for (let i = 0; i < todayCount; i++) addTodo(new Date(NOW));
  const otherOffsets = [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3];
  for (let i = 0; i < 30 - todayCount; i++) addTodo(addDays(NOW, pick(otherOffsets)));

  await insertChunked(todos, todoRows);

  const todayTodoIds = [...todoDateForId.entries()]
    .filter(([, d]) => dateStr(d) === dateStr(NOW))
    .map(([id]) => id);
  const blockCount = Math.min(randInt(3, 4), todayTodoIds.length);
  const chosenTodoIds = sampleUnique(todayTodoIds, blockCount);

  const timeBlockRows: InferInsertModel<typeof todoTimeBlocks>[] = chosenTodoIds.map((todoId) => ({
    id: randomUUID(),
    todoId,
    userId: demoId,
    blockDate: dateStr(NOW),
    startSlot: randInt(18, 36),
    durationSlots: randInt(2, 4),
  }));
  await insertChunked(todoTimeBlocks, timeBlockRows);

  console.log(`할일 ${todoRows.length}개, 타임블록 ${timeBlockRows.length}개 삽입 완료.`);

  // ── 11. 위젯 메모 (8) ───────────────────────────────────────

  await insertChunked(
    memos,
    WIDGET_MEMO_CONTENTS.map((content) => ({
      id: randomUUID(),
      userId: demoId,
      content,
      createdAt: withRandomTime(daysAgo(randInt(0, 30))),
    }))
  );

  console.log(`위젯 메모 ${WIDGET_MEMO_CONTENTS.length}개 삽입 완료.`);

  // ── 12. 고객환경정보 (8) ─────────────────────────────────────

  const envClients = sampleUnique(clientPlans, 8);
  await insertChunked(
    clientEnvironments,
    envClients.map((c) => {
      const kind = chance(0.5) ? "홈페이지" : "쇼핑몰";
      return {
        id: randomUUID(),
        customerName: c.companyName,
        name: `${c.companyName} ${kind}`,
        hosting: { provider: pick(HOSTING_PROVIDERS), username: `${c.slug}admin`, password: fakePassword() },
        domain: { registrar: pick(REGISTRARS), username: `${c.slug}dom`, password: fakePassword() },
        remoteAccess: chance(0.5)
          ? { host: `203.0.113.${randInt(1, 254)}`, port: 22, username: "deploy", password: fakePassword() }
          : null,
        customFields: chance(0.5)
          ? [
              {
                category: "CMS",
                items: [
                  { label: "관리자 URL", value: `https://${randInt(1000, 9999)}.example/admin` },
                  { label: "계정", value: "admin01" },
                ],
              },
            ]
          : null,
        notes: chance(0.5) ? pick(ENV_NOTES) : null,
        author: demoId,
        createdAt: withRandomTime(daysAgo(randInt(30, 300))),
      };
    })
  );

  console.log(`고객환경정보 ${envClients.length}개 삽입 완료.`);

  // ── 13. 드라이브 파일 ────────────────────────────────────────

  const FOLDER_NAMES = ["계약서", "견적서 사본", "디자인 시안", "참고자료"];
  const folderIds = FOLDER_NAMES.map(() => randomUUID());

  await insertChunked(
    files,
    FOLDER_NAMES.map((name, i) => ({
      id: folderIds[i],
      name,
      s3Key: null,
      mimeType: null,
      size: null,
      folderId: null,
      isFolder: true,
      author: demoId,
      isFavorited: i === 2,
      favoriteOrder: i === 2 ? 1 : null,
      ownerType: "drive",
      ownerId: null,
    }))
  );

  const TXT_SAMPLES = [
    "제1조 (목적)\n본 계약은 웹사이트 제작 용역에 관한 사항을 정함을 목적으로 한다.\n제2조 (계약금액)\n계약금액은 별도 견적서에 따른다.",
    "납품 체크리스트\n- 반응형 확인\n- 크로스 브라우저 테스트\n- 관리자 계정 전달\n- 도메인 연결 확인",
    "회의록 요약\n- 메인 배너 문구 확정\n- 서브페이지 3종 추가 요청\n- 다음 미팅 일정 조율 필요",
  ];
  const CSV_SAMPLE =
    "프로젝트,상태,금액\n그린랩스토어 홈페이지 구축,completed,4500000\n메이플제과 랜딩페이지 제작,active,2200000\n한빛출판미디어 브랜드 사이트 구축,settling,6800000\n";
  const JSON_SAMPLE = JSON.stringify({ project: "참고 데이터", tags: ["데모", "샘플"], amount: 1200000 }, null, 2);
  const PNG_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const MIN_PDF = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Resources<<>>>>endobj",
    "trailer<</Size 4/Root 1 0 R>>",
    "%%EOF",
  ].join("\n");

  const filePlans: { name: string; ext: string; mime: string; buffer: Buffer; folderIndex: number }[] = [
    { name: "표준 용역계약서 조항 요약.txt", ext: "txt", mime: "text/plain", buffer: Buffer.from(TXT_SAMPLES[0], "utf-8"), folderIndex: 0 },
    { name: "계약서 최종본.pdf", ext: "pdf", mime: "application/pdf", buffer: Buffer.from(MIN_PDF, "utf-8"), folderIndex: 0 },
    { name: "웨이브웍스 견적서 사본.pdf", ext: "pdf", mime: "application/pdf", buffer: Buffer.from(MIN_PDF, "utf-8"), folderIndex: 1 },
    { name: "메인 배너 시안.png", ext: "png", mime: "image/png", buffer: Buffer.from(PNG_BASE64, "base64"), folderIndex: 2 },
    { name: "서브페이지 시안.png", ext: "png", mime: "image/png", buffer: Buffer.from(PNG_BASE64, "base64"), folderIndex: 2 },
    { name: "납품 체크리스트.txt", ext: "txt", mime: "text/plain", buffer: Buffer.from(TXT_SAMPLES[1], "utf-8"), folderIndex: 3 },
    { name: "회의록 요약.txt", ext: "txt", mime: "text/plain", buffer: Buffer.from(TXT_SAMPLES[2], "utf-8"), folderIndex: 3 },
    { name: "프로젝트 현황.csv", ext: "csv", mime: "text/csv", buffer: Buffer.from(CSV_SAMPLE, "utf-8"), folderIndex: 3 },
    { name: "참고 데이터.json", ext: "json", mime: "application/json", buffer: Buffer.from(JSON_SAMPLE, "utf-8"), folderIndex: 3 },
  ];

  const fileInsertRows: InferInsertModel<typeof files>[] = [];
  for (const [idx, f] of filePlans.entries()) {
    const key = `files/${randomUUID()}.${f.ext}`;
    await uploadFile(key, f.buffer, f.mime);
    fileInsertRows.push({
      id: randomUUID(),
      name: f.name,
      s3Key: key,
      mimeType: f.mime,
      size: f.buffer.length,
      folderId: folderIds[f.folderIndex],
      isFolder: false,
      author: demoId,
      isFavorited: idx === 0,
      favoriteOrder: idx === 0 ? 2 : null,
      ownerType: "drive",
      ownerId: null,
    });
  }
  await insertChunked(files, fileInsertRows);

  console.log(`드라이브 폴더 ${FOLDER_NAMES.length}개, 파일 ${fileInsertRows.length}개 삽입 완료.`);

  // ── 요약 ─────────────────────────────────────────────────

  console.log("\n데모 시딩 완료!");
  console.log(`  - 클라이언트: ${clientPlans.length}개 (메모 ${clientMemoRows.length}개)`);
  console.log(`  - 파트너: ${partnerPlans.length}개 (메모 ${partnerMemoRows.length}개)`);
  console.log(`  - 견적서 계열: ${seriesPlans.length}개 (견적서 ${estimateRows.length}개)`);
  console.log(`  - 프로젝트: ${allProjects.length}개 (메모 ${projectMemoRows.length}개)`);
  console.log(`  - 계산서/수금/지출: ${invoicePlans.length}/${collectionPlans.length}/${expenseRows.length}개`);
  console.log(`  - 파트너 지급: ${partnerPaymentPlans.length}개`);
  console.log(`  - 간트 레인/바: ${lanePlans.length}/${schedulePlans.length}개`);
  console.log(`  - 캘린더 일정: ${scheduleInsertRows.length}개`);
  console.log(`  - 할일/타임블록: ${todoRows.length}/${timeBlockRows.length}개`);
  console.log(`  - 위젯 메모: ${WIDGET_MEMO_CONTENTS.length}개`);
  console.log(`  - 고객환경정보: ${envClients.length}개`);
  console.log(`  - 드라이브: 폴더 ${FOLDER_NAMES.length}개, 파일 ${fileInsertRows.length}개`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("데모 시딩 실패:", err);
  process.exit(1);
});
