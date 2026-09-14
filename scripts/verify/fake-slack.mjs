/**
 * 가짜 Slack Incoming Webhook 수신기 — **검증 전용**
 * ===========================================================================
 *
 *   OUT=/tmp/slack.txt node scripts/verify/fake-slack.mjs     # :4599 에서 대기
 *
 * `SLACK_INQUIRY_WEBHOOK_URL=http://localhost:4599/x` 로 앱을 띄우면 실제 Slack
 * 대신 여기로 온다. 받은 payload 를 `OUT` 파일에 그대로 적는다.
 *
 * ## 왜 필요한가
 *
 * `lib/notify/slack.ts` 는 **실패해도 throw 하지 않는다**(접수를 살리려는 의도).
 * 부작용으로 **웹훅이 틀려도 화면상 증상이 전혀 없다.** 무엇이 나가는지 확인할
 * 유일한 방법이 받아서 열어 보는 것이다.
 *
 * 실제로 이걸로 확인한 것들:
 *   - payload 에 이름·이메일·연락처·본문이 **없다** (개인정보 미발송, ADR-031)
 *   - 직접 등록 시 `경로` 가 붙는다 / 처리완료 등록은 **아예 안 온다**
 *   - 수신기를 꺼두면 등록은 성공하고 알림만 실패한다 (best-effort 동작)
 *
 * `/fail` 경로로 보내면 **404 를 돌려준다.** 실패 분기를 시험할 때 쓴다 —
 * 성공 경로만 확인하고 끝내면 "실패 시 어떻게 되는가" 를 모르는 채로 배포하게 된다.
 */
import { createServer } from 'node:http'
import { appendFileSync } from 'node:fs'
const OUT = process.env.OUT
createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    appendFileSync(OUT, `${req.method} ${req.url}\n${body}\n---\n`)
    if (req.url === '/fail') { res.writeHead(404); res.end('no_service'); return }
    res.writeHead(200); res.end('ok')
  })
}).listen(4599, () => console.log('fake slack on 4599'))
