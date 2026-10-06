// 개인정보 가림 (DESIGN.md 7.1)
// - 주민등록번호, 전화번호, 계좌번호를 찾아 일부를 *로 바꾼다.
// - 적용 시점: 문서 저장 전(→ AI에도 가린 글자만 감), 보고서 초안 저장 전, 챗봇 답변 표시 전
// - 사업자등록번호(000-00-00000)는 개인정보가 아니므로 가리지 않는다.
// - 서버·화면 어디서든 쓸 수 있도록 비밀 값이나 서버 전용 기능을 쓰지 않는 순수 함수로 만든다.

/** 숫자만 *로 바꾸고 하이픈 등은 그대로 둔다 */
const starDigits = (s: string) => s.replace(/\d/g, "*");

/** 앞뒤가 숫자·하이픈·*에 붙어 있지 않은 "독립된 숫자 덩어리"만 찾기 위한 경계 */
const B_START = "(?<![\\d*-])";
const B_END = "(?![\\d*-])";

/** 주민등록번호 앞 6자리가 실제 날짜 모양(YYMMDD)인지 */
function isBirthDate(yymmdd: string): boolean {
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

// 1) 주민등록번호: 900101-1234567 / 9001011234567 → 900101-1****** / 9001011******
const RRN = new RegExp(`${B_START}(\\d{6})(-?)([1-8])(\\d{6})${B_END}`, "g");

// 2) 전화번호: 휴대폰(010 등)과 지역번호(02, 031 등) → 가운데 자리를 가림 (010-****-5678)
const PHONE = new RegExp(
  `${B_START}(01[016789]|02|0[3-6][1-5]|070)(-?)(\\d{3,4})(-?)(\\d{4})${B_END}`,
  "g",
);

// 3) 계좌번호: 하이픈이 섞인 숫자 덩어리(숫자 10~14개) 또는 하이픈 없는 숫자 10~14자리
//    → 앞 3자리만 남기고 가림 (110-***-******)
//    단, 금액(뒤에 "원")과 사업자등록번호(3-2-5 모양)는 제외
const ACCOUNT = new RegExp(`${B_START}\\d+(?:-\\d+){0,4}${B_END}`, "g");
const BIZ_NO = /^\d{3}-\d{2}-\d{5}$/;

function maskAccount(match: string, offset: number, text: string): string {
  const digitCount = match.replace(/-/g, "").length;
  if (digitCount < 10 || digitCount > 14) return match; // 날짜·문서번호·짧은 숫자는 그대로
  if (BIZ_NO.test(match)) return match; // 사업자등록번호는 그대로
  if (/^\s*원/.test(text.slice(offset + match.length))) return match; // 금액은 그대로
  return match.slice(0, 3) + starDigits(match.slice(3));
}

/**
 * 글 안의 주민등록번호·전화번호·계좌번호를 가린다.
 * 여러 번 적용해도 결과가 같다. (이미 가린 부분은 다시 건드리지 않음)
 */
export function maskPersonalInfo(text: string): string {
  return text
    .replace(RRN, (match, front: string, dash: string, gender: string) =>
      isBirthDate(front) ? `${front}${dash}${gender}******` : match,
    )
    .replace(
      PHONE,
      (_m, area: string, d1: string, mid: string, d2: string, last: string) =>
        `${area}${d1}${starDigits(mid)}${d2}${last}`,
    )
    .replace(ACCOUNT, maskAccount);
}
