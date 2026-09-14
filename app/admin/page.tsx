import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui'
import { services } from '@/content/services'
import { auditContext, logAdminAction } from '@/lib/admin/audit'
import { formatDateTime } from '@/lib/admin/format'
import { requireAdminSession } from '@/lib/admin/guard'
import { listInquiries } from '@/lib/admin/inquiries'
import { CHANNEL_LABEL, STATUS_LABEL, isInquiryStatus, isIntakeChannel } from '@/lib/admin/status'
import { can } from '@/lib/admin/roles'
import { isSlackNotifyConfigured } from '@/lib/notify/slack'
import { isSupabaseConfigured } from '@/lib/supabase/server'
import { sendNotifyTest } from './actions'

export const metadata: Metadata = {
  title: '상담 문의',
  robots: { index: false, follow: false, nocache: true },
}

/** 관리자 화면은 절대 캐시하지 않는다. */
export const dynamic = 'force-dynamic'

const serviceLabel = new Map<string, string>([
  ...services.map((s) => [s.slug, s.name] as [string, string]),
  ['other', '기타 문의'],
])

/**
 * 점검 결과 코드 → 사람이 읽는 문장.
 *
 * ⚠️ 원인 문자열을 URL 에 그대로 싣지 않고 **코드로만** 주고받는다. URL 은 브라우저
 *    기록과 리퍼러에 남는다. 여기서 문장으로 바꿔 보여 준다.
 */
function notifyMessage(code: string): { tone: 'ok' | 'bad'; text: string } | null {
  if (!code) return null
  if (code === 'ok') {
    return { tone: 'ok', text: 'Slack 으로 테스트 메시지를 보냈습니다. 채널을 확인하세요.' }
  }
  if (code === 'unset') {
    return {
      tone: 'bad',
      text: 'SLACK_INQUIRY_WEBHOOK_URL 이 이 환경에 없습니다. Vercel 환경변수를 확인하고 재배포하세요.',
    }
  }
  if (code.startsWith('http-')) {
    return {
      tone: 'bad',
      text: `Slack 이 ${code.slice(5)} 를 반환했습니다. 웹훅이 폐기됐거나 URL 이 잘못됐습니다 — 재발급 후 환경변수를 교체하세요.`,
    }
  }
  if (code.startsWith('err-')) {
    return {
      tone: 'bad',
      text: `전송 중 ${code.slice(4)} 가 발생했습니다. 네트워크 차단 또는 타임아웃(5초)입니다.`,
    }
  }
  return null
}

type PageProps = { searchParams: Promise<{ notify?: string }> }

export default async function AdminInquiriesPage({ searchParams }: PageProps) {
  const session = await requireAdminSession()
  const notify = notifyMessage((await searchParams).notify ?? '')
  const context = await auditContext()
  await logAdminAction({ action: 'list_viewed', actor: session.username, context })

  const rows = await listInquiries()

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="type-title">상담 문의</h1>
        <div className="flex items-center gap-4">
          <p className="font-mono text-[12px] text-ink-muted">
            {rows === null ? '조회 실패' : `${rows.length}건`}
          </p>
          <Link
            href="/admin/new"
            className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover"
          >
            직접 등록
          </Link>
        </div>
      </div>

      <p className="type-body mt-3 text-[14px]">
        목록에서는 이메일·연락처를 마스킹합니다. 전체 값은 상세에서 확인하세요.
        전화·이메일로 받은 문의는 <b className="font-medium text-ink">직접 등록</b>으로 남기세요.
        <b className="font-medium text-ink"> 모든 조회는 감사 로그에 기록됩니다.</b>
      </p>

      {!isSupabaseConfigured() ? (
        <p className="mt-8 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          Supabase 환경변수가 설정되지 않아 문의를 조회할 수 없습니다.
        </p>
      ) : rows === null ? (
        <p className="mt-8 rounded-2xl border border-hairline bg-surface px-5 py-4 text-[14px] text-ink-muted">
          조회 중 오류가 발생했습니다. 서버 로그의 <code>[admin]</code> 항목을 확인하세요.
        </p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-squircle-lg border border-hairline bg-surface p-10 text-center">
          <p className="type-title">아직 접수된 문의가 없습니다.</p>
          <p className="type-body mx-auto mt-3 max-w-md text-[14px]">
            현재 홈페이지 상담 폼이 비활성 상태입니다(<code>content/features.ts</code>).
            전화·이메일로 받은 문의는 <b className="font-medium text-ink">직접 등록</b>으로
            이력을 남길 수 있습니다.
          </p>
          <Link
            href="/admin/new"
            className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover"
          >
            직접 등록
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-hairline">
                {[
                  '접수일시',
                  '경로',
                  '회사',
                  '담당자',
                  '분야',
                  '이메일',
                  '연락처',
                  '상태',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-hairline">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] tabular-nums text-ink-muted">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-muted">
                    {isIntakeChannel(row.intakeChannel)
                      ? CHANNEL_LABEL[row.intakeChannel]
                      : row.intakeChannel}
                  </td>
                  <td className="px-3 py-3 text-ink">{row.company}</td>
                  <td className="px-3 py-3 text-ink">{row.name}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-muted">
                    {serviceLabel.get(row.serviceSlug) ?? row.serviceSlug}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-ink-muted">
                    {row.emailMasked ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-ink-muted">
                    {row.phoneMasked ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-ink">
                      {isInquiryStatus(row.status) ? STATUS_LABEL[row.status] : row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <Link
                      href={`/admin/${row.id}`}
                      className="text-[13px] font-medium text-accent hover:text-accent-hover"
                    >
                      상세
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 접수 알림 채널 점검 ──────────────────────────────────────────
          알림 전송은 실패해도 throw 하지 않으므로(접수 우선) **조용히 안 온다.**
          그 침묵을 깨는 유일한 수단이라 관리자 화면에 둔다.
          ⚠️ 관리자 전용이다(`notify.test`). 상담자에게는 보이지 않는다. */}
      {can(session.role, 'notify.test') ? (
        <section className="mt-16 rounded-2xl border border-hairline bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">접수 알림 채널</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                문의가 접수되면 Slack 으로 알립니다(개인정보는 보내지 않고 분야·회사명·접수
                id 만). 전송 실패는 접수를 막지 않도록 조용히 넘어가므로,
                <b className="font-medium text-ink"> 배선이 살아 있는지는 눌러서 확인해야 합니다.</b>
              </p>
              <p className="mt-2 font-mono text-[12px] text-ink-muted">
                SLACK_INQUIRY_WEBHOOK_URL: {isSlackNotifyConfigured() ? '설정됨' : '미설정'}
              </p>
            </div>
            <form action={sendNotifyTest}>
              <button
                type="submit"
                className="whitespace-nowrap rounded-full border border-hairline px-4 py-2 text-[13px] font-medium text-ink transition-colors duration-300 hover:bg-surface-2"
              >
                테스트 메시지 보내기
              </button>
            </form>
          </div>

          {notify ? (
            <p
              className={`mt-4 border-t border-hairline pt-4 text-[13px] leading-relaxed ${
                notify.tone === 'ok' ? 'text-ink' : 'text-accent'
              }`}
            >
              {notify.text}
            </p>
          ) : null}
        </section>
      ) : null}
    </Container>
  )
}
