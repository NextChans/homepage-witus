'use client'

import { useEffect, useRef, useState } from 'react'
import { buttonClass } from './ui'

/**
 * 이메일 주소 복사 버튼.
 *
 * ## 왜 있는가
 *
 * 이 사이트의 실질 창구는 **이메일 하나**다(`company.tel` 이 `null` 인 동안).
 * 그런데 `mailto:` 는 **핸들러가 등록돼 있지 않으면 아무 일도 일어나지 않는다** —
 * 에러도, 안내도 없다. 데스크톱 브라우저에서 기본 메일 앱이 지정돼 있지 않은
 * 경우가 흔하고, 그때 방문자에게 남는 대안은 0이다(전화가 없으므로).
 *
 * ⚠️ **`mailto:` 를 대체하지 않고 옆에 둔다.** 메일 앱이 뜨는 환경에서는 그쪽이
 *    여전히 가장 빠르다. 여기서 고치는 것은 "실패했다는 신호조차 없는" 경우다.
 *
 * ## 왜 클라이언트 컴포넌트인가
 *
 * 클립보드는 서버에서 만질 수 없다. 이 프로젝트에서 `'use client'` 는 상호작용이
 * 반드시 필요한 경우에만 쓴다(`CLAUDE.md`). 복사는 그 경우에 해당한다.
 */
type State = 'idle' | 'copied' | 'failed'

const LABEL: Record<State, string> = {
  idle: '주소 복사',
  copied: '복사했습니다',
  failed: '복사할 수 없습니다',
}

/** 상태 표시를 되돌리기까지의 시간(ms). 짧으면 못 보고, 길면 버튼이 멈춰 보인다. */
const RESET_MS = 2400

export function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<State>('idle')
  const timer = useRef<number | undefined>(undefined)

  // 복사 직후 이동하면 setState 가 언마운트된 컴포넌트에 걸린다.
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function handleClick() {
    window.clearTimeout(timer.current)
    setState((await writeToClipboard(email)) ? 'copied' : 'failed')
    timer.current = window.setTimeout(() => setState('idle'), RESET_MS)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      // ⚠️ 라벨 자체가 바뀌므로 live region 을 버튼에 건다. 별도 안내 문구를
      //    띄우면 버튼 옆 레이아웃이 밀린다.
      aria-live="polite"
      className={buttonClass('secondary')}
    >
      {LABEL[state]}
    </button>
  )
}

/**
 * 클립보드 쓰기. 성공 여부를 돌려준다.
 *
 * ⚠️ **실패를 삼키지 않는다.** 조용히 실패하면 `mailto:` 와 똑같은 문제를 하나 더
 *    만드는 것이다. 실패하면 버튼 라벨이 그렇게 말하고, 주소는 화면에 그대로 있다.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 권한 거부 또는 비보안 컨텍스트(http). 아래 폴백으로 넘어간다.
    // ⚠️ 에러 객체를 로그로 남기지 않는다 — 콘솔에 입력값이 찍히게 하지 않는다.
  }
  return legacyCopy(text)
}

/** `navigator.clipboard` 가 없는 환경(비보안 컨텍스트·구형 브라우저)용 폴백. */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false

  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  // 화면 밖으로 보내면 iOS 에서 select() 가 동작하지 않는다. 보이지 않게만 둔다.
  el.style.position = 'fixed'
  el.style.top = '0'
  el.style.opacity = '0'
  el.style.pointerEvents = 'none'
  document.body.appendChild(el)

  try {
    el.select()
    el.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    el.remove()
  }
}
