// 화면 쪽 기다림 한도 시험 (실행: npm test)
// 작은 시험용 서버를 잠깐 띄워서 정상·오류·지연 응답을 흉내 낸다.
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { AI_RETRY_MESSAGE } from "./ai/errors.ts";
import { fetchWithTimeout } from "./fetch-with-timeout.ts";

let server: Server;
let base = "";

before(async () => {
  server = createServer((req, res) => {
    const send = (status: number, body: string) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(body);
    };
    if (req.url === "/ok") return send(200, JSON.stringify({ answer: "공정률 42.5%" }));
    if (req.url === "/known-error") return send(400, JSON.stringify({ error: "선택한 기간에 해당하는 문서가 없습니다." }));
    if (req.url === "/broken") return send(500, "<html>서버 오류</html>");
    if (req.url === "/slow") return void setTimeout(() => send(200, "{}"), 1000);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

describe("fetchWithTimeout", () => {
  it("정상 응답은 data로 돌려준다", async () => {
    assert.deepEqual(await fetchWithTimeout(`${base}/ok`), { ok: true, data: { answer: "공정률 42.5%" } });
  });

  it("서버가 보낸 안내 문구가 있으면 그대로 보여준다", async () => {
    assert.deepEqual(await fetchWithTimeout(`${base}/known-error`), {
      ok: false,
      message: "선택한 기간에 해당하는 문서가 없습니다.",
    });
  });

  it("알아볼 수 없는 오류 응답은 기본 안내 문구로 바꾼다", async () => {
    assert.deepEqual(await fetchWithTimeout(`${base}/broken`), { ok: false, message: AI_RETRY_MESSAGE });
  });

  it("한도 시간이 지나면 기다리기를 멈추고 안내 문구를 돌려준다", async () => {
    const started = Date.now();
    const result = await fetchWithTimeout(`${base}/slow`, {}, 100);
    assert.deepEqual(result, { ok: false, message: AI_RETRY_MESSAGE });
    assert.ok(Date.now() - started < 900, "1초짜리 응답을 끝까지 기다리면 안 된다");
  });

  it("서버에 연결할 수 없을 때도 안내 문구를 돌려준다", async () => {
    assert.deepEqual(await fetchWithTimeout("http://127.0.0.1:1/none"), { ok: false, message: AI_RETRY_MESSAGE });
  });
});
