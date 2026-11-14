// 공개 전용 빌드 스크립트 (허용 목록 방식)
// dist/ 에는 아래 PUBLIC_FILES에 명시한 파일과 images/ 폴더의 이미지 파일만 복사한다.
// .git, .kiro, docs, 개인 기록 등은 절대 포함하지 않는다.
import { mkdir, copyFile, rm, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

// 공개할 파일만 여기에 추가한다 (허용 목록)
const PUBLIC_FILES = ["index.html", "game.html"];

// images/ 에서는 아래 확장자의 이미지 파일만 공개한다 (하위 폴더와 그 밖의 파일은 건너뜀).
// 파일 이름은 영문 소문자, 숫자, -, _ 만 허용한다. Vercel 서버는 대소문자를 구분해서
// Windows에서만 열리는 이름(예: Konnect-1.PNG)을 배포 전에 막기 위해서다.
const IMAGE_DIR = "images";
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;
const SAFE_IMAGE_NAME = /^[a-z0-9][a-z0-9_-]*\.(png|jpe?g|webp|gif|avif)$/;

async function copyImages() {
  const copied = new Set();
  const dir = join(root, IMAGE_DIR);
  if (!existsSync(dir)) return copied;

  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (!entry.isFile() || !IMAGE_EXT.test(name)) {
      console.log(`skipped: ${IMAGE_DIR}/${name} (공개 이미지 아님)`);
      continue;
    }
    if (!SAFE_IMAGE_NAME.test(name)) {
      throw new Error(`이미지 파일 이름은 영문 소문자, 숫자, -, _ 만 써 주세요: ${IMAGE_DIR}/${name}`);
    }
    await mkdir(join(dist, IMAGE_DIR), { recursive: true });
    await copyFile(join(dir, name), join(dist, IMAGE_DIR, name));
    copied.add(name);
    console.log(`copied: ${IMAGE_DIR}/${name}`);
  }
  return copied;
}

// 공개 HTML이 가리키는 images/ 파일이 실제로 복사됐는지 확인한다. HTML 주석 안의 예시는 제외한다.
async function checkImageRefs(copied) {
  const ref = /(?:src|href)\s*=\s*["'](?:\.?\/)?images\/([^"'?#]+)/gi;
  for (const rel of PUBLIC_FILES) {
    const html = (await readFile(join(root, rel), "utf8")).replace(/<!--[\s\S]*?-->/g, "");
    for (const m of html.matchAll(ref)) {
      if (!copied.has(m[1])) {
        throw new Error(`${rel}에 적힌 이미지가 ${IMAGE_DIR} 폴더에 없음 (이름·대소문자 확인): ${IMAGE_DIR}/${m[1]}`);
      }
    }
  }
}

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

  const images = await copyImages();
  await checkImageRefs(images);

  console.log(`\n빌드 완료 → ${dist}`);
}

main().catch((err) => {
  console.error("빌드 실패:", err.message);
  process.exit(1);
});
