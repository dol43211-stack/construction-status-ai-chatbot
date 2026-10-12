// 개인정보 가림 (DESIGN.md 7.1)
// - 주민등록번호, 전화번호, 계좌번호를 찾아 일부를 *로 바꾼다.
// - 적용 시점: 문서 저장 전(→ AI에도 가린 글자만 감), 보고서 초안 저장 전, 챗봇 답변 표시 전
// - 사업자등록번호(000-00-00000)는 개인정보가 아니므로 가리지 않는다.
// - 번호 사이 구분은 하이픈(-)·띄어쓰기·점(.)·없음 모두 알아보고, 지역번호 괄호와 전각 숫자(０-９)도 처리한다. (CHECK.md 1번)
// - 서버·화면 어디서든 쓸 수 있도록 비밀 값이나 서버 전용 기능을 쓰지 않는 순수 함수로 만든다.

/** 숫자만 *로 바꾸고 하이픈·띄어쓰기·점 등은 그대로 둔다 */
const starDigits = (s: string) => s.replace(/\d/g, "*");

/**
 * "독립된 숫자 덩어리"만 찾기 위한 경계
 * - 앞뒤가 숫자·*·하이픈에 붙어 있으면 안 된다.
 * - "2026.09.1234"처럼 점으로 이어진 숫자의 중간부터 잡지 않도록, 앞이 "숫자." 이거나 뒤가 ".숫자"여도 안 된다.
 */
const B_START = "(?<![\\d*-]|\\d\\.)";
const B_END = "(?![\\d*-]|\\.\\d)";

/** 번호 사이 구분 글자 한 개: 하이픈, 띄어쓰기, 점 */
const SEP = "[-. ]";

/** 전각 숫자(０-９)와 전각 하이픈(－)을 보통 글자로 바꾼다 (같은 규칙으로 가리기 위해) */
function toHalfWidth(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/－/g, "-");
}

/** 주민등록번호 앞 6자리가 실제 날짜 모양(YYMMDD)인지 */
function isBirthDate(yymmdd: string): boolean {
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

// 1) 주민등록번호: 900101-1234567 / 900101 1234567 / 9001011234567 → 900101-1****** 등
const RRN = new RegExp(`${B_START}(\\d{6})(${SEP}?)([1-8])(\\d{6})${B_END}`, "g");

// 2) 전화번호: 휴대폰(010 등)과 지역번호(02, 031 등) → 가운데 자리를 가림 (010-****-5678)
const AREA = "01[016789]|02|0[3-6][1-5]|070";
//    2-1) 구분이 같은 글자로 반복될 때: 010-1234-5678, 010 1234 5678, 010.1234.5678, 01012345678
const PHONE = new RegExp(`${B_START}(${AREA})(${SEP}?)(\\d{3,4})\\2(\\d{4})${B_END}`, "g");
//    2-2) 지역번호에 괄호: (02)123-4567, (02) 123-4567, (031)1234-5678
const PHONE_PAREN = new RegExp(`\\((${AREA})\\)( ?)(\\d{3,4})(${SEP}?)(\\d{4})${B_END}`, "g");

// 3) 계좌번호 → 앞 3자리만 남기고 가림 (110-***-******)
//    3-1) 하이픈이 섞인 숫자 덩어리(숫자 10~14개) 또는 하이픈 없는 숫자 10~14자리
//         단, 금액(뒤에 "원")과 사업자등록번호(3-2-5 모양)는 제외
const ACCOUNT = new RegExp(`${B_START}\\d+(?:-\\d+){0,4}${B_END}`, "g");
const BIZ_NO = /^\d{3}-\d{2}-\d{5}$/;
//    3-2) 띄어쓰기·점으로 나눈 계좌번호(110 123 456789). 표의 숫자·날짜와 헷갈리지 않도록
//         바로 앞(30자 이내)에 은행·계좌를 뜻하는 말이 있을 때만 가린다.
const ACCOUNT_SPACED = new RegExp(`${B_START}\\d{2,6}([. ])\\d{2,8}(?:\\1\\d{1,8}){0,3}${B_END}`, "g");
const BANK_WORDS = /(계좌|은행|뱅크|농협|수협|신협|금고|우체국|입금|예금주)/;

function countDigits(s: string): number {
  return s.replace(/\D/g, "").length;
}

function maskAccount(match: string, offset: number, text: string): string {
  const digitCount = countDigits(match);
  if (digitCount < 10 || digitCount > 14) return match; // 날짜·문서번호·짧은 숫자는 그대로
  if (BIZ_NO.test(match)) return match; // 사업자등록번호는 그대로
  if (/^\s*원/.test(text.slice(offset + match.length))) return match; // 금액은 그대로
  return match.slice(0, 3) + starDigits(match.slice(3));
}

function maskSpacedAccount(match: string, _sep: string, offset: number, text: string): string {
  if (!BANK_WORDS.test(text.slice(Math.max(0, offset - 30), offset))) return match; // 은행·계좌 말이 없으면 그대로
  return maskAccount(match, offset, text);
}

/**
 * 글 안의 주민등록번호·전화번호·계좌번호를 가린다.
 * 여러 번 적용해도 결과가 같다. (이미 가린 부분은 다시 건드리지 않음)
 */
export function maskPersonalInfo(text: string): string {
  return toHalfWidth(text)
    .replace(RRN, (match, front: string, sep: string, gender: string) =>
      isBirthDate(front) ? `${front}${sep}${gender}******` : match,
    )
    .replace(
      PHONE,
      (_m, area: string, sep: string, mid: string, last: string) =>
        `${area}${sep}${starDigits(mid)}${sep}${last}`,
    )
    .replace(
      PHONE_PAREN,
      (_m, area: string, space: string, mid: string, sep: string, last: string) =>
        `(${area})${space}${starDigits(mid)}${sep}${last}`,
    )
    .replace(ACCOUNT, maskAccount)
    .replace(ACCOUNT_SPACED, maskSpacedAccount);
}
