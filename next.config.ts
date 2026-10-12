import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * 이 PC의 내부 네트워크 주소들 (예: 172.30.1.45)
 * 같은 와이파이의 휴대폰에서 http://<이 주소>:3001 로 개발 서버를 열 때, 버튼·챗봇 같은 동작이 막히지 않게 허용한다.
 * 와이파이가 바뀌어 주소가 달라져도 개발 서버를 다시 켜면 자동으로 따라간다.
 * (개발 서버에서만 쓰이는 설정이며, Vercel에 배포한 앱에는 영향이 없다)
 */
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
};

export default nextConfig;
