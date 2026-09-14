import { CtaBand } from '@/components/cta-band'
import { FeatureSplit } from '@/components/feature-split'
import { Hero } from '@/components/hero'
import { LogoStrip } from '@/components/logo-strip'
import { MetricsBand } from '@/components/metrics-band'
import { ProcessSteps } from '@/components/process-steps'
import { ServiceGrid } from '@/components/service-grid'
import { ButtonLink, Container, Section } from '@/components/ui'
import { Reveal } from '@/components/reveal'

const journey = [
  {
    step: '01',
    title: '진단',
    body: '자금 흐름과 결제 구조를 도식화해 필요한 등록과 연동을 특정합니다.',
  },
  { step: '02', title: '설계', body: '규제 요건과 기술 요건을 하나의 일정표로 합칩니다.' },
  { step: '03', title: '실행', body: '서류 제출과 연동 일정, 검증을 나란히 관리합니다.' },
  { step: '04', title: '운영', body: '오픈 후 정기 보고 체계와 장애 접수 창구를 정리해 넘겨드립니다.' },
] as const

export default function HomePage() {
  return (
    <>
      <Hero
        eyebrow="전자금융 인프라 파트너"
        title={
          // ⚠️ 줄바꿈을 **명시한다.** `display` 스케일에서 브라우저에 맡기면
          //    `복잡한 온오프라인 결제.` 가 스스로 두 줄로 꺾여 **1440px 에서도
          //    3줄**이 된다(의도는 2줄). 후보 5개를 실제 렌더로 측정해 이 분할만
          //    390 · 768 · 1440px 에서 의도대로 유지되는 것을 확인했다.
          //    ⚠️ 문구를 늘리면 **다시 측정한다.** 한 글자가 줄 수를 바꾼다.
          <>
            복잡한
            <br />
            온오프라인 결제.
            <br />
            단순한 시작.
          </>
        }
        lede="오프라인 결제 단말기와 키오스크부터 PG 가맹점 등록, 전자금융업 등록과 금융 클라우드, 오픈뱅킹 컨설팅까지. 흩어진 절차를 한 팀이 끝냅니다."
        actions={
          <>
            <ButtonLink href="/contact">상담 신청</ButtonLink>
            <ButtonLink href="/services" variant="secondary">
              서비스 살펴보기
            </ButtonLink>
          </>
        }
        meta="전화·이메일로 문의를 받습니다"
      />

      <MetricsBand />

      <ServiceGrid />

      <div className="border-t border-hairline">
        <FeatureSplit
          eyebrow="왜 한 팀인가"
          title={
            <>
              규제와 기술은
              <br />
              같은 일정 위에 있습니다.
            </>
          }
          body="등록은 법무, 연동은 개발사. 창구가 나뉘면 일정이 어긋나고 오픈이 밀립니다. 요건 진단부터 검증까지 하나의 창구가 같은 계획표로 관리합니다."
          points={[
            '규제 일정과 개발사 일정을 하나의 계획표로 관리',
            '보완 요청이 오면 서류와 연동 사항을 함께 챙김',
            '오픈 이후 정기 보고 주체까지 사전에 지정',
          ]}
        />
      </div>

      <Section className="border-t border-hairline">
        <Container>
          <div className="max-w-2xl">
            <Reveal as="p" className="type-eyebrow">
              진행 방식
            </Reveal>
            <Reveal as="h2" className="type-headline mt-4" delay={60}>
              네 단계.
              <br />
              그 이상은 없습니다.
            </Reveal>
          </div>
          <div className="mt-14">
            <ProcessSteps steps={journey} />
          </div>
        </Container>
      </Section>

      <div className="border-t border-hairline bg-surface">
        <LogoStrip />
      </div>

      <CtaBand />
    </>
  )
}
