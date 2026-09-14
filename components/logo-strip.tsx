import { features } from '@/content/features'
import { partnerLogos } from '@/content/site'
import { Container } from './ui'
import { Reveal } from './reveal'

/**
 * 파트너 표기. 실제 로고 이미지가 준비되면 텍스트를 <Image /> 로 교체한다.
 *
 * ⚠️ 제휴사 로고·상호는 **서면 사용 동의 후에만** 게재할 것.
 * ⚠️ `features.partnerLogos` 가 꺼져 있으면 **섹션 전체가 사라진다.**
 *    호출부(`app/page.tsx`)를 고칠 필요가 없도록 여기서 판단한다 —
 *    `MetricsBand` 와 같은 방식이다.
 *
 * ⚠️ **배경·상단선 래퍼를 이 컴포넌트가 직접 갖는다.** 호출부에 두면 안 된다 —
 *    실제로 그렇게 되어 있었고, 플래그를 끄자 `null` 만 사라지고 **빈 래퍼(높이 1px,
 *    `border-t` + `bg-surface`)가 남아** CTA 밴드 위에 hairline 이 두 줄로 겹쳤다.
 *    숨길 수 있는 섹션은 **자기 크롬을 자기가 소유해야** 깨끗하게 사라진다.
 */
export function LogoStrip() {
  if (!features.partnerLogos) return null

  return (
    <div className="border-t border-hairline bg-surface">
      <Container className="py-20">
        <Reveal as="p" className="text-center text-[13px] text-ink-muted">
          주요 VAN · PG · 금융기관과 연동합니다
        </Reveal>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-16">
          {partnerLogos.map((name, i) => (
            <Reveal
              as="li"
              key={name}
              delay={i * 40}
              className="text-[15px] font-medium tracking-[-0.01em] text-ink-muted/70"
            >
              {name}
            </Reveal>
          ))}
        </ul>
      </Container>
    </div>
  )
}
