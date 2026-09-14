/**
 * 전자금융업 등록 대상 자가진단 — 질문과 판정 규칙
 *
 * ## ⚠️ 공개 전 반드시 법무 검토를 받는다
 *
 * 조문·금액은 아래 `LAW_BASIS.sources` 의 원문(법제처 PDF)과 한 줄씩 대조했다.
 * 그러나 **대조했다는 것과 해석이 맞다는 것은 다르다** — 어떤 사업 구조가 어느
 * 조문에 걸리는지는 법률 판단이다. `features.eligibilityCheck` 가 꺼져 있는 이유다.
 *
 * 틀리면 이 도구의 값은 0이 아니라 **음수**가 된다. 규제를 안다고 내건 회사가
 * 규제를 틀리게 안내한 것이 되기 때문이다.
 *
 * ## 2026-09-14 원문 대조에서 실제로 나온 오류 (기록용)
 *
 * 공개 자료만 보고 쓴 초안에 아래가 있었다. 원문을 보고서야 잡혔다.
 *
 * 1. **선불 1가맹점 면제** — "다른 곳 1군데면 면제" 로 썼다. 법 제28조③1가는
 *    "하나의 가맹점(**가맹점의 사업주가 동일한 경우로 한정**한다)" 이다. 사업주가
 *    다르면 면제가 아니다.
 * 2. **PG 면제의 미래** — "2026. 12. 17. 개정이 중개업 부수 정산을 제외한다" 고
 *    썼다. 정반대다. 법 제28조③2(정보만 전달하는 PG 면제)가 **삭제**된다.
 *    지금 면제받는 쪽이 등록 대상이 된다.
 * 3. **분기 거래총액 기준** — 300억만 알고 있었다. 현행 법 제30조③의 기준은
 *    **30억**이고, 300억은 2026. 12. 17. 개정이 신설하는 세 번째 구간이다.
 * 4. **선불충전금 100% 별도관리** — 개정으로 생기는 의무로 적었다. 영 제13조의2②가
 *    이미 100분의 100을 요구한다. **현행 의무**다.
 *
 * 공통점: 넷 다 "숫자는 맞는데 붙는 자리가 틀렸다". 조문 번호를 함께 적지 않으면
 * 이런 건 검토자도 못 잡는다 → 그래서 `Verdict.lawRef` 를 둔다.
 *
 * ## 2026-09-14 2차 — 고시까지 받고 나서 (질문이 조문을 덜 담고 있었다)
 *
 * 판정은 맞았는데 **질문이 조문의 요건을 일부만 묻고 있었다.** 답하는 사람이 다른
 * 것을 생각하고 답하면 판정도 같이 틀어진다.
 *
 * - **거래금액 기준** — "분기별 전자금융거래 총액" 이라고 물었다. 고시 제42조의2①은
 *   **업종별 금액**(결제대행금액·결제대금예치금액·전자고지결제금액)이고, 결제대행금액은
 *   **이용자가 지급한 재화·용역의 매출총액**이다. 수수료 수익으로 답하면 자릿수가 틀린다.
 * - **결제대금예치** — 영 제15조③1호는 「전자상거래법」 제13조②10호에 **한정**한다.
 * - **전자고지결제** — 영 제15조③2호는 고지 + 자금 직접 수수 + 정산 대행 **3요소**다.
 * - **전자자금이체** — 법 제2조12호는 지급지시와 **추심이체** 둘 다다.
 * - **선불 발행잔액** — 고시 제42조①1호는 **각 분기말 잔액의 단순평균**이다. 특정 시점의
 *   잔액이 아니다.
 *
 * ⚠️ **남은 미해결** — 법 제2조14호의 "대통령령으로 정하는 특수관계인" 범위를 시행령에서도
 *    고시에서도 찾지 못했다. 계열사에서 쓰이는 포인트가 "발행인 외의 제3자" 인지가 여기서
 *    갈린다. 확인 전까지 `prepaidReach` 안내로 "모르겠다" 를 유도한다 —
 *    **없는 의무를 있다고 말하는 쪽이 더 나쁘다.**
 *
 * ## 왜 결정 트리가 아니라 독립 판정인가
 *
 * **하나의 서비스가 여러 업종에 동시에 해당한다.** 플랫폼이 대금을 정산하면서
 * (PG) 포인트도 발행하고(선불) 구매확정까지 대금을 잡아두면(결제대금예치)
 * 셋 다이다. 트리는 답을 하나만 내므로 **둘을 놓친다.**
 *
 * 그리고 영 제17조④가 **둘 이상이면 자본금을 합산**하라고 한다(50억 상한).
 * 트리로는 이 합산을 애초에 보여줄 수 없다.
 *
 * ## 왜 '모르겠다' 가 기능인가
 *
 * 어느 질문이든 판정에 필요한 답이 `unsure` 면 그 업종은 `확인 필요` 로 뺀다.
 * 추정해서 답하면 이 도구의 유일한 값(정확성)이 무너진다. 그리고 애매한
 * 케이스는 원래 사람이 봐야 하므로 **상담 전환에도 이쪽이 낫다.**
 */

/** 근거 기준일과 대조한 원문. 법령이 바뀌면 이 값과 아래 기준을 함께 고친다. */
export const LAW_BASIS = {
  /** 이 파일의 기준을 원문과 대조한 날 */
  checkedAt: '2026-09-14',
  /** 현재 시행 중인 법률 */
  current: '2026. 4. 28. 시행 (법률 제21205호 일부 · 대통령령 제36281호)',
  /** 곧 시행되는 개정 — 결과를 이 시점 전후로 나눠 보여주는 근거 */
  upcoming: { date: '2026-12-17', promulgated: '2025-12-16' },
  /** 대조한 원문. 재검토 때 같은 것을 다시 받으면 된다. */
  sources: [
    '전자금융거래법 (법률 제21205호, 시행 2025. 12. 16.)',
    '전자금융거래법 (법률 제21205호, 시행 2026. 12. 17.)',
    '전자금융거래법 시행령 (대통령령 제36281호, 시행 2026. 4. 28.)',
    '전자금융감독규정 (금융위원회고시 제2026-29호, 시행 2026. 7. 15.)',
  ],
} as const

export type Answer = 'yes' | 'no' | 'unsure'

/**
 * 선불 사용처 범위.
 *
 * 법 제28조③1가의 면제는 "하나의 가맹점(**사업주가 동일한 경우로 한정**)" 이다.
 * 따라서 가르는 선은 가맹점 **개수**가 아니라 **사업주가 같은가**이다.
 * `others` 는 1곳이든 10곳이든 사업주가 다르면 전부 여기에 들어온다.
 */
export type Reach = 'self' | 'sameOwner' | 'others' | 'unsure'

/**
 * 분기별 전자금융거래 총액 구간.
 *
 * - 현행 법 제30조③: **30억** 이하(3억) / 초과(5억 이상 → 영 제17조③이 상향)
 * - 2026. 12. 17.: 30억 이하(3억) / 30억~**300억**(5억) / 300억 초과(10억)
 *
 * 그래서 두 경계를 모두 물어야 현재와 이후를 같이 답할 수 있다.
 */
export type Volume = 'under30' | 'to300' | 'over300' | 'unsure'

export type Answers = {
  /** 카드사·은행과 결제 승인/취소 정보를 주고받는가 (PG 정의의 앞단) */
  paymentInfo: Answer
  /** 고객 대금이 우리 명의 계좌를 거쳐 판매자에게 가는가 (면제 여부를 가른다) */
  funds: Answer
  /** 충전식 잔액(포인트·머니)을 발행하는가 */
  prepaid: Answer
  /** (prepaid=yes) 발행사 외 어디서 쓸 수 있는가 */
  prepaidReach: Reach
  /** (prepaid=yes) 미사용 충전잔액이 30억 이상인가 */
  prepaidBalanceOver: Answer
  /** (prepaid=yes) 연간 총발행액이 500억 이상인가 */
  prepaidIssueOver: Answer
  /** 구매확정까지 대금을 보관했다가 지급하는가 */
  escrow: Answer
  /** 고객 계좌에서 직접 출금(이체)을 일으키는가 */
  transfer: Answer
  /** 고지 내역을 대신 보여주고 수납받는가 */
  billing: Answer
  /** 분기 전자금융거래 총액 구간 — 자본금을 가른다 */
  volume: Volume
}

export const EMPTY_ANSWERS: Answers = {
  paymentInfo: 'unsure',
  funds: 'unsure',
  prepaid: 'unsure',
  prepaidReach: 'unsure',
  prepaidBalanceOver: 'unsure',
  prepaidIssueOver: 'unsure',
  escrow: 'unsure',
  transfer: 'unsure',
  billing: 'unsure',
  volume: 'unsure',
}

// ── 질문 ────────────────────────────────────────────────────────────────────
//
// ⚠️ **비전문가가 답할 수 있는 말로 쓴다.** "전자지급결제대행에 해당하십니까"
//    는 물어봐야 소용이 없다. 자금과 정보가 어떻게 흐르는지를 묻는다.

export type Choice = { value: string; label: string }
export type Question = {
  key: keyof Answers
  text: string
  help?: string
  /** 이 질문이 의미를 갖는 조건. 안내 문구로만 쓰고 숨기지는 않는다 */
  onlyIf?: string
  choices: readonly Choice[]
}

const YES_NO: readonly Choice[] = [
  { value: 'yes', label: '예' },
  { value: 'no', label: '아니오' },
  { value: 'unsure', label: '모르겠다' },
]

export const questions: readonly Question[] = [
  {
    key: 'paymentInfo',
    text: '카드사·은행과 결제 승인·취소 정보를 주고받나요?',
    help:
      '법 제2조제19호는 “지급결제정보를 송신하거나 수신하는 것” 자체를 전자지급결제대행으로 봅니다. ' +
      '자금을 만지지 않고 정보만 전달해도 해당합니다.',
    choices: YES_NO,
  },
  {
    key: 'funds',
    text: '고객이 낸 대금이 우리 명의 계좌를 거쳐 판매자에게 가나요?',
    help:
      '자금을 수수하지 않고 정보만 단순 전달하면 지금은 등록이 면제됩니다(영 제15조⑦). ' +
      '다만 이 면제 조항은 2026. 12. 17.에 삭제됩니다.',
    choices: YES_NO,
  },
  {
    key: 'prepaid',
    text: '고객이 미리 충전해두고 쓰는 잔액(포인트·머니·캐시)을 발행하나요?',
    help: '구매 후 적립되는 보상 포인트가 아니라, 현금을 받고 발행하는 잔액을 말합니다.',
    choices: YES_NO,
  },
  {
    key: 'prepaidReach',
    text: '그 잔액을 어디에서 쓸 수 있나요?',
    help:
      '법 제28조제3항제1호 가목의 면제는 “하나의 가맹점(가맹점의 사업주가 동일한 경우로 한정)” 입니다. ' +
      '가맹점 수가 아니라 사업주가 같은지가 기준입니다. ' +
      '계열사·특수관계인에서 쓰이는 경우는 법 제2조제14호의 “발행인(특수관계인 포함) 외의 제3자” 에 ' +
      '해당하는지가 갈립니다. 그 범위를 정한 규정을 확인하지 못했으므로 “모르겠다” 를 고르세요.',
    onlyIf: '충전식 잔액을 발행하는 경우',
    choices: [
      { value: 'self', label: '발행사인 우리에게만 쓴다' },
      { value: 'sameOwner', label: '사업주가 같은 가맹점 한 곳에서만 쓴다' },
      { value: 'others', label: '사업주가 다른 곳에서도 쓴다' },
      { value: 'unsure', label: '모르겠다' },
    ],
  },
  {
    key: 'prepaidBalanceOver',
    text: '발행잔액(아직 쓰이지 않은 충전잔액)이 30억 원 이상인가요?',
    help:
      '고시 제42조제1항제1호 — 직전 사업연도 1분기부터 등록신청일 직전 분기까지 ' +
      '각 분기말 미상환 발행잔액의 단순평균입니다. 특정 시점의 잔액이 아닙니다.',
    onlyIf: '충전식 잔액을 발행하는 경우',
    choices: YES_NO,
  },
  {
    key: 'prepaidIssueOver',
    text: '연간 총발행액이 500억 원 이상인가요?',
    help:
      '직전 사업연도에 발행된 총 발행금액입니다(고시 제42조제1항제2호). ' +
      '법 제28조제3항제1호 나목은 발행잔액 “및” 연간 총발행액이므로 ' +
      '두 기준을 둘 다 밑돌아야 면제됩니다(영 제15조⑤ — 30억 원 / 500억 원).',
    onlyIf: '충전식 잔액을 발행하는 경우',
    choices: YES_NO,
  },
  {
    key: 'escrow',
    text: '통신판매에서 구매확정 때까지 대금을 맡아뒀다가 판매자에게 주나요?',
    help:
      '영 제15조제3항제1호는 「전자상거래 등에서의 소비자보호에 관한 법률」 제13조제2항제10호에 따라 ' +
      '결제대금을 예치받는 업무로 한정합니다. B2B 거래처럼 그 법의 통신판매 밖에서 대금을 보관하는 경우는 ' +
      '판단이 갈리므로 “모르겠다” 를 고르세요.',
    choices: YES_NO,
  },
  {
    key: 'transfer',
    text: '고객 계좌와 다른 계좌 사이의 자금 이동 지시를 우리가 처리하나요?',
    help:
      '법 제2조제12호는 두 가지를 모두 포함합니다 — 지급인의 지급지시(보내기)와 ' +
      '수취인의 추심지시(가져오기, 자동이체·CMS 출금). 둘 중 하나라도 해당하면 “예” 입니다.',
    choices: YES_NO,
  },
  {
    key: 'billing',
    text: '고지 내역을 대신 보여주고, 대금을 직접 받아 수취인에게 정산까지 해주나요?',
    help:
      '영 제15조제3항제2호는 세 가지를 모두 요구합니다 — ① 수취인을 대행해 지급 내역을 전자적으로 고지하고 ' +
      '② 자금을 직접 수수하며 ③ 그 정산을 대행할 것. 고지만 하고 자금은 만지지 않으면 해당하지 않습니다.',
    choices: YES_NO,
  },
  {
    key: 'volume',
    text: '분기별 결제대행금액(또는 결제대금예치·전자고지결제 금액)이 어느 정도인가요?',
    help:
      '고시 제42조의2제1항의 기준입니다. 결제대행금액은 “이용자가 지급한 재화 및 용역의 매출총액” 이므로 ' +
      '우리가 받는 수수료 수익이 아니라 거래액으로 답하세요. ' +
      '300억 원 구간은 2026. 12. 17. 시행 개정으로 새로 생기며, 그 구간의 기준은 아직 고시되지 않았습니다.',
    onlyIf: '결제대행·결제대금예치·전자고지결제에 해당하는 경우',
    choices: [
      { value: 'under30', label: '30억 원 이하' },
      { value: 'to300', label: '30억 초과 ~ 300억 원 이하' },
      { value: 'over300', label: '300억 원 초과' },
      { value: 'unsure', label: '모르겠다' },
    ],
  },
]

// ── 판정 ────────────────────────────────────────────────────────────────────

export type Level = 'likely' | 'exempt' | 'unlikely' | 'unsure'

export type Verdict = {
  slug: string
  name: string
  /** 등록인지 허가인지 */
  license: '등록' | '허가'
  /** 현행 시행령 기준 자본금. 검토자가 대조할 수 있도록 조문을 함께 낸다 */
  capital: string
  /** 현재 시행 기준 판정 */
  now: Level
  /** 2026. 12. 17. 이후 판정. 현재와 같으면 생략 */
  after?: Level
  /** 왜 그렇게 봤는지 — 화면에 그대로 보여준다 */
  reason: string
  /** 2026. 12. 17. 이후가 달라지는 이유 */
  afterReason?: string
  /** 근거 조문. **이걸 빼면 법무 검토가 불가능해진다** */
  lawRef: string
  /** 이어질 서비스 페이지 slug */
  serviceSlug: string
}

/** 판정에 쓰이는 답이 하나라도 `unsure` 면 판정하지 않는다. */
function anyUnsure(...values: string[]): boolean {
  return values.includes('unsure')
}

/**
 * 분기 거래총액 구간별 자본금 (영 제17조②③).
 *
 * 현행 시행령은 **30억 이하 / 초과** 두 구간뿐이라 `to300` 과 `over300` 이 같은
 * 금액이 된다. 2026. 12. 17. 개정 법률이 세 구간으로 나누므로 시행령도 따라
 * 바뀔 것이고, 그때 이 표를 고친다.
 */
function capitalFor(volume: Volume, small: string, large: string): string {
  if (volume === 'under30') return `${small} (영 제17조②)`
  if (volume === 'to300' || volume === 'over300') return `${large} (영 제17조③)`
  return `${small} ~ ${large} — 분기별 결제대행금액 등에 따라 (영 제17조②③)`
}

export function evaluate(a: Answers): Verdict[] {
  const out: Verdict[] = []

  // ── 전자지급결제대행 (PG) ────────────────────────────────────────────────
  //
  // ⚠️ 이 업종만 두 축으로 본다.
  //   - 해당 여부: 결제정보를 송·수신하는가 (법 제2조19호)
  //   - 면제 여부: 자금을 수수하는가 (법 제28조③2 + 영 제15조⑦)
  // 초안은 `funds` 하나로 둘 다 판단해서, **정보만 전달하는 사업자를 아예
  // 해당 없음으로 떨어뜨렸다.** 그쪽이야말로 2026. 12. 17.에 등록 대상이 된다.
  {
    let now: Level
    let reason: string
    let after: Level | undefined
    let afterReason: string | undefined

    if (anyUnsure(a.paymentInfo)) {
      now = 'unsure'
      reason = '결제정보 송·수신 여부에 대한 답이 없어 판정하지 않았습니다.'
    } else if (a.paymentInfo === 'no' && a.funds !== 'yes') {
      now = a.funds === 'unsure' ? 'unsure' : 'unlikely'
      reason =
        a.funds === 'unsure'
          ? '자금 흐름에 대한 답이 없어 판정하지 않았습니다.'
          : '결제정보를 주고받지도, 대금을 수수하지도 않는 구조로 보입니다.'
    } else if (a.funds === 'unsure') {
      now = 'unsure'
      reason = '전자지급결제대행에는 해당하나, 자금 수수 여부를 알아야 면제가 판정됩니다.'
    } else if (a.funds === 'no') {
      now = 'exempt'
      reason =
        '자금을 수수하지 않고 결제정보만 전달하는 구조로 보여 현재는 등록이 면제됩니다.'
      after = 'likely'
      afterReason =
        '이 면제 근거인 법 제28조제3항제2호가 삭제됩니다. 면제 없이 등록 대상이 됩니다.'
    } else {
      now = 'likely'
      reason = '고객 대금이 귀사 명의 계좌를 거쳐 판매자에게 갑니다.'
    }

    out.push({
      slug: 'pg',
      name: '전자지급결제대행업 (PG)',
      license: '등록',
      capital: capitalFor(a.volume, '3억 원', '10억 원'),
      now,
      after,
      reason,
      afterReason,
      lawRef:
        '법 제2조19호 · 제28조②4호 · 제28조③2호(2026. 12. 17. 삭제) · 영 제15조⑦ · 고시 제42조의2①',
      serviceSlug: 'pg-agency',
    })
  }

  // ── 선불전자지급수단 ─────────────────────────────────────────────────────
  {
    let level: Level
    let reason: string
    if (anyUnsure(a.prepaid)) {
      level = 'unsure'
      reason = '충전식 잔액 발행 여부에 대한 답이 없어 판정하지 않았습니다.'
    } else if (a.prepaid === 'no') {
      level = 'unlikely'
      reason = '충전식 잔액을 발행하지 않는 것으로 보입니다.'
    } else if (a.prepaidReach === 'unsure') {
      level = 'unsure'
      reason = '사용처 범위에 대한 답이 없어 판정하지 않았습니다.'
    } else if (a.prepaidReach === 'self') {
      level = 'unlikely'
      reason =
        '발행사 안에서만 쓰이면 법 제2조제14호의 “발행인 외의 제3자” 요건을 채우지 못해 ' +
        '선불전자지급수단으로 보지 않습니다.'
    } else if (a.prepaidReach === 'sameOwner') {
      level = 'exempt'
      reason =
        '사업주가 동일한 하나의 가맹점에서만 쓰이면 등록이 면제될 수 있습니다. ' +
        '사업주가 다른 곳이 한 곳이라도 더해지는 순간 이 면제는 사라집니다.'
    } else if (anyUnsure(a.prepaidBalanceOver, a.prepaidIssueOver)) {
      level = 'unsure'
      reason = '규모 기준에 대한 답이 없어 판정하지 않았습니다.'
    } else if (a.prepaidBalanceOver === 'no' && a.prepaidIssueOver === 'no') {
      level = 'exempt'
      reason =
        '발행잔액 30억 원 미만이면서 연간 총발행액 500억 원 미만이라 등록이 면제될 수 있습니다. ' +
        '두 기준 중 하나라도 넘으면 대상이 됩니다.'
    } else {
      level = 'likely'
      reason = '사업주가 다른 곳에서 쓰이고 규모 기준을 넘어 등록 대상으로 보입니다.'
    }
    out.push({
      slug: 'prepaid',
      name: '선불전자지급수단 발행·관리업',
      license: '등록',
      capital: '20억 원 (영 제17조①3호)',
      now: level,
      reason,
      lawRef: '법 제2조14호 · 제28조②3호 · 제28조③1호 가목·나목 · 영 제15조⑤ · 고시 제42조①',
      serviceSlug: 'efin-license',
    })
  }

  // ── 결제대금예치 · 전자자금이체 · 전자고지결제 ───────────────────────────
  const simple: readonly {
    slug: string
    name: string
    capital: string
    lawRef: string
    key: 'escrow' | 'transfer' | 'billing'
    yes: string
    no: string
  }[] = [
    {
      slug: 'escrow',
      name: '결제대금예치업 (에스크로)',
      capital: capitalFor(a.volume, '3억 원', '10억 원'),
      lawRef: '법 제28조②5호 · 영 제15조③1호 · 영 제17조②③ · 고시 제42조의2①',
      key: 'escrow',
      yes: '구매확정 시점까지 대금을 보관하는 구조로 보입니다.',
      no: '대금을 보관하지 않는 것으로 보입니다.',
    },
    {
      slug: 'transfer',
      name: '전자자금이체업',
      capital: '30억 원 (영 제17조①1호)',
      lawRef: '법 제2조12호(지급지시·추심이체) · 제28조②1호 · 영 제17조①1호',
      key: 'transfer',
      yes: '고객 계좌에서 직접 출금을 일으키는 구조로 보입니다.',
      no: '직접 출금을 일으키지 않는 것으로 보입니다.',
    },
    {
      slug: 'billing',
      name: '전자고지결제업',
      capital: capitalFor(a.volume, '3억 원', '5억 원'),
      lawRef: '법 제28조②5호 · 영 제15조③2호 · 영 제17조②③ · 고시 제42조의2①',
      key: 'billing',
      yes: '고지 내역을 대신 제시하고 수납받는 구조로 보입니다.',
      no: '고지·수납 대행을 하지 않는 것으로 보입니다.',
    },
  ]

  for (const s of simple) {
    const v = a[s.key]
    out.push({
      slug: s.slug,
      name: s.name,
      license: '등록',
      capital: s.capital,
      now: v === 'unsure' ? 'unsure' : v === 'yes' ? 'likely' : 'unlikely',
      reason: v === 'unsure' ? '답이 없어 판정하지 않았습니다.' : v === 'yes' ? s.yes : s.no,
      lawRef: s.lawRef,
      serviceSlug: 'efin-license',
    })
  }

  return out
}

/** 등록 대상으로 보이는 업종 수. 자본금 합산 안내를 낼지 결정한다. */
function likelyCount(verdicts: Verdict[]): number {
  return verdicts.filter((v) => v.now === 'likely' || v.after === 'likely').length
}

/**
 * 현재 시행 기준으로 이미 지고 있는 의무 중, 놓치기 쉬운 것.
 *
 * ⚠️ 초안은 선불충전금 100% 별도관리를 **개정으로 생기는 의무**로 적었다.
 *    영 제13조의2②가 이미 100분의 100을 요구한다 — 지금 의무다.
 */
export function currentDuties(a: Answers, verdicts: Verdict[]): string[] {
  const has = (slug: string) => verdicts.some((v) => v.slug === slug && v.now === 'likely')
  const duties: string[] = []

  // 소규모 구간으로 등록한 뒤 규모가 커지면 조용히 위법해지는 자리다.
  // 기한이 "금융위원회가 정하는 기한" 이라 법률만 봐서는 알 수 없다 — 고시에 6월로 있다.
  if (a.volume === 'under30' && (has('pg') || has('escrow') || has('billing'))) {
    duties.push(
      '소규모(분기 30억 원 이하) 기준으로 등록한 뒤 2분기 이상 계속 그 기준을 넘으면 ' +
        '금융위원회에 신고하고, 신고한 때로부터 6개월 이내에 상위 구간의 자본금 요건을 갖춰야 합니다 ' +
        '(법 제30조④ · 고시 제42조의2②).',
    )
  }

  if (has('prepaid')) {
    duties.push(
      '선불충전금 전액(100분의 100)을 은행 등을 통해 신탁·예치·지급보증보험으로 별도관리해야 합니다 ' +
        '(법 제25조의2① · 영 제13조의2②). 매 영업일 점검 의무도 함께 붙습니다(영 제13조의6①3호).',
    )
  }
  if (likelyCount(verdicts) > 1) {
    duties.push(
      '둘 이상의 업무를 함께 하면 자본금은 각 금액의 합계액입니다. ' +
        '다만 합계가 50억 원 이상이면 50억 원으로 봅니다 (영 제17조④).',
    )
  }
  return duties
}

/**
 * 2026. 12. 17. 시행 개정으로 새로 생기는 의무.
 *
 * 등록 여부와 별개로 **이미 등록한 사업자에게도** 새로 생기는 의무라서 따로 낸다.
 * 여기 적는 것은 전부 원문에서 확인한 것만이다 — 확인 못 한 것은 적지 않는다.
 */
export function upcomingDuties(a: Answers, verdicts: Verdict[]): string[] {
  const has = (slug: string) =>
    verdicts.some((v) => v.slug === slug && (v.now === 'likely' || v.after === 'likely'))
  const duties: string[] = []

  if (has('pg')) {
    duties.push(
      '정산대상금액 전액을 은행 등을 통해 신탁·예치·지급보증보험으로 외부관리해야 합니다 ' +
        '(법 제25조의4①). 부칙 제2조에 따라 시행 후 1년까지 60%, 그다음 1년간 80%, 이후 전액입니다.',
    )
  }
  if (has('pg') || has('escrow') || has('billing')) {
    const band =
      a.volume === 'over300'
        ? '300억 원 초과 구간(법률 하한 10억 원)'
        : a.volume === 'to300'
          ? '30억 초과 ~ 300억 원 구간(법률 하한 5억 원)'
          : a.volume === 'under30'
            ? '30억 원 이하 구간(법률 하한 3억 원)'
            : '해당 구간'
    duties.push(
      `자본금 구간이 세 단계로 나뉩니다 — 귀사는 ${band}입니다 (법 제30조③ 개정). ` +
        '구간별 구체 금액은 대통령령으로, 구간 판정 기준은 금융위원회 고시로 정해지는데 ' +
        '둘 다 아직 개정 전입니다(고시 제2026-29호는 30억 원 구간만 정하고 있습니다). ' +
        '이미 등록한 사업자는 시행일부터 1년 이내에 새 요건을 갖춰야 합니다 (부칙 제3조).',
    )
  }
  if (duties.length > 0) {
    duties.push(
      '대주주가 바뀌면 사유 발생일부터 15일 이내에 금융위원회의 변경허가를 받거나 변경등록을 해야 합니다 ' +
        '(법 제33조의3 신설).',
    )
  }
  return duties
}
