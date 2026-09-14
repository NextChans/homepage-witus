/**
 * `scripts/apps-script/inquiry-mail-notify.gs` 테스트 — 15개 검사
 * ===========================================================================
 *
 *   node scripts/verify/mail-notify.test.mjs
 *
 * Apps Script API(`GmailApp` · `UrlFetchApp` · `PropertiesService` · `ScriptApp`)를
 * 스텁으로 갈아끼우고 **`.gs` 파일을 그대로** 실행한다. 복사본을 시험하지 않는다 —
 * 복사본은 원본과 갈린다.
 *
 * ## 무엇을 지키는가
 *
 *  - payload 에 발신자 **이름·주소가 없다** (도메인만, ADR-032)
 *  - 같은 도메인이 **한 줄로 합산**된다 (3통이면 3줄이 아니다)
 *  - 전송 실패 시 **중복방지 라벨을 붙이지 않는다** — 붙이면 그 메일은 영원히 묻힌다
 *  - 웹훅 미설정 시 **조용히 넘어가지 않고 예외**를 던진다
 *  - `@` 없는 이상한 `From` 에도 죽지 않는다
 *
 * `.gs` 를 고치면 **여기부터 돌린다.** Apps Script 편집기에서 확인하려면 매번
 * 붙여넣고 실행해야 하는데, 그러면 확인을 건너뛰게 된다.
 */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const src = readFileSync(new URL('../apps-script/inquiry-mail-notify.gs', import.meta.url), 'utf8')

function makeThread(from) {
  const labels = new Set()
  return {
    _from: from, _labels: labels,
    getMessages: () => [{ getFrom: () => from }],
    addLabel: (l) => labels.add(l.name),
  }
}

function run({ webhook, threads, status = 200 }) {
  const sent = []
  const ctx = {
    console,
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => webhook }) },
    GmailApp: {
      getUserLabelByName: (n) => ({ name: n }),
      createLabel: (n) => ({ name: n }),
      search: (q) => { ctx.lastQuery = q; return threads },
    },
    UrlFetchApp: {
      fetch: (url, opt) => { sent.push({ url, body: JSON.parse(opt.payload), mute: opt.muteHttpExceptions })
                            return { getResponseCode: () => status } },
    },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyMinutes: () => ({ create(){} }) }) }) },
    lastQuery: null,
  }
  vm.createContext(ctx)
  vm.runInContext(src, ctx)
  let error = null
  try { ctx.notifyNewMail() } catch (e) { error = e.message }
  return { sent, error, ctx, threads }
}

const ok = (label, cond) => console.log((cond ? '  PASS  ' : '  FAIL  ') + label)

// ── 1. 정상: 도메인별 집계 ──
let t = [makeThread('홍길동 <hong@ganada.co.kr>'), makeThread('"Kim" <kim@ganada.co.kr>'),
         makeThread('someone@gmail.com')]
let r = run({ webhook: 'https://hooks.slack.test/x', threads: t })
const text = r.sent[0].body.blocks[0].text.text
console.log('--- 전송된 메시지 ---')
console.log(text)
console.log(r.sent[0].body.blocks[1].elements[0].text)
console.log('--- 검사 ---')
ok('메시지 1건 전송', r.sent.length === 1)
ok('총 통수 3', text.includes('새 메일 3통'))
ok('ganada.co.kr 2통으로 합산', text.includes('ganada.co.kr — 2통'))
ok('gmail.com 1통', text.includes('gmail.com — 1통'))
ok('발신자 이름 미포함', !text.includes('홍길동') && !text.includes('Kim'))
ok('발신자 주소 미포함', !text.includes('hong@') && !text.includes('kim@') && !text.includes('someone@'))
ok('꺾쇠 잔여물 없음', !text.includes('>'))
ok('muteHttpExceptions 사용', r.sent[0].mute === true)
ok('성공 시 전 스레드에 라벨', t.every(x => x._labels.has('slack-notified')))
ok('검색어에 중복방지 제외 포함', r.ctx.lastQuery.includes('-label:slack-notified'))

// ── 2. 전송 실패: 라벨을 붙이면 안 된다 ──
let t2 = [makeThread('a@x.co.kr')]
run({ webhook: 'https://hooks.slack.test/x', threads: t2, status: 404 })
ok('실패 시 라벨 미부착(다음 실행에 재시도)', !t2[0]._labels.has('slack-notified'))

// ── 3. 웹훅 미설정: 조용히 넘어가지 않는다 ──
let r3 = run({ webhook: null, threads: [makeThread('a@x.co.kr')] })
ok('웹훅 없으면 예외', !!r3.error && r3.error.includes('SLACK_INQUIRY_WEBHOOK_URL'))
ok('웹훅 없으면 전송 시도 안 함', r3.sent.length === 0)

// ── 4. 메일 없음: 전송 안 함 ──
let r4 = run({ webhook: 'https://hooks.slack.test/x', threads: [] })
ok('메일 0통이면 미전송', r4.sent.length === 0 && !r4.error)

// ── 5. 이상한 From 값도 죽지 않는다 ──
let r5 = run({ webhook: 'https://hooks.slack.test/x', threads: [makeThread('보낸사람없음')] })
ok('@ 없는 From 도 처리', r5.sent.length === 1 && r5.sent[0].body.blocks[0].text.text.includes('알 수 없음'))
