// 공개 전용 빌드 스크립트 (허용 목록 방식)
// dist/ 에는 아래 PUBLIC_FILES에 명시한 파일만 복사한다.
// .git, .kiro, docs, 개인 기록 등은 절대 포함하지 않는다.
import { mkdir, copyFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

// 공개할 파일만 여기에 추가한다 (허용 목록)
const PUBLIC_FILES = ["index.html", "game.html"];

async function main() {
  // dist 초기화
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const rel of PUBLIC_FILES) {
    const src = join(root, rel);
    if (!existsSync(src)) {
      throw new Error(`공개 파일을 찾을 수 없음: ${rel}`);
    }
    const dest = join(dist, rel);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
    console.log(`copied: ${rel}`);
  }

  console.log(`\n빌드 완료 → ${dist}`);
}

main().catch((err) => {
  console.error("빌드 실패:", err.message);
  process.exit(1);
});
