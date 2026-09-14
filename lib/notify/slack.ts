import 'server-only'

/**
 * 상담 문의 접수 Slack 알림.
 *
 * `SLACK_INQUIRY_WEBHOOK_URL` 은 **Vercel Production 에 설정되어 있다**(2026-09-14).
 * 다만 `features.inquiryForm` 이 꺼져 있어 **호출 지점이 실행되지 않는다** — 즉
 * 배선이 살아 있는지 확인할 방법이 평상시에는 없다.
 *
 * ⚠️ **이 모듈은 실패해도 throw 하지 않는다**(아래 `notifyInquiry` 참고).
 *    접수를 살리려는 의도적 설계지만, 부작용으로 **웹훅 URL 이 틀려도 화면상
 *    증상이 전혀 없다.** 조용히 안 오는 것이 가장 나쁜 실패 형태다.
 *    → 그래서 `notifyTest()` 를 둔다. 관리자 화면(`/admin`)에서 수동으로 눌러
 *      **실제 전송 경로 전체**(환경변수 → 코드 → Slack)를 확인한다.
 *
 * ⚠️ 개인정보를 Slack 으로 보내지 않는다 —
 *    Slack 은 제3자 서비스이고 메시지는 워크스페이스에 장기 보존되며 검색된다.
 *    이름·이메일·연락처·문의 본문을 알림에 넣으면 **개인정보 처리 위탁 범위가
 *    Slack 까지 확대**되어 처리방침의 수탁자 목록에 Slack 을 추가해야 한다.
 *    그래서 알림에는 "무엇이 들어왔는지" 만 담고, 실제 내용은 Supabase 에서 본다.
 *
 *    보내는 것:   접수 시각 · 문의 분야 · 회사명(법인 정보) · 행 id
 *    보내지 않는 것: 담당자 이름 · 이메일 · 연락처 · 문의 본문 · IP 해시
 *
 *    회사명조차 제외하려면 `payload` 에서 `company` 를 빼면 된다. 알림의 유용성과
 *    최소수집 원칙 사이의 트레이드오프이며, 법무 판단에 따라 조정할 것.
 */

export type InquiryNotification = {
  /** Supabase `inquiries.id`. 실제 내용은 이 id 로 대시보드에서 조회한다. */
  id: string
  /** 문의 분야 slug */
  serviceSlug: string
  /** 회사명. 개인정보가 아닌 법인 정보. 제외하려면 호출부에서 빼면 된다. */
  company?: string
}

/** 웹훅이 설정되어 있는가. 미설정이면 알림은 조용히 건너뛴다. */
export function isSlackNotifyConfigured(): boolean {
  return Boolean(process.env.SLACK_INQUIRY_WEBHOOK_URL)
}

function buildBlocks(input: InquiryNotification) {
  const lines = [
    `*분야* ${input.serviceSlug}`,
    input.company ? `*회사* ${input.company}` : null,
    `*접수 id* \`${input.id}\``,
  ].filter(Boolean)

  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `:inbox_tray: *새 상담 문의*\n${lines.join('\n')}` },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '담당자 이름·연락처·문의 내용은 개인정보라 알림에 넣지 않습니다. Supabase 에서 확인하세요.',
        },
      ],
    },
  ]
}

/**
 * 접수 알림을 보낸다. **실패해도 절대 throw 하지 않는다.**
 * 알림 실패가 문의 접수 자체를 실패로 만들면 안 된다 — 접수가 우선이다.
 *
 * @returns 실제로 전송했는지 여부
 */
export async function notifyInquiry(input: InquiryNotification): Promise<boolean> {
  const webhook = process.env.SLACK_INQUIRY_WEBHOOK_URL
  if (!webhook) return false

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: buildBlocks(input) }),
      // 알림이 접수 응답을 붙잡지 않도록 짧게 끊는다.
      signal: AbortSignal.timeout(3_000),
    })

    if (!res.ok) {
      console.error('[inquiry] Slack 알림 실패', { status: res.status })
      return false
    }
    return true
  } catch (error) {
    // 입력값은 절대 로깅하지 않는다.
    console.error('[inquiry] Slack 알림 예외', {
      name: error instanceof Error ? error.name : 'unknown',
    })
    return false
  }
}

/**
 * 알림 채널 점검 결과.
 *
 * `notifyInquiry` 와 달리 **실패 이유를 돌려준다.** 점검의 목적이 바로 그것이기
 * 때문이다 — "안 왔다" 만으로는 환경변수 미설정인지, URL 이 폐기됐는지,
 * 네트워크가 막힌 것인지 구분할 수 없다.
 *
 * ⚠️ `detail` 에 **웹훅 URL 을 절대 넣지 않는다.** 이 값은 관리자 화면에 그대로
 *    표시된다. Slack 웹훅 URL 은 그 자체가 비밀이다(아는 사람은 누구나 채널에
 *    글을 쓸 수 있다).
 */
export type NotifyTestResult =
  | { ok: true }
  | { ok: false; reason: 'unconfigured' }
  | { ok: false; reason: 'http'; status: number }
  | { ok: false; reason: 'exception'; name: string }

/**
 * 알림 채널 점검용 테스트 메시지를 보낸다.
 *
 * **개인정보를 담지 않는다** — 고정 문구와 누른 사람의 관리자 계정명뿐이다.
 * 계정명은 개인정보가 아니라 운영 식별자이고, "누가 점검했는지" 가 Slack 메시지
 * 자체에 남아 **별도 감사 로그 없이도 기록이 된다**(그래서 `AdminAction` 을
 * 늘리지 않았다 — 늘리면 DB CHECK 제약 마이그레이션이 따라온다).
 *
 * ⚠️ 메시지 첫 줄에 **테스트임을 명시**한다. 실제 접수 알림과 섞이면 점검이
 *    오히려 혼란을 만든다.
 */
export async function notifyTest(actor: string): Promise<NotifyTestResult> {
  const webhook = process.env.SLACK_INQUIRY_WEBHOOK_URL
  if (!webhook) return { ok: false, reason: 'unconfigured' }

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          ':wrench: *알림 채널 점검 (테스트)*\n' +
          '실제 상담 문의가 아닙니다. 이 메시지가 보이면 웹훅 배선이 정상입니다.',
      },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `실행: ${actor} · ${new Date().toISOString()}` }],
    },
  ]

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return { ok: false, reason: 'http', status: res.status }
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: 'exception', name: error instanceof Error ? error.name : 'unknown' }
  }
}
