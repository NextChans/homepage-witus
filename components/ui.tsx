import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/** 페이지 폭 컨테이너. Apple 은 본문 폭을 좁게 잡고 여백을 크게 쓴다. */
export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`mx-auto w-full max-w-[1120px] px-6 sm:px-8 ${className}`}>{children}</div>
}

/** 섹션. 수직 여백을 공격적으로 확보한다. */
export function Section({
  children,
  className = '',
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={`py-24 sm:py-32 lg:py-40 ${className}`}>
      {children}
    </section>
  )
}

const buttonBase =
  'inline-flex items-center justify-center rounded-full px-6 py-3 text-[15px] font-medium transition-colors duration-300 ease-[var(--ease-silk)]'

const buttonVariant = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-hairline text-ink hover:border-ink-muted',
} as const

type Variant = keyof typeof buttonVariant

/**
 * 버튼 클래스 문자열.
 *
 * 실제 `<button>` 이 필요한 곳(클립보드 복사 등)에서 쓴다. 링크가 아닌 동작 버튼을
 * `<a>` 로 흉내 내지 않기 위한 것이다 — 그렇게 하면 키보드·스크린리더에서 링크로
 * 읽힌다. **스타일은 여기 한 곳에서만 만든다.**
 */
export function buttonClass(variant: Variant = 'secondary', className = '') {
  return `${buttonBase} ${buttonVariant[variant]} ${className}`
}

/** 내부 라우팅용 버튼. */
export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />
}

/** tel:/mailto: 등 외부 스킴용 버튼. next/link 를 쓰지 않는다. */
export function ButtonAnchor({
  variant = 'secondary',
  className = '',
  ...props
}: ComponentProps<'a'> & { variant?: Variant }) {
  return <a className={buttonClass(variant, className)} {...props} />
}

/** 텍스트 링크 + 셰브런. 강조색은 여기서만 쓴다. */
export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 text-[15px] font-medium text-accent transition-colors duration-300 hover:text-accent-hover"
    >
      {children}
      <span
        aria-hidden
        className="transition-transform duration-300 ease-[var(--ease-silk)] group-hover:translate-x-0.5"
      >
        ›
      </span>
    </Link>
  )
}

/** 얇은 구분선. 색은 hairline 하나로 통일. */
export function Hairline() {
  return <hr className="border-0 border-t border-hairline" />
}
