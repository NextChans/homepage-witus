import { metrics } from '@/content/site'
import { Container } from './ui'
import { Reveal } from './reveal'

/**
 * 지표 개수에 맞는 열 수.
 *
 * ⚠️ **열 수를 하드코딩하지 않는다.** 지표를 4개에서 3개로 줄였을 때
 *    `grid-cols-2 lg:grid-cols-4` 가 그대로 남아 있으면 —
 *    데스크톱에서 **왼쪽으로 쏠리고 네 번째 칸이 빈다.** 모바일(2열)에서는
 *    마지막 하나가 혼자 남아 가운데가 아니라 **왼쪽에 붙는다.**
 *    서비스 카드에서 같은 실수를 한 적이 있다(`service-grid.tsx` 의 `cardSpan`).
 *
 * ⚠️ **Tailwind 는 클래스 문자열을 정적으로 스캔한다.** `grid-cols-${n}` 처럼
 *    조립하면 해당 CSS 가 생성되지 않아 **열이 아예 안 먹는다.** 정적 맵으로 둔다.
 */
const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-2 lg:grid-cols-3',
}

export function MetricsBand() {
  const cols = GRID_COLS[metrics.length] ?? 'grid-cols-2 lg:grid-cols-4'

  return (
    <div className="border-y border-hairline bg-surface">
      <Container className="py-14 sm:py-16">
        <dl className={`grid gap-x-6 gap-y-10 ${cols}`}>
          {metrics.map((m, i) => (
            <Reveal key={m.label} className="text-center" delay={i * 70}>
              <dt className="sr-only">{m.label}</dt>
              <dd>
                <span className="block text-[clamp(1.75rem,4.5vw,2.75rem)] font-semibold tracking-[-0.03em] text-ink">
                  {m.value}
                </span>
                <span className="mt-2 block text-[13px] text-ink-muted">{m.label}</span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </Container>
    </div>
  )
}
