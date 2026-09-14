import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Hero } from '@/components/hero'
import { Container, Section } from '@/components/ui'
import { features } from '@/content/features'
import {
  type Answers,
  EMPTY_ANSWERS,
  LAW_BASIS,
  type Level,
  currentDuties,
  evaluate,
  questions,
  upcomingDuties,
} from '@/content/eligibility'
import { services } from '@/content/services'

/**
 * ⚠️ **`export const metadata` 를 쓰지 않는다** — 플래그로 숨긴 페이지이기 때문이다.
 *
 * 정적 `metadata` 는 컴포넌트가 `notFound()` 를 부르기 **전에** 평가되고, 그 결과가
 * **RSC 페이로드에 그대로 실려 나간다.** 화면상 404 는 맞지만 응답 본문을 열면
 * 페이지 제목·설명이 보인다 — 실제로 프로덕션에서 확인했다(2026-09-14).
 *
 * 숨긴 페이지의 존재와 내용을 알려 줄 이유가 없으므로 `generateMetadata()` 로
 * 바꿔 **플래그가 꺼져 있으면 빈 객체를 돌려준다.**
 */
export async function generateMetadata(): Promise<Metadata> {
  if (!features.eligibilityCheck) return {}
  return {
    title: '전자금융업 등록 대상 자가진단',
    description:
      '우리 서비스가 전자금융업 등록 대상인지 질문 몇 개로 확인합니다. 2026. 12. 17. 시행 개정 기준까지 함께 보여드립니다.',
  }
}

/**
 * 전자금융업 등록 대상 자가진단.
 *
 * ## ⚠️ 개인정보를 받지도, 저장하지도 않는다
 *
 * 답변은 **URL 쿼리스트링에만** 있고 서버에 기록하지 않는다. 이 설계 덕분에
 * `features.privacyPolicy` 가 꺼져 있어도(= 처리방침 비공개) 이 페이지를 켤 수 있다.
 * **저장을 붙이는 순간 그 전제가 깨진다** — 처리방침·수탁자·보관기간이 전부 따라온다.
 *
 * 부수 효과로 **결과 URL 을 그대로 공유**할 수 있다.
 *
 * ## 왜 `'use client'` 가 없는가
 *
 * `<form method="get">` + 라디오 버튼이면 **JS 없이** 제출이 된다. 제출하면 답이
 * `searchParams` 로 돌아오고 서버에서 렌더한다. 조건부 질문을 접었다 폈다 하려면
 * 클라이언트 컴포넌트가 되어야 하는데, **질문 10개를 한 화면에 두고 안내 문구로
 * 조건을 표시**하면 그럴 필요가 없다. B2B 담당자에게는 전체 범위가 한눈에 보이는
 * 쪽이 오히려 낫다.
 *
 * ⚠️ `export const dynamic = 'force-static'` 을 붙이지 않는다. `searchParams` 를
 *    읽는 페이지는 요청마다 달라지므로 정적일 수 없고, 강제하면 **쿼리가 빈 채로
 *    들어와 결과가 영영 안 나온다.** 빌드 로그에서 `ƒ (Dynamic)` 인지 확인할 것.
 */

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

/** 쿼리스트링 → 답변. 없거나 이상한 값은 전부 `unsure` 로 떨어진다. */
function readAnswers(sp: Record<string, string | string[] | undefined>): {
  answers: Answers
  answered: boolean
} {
  const answers: Answers = { ...EMPTY_ANSWERS }
  let answered = false

  for (const q of questions) {
    const raw = sp[q.key]
    const value = Array.isArray(raw) ? raw[0] : raw
    if (!value) continue
    const ok = q.choices.some((c) => c.value === value)
    if (!ok) continue
    // 질문마다 허용 값 집합이 다르므로 검사 후에만 대입한다.
    ;(answers as Record<string, string>)[q.key] = value
    if (value !== 'unsure') answered = true
  }
  return { answers, answered }
}

const LEVEL_LABEL: Record<Level, string> = {
  likely: '등록 대상일 가능성이 높습니다',
  exempt: '대상이나 등록이 면제될 수 있습니다',
  unlikely: '해당하지 않는 것으로 보입니다',
  unsure: '확인이 필요합니다',
}

/** `accent` 는 링크·버튼·포커스·에러에만 쓴다. 판정 강조는 굵기·색조로만 한다. */
const LEVEL_TONE: Record<Level, string> = {
  likely: 'text-ink font-semibold',
  exempt: 'text-ink',
  unlikely: 'text-ink-muted',
  unsure: 'text-ink',
}

export default async function CheckPage({ searchParams }: PageProps) {
  if (!features.eligibilityCheck) notFound()

  const sp = await searchParams
  const { answers, answered } = readAnswers(sp)
  const verdicts = evaluate(answers)
  const nowDuties = currentDuties(answers, verdicts)
  const duties = upcomingDuties(answers, verdicts)
  const serviceName = new Map<string, string>(services.map((s) => [s.slug, s.name]))

  return (
    <>
      <Hero
        size="headline"
        eyebrow="자가진단"
        title="우리 서비스가 등록 대상인가."
        lede="질문에 답하면 해당 가능성이 있는 전자금융업 종류를 보여드립니다. 개인정보를 입력받지 않으며 답변을 저장하지 않습니다."
      />

      <Section className="border-t border-hairline pt-16 sm:pt-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            {/* ⚠️ 이 고지를 결과 화면에서 떼지 말 것. 푸터 문구로는 부족하다 —
                이 페이지는 개별 사안에 대한 답처럼 읽히기 때문이다.

                "법무 검토를 받지 않았다" 를 **맨 앞에** 둔다. 조문 번호가 붙어 있어
                오히려 확정된 답처럼 읽히기 때문이다. 신뢰도를 올리는 장치가
                책임 범위를 흐리면 안 된다. */}
            <div className="rounded-2xl border border-hairline bg-surface p-5">
              <p className="text-[13px] font-medium leading-relaxed text-ink">
                법무 검토를 받지 않은 단순 참고용입니다.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                입력하신 내용만으로 조문을 기계적으로 대조한 결과이며, 법률 자문이나 감독당국의
                판단을 대신하지 않습니다. 실제 해당 여부는 사업 구조 전체를 보아야 확정됩니다.
                조문·금액은 아래 원문과 대조했습니다.
              </p>
              <ul className="mt-3 space-y-1">
                {LAW_BASIS.sources.map((src) => (
                  <li key={src} className="text-[12px] leading-relaxed text-ink-muted">
                    — {src}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-ink-muted">
                대조 기준일 {LAW_BASIS.checkedAt}
              </p>
            </div>

            {/* ── 질문 ────────────────────────────────────────────────── */}
            <form method="get" action="/check" className="mt-12">
              <ol className="space-y-10">
                {questions.map((q, i) => (
                  <li key={q.key}>
                    <fieldset>
                      <legend className="text-[17px] font-semibold leading-relaxed tracking-[-0.01em] text-ink">
                        <span className="mr-2 font-mono text-[13px] font-normal text-ink-muted">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {q.text}
                      </legend>
                      {q.onlyIf ? (
                        <p className="mt-2 text-[13px] text-ink-muted">— {q.onlyIf}만 답하세요</p>
                      ) : null}
                      {q.help ? (
                        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{q.help}</p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                        {q.choices.map((c) => {
                          const id = `${q.key}-${c.value}`
                          const current = (answers as Record<string, string>)[q.key]
                          return (
                            <div key={c.value} className="flex items-center gap-2">
                              <input
                                type="radio"
                                id={id}
                                name={q.key}
                                value={c.value}
                                defaultChecked={current === c.value}
                                className="h-4 w-4 accent-[var(--color-accent)]"
                              />
                              <label htmlFor={id} className="text-[15px] text-ink">
                                {c.label}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </fieldset>
                  </li>
                ))}
              </ol>

              <div className="mt-12 flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover"
                >
                  결과 보기
                </button>
                {answered ? (
                  <Link
                    href="/check"
                    className="rounded-full border border-hairline px-6 py-3 text-[15px] font-medium text-ink transition-colors duration-300 hover:bg-surface"
                  >
                    다시 하기
                  </Link>
                ) : null}
              </div>
            </form>
          </div>
        </Container>
      </Section>

      {/* ── 결과 ──────────────────────────────────────────────────────── */}
      {answered ? (
        <Section className="border-t border-hairline bg-surface">
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2 className="type-title">확인 결과</h2>

              <dl className="mt-10 divide-y divide-hairline border-y border-hairline">
                {verdicts.map((v) => (
                  <div key={v.slug} className="py-6">
                    <dt className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                        {v.name}
                      </span>
                      <span className={`text-[15px] ${LEVEL_TONE[v.now]}`}>
                        {LEVEL_LABEL[v.now]}
                      </span>
                    </dt>
                    <dd className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                      {v.reason}
                    </dd>
                    {/* 시점에 따라 판정이 갈리는 경우에만 나온다. 이 도구의 차별점이라
                        사유에 섞지 않고 줄을 따로 준다. */}
                    {v.after && v.after !== v.now ? (
                      <dd className="mt-2 text-[15px] leading-relaxed text-ink">
                        <b className="font-semibold">2026. 12. 17. 이후</b> — {LEVEL_LABEL[v.after]}
                        {v.afterReason ? <> · {v.afterReason}</> : null}
                      </dd>
                    ) : null}
                    {v.now === 'likely' || v.now === 'exempt' ? (
                      <dd className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-muted">
                        <span>
                          {v.license} · 자본금 {v.capital}
                        </span>
                        <Link
                          href={`/services/${v.serviceSlug}`}
                          className="font-medium text-accent hover:text-accent-hover"
                        >
                          {serviceName.get(v.serviceSlug) ?? '관련 서비스'} 보기 →
                        </Link>
                      </dd>
                    ) : null}
                    {/* 근거 조문. 검토자가 원문과 대조할 수 있어야 이 도구가 검증
                        가능해진다 — 빼면 "믿거나 말거나" 가 된다. */}
                    <dd className="mt-2 font-mono text-[12px] leading-relaxed text-ink-muted">
                      {v.lawRef}
                    </dd>
                  </div>
                ))}
              </dl>

              {nowDuties.length > 0 ? (
                <div className="mt-12">
                  <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
                    지금 이미 적용되는 의무
                  </h3>
                  <p className="type-body mt-3 text-[14px]">
                    등록 대상이라면 등록과 동시에 지게 되는 의무 중 놓치기 쉬운 것입니다.
                  </p>
                  <ul className="mt-6 space-y-3">
                    {nowDuties.map((d) => (
                      <li key={d} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                        <span aria-hidden className="mt-px shrink-0 text-accent">
                          —
                        </span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {duties.length > 0 ? (
                <div className="mt-12">
                  <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
                    2026. 12. 17. 시행 개정으로 추가되는 의무
                  </h3>
                  <p className="type-body mt-3 text-[14px]">
                    이미 등록한 사업자에게도 새로 생기는 의무입니다.
                  </p>
                  <ul className="mt-6 space-y-3">
                    {duties.map((d) => (
                      <li key={d} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                        <span aria-hidden className="mt-px shrink-0 text-accent">
                          —
                        </span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-12 rounded-2xl border border-hairline bg-canvas p-6">
                <p className="text-[15px] leading-relaxed text-ink">
                  결과에 <b className="font-semibold">확인이 필요합니다</b> 가 있거나, 구조가 위
                  질문으로 딱 나뉘지 않는다면 사업 구조를 함께 보는 편이 빠릅니다.
                </p>
                <div className="mt-6">
                  <Link
                    href="/contact"
                    className="inline-block rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white transition-colors duration-300 hover:bg-accent-hover"
                  >
                    상담 신청
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  )
}
