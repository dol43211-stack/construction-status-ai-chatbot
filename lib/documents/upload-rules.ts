// 문서 올리기 규칙 (PRD 6 범위, DESIGN.md 4.2·6.3)
// 화면(올리기 전 미리 검사)과 서버(받은 뒤 다시 검사)가 같은 규칙을 쓰도록 한곳에 모은다.
// 비밀 값을 다루지 않으므로 서버·화면 어디서든 불러올 수 있다.

export type FileType = "pdf" | "hwpx" | "xlsx";

/** 파일 1개 최대 크기: 4MB */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** 한 번에 올릴 수 있는 파일 수 */
export const MAX_FILES = 10;

/** 파일 고르기 창에서 보여줄 형식 */
export const ACCEPT = ".pdf,.hwpx,.xlsx";

export const UPLOAD_MESSAGES = {
  wrongType: "PDF·.hwpx·.xlsx 파일만 올릴 수 있습니다.",
  // 옛 한글 형식은 형식 오류 대신 다시 저장하라고 안내한다 (PRD 예외 상황 1번)
  oldHwp: "옛 한글(.hwp) 파일은 읽을 수 없습니다. 한글에서 .hwpx나 PDF로 다시 저장해 올려주세요.",
  tooBig: "파일 1개는 4MB 이하만 올릴 수 있습니다.",
  tooMany: `한 번에 ${MAX_FILES}개까지만 올릴 수 있습니다.`,
  empty: "빈 파일은 올릴 수 없습니다.",
  // 확장자만 바꾼 파일 (예: 그림 파일 이름을 .pdf로 바꾼 경우)
  fakeType: "파일 내용이 확장자와 다릅니다. 원래 형식으로 저장된 파일을 올려주세요.",
  // 같은 내용의 파일 (PRD 예외 상황 2번). 파일 이름이 달라도 내용이 같으면 같은 문서로 본다.
  duplicate: "이미 올라온 문서입니다.",
  // 글자를 꺼낼 수 없는 파일 (PRD 예외 상황 1번, DESIGN.md 6.3)
  unreadable: "이 파일은 글자를 읽을 수 없습니다. PDF(글자 복사 가능)·.hwpx·.xlsx로 다시 저장해 올려주세요.",
  encrypted: "암호가 걸린 파일은 읽을 수 없습니다. 암호를 풀고 다시 저장해 올려주세요.",
  // 암호 걸린 엑셀과 옛 엑셀(.xls)은 둘 다 "복합 문서" 형식이라 겉으로 구별할 수 없다
  lockedOrOldXlsx: "암호가 걸린 엑셀이거나 옛 엑셀(.xls) 파일입니다. 암호를 풀고 .xlsx로 다시 저장해 올려주세요.",
} as const;

/** 글자를 이만큼도 꺼내지 못하면 "읽을 수 없는 파일"로 본다 (공백 제외 글자 수, 설계 검토 I-8) */
export const MIN_READABLE_CHARS = 50;

/** 중복 안내 문구. 먼저 올라온 파일의 이름을 알면 함께 알려준다. */
export function duplicateMessage(existingFileName?: string): string {
  return existingFileName
    ? `${UPLOAD_MESSAGES.duplicate} (먼저 올린 파일: ${existingFileName})`
    : UPLOAD_MESSAGES.duplicate;
}

/** 파일 이름의 확장자로 형식을 알아낸다. 허용하지 않는 형식이면 null */
export function fileTypeOf(fileName: string): FileType | null {
  const ext = fileName.toLowerCase().split(".").pop();
  return ext === "pdf" || ext === "hwpx" || ext === "xlsx" ? ext : null;
}

/** 파일 이름과 크기만으로 할 수 있는 검사. 문제가 있으면 안내 문구, 없으면 null */
export function checkFile(fileName: string, size: number): string | null {
  if (fileName.toLowerCase().endsWith(".hwp")) return UPLOAD_MESSAGES.oldHwp;
  if (!fileTypeOf(fileName)) return UPLOAD_MESSAGES.wrongType;
  if (size === 0) return UPLOAD_MESSAGES.empty;
  if (size > MAX_FILE_BYTES) return UPLOAD_MESSAGES.tooBig;
  return null;
}

/**
 * 파일 앞부분(서명)이 확장자와 맞는지 확인한다.
 * PDF는 "%PDF"로, .hwpx·.xlsx는 압축 파일이라 "PK"로 시작한다.
 */
export function matchesSignature(type: FileType, head: Uint8Array): boolean {
  const startsWith = (sig: number[]) => sig.every((b, i) => head[i] === b);
  if (type === "pdf") return startsWith([0x25, 0x50, 0x44, 0x46]); // %PDF
  return startsWith([0x50, 0x4b, 0x03, 0x04]); // PK.. (zip)
}

/**
 * 서명이 맞지 않을 때, 무엇 때문인지 더 친절한 안내를 고른다.
 * 암호 걸린 엑셀, 옛 엑셀(.xls), 옛 한글(.hwp)은 모두 "복합 문서"(D0 CF 11 E0)로 시작한다.
 */
export function signatureMismatchMessage(type: FileType, head: Uint8Array): string {
  const compound = [0xd0, 0xcf, 0x11, 0xe0].every((b, i) => head[i] === b);
  if (compound && type === "xlsx") return UPLOAD_MESSAGES.lockedOrOldXlsx;
  if (compound && type === "hwpx") return UPLOAD_MESSAGES.oldHwp; // .hwp 파일 이름만 .hwpx로 바꾼 경우
  return UPLOAD_MESSAGES.fakeType;
}

/** 꺼낸 글자가 충분한지 (스캔본처럼 글자가 거의 없으면 false) */
export function isReadableText(text: string): boolean {
  return text.replace(/\s/g, "").length >= MIN_READABLE_CHARS;
}
