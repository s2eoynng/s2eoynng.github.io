# 기능 명세: 팀원 한마디 (방명록)

상태: 계획 단계 (미구현)
관련 프로젝트 기록: Notion "임서영_홈페이지 프로젝트 기록" (기한 11/11)

## 1. 결정 사항

| 항목 | 결정 | 이유 |
|---|---|---|
| 기능 | A. 팀원 한마디 | `index.html`의 "첫 회의 때 서로 나눠요" 섹션에 자연스럽게 붙고, 가장 작은 완성 버전임 |
| 데이터 저장 | Supabase (Postgres + RLS) | 필수 구성. 브라우저에서 직접 호출하므로 서버 함수가 필요 없음 |
| 배포 | Vercel | 선택됨. 정적 사이트라 서버 함수 없이 배포 |
| 로그인 | 사용하지 않음 | 범위를 작게 유지. 대신 승인제와 RLS로 접근을 제한함 |
| 기존 배포 | GitHub Pages(`main`, `/`) 유지 | 함부로 지우지 않음 |

## 2. 화면

위치: `index.html`, "FIRST MEETING" 섹션 아래 새 섹션.

- 입력란
  - 이름: 1~20자
  - 한마디: 1~200자
  - 허니팟: 사람 눈에 보이지 않는 입력란. 값이 있으면 전송하지 않음
- 버튼: "남기기"
- 결과: 승인된 최근 글 20개(이름, 내용, 날짜), 최신순
- 빈 상태: "아직 남긴 글이 없어요"
- 로딩 상태: "불러오는 중"

기존 디자인(파스텔 색 변수, `--font-display`, `--font-body`, 다크 모드)을 그대로 따른다.

## 3. 저장 항목

테이블 `public.messages`

| 열 | 형식 | 규칙 |
|---|---|---|
| `id` | bigint, identity | 기본 키 |
| `nickname` | text | 공백 제거 후 1~20자, not null |
| `message` | text | 공백 제거 후 1~200자, not null |
| `approved` | boolean | 기본값 false |
| `created_at` | timestamptz | 기본값 now() |

### 스키마 초안 (아직 실행하지 않음)

```sql
create table public.messages (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 20),
  message  text not null check (char_length(btrim(message))  between 1 and 200),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

revoke all on public.messages from anon;
grant select on public.messages to anon;
grant insert (nickname, message) on public.messages to anon;

create policy "anon reads approved" on public.messages
  for select to anon using (approved = true);

create policy "anon inserts pending" on public.messages
  for insert to anon with check (approved = false);
```

## 4. 접근 제한

- 읽기: 누구나 가능. 승인(`approved = true`)된 글만 보임
- 쓰기: 누구나 가능. 이름과 한마디 두 열만 쓸 수 있고, 항상 승인 대기 상태로 저장됨
- 수정·삭제: 익명 사용자는 불가. 본인이 Supabase 대시보드에서 승인·삭제
- 브라우저에는 프로젝트 URL과 anon 키만 사용. `service_role` 키는 코드, 빌드 출력, 문서 어디에도 넣지 않음
- 승인되지 않은 행은 익명 사용자가 읽을 수 없으므로, 저장 요청은 결과 행을 돌려받지 않는 방식(`return=minimal`)으로 보냄
- 목록은 `textContent`로 그려 HTML이 실행되지 않게 함

## 5. 성공·실패 동작

| 상황 | 동작 |
|---|---|
| 저장 성공 | 입력란을 비우고 "남겼어요. 확인 후 표시됩니다" 표시 |
| 이름 또는 한마디가 비었거나 공백뿐 | 전송하지 않고 해당 입력란 옆에 이유 표시 |
| 길이 초과 | 입력란 `maxlength`로 막고, 우회해 전송해도 DB 제약이 거부 |
| 허니팟 값 있음 | 아무 표시 없이 전송 무시 |
| 네트워크 또는 Supabase 오류 | 입력 내용 유지, "지금은 저장하지 못했어요. 다시 시도해 주세요" 표시. 오류 상세는 화면에 노출하지 않음 |
| 전송 중 | 버튼 비활성화(중복 전송 방지) |
| 목록 불러오기 실패 | "목록을 불러오지 못했어요" 표시. 입력란은 계속 사용 가능 |

## 6. 구현 범위

포함
- `index.html`에 입력 폼, 목록, 브라우저 JS 추가 (supabase-js 라이브러리 또는 REST 호출)
- Supabase 테이블과 RLS 설정
- Vercel 배포용 빌드 구성 (아래 7번)

제외
- 로그인, 글 수정·삭제 화면, 관리자 화면, 서버 함수, 새 프레임워크

## 7. 배포 계획 (Vercel)

공개해야 하는 파일은 `index.html`과 `game.html`뿐이다. 저장소 루트를 그대로 공개하면 추적 중인 `.kiro/steering/workflow.md` 같은 파일이 함께 공개될 수 있으므로, 공개 전용 폴더를 만든다.

- `package.json`의 `build` 스크립트가 `index.html`, `game.html`(이후 추가되는 공개 자산)만 `dist/`로 복사. 허용 목록 방식
- `vercel.json`에 출력 폴더(`dist`)와 빌드 명령을 지정
- `.git`, `.env`, `.kiro`, `docs`, `node_modules`, 개인 기록은 `dist/`에 포함하지 않음
- 서버 함수는 만들지 않음. 나중에 필요해지면 `api/` 폴더에 두고 `dist/`에는 복사하지 않음

대시보드 입력값 (빌드 검사 후 확정)

| 항목 | 값 |
|---|---|
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | 비움 (의존성 없음) |
| Production Branch | `main` |

작업은 새 브랜치와 PR로 진행하고, 브랜치 미리보기 배포로 확인한 뒤 `main`에 병합한다.

## 8. 검사 방법

1. 정상 입력을 남기면 `approved = false`로 저장되는지 확인한다.
2. 승인 전에는 화면에 보이지 않고, 대시보드에서 승인하면 새로고침 후 보이는지 확인한다.
3. anon 키로 수정·삭제 요청이 거부되는지 확인한다.
4. anon 키로 `approved = true`를 넣어 삽입하면 거부되는지 확인한다.
5. 빈 값, 공백만 입력, 201자 입력이 막히는지 확인한다.
6. 네트워크를 끈 상태에서 오류 문구가 나오고 입력 내용이 유지되는지 확인한다.
7. 글에 `<script>`나 `<b>` 같은 HTML을 넣어도 문자 그대로 표시되는지 확인한다.
8. `npm run build` 후 `dist/`에 `index.html`, `game.html` 외 파일이 없는지 확인한다.
9. 소스와 `dist/`에 `service_role`, `.env`, 개인 Notion 주소가 없는지 검색한다.
10. Vercel 미리보기 주소와 기존 GitHub Pages 주소에서 둘 다 기능이 동작하는지 확인한다.

## 9. 미확인·열린 항목

- Supabase 프로젝트 URL과 anon 키: 아직 없음. 프로젝트 생성 후 코드에 넣는다 (anon 키는 공개해도 되는 값)
- 사용자가 따로 쓰겠다고 한 문장들: 아직 받지 못함. 받으면 이 문서에 반영한다
- 스팸이 많아질 경우의 대응(전송 횟수 제한 등): 이번 범위에서 제외
