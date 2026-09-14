import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Hero } from '@/components/hero'
import { Container, Section } from '@/components/ui'
import { features } from '@/content/features'
import {
  type Answers,
  type Correspondence,
  EMPTY_ANSWERS,
  IT_SCOPE,
  LAW_BASIS,
  REVIEW_DOCUMENTS,
  REVIEW_PERIOD,
  REVIEW_REQUIREMENTS,
  type StatuteQuote,
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
 */
export async function generateMetadata(): Promise<Metadata> {
  if (!features.eligibilityCheck) return {}
  return {
    title: '전자금융업 요건 확인',
    description:
      '답변한 내용이 전자금융거래법의 어느 정의 문언에 대응하는지 조문 원문과 함께 보여드립니다. 등록 시 심사되는 요건·서류·기한도 함께 정리했습니다.',
  }
}

/**
 * 전자금융업 요건 확인.
 *
 * ## ⚠️ 판정하지 않는다
 *
 * "귀사는 등록 대상입니다" 라는 결론을 내지 않는다. 답변이 **정의 규정의 어느 문언에
 * 대응하는지**를 조문 원문과 나란히 보여주고, **등록 시 심사되는 요건**을 정보로 낸다.
 * 해당 여부는 금융위원회가 판단한다.
 *
 * 조문 원문을 그대로 내는 것이 핵심이다 — 읽는 사람이 직접 대조할 수 있으면
 * 이 도구가 틀려도 드러난다. 실제로 판정을 내던 때 PG 의 2026. 12. 17. 이후를
 * 정반대로 내보내고 있었다(`content/eligibility.ts` 헤더 참고).
 *
 * ## ⚠️ 개인정보를 받지도, 저장하지도 않는다
 *
 * 답변은 **URL 쿼리스트링에만** 있고 서버에 기록하지 않는다. 이 설계 덕분에
 * `features.privacyPolicy` 가 꺼져 있어도 이 페이지를 켤 수 있다.
 * **저장을 붙이는 순간 그 전제가 깨진다.** 부수 효과로 결과 URL 을 그대로 공유할 수 있다.
 *
 * ## 왜 `'use client'` 가 없는가
 *
 * `<form method="get">` + 라디오 버튼이면 **JS 없이** 제출이 된다.
 *
 * ⚠️ `export const dynamic = 'force-static'` 을 붙이지 않는다. `searchParams` 를
 *    읽는 페이지는 요청마다 달라지므로 정적일 수 없고, 강제하면 **쿼리가 빈 채로
 *    들어와 결과가 영영 안 나온다.**
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

/**
 * ⚠️ **결론이 아니라 대조 결과를 말한다.**
 *
 * "등록 대상일 가능성이 높습니다" 는 판단이다. "정의 문언에 대응합니다" 는 대조다.
 * 이 문구를 결론형으로 되돌리지 말 것.
 */
const CORRESPONDENCE_LABEL: Record<Correspondence, string> = {
  matches: '정의 문언에 대응합니다',
  exemption: '정의 문언에 대응하며, 면제 조문이 함께 있습니다',
  noMatch: '정의 문언에 대응하지 않습니다',
  unsure: '대조할 답변이 없습니다',
}

/** `accent` 는 링크·버튼·포커스·에러에만 쓴다. 강조는 굵기·색조로만 한다. */
const CORRESPONDENCE_TONE: Record<Correspondence, string> = {
  matches: 'text-ink font-semibold',
  exemption: 'text-ink',
  noMatch: 'text-ink-muted',
  unsure: 'text-ink',
}

/** 조문 원문 블록. 요약하지 않고 그대로 낸다 — 요약하는 순간 해석이 된다. */
function Statute({ quote }: { quote: StatuteQuote }) {
  return (
    <div className="mt-3 border-l-2 border-hairline pl-4">
      <p className="font-mono text-[12px] text-ink-muted">{quote.ref}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-ink">{quote.text}</p>
    </div>
  )
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
        eyebrow="요건 확인"
        title="등록하려면 무엇이 필요한가."
        lede="답변한 내용이 전자금융거래법의 어느 정의 문언에 대응하는지 조문 원문과 함께 보여드립니다. 해당 여부는 감독당국이 판단합니다. 개인정보를 입력받지 않으며 답변을 저장하지 않습니다."
      />

      <Section className="border-t border-hairline pt-16 sm:pt-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            {/* ⚠️ 이 고지를 결과 화면에서 떼지 말 것. 푸터 문구로는 부족하다 —
                조문 번호가 붙어 있어 오히려 확정된 답처럼 읽히기 때문이다. */}
            <div className="rounded-2xl border border-hairline bg-surface p-5">
              <p className="text-[13px] font-medium leading-relaxed text-ink">
                법무 검토를 받지 않은 단순 참고용입니다.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                이 페이지는 <b className="font-medium text-ink">판정하지 않습니다.</b> 답변한 내용과
                법령 문언을 나란히 놓아 보여줄 뿐이며, 해당 여부와 등록 의무는 금융위원회가
                판단합니다. 조문·금액은 아래 원문과 대조했습니다.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink">
                이 확인은 <b className="font-medium">「전자금융거래법」 기준</b>입니다.
                「여신전문금융업법」 등 다른 법률의 등록·신고 의무는 다루지 않으므로,
                여기서 “대응하지 않는다” 고 나와도 별도 확인이 필요합니다.
              </p>
              <ul className="mt-3 space-y-1">
                {LAW_BASIS.sources.map((src) => (
                  <li key={src} className="text-[12px] leading-relaxed text-ink-muted">
                    — {src}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-ink-muted">대조 기준일 {LAW_BASIS.checkedAt}</p>
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
                  문언 대조 결과 보기
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
        <>
          <Section className="border-t border-hairline bg-surface">
            <Container>
              <div className="mx-auto max-w-3xl">
                <h2 className="type-title">문언 대조</h2>
                <p className="type-body mt-4 text-[15px]">
                  답변한 내용을 각 정의 규정의 문언과 나란히 놓았습니다. 판단은 하지 않습니다.
                </p>

                <dl className="mt-10 divide-y divide-hairline border-y border-hairline">
                  {verdicts.map((v) => (
                    <div key={v.slug} className="py-8">
                      <dt className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                        <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                          {v.name}
                        </span>
                        <span className={`text-[15px] ${CORRESPONDENCE_TONE[v.now]}`}>
                          {CORRESPONDENCE_LABEL[v.now]}
                        </span>
                      </dt>

                      <dd className="mt-3 text-[15px] leading-relaxed text-ink-muted">{v.note}</dd>

                      {/* 정의 조문 원문 — 이 도구의 핵심. 읽는 사람이 직접 대조한다. */}
                      <dd>
                        <Statute quote={v.definition.now} />
                      </dd>

                      {v.definition.after ? (
                        <dd>
                          <Statute quote={v.definition.after} />
                        </dd>
                      ) : null}

                      {v.after && v.after !== v.now ? (
                        <dd className="mt-4 text-[15px] leading-relaxed text-ink">
                          <b className="font-semibold">2026. 12. 17. 이후</b> —{' '}
                          {CORRESPONDENCE_LABEL[v.after]}
                          {v.afterNote ? <> · {v.afterNote}</> : null}
                        </dd>
                      ) : null}

                      {v.related.length > 0 ? (
                        <dd className="mt-4">
                          <p className="text-[13px] font-medium text-ink">함께 읽을 조문</p>
                          {v.related.map((q) => (
                            <Statute key={q.ref} quote={q} />
                          ))}
                        </dd>
                      ) : null}

                      {v.now === 'matches' || v.now === 'exemption' ? (
                        <dd className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-muted">
                          <span>
                            {v.license} 시 자본금 {v.capital}
                          </span>
                          <Link
                            href={`/services/${v.serviceSlug}`}
                            className="font-medium text-accent hover:text-accent-hover"
                          >
                            {serviceName.get(v.serviceSlug) ?? '관련 서비스'} 보기 →
                          </Link>
                        </dd>
                      ) : null}
                    </div>
                  ))}
                </dl>
              </div>
            </Container>
          </Section>

          {/* ── 등록 시 심사되는 것 ──────────────────────────────────── */}
          <Section className="border-t border-hairline">
            <Container>
              <div className="mx-auto max-w-3xl">
                <h2 className="type-title">등록하려면 무엇이 필요한가</h2>
                <p className="type-body mt-4 text-[15px]">
                  아래는 대응 여부와 관계없이, 전자금융업 등록에서 실제로 심사되는 항목입니다.
                  전부 조문에 적힌 것을 그대로 옮겼습니다.
                </p>

                <h3 className="mt-10 text-[19px] font-semibold tracking-[-0.02em] text-ink">
                  요건
                </h3>
                <div className="mt-4 space-y-4">
                  {REVIEW_REQUIREMENTS.map((q) => (
                    <Statute key={q.ref} quote={q} />
                  ))}
                </div>

                <h3 className="mt-12 text-[19px] font-semibold tracking-[-0.02em] text-ink">
                  등록신청서 첨부서류 <span className="font-normal text-ink-muted">영 제20조②</span>
                </h3>
                <ul className="mt-4 space-y-2">
                  {REVIEW_DOCUMENTS.map((d) => (
                    <li key={d} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                      <span aria-hidden className="mt-px shrink-0 text-ink-muted">
                        —
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>

                <h3 className="mt-12 text-[19px] font-semibold tracking-[-0.02em] text-ink">
                  처리기한
                </h3>
                <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-ink">
                  <li>등록 — {REVIEW_PERIOD.register}</li>
                  <li>허가 — {REVIEW_PERIOD.license}</li>
                </ul>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
                  {REVIEW_PERIOD.note}
                </p>

                {/* 손이 가장 많이 가는 곳. 이 도구가 상담으로 이어져야 할 자리다. */}
                <h3 className="mt-12 text-[19px] font-semibold tracking-[-0.02em] text-ink">
                  정보기술·정보보호 부문{' '}
                  <span className="font-normal text-ink-muted">고시 제7조</span>
                </h3>
                <p className="type-body mt-3 text-[14px]">
                  법 제21조제2항의 “금융위원회가 정하는 기준” 은 아래 8개 부문이며, 세부 기준은
                  고시 제8조부터 제36조에 있습니다. 등록 준비에서 가장 손이 많이 가는 부분입니다.
                </p>
                <ol className="mt-6 space-y-2">
                  {IT_SCOPE.map((s) => (
                    <li key={s.no} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                      <span aria-hidden className="mt-px shrink-0 font-mono text-[13px] text-ink-muted">
                        {s.no}
                      </span>
                      <span>{s.name}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Container>
          </Section>

          {/* ── 등록 이후에 붙는 의무 ────────────────────────────────── */}
          {nowDuties.length > 0 || duties.length > 0 ? (
            <Section className="border-t border-hairline bg-surface">
              <Container>
                <div className="mx-auto max-w-3xl">
                  <h2 className="type-title">등록 이후에 붙는 의무</h2>

                  {nowDuties.length > 0 ? (
                    <div className="mt-10">
                      <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
                        지금 이미 적용되는 것
                      </h3>
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
                        2026. 12. 17. 시행 개정으로 추가되는 것
                      </h3>
                      <p className="type-body mt-3 text-[14px]">
                        이미 등록한 사업자에게도 새로 붙습니다.
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
                      결과에 <b className="font-semibold">대조할 답변이 없습니다</b> 가 있거나,
                      구조가 위 질문으로 딱 나뉘지 않는다면 사업 구조를 함께 보는 편이 빠릅니다.
                      정보기술·정보보호 부문 요건 검토도 함께 진행합니다.
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
      ) : null}
    </>
  )
}
