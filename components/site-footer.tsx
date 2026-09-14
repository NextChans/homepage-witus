import Link from 'next/link'
import { features } from '@/content/features'
import { company, nav, site, telHref } from '@/content/site'
import { services } from '@/content/services'
import { BrandMark } from './brand-mark'
import { Container } from './ui'

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-surface">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[13px] font-semibold text-ink">서비스</p>
            <ul className="mt-4 space-y-2.5">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="text-[13px] text-ink-muted transition-colors duration-300 hover:text-ink"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink">회사</p>
            <ul className="mt-4 space-y-2.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-ink-muted transition-colors duration-300 hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {features.privacyPolicy ? (
                <li>
                  <Link
                    href="/privacy"
                    className="text-[13px] text-ink-muted transition-colors duration-300 hover:text-ink"
                  >
                    개인정보처리방침
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="text-[13px] font-semibold text-ink">문의</p>
            <dl className="mt-4 space-y-2.5 text-[13px] text-ink-muted">
              {/* 전화는 미개통이면 줄째로 접는다 — 없는 번호를 걸어 두지 않는다.
                  `content/site.ts` 의 `company.tel` 에 값이 들어오면 자동으로 복구된다. */}
              {company.tel && telHref ? (
                <div className="flex gap-3">
                  <dt className="w-14 shrink-0">전화</dt>
                  <dd>
                    <a href={telHref} className="hover:text-ink">
                      {company.tel}
                    </a>
                  </dd>
                </div>
              ) : null}
              <div className="flex gap-3">
                <dt className="w-14 shrink-0">이메일</dt>
                <dd>
                  <a href={`mailto:${company.email}`} className="hover:text-ink">
                    {company.email}
                  </a>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-14 shrink-0">운영시간</dt>
                <dd>{company.hours}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 브랜드 락업 — 심볼 + 워드마크 + 영문 보조 문구.
            헤더는 좁아 심볼+사명까지만 두고, 유래를 담은 `motto` 는 여기 둔다. */}
        <div className="mt-12 flex items-center gap-2.5 border-t border-hairline pt-8 text-ink">
          <BrandMark className="h-6 w-auto" />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">{site.name}</span>
          <span className="text-[11px] font-medium tracking-[0.14em] text-ink-muted">
            {site.motto}
          </span>
        </div>

        <div className="mt-6">
          {/* 사업자 표시 정보. **확정된 항목만** 이어 붙인다 — 미확정 값을 그럴듯한
              플레이스홀더로 채우면 실제 도메인에 허위 표시가 나간다(2026-09-14 이전
              상태가 그랬다). 값이 확정되면 `content/site.ts` 만 고치면 된다. */}
          <p className="text-[12px] leading-relaxed text-ink-muted">
            {[
              site.legalName,
              `대표 ${company.ceo}`,
              company.bizNo ? `사업자등록번호 ${company.bizNo}` : null,
              company.address,
            ]
              .filter((v): v is string => Boolean(v))
              .join(' · ')}
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">
            개인정보 보호책임자 {company.privacyOfficer}
          </p>
          <p className="mt-4 text-[12px] text-ink-muted">
            © {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>
          {/* ⚠️ 이 문구를 "템플릿 예시입니다" 로 되돌리지 말 것.
              커스텀 도메인(witus.kr)이 붙기 전에는 맞는 말이었지만, 실제 사명·대표자·
              대표 이메일이 들어간 지금은 **자기 사이트를 스스로 가짜라고 선언하는 문장**이
              된다. 플레이스홀더 수치는 `features.metrics` 로 내렸고 회사 정보는 미확정
              항목을 `null` 로 접었으므로, 남길 것은 **자문 아님 고지**뿐이다. */}
          <p className="mt-4 text-[12px] leading-relaxed text-ink-muted/80">
            본 사이트의 내용은 일반적인 정보 제공을 목적으로 하며, 개별 사안에 대한 법률·규제
            자문 의견이나 확정된 계약 조건을 구성하지 않습니다. 실제 진행 요건과 조건은 상담을
            통해 확정됩니다.
          </p>
        </div>
      </Container>
    </footer>
  )
}
