import type { ReactNode } from 'react'
import { Reveal } from './reveal'
import { Container } from './ui'

type FeatureSplitProps = {
  eyebrow: string
  title: ReactNode
  body: ReactNode
  points?: readonly string[]
  /**
   * 시각 패널에 들어갈 내용. **장식이 아니라 정보여야 한다.**
   *
   * 선택 항목이다 — 보여줄 **근거 있는 정보가 없으면 넣지 않는다.**
   * 빈칸을 채우려고 플레이스홀더 수치(`XX%` 등)를 넣지 말 것. 없으면 단일 컬럼으로
   * 렌더되고, 그 편이 근거 없는 숫자를 띄우는 것보다 낫다.
   */
  panel?: ReactNode
  /** true 면 패널이 왼쪽으로 간다. */
  reverse?: boolean
}

export function FeatureSplit({
  eyebrow,
  title,
  body,
  points,
  panel,
  reverse = false,
}: FeatureSplitProps) {
  return (
    <Container className="py-20 sm:py-24">
      {/* 패널이 없으면 2단 그리드를 쓰지 않는다 — 빈 칸이 생긴다. */}
      <div className={panel ? 'grid items-center gap-12 lg:grid-cols-2 lg:gap-20' : 'max-w-2xl'}>
        <Reveal className={panel && reverse ? 'lg:order-2' : undefined}>
          <p className="type-eyebrow">{eyebrow}</p>
          <h2 className="type-title mt-4 max-w-md">{title}</h2>
          <p className="type-body mt-5 max-w-md">{body}</p>
          {points ? (
            <ul className="mt-8 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex gap-3 text-[15px] text-ink">
                  <span aria-hidden className="mt-px shrink-0 text-accent">
                    —
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Reveal>

        {panel ? (
          <Reveal
            delay={80}
            className={`rounded-squircle-lg border border-hairline bg-surface p-10 shadow-lift sm:p-12 ${
              reverse ? 'lg:order-1' : ''
            }`}
          >
            {panel}
          </Reveal>
        ) : null}
      </div>
    </Container>
  )
}

/**
 * 패널용 정보 테이블. 수치는 크게, 라벨은 작게.
 *
 * ⚠️ **현재 사용처가 없다.** 사업 시작 전이라 게재할 근거 있는 수치가 없어
 *    홈에서 내렸다(2026-09-13). 지우지 않고 남겨 둔다 — 실적이 쌓이면 그대로 쓴다.
 *    쓸 때는 **근거 자료가 있는 항목만** 넣는다(표시광고법).
 */
export function PanelStats({
  rows,
}: {
  rows: readonly { value: string; label: string }[]
}) {
  return (
    <dl className="divide-y divide-hairline">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-6 py-5 first:pt-0 last:pb-0">
          <dt className="text-[14px] text-ink-muted">{r.label}</dt>
          <dd className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
