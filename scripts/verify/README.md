# 검증용 스텁 — 저장소 밖으로 나가지 않는다

여기 있는 것들은 **제품 코드가 아니다.** 실제 외부 서비스 없이 코드 경로를
끝까지 태워 보기 위한 도구다. `npm run build` 에 포함되지 않는다.

| 파일 | 무엇을 대신하나 | 포트 |
|---|---|---|
| `fake-slack.mjs` | Slack Incoming Webhook | 4599 |
| `fake-supabase.mjs` | Supabase (PostgREST) | 4600 |
| `mail-notify.test.mjs` | Google Apps Script 런타임 | — |

## 왜 두는가

이 프로젝트에는 **실패해도 조용한 경로가 많다.**

- `lib/notify/slack.ts` 는 실패해도 throw 하지 않는다 — 접수를 살리려는 의도지만,
  **웹훅이 틀려도 화면상 증상이 없다.**
- 문의 등록은 DB 쓰기를 타야 실행된다 — 로컬에 Supabase 가 없으면
  `createInquiry → notifyInquiry` 를 **한 번도 못 태워 보고** 배포하게 된다.
- Apps Script 는 저장소 밖(Google 계정)에서 돈다 — 편집기에 붙여넣어야만
  확인되면 **확인을 건너뛰게 된다.**

조용한 실패는 눈으로 확인하는 수밖에 없고, 그 눈을 만들어 주는 것이 이 폴더다.

## 쓰는 법

### 1. 문의 접수 → Slack 알림 전 구간

```sh
# 터미널 A — 가짜 Slack
OUT=/tmp/slack.txt node scripts/verify/fake-slack.mjs

# 터미널 B — 가짜 DB
node scripts/verify/fake-supabase.mjs

# 터미널 C — .env.local 에 아래를 넣고 빌드·기동
#   SLACK_INQUIRY_WEBHOOK_URL=http://localhost:4599/x
#   SUPABASE_URL=http://localhost:4600
#   NEXT_PUBLIC_SUPABASE_URL=http://localhost:4600
#   SUPABASE_SECRET_KEY=local-stub-key-not-real
npm run build && npx next start -p 3100

# 폼 제출 또는 /admin/new 등록 후
cat /tmp/slack.txt        # ← 무엇이 나갔는지 눈으로 본다
```

**확인할 것**: payload 에 이름·이메일·연락처·본문이 **없어야** 한다.
있으면 Slack 이 개인정보 수탁자가 되어 처리방침을 고쳐야 한다(ADR-031).

### 2. 실패 분기

웹훅 URL 을 `http://localhost:4599/fail` 로 바꾸면 수신기가 **404** 를 돌려준다.
성공 경로만 보고 끝내면 "실패하면 어떻게 되는가" 를 모르는 채 배포하게 된다.

### 3. 메일 알림 스크립트

```sh
node scripts/verify/mail-notify.test.mjs     # 15개 검사
```

`.gs` 를 고치면 **여기부터 돌린다.**

## ⚠️ `.env.local` 의 `$` 는 escape 한다

`ADMIN_PASSWORD_HASH` 는 `scrypt$<salt>$<hash>` 형식이라 그대로 넣으면
dotenv-expand 가 변수로 해석해 **빈 값이 된다.** 증상은 로그인 실패 메시지
하나뿐이라 원인을 찾기 어렵다. `$` → `\$` 로 적는다.
(`homepage-verify` 스킬 함정 11)

## ⚠️ 대조군 없이 결론 내지 않는다

"플래그를 껐더니 안 나온다" 는 **켰을 때 나오는 것을 확인해야** 의미가 있다.
실제로 정적 grep 으로 Analytics 중단을 확인하려다, 켠 빌드와 끈 빌드가 **같은
결과**를 내는 바람에 아무것도 증명하지 못한 적이 있다(ADR-033).
**검사 방법이 판별력을 갖는지 먼저 본다.**
