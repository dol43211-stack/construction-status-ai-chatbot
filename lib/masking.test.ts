// 개인정보 가림 시험 (실행: npm test)
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROJECTS } from "../samples/sample-data.mjs";
import { maskPersonalInfo as mask } from "./masking.ts";

describe("주민등록번호", () => {
  it("하이픈 있는 번호는 뒷자리 첫 숫자만 남긴다", () => {
    assert.equal(mask("900101-1234567"), "900101-1******");
  });
  it("하이픈 없는 번호도 가린다", () => {
    assert.equal(mask("9001012234567"), "9001012******");
  });
  it("앞 6자리가 날짜 모양이 아니면 주민번호로 보지 않는다 (대신 계좌번호 규칙이 가림)", () => {
    assert.equal(mask("3333012345678"), "333**********");
  });
});

describe("전화번호", () => {
  it("휴대폰 번호의 가운데를 가린다", () => {
    assert.equal(mask("연락처 010-1234-5678"), "연락처 010-****-5678");
  });
  it("하이픈 없는 휴대폰 번호도 가린다", () => {
    assert.equal(mask("01012345678"), "010****5678");
  });
  it("서울(02)·지역번호도 가린다", () => {
    assert.equal(mask("02-123-4567"), "02-***-4567");
    assert.equal(mask("031-1234-5678"), "031-****-5678");
  });
});

describe("계좌번호", () => {
  it("하이픈 있는 계좌번호는 앞 3자리만 남긴다", () => {
    assert.equal(mask("국민은행 110-123-456789"), "국민은행 110-***-******");
  });
  it("하이픈 없는 계좌번호도 가린다", () => {
    assert.equal(mask("카카오뱅크 3333012345678"), "카카오뱅크 333**********");
  });
});

describe("가리면 안 되는 것", () => {
  it("사업자등록번호", () => {
    assert.equal(mask("사업자등록번호 123-45-67890"), "사업자등록번호 123-45-67890");
  });
  it("쉼표 있는 금액과 쉼표 없는 금액", () => {
    assert.equal(mask("1,380,000,000원"), "1,380,000,000원");
    assert.equal(mask("18500000000원"), "18500000000원");
    assert.equal(mask("18500000000 원"), "18500000000 원");
  });
  it("날짜·기간·문서번호·공정률", () => {
    const text = "2026-09-01 ~ 2026-09-30, 2025.11.03, 감독-2026-038, 실적 42.5%, 156명";
    assert.equal(mask(text), text);
  });
});

describe("여러 번 적용해도 같은 결과", () => {
  it("이미 가린 글자는 다시 건드리지 않는다", () => {
    const once = mask("900101-1234567 / 010-1234-5678 / 110-123-456789");
    assert.equal(mask(once), once);
  });
});

describe("샘플 문서(한빛청사 9월 업체 월간보고서)", () => {
  const hanbit = PROJECTS.find((p) => p.key === "hanbit");
  assert.ok(hanbit);
  const personal = hanbit.months["2026-09"].personal;
  assert.ok(personal);
  const [victim, accounts] = personal;

  it("재해자 줄: 주민번호·연락처를 가린다", () => {
    assert.equal(
      mask(victim),
      "재해자: 근로자 A (주민등록번호 900101-1******, 연락처 010-****-5678)",
    );
  });
  it("계좌 줄: 하이픈 있는/없는 계좌를 모두 가린다", () => {
    assert.equal(
      mask(accounts),
      "노임 지급 계좌: 근로자 B 국민은행 110-***-******, 근로자 C 카카오뱅크 333**********",
    );
  });
  it("모든 공사의 사업자등록번호는 그대로 남는다", () => {
    for (const p of PROJECTS) assert.equal(mask(p.bizNo), p.bizNo);
  });
});
