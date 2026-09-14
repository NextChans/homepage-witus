/**
 * 상담 메일 도착 알림 — Google Apps Script
 * ===========================================================================
 *
 * `wituskr@gmail.com` 으로 메일이 오면 Slack 접수 채널에 **"왔다" 만** 알린다.
 * 설치 방법은 `doc/09-deployment.md` 6절에 있다.
 *
 * ## 이 스크립트는 저장소 밖(사용자 Google 계정)에서 돈다
 *
 * 그런데도 저장소에 두는 이유: **이 파일이 유일한 원본**이다. Apps Script 편집기
 * 안에만 있으면 계정이 바뀌거나 실수로 지웠을 때 복구할 수 없고, 왜 이렇게
 * 만들었는지도 남지 않는다. 고칠 때는 **여기를 고치고 붙여넣는다.**
 *
 * ## ⚠️ 보내지 않는 것 — 제목과 발신자 주소
 *
 * 보내는 것:     발신 **도메인**, 메일 통수, 메일함 링크
 * 보내지 않는 것: 제목 · 본문 · 첨부 · 발신자 전체 주소
 *
 * 제목을 넣고 싶은 유혹이 크지만 **넣지 않는다.** 제목은 우리가 정하는 값이
 * 아니라 상대가 쓰는 값이고, 실제로 `홍길동 010-1234-5678 문의드립니다` 같은
 * 제목이 온다. 그 순간 개인정보가 Slack 에 장기 보존되고 검색된다 —
 * `lib/notify/slack.ts` 에서 이름·연락처·본문을 뺀 이유와 **정확히 같은 이유**다.
 * 접수 채널은 여러 사람에게 열려 있으므로 더 그렇다.
 *
 * 발신자 전체 주소(`hong@ganada.co.kr`)도 개인을 식별하므로 제외한다.
 * **도메인(`ganada.co.kr`)은 법인 정보**라 남긴다 — 어느 회사에서 왔는지는
 * 우선순위 판단에 실제로 쓰인다.
 *
 * 알림의 목적은 "메일함을 열어봐라" 하나다. 그 목적에는 도메인과 통수로 충분하다.
 *
 * ## ⚠️ 웹훅 URL 을 이 파일에 적지 않는다
 *
 * **스크립트 속성(Script Properties)** 에서 읽는다. 코드에 박으면 Apps Script
 * 프로젝트를 공유하거나 내보내는 순간 URL 이 함께 나가고, Slack 웹훅 URL 은
 * 인증이 없어서 **아는 사람은 누구나 그 채널에 글을 쓸 수 있다.**
 */

// ── 설정 ───────────────────────────────────────────────────────────────────

/** 스크립트 속성 키. 값은 편집기 → 프로젝트 설정 → 스크립트 속성에서 넣는다. */
var WEBHOOK_PROPERTY_KEY = 'SLACK_INQUIRY_WEBHOOK_URL'

/**
 * 알림을 보낸 스레드에 붙이는 라벨. **중복 알림을 막는 유일한 장치다.**
 * 트리거가 5분마다 도는데 이게 없으면 같은 메일을 계속 알린다.
 */
var NOTIFIED_LABEL = 'slack-notified'

/**
 * 감시할 메일 검색어.
 *
 * 기본값은 받은편지함의 안 읽은 메일에서 프로모션·소셜·업데이트 탭을 뺀 것이다.
 * `newer_than:2d` 는 **처음 설치할 때 과거 메일이 한꺼번에 쏟아지는 것**을 막는다.
 *
 * 더 좁히려면 Gmail 필터로 문의 메일에 라벨(예: `문의`)을 붙이고 여기를
 * `label:문의 is:unread` 로 바꾼다. 스팸·뉴스레터가 섞이면 채널이 소음이 되고,
 * 소음이 쌓이면 진짜 알림을 아무도 안 본다.
 */
var SEARCH_QUERY =
  'in:inbox is:unread newer_than:2d -category:promotions -category:social -category:updates'

/** 한 번에 처리할 최대 스레드 수. 폭주 시 알림이 채널을 덮는 것을 막는다. */
var MAX_THREADS = 20

// ── 본체 ───────────────────────────────────────────────────────────────────

/** 시간 기반 트리거가 부르는 진입점. */
function notifyNewMail() {
  var webhook = PropertiesService.getScriptProperties().getProperty(WEBHOOK_PROPERTY_KEY)
  if (!webhook) {
    // 조용히 넘어가지 않는다 — 설정이 빠진 채로 도는 트리거가 가장 나쁘다.
    throw new Error(
      '스크립트 속성 ' + WEBHOOK_PROPERTY_KEY + ' 가 없습니다. 프로젝트 설정에서 추가하세요.',
    )
  }

  var label = getOrCreateLabel_(NOTIFIED_LABEL)
  var threads = GmailApp.search(SEARCH_QUERY + ' -label:' + NOTIFIED_LABEL, 0, MAX_THREADS)
  if (threads.length === 0) return

  // 도메인별로 묶는다. 같은 회사에서 3통 오면 3줄이 아니라 한 줄이어야 읽힌다.
  var counts = {}
  for (var i = 0; i < threads.length; i++) {
    var domain = senderDomain_(threads[i])
    counts[domain] = (counts[domain] || 0) + 1
  }

  var lines = []
  for (var d in counts) {
    if (Object.prototype.hasOwnProperty.call(counts, d)) {
      lines.push('· ' + d + ' — ' + counts[d] + '통')
    }
  }

  var ok = postToSlack_(webhook, threads.length, lines)

  // ⚠️ **전송에 성공했을 때만 라벨을 붙인다.** 실패한 채로 라벨을 붙이면
  //    그 메일은 영원히 알림 없이 묻힌다. 실패하면 다음 실행에서 다시 시도된다.
  if (ok) {
    for (var j = 0; j < threads.length; j++) threads[j].addLabel(label)
  }
}

/**
 * 발신자의 **도메인만** 뽑는다. `홍길동 <hong@ganada.co.kr>` → `ganada.co.kr`
 *
 * 메일 본문은 읽지 않는다 — `getFrom()` 만 본다.
 */
function senderDomain_(thread) {
  try {
    var messages = thread.getMessages()
    if (!messages.length) return '(알 수 없음)'
    var from = messages[0].getFrom() || ''
    var at = from.lastIndexOf('@')
    if (at === -1) return '(알 수 없음)'
    // 꺾쇠·따옴표·공백을 떼어낸다.
    var domain = from.slice(at + 1).replace(/[>"'\s].*$/, '').toLowerCase()
    return domain || '(알 수 없음)'
  } catch (e) {
    // 한 통 때문에 전체 알림을 놓치지 않는다.
    return '(알 수 없음)'
  }
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name)
}

/**
 * Slack 으로 보낸다. 성공 여부만 돌려준다.
 *
 * `muteHttpExceptions: true` 를 쓰는 이유 — 4xx/5xx 에서 예외가 던져지면
 * Apps Script 실행이 실패로 끝나고 **라벨을 붙일지 말지 판단할 기회가 없다.**
 */
function postToSlack_(webhook, total, lines) {
  var payload = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':mailbox_with_mail: *새 메일 ' + total + '통*\n' + lines.join('\n'),
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text:
              '제목·본문·발신자 주소는 개인정보라 보내지 않습니다. ' +
              '<https://mail.google.com/mail/u/0/#inbox|메일함에서 확인> → ' +
              '상담 건이면 witus.kr/admin 의 *직접 등록* 으로 남기세요.',
          },
        ],
      },
    ],
  }

  var res = UrlFetchApp.fetch(webhook, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  })

  var code = res.getResponseCode()
  if (code < 200 || code >= 300) {
    // 실행 로그에 남는다. 웹훅 URL 은 절대 출력하지 않는다.
    console.error('Slack 전송 실패 status=' + code)
    return false
  }
  return true
}

// ── 설치 도우미 ────────────────────────────────────────────────────────────

/**
 * 5분 트리거를 설치한다. 편집기에서 **한 번만** 실행한다.
 *
 * 기존 트리거를 먼저 지운다 — 여러 번 실행해서 트리거가 쌓이면 같은 메일에
 * 알림이 여러 번 간다.
 */
function installTrigger() {
  var existing = ScriptApp.getProjectTriggers()
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'notifyNewMail') {
      ScriptApp.deleteTrigger(existing[i])
    }
  }
  ScriptApp.newTrigger('notifyNewMail').timeBased().everyMinutes(5).create()
  console.log('5분 트리거 설치 완료')
}

/**
 * 설정이 맞는지 확인한다. **메일이 없어도** 테스트 메시지를 보낸다.
 *
 * `notifyNewMail()` 을 직접 실행하면 조건에 맞는 메일이 없을 때 아무 일도
 * 일어나지 않아 "설정이 틀린 것" 과 구분되지 않는다.
 */
function testConnection() {
  var webhook = PropertiesService.getScriptProperties().getProperty(WEBHOOK_PROPERTY_KEY)
  if (!webhook) throw new Error('스크립트 속성 ' + WEBHOOK_PROPERTY_KEY + ' 가 없습니다.')
  var ok = postToSlack_(webhook, 0, ['· (연결 테스트입니다. 실제 메일이 아닙니다.)'])
  console.log(ok ? '전송 성공 — 채널을 확인하세요' : '전송 실패 — 위 로그의 status 확인')
}
