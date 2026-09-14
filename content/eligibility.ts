/**
 * 전자금융업 요건 확인 — 법령 문언과 답변을 나란히 놓는 도구
 *
 * ## ⚠️ 이것은 판정 도구가 아니다
 *
 * "귀사는 등록 대상입니다" 같은 **결론을 내지 않는다.** 하는 일은 두 가지다 —
 *
 * 1. 답변한 내용이 **정의 규정의 어느 문언에 대응하는지** 보여준다 (조문 원문과 함께)
 * 2. 등록 시 심사되는 **요건·서류·기한**을 정보로 제시한다
 *
 * 해당 여부와 등록 의무는 **금융위원회가 판단한다.** 이 페이지는 판단하지 않는다.
 *
 * ### 왜 이렇게 바꿨나 (2026-09-14)
 *
 * 판정을 내니까 **틀린 판정이 나갔다.** 실제로 이 파일은 PG 의 2026. 12. 17. 이후를
 * `등록 대상이 된다` 로 내보내고 있었는데 **정반대였다.**
 *
 * 법 제2조19호가 개정으로 좁아진다 —
 *
 * | | 현행 | 2026. 12. 17. |
 * |---|---|---|
 * | 법 제2조19호 | 지급결제정보를 **송신·수신**하는 것 **또는** 대가의 정산을 대행·매개 | 대가를 **수수하고** 정산을 대행하는 것. 통신판매중개 등 부수적 정산은 제외 |
 *
 * "정보 송수신" 이 정의에서 빠진다. 법 제28조③2호(면제)가 삭제된 것은 면제를 없애려는
 * 것이 아니라 **정의가 좁아져 면제가 불필요해졌기 때문**이다. 나는 제28조만 보고
 * "면제가 사라지니 대상이 된다" 고 결론지었다.
 *
 * ⚠️ **조문 하나만 보고 결론 내지 않는다.** 면제 조항의 삭제는 정의의 변경과 함께
 *    읽어야 한다. 같은 실수를 ADR-041 에서 이미 한 번 적어두고도 반복했다.
 *
 * **조문 원문을 화면에 그대로 내면 이런 오류가 나갈 자리가 없어진다.** 읽는 사람이
 * 직접 대조하기 때문이다. 그것이 이 개편의 핵심이다.
 *
 * ## 왜 업종별 독립 대응인가
 *
 * 하나의 서비스가 여러 정의에 동시에 대응한다. 플랫폼이 대금을 정산하면서(PG) 포인트도
 * 발행하고(선불) 구매확정까지 대금을 잡아두면(결제대금예치) 셋 다이다. 트리는 답을
 * 하나만 내므로 **둘을 놓친다.**
 *
 * ## 왜 '모르겠다' 가 기능인가
 *
 * 대응 여부를 보는 데 필요한 답이 `unsure` 면 그 업종은 `확인 필요` 로 뺀다.
 * 추정해서 답하면 이 도구의 유일한 값(정확성)이 무너진다.
 */

/** 근거 기준일과 대조한 원문. 법령이 바뀌면 이 값과 아래 조문을 함께 고친다. */
export const LAW_BASIS = {
  /** 이 파일의 조문을 원문과 대조한 날 */
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

/** 화면에 그대로 내는 조문. **요약하지 않는다** — 요약하는 순간 해석이 된다. */
export type StatuteQuote = { ref: string; text: string }

// ── 질문 ────────────────────────────────────────────────────────────────────
//
// ⚠️ **비전문가가 답할 수 있는 말로 쓴다.** "전자지급결제대행에 해당하십니까" 는
//    물어봐야 소용이 없다. 자금과 정보가 어떻게 흐르는지를 묻는다.
//
// ⚠️ 그리고 **조문의 요건을 빠짐없이 묻는다.** 2026-09-14 대조에서, "분기별 전자금융
//    거래 총액" 으로 물었는데 고시 제42조의2①의 기준은 이용자가 지급한 재화·용역의
//    매출총액이었다. 담당자가 수수료 수익으로 답하면 자릿수가 통째로 틀린다.

export type Answer = 'yes' | 'no' | 'unsure'

/**
 * 선불 사용처 범위.
 *
 * 법 제28조③1가의 면제는 "하나의 가맹점(사업주가 동일한 경우로 한정)" 이다.
 * 가르는 선은 가맹점 **개수**가 아니라 **사업주가 같은가**이다.
 */
export type Reach = 'self' | 'sameOwner' | 'others' | 'unsure'

/**
 * 분기별 금액 구간 (고시 제42조의2① — 결제대행금액·결제대금예치금액·전자고지결제금액).
 *
 * - 현행 법 제30조③: 30억 이하(3억) / 초과(5억 이상 → 영 제17조③이 상향)
 * - 2026. 12. 17.: 30억 이하 / 30억~300억 / 300억 초과
 */
export type Volume = 'under30' | 'to300' | 'over300' | 'unsure'

export type Answers = {
  /** 카드사·은행과 결제 승인/취소 정보를 주고받는가 (현행 정의의 앞단) */
  paymentInfo: Answer
  /** 대가를 수수하고 정산을 대행하는가 (양쪽 정의에 공통) */
  funds: Answer
  /** (funds=yes) 그 정산이 통신판매중개 등 다른 업무의 부수인가 (개정 정의 단서) */
  ancillary: Answer
  /** 충전식 잔액(포인트·머니)을 발행하는가 */
  prepaid: Answer
  /** (prepaid=yes) 발행사 외 어디서 쓸 수 있는가 */
  prepaidReach: Reach
  /** (prepaid=yes) 발행잔액이 30억 이상인가 */
  prepaidBalanceOver: Answer
  /** (prepaid=yes) 연간 총발행액이 500억 이상인가 */
  prepaidIssueOver: Answer
  /** 구매확정까지 대금을 보관했다가 지급하는가 */
  escrow: Answer
  /** 계좌 사이의 자금 이동 지시를 처리하는가 */
  transfer: Answer
  /** 고지 내역을 대신 보여주고 자금을 직접 수수해 정산까지 하는가 */
  billing: Answer
  /** 분기별 결제대행금액 등 구간 — 자본금을 가른다 */
  volume: Volume
}

export const EMPTY_ANSWERS: Answers = {
  paymentInfo: 'unsure',
  funds: 'unsure',
  ancillary: 'unsure',
  prepaid: 'unsure',
  prepaidReach: 'unsure',
  prepaidBalanceOver: 'unsure',
  prepaidIssueOver: 'unsure',
  escrow: 'unsure',
  transfer: 'unsure',
  billing: 'unsure',
  volume: 'unsure',
}

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
      '현행 법 제2조제19호는 “지급결제정보를 송신하거나 수신하는 것” 을 정의에 포함합니다. ' +
      '다만 2026. 12. 17. 시행 개정에서 이 문언이 빠집니다.',
    choices: YES_NO,
  },
  {
    key: 'funds',
    text: '고객이 낸 대가를 우리가 수수했다가 판매자에게 정산해 주나요?',
    help: '고객이 판매자에게 직접 지급하고 우리는 정보만 전달한다면 “아니오” 입니다.',
    choices: YES_NO,
  },
  {
    key: 'ancillary',
    text: '그 정산이 통신판매중개 등 다른 업무를 하는 과정에서 부수적으로 일어나나요?',
    help:
      '오픈마켓·예약 플랫폼처럼 본업이 따로 있고 정산은 그에 딸린 경우를 말합니다. ' +
      '2026. 12. 17. 시행 개정 정의의 단서가 이 경우를 제외합니다.',
    onlyIf: '대가를 수수해 정산하는 경우',
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
      '두 기준을 둘 다 밑돌아야 면제 조문에 해당합니다(영 제15조⑤ — 30억 원 / 500억 원).',
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
      '② 자금을 직접 수수하며 ③ 그 정산을 대행할 것. 고지만 하고 자금은 만지지 않으면 대응하지 않습니다.',
    choices: YES_NO,
  },
  {
    key: 'volume',
    text: '분기별 결제대행금액(또는 결제대금예치·전자고지결제 금액)이 어느 정도인가요?',
    help:
      '고시 제42조의2제1항의 기준입니다. 결제대행금액은 “이용자가 지급한 재화 및 용역의 매출총액” 이므로 ' +
      '우리가 받는 수수료 수익이 아니라 거래액으로 답하세요. ' +
      '300억 원 구간은 2026. 12. 17. 시행 개정으로 새로 생기며, 그 구간의 기준은 아직 고시되지 않았습니다.',
    onlyIf: '결제대행·결제대금예치·전자고지결제 문언에 대응하는 경우',
    choices: [
      { value: 'under30', label: '30억 원 이하' },
      { value: 'to300', label: '30억 초과 ~ 300억 원 이하' },
      { value: 'over300', label: '300억 원 초과' },
      { value: 'unsure', label: '모르겠다' },
    ],
  },
]

// ── 문언 대응 ───────────────────────────────────────────────────────────────

/**
 * 답변과 정의 문언의 대응 관계. **결론이 아니라 대조 결과다.**
 *
 * - `matches`      정의 문언에 대응하는 항목이 있다
 * - `exemption`    대응하나, 등록 면제 조문이 함께 있다
 * - `noMatch`      대응하는 항목이 없다
 * - `unsure`       대응 여부를 볼 답변이 없다
 */
export type Correspondence = 'matches' | 'exemption' | 'noMatch' | 'unsure'

export type Verdict = {
  slug: string
  name: string
  license: '등록' | '허가'
  /** 시점별 정의 조문 원문. 개정으로 달라지면 둘 다 낸다 */
  definition: { now: StatuteQuote; after?: StatuteQuote }
  /** 현재 시행 기준 대응 */
  now: Correspondence
  /** 2026. 12. 17. 이후 대응. 현재와 같으면 생략 */
  after?: Correspondence
  /** 어느 문언에 어떻게 대응하는지 — 해석이 아니라 대조 서술 */
  note: string
  /** 2026. 12. 17. 이후가 달라지는 이유 */
  afterNote?: string
  /** 함께 읽어야 하는 면제·제외 조문 원문 */
  related: StatuteQuote[]
  /** 등록 시 심사되는 자본금 (법 제31조①1호 → 제30조 → 영 제17조) */
  capital: string
  /** 이어질 서비스 페이지 slug */
  serviceSlug: string
}

/** 대응을 보는 데 쓰이는 답이 하나라도 `unsure` 면 대조하지 않는다. */
function anyUnsure(...values: string[]): boolean {
  return values.includes('unsure')
}

/**
 * 분기 금액 구간별 자본금 (영 제17조②③).
 *
 * 현행 시행령은 30억 이하 / 초과 두 구간뿐이라 `to300` 과 `over300` 이 같은 금액이 된다.
 * 2026. 12. 17. 개정 법률이 세 구간으로 나누므로 시행령도 따라 바뀔 것이고, 그때 고친다.
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
  // ⚠️ 정의가 2026. 12. 17. 에 좁아진다. 면제 조문(법 제28조③2호)의 삭제만 보고
  //    "대상이 된다" 고 읽으면 정반대의 답이 나온다 — 실제로 그렇게 틀렸었다.
  {
    const DEF_NOW: StatuteQuote = {
      ref: '법 제2조제19호 (현행)',
      text:
        '“전자지급결제대행”이라 함은 전자적 방법으로 재화의 구입 또는 용역의 이용에 있어서 ' +
        '지급결제정보를 송신하거나 수신하는 것 또는 그 대가의 정산을 대행하거나 매개하는 것을 말한다.',
    }
    const DEF_AFTER: StatuteQuote = {
      ref: '법 제2조제19호 (2026. 12. 17. 시행)',
      text:
        '“전자지급결제대행”이란 제3자 사이에서 이루어지는 재화의 공급 또는 용역의 제공에 대한 대가의 지급이 ' +
        '전자지급수단으로 이루어지는 경우에 그 대가를 수수하고 정산을 대행하는 것을 말한다. ' +
        '다만, 「전자상거래 등에서의 소비자보호에 관한 법률」에 따른 통신판매중개 등 다른 업무를 영위하는 ' +
        '과정에서 부수적으로 대가를 수수하고 정산을 대행하는 경우는 제외한다.',
    }
    const EXEMPT_NOW: StatuteQuote = {
      ref: '법 제28조제3항제2호 (2026. 12. 17. 삭제) · 영 제15조제7항',
      text:
        '[법] 자금이동에 직접 관여하지 아니하고 전자지급거래의 전자적 처리를 위한 정보만을 전달하는 업무 등 ' +
        '대통령령이 정하는 전자지급결제대행에 관한 업무를 수행하는 자는 등록하지 아니하고 업무를 행할 수 있다. ' +
        '[영] 전자금융거래와 관련된 자금을 수수하거나 수수를 대행하지 아니하고 ' +
        '전자지급거래에 관한 정보만을 단순히 전달하는 업무를 말한다.',
    }

    let now: Correspondence
    let note: string
    let after: Correspondence | undefined
    let afterNote: string | undefined
    const related: StatuteQuote[] = []

    if (anyUnsure(a.paymentInfo, a.funds)) {
      now = 'unsure'
      note = '결제정보 송·수신 또는 대가 수수·정산에 대한 답변이 없어 대조하지 않았습니다.'
      after = 'unsure'
    } else if (a.funds === 'yes') {
      now = 'matches'
      note = '대가를 수수해 정산한다고 답하셨습니다. 양쪽 정의의 “대가의 정산을 대행” 문언에 대응합니다.'
      if (a.ancillary === 'yes') {
        after = 'noMatch'
        afterNote =
          '통신판매중개 등 다른 업무의 부수적 정산이라고 답하셨습니다. 개정 정의의 단서가 이 경우를 제외합니다.'
      } else if (a.ancillary === 'unsure') {
        after = 'unsure'
        afterNote = '부수성에 대한 답변이 없어 개정 정의의 단서 해당 여부를 대조하지 않았습니다.'
      }
    } else if (a.paymentInfo === 'yes') {
      // 자금은 수수하지 않고 정보만 — 현행 정의에는 대응하나 면제 조문이 있고,
      // 개정 정의에서는 그 문언 자체가 빠진다.
      now = 'exemption'
      note =
        '결제정보를 주고받되 대가는 수수하지 않는다고 답하셨습니다. ' +
        '현행 정의의 “지급결제정보를 송신하거나 수신하는 것” 에 대응하며, 아래 면제 조문이 함께 있습니다.'
      related.push(EXEMPT_NOW)
      after = 'noMatch'
      afterNote =
        '개정 정의에서 “지급결제정보를 송신하거나 수신하는 것” 문언이 빠집니다. ' +
        '면제 조문(법 제28조제3항제2호)이 삭제되는 것은 정의가 좁아져 면제가 불필요해졌기 때문입니다.'
    } else {
      now = 'noMatch'
      note = '결제정보를 주고받지도, 대가를 수수해 정산하지도 않는다고 답하셨습니다.'
      after = 'noMatch'
    }

    out.push({
      slug: 'pg',
      name: '전자지급결제대행업 (PG)',
      license: '등록',
      definition: { now: DEF_NOW, after: DEF_AFTER },
      now,
      after,
      note,
      afterNote,
      related,
      capital: capitalFor(a.volume, '3억 원', '10억 원'),
      serviceSlug: 'pg-agency',
    })
  }

  // ── 선불전자지급수단 ─────────────────────────────────────────────────────
  {
    const DEF: StatuteQuote = {
      ref: '법 제2조제14호',
      text:
        '“선불전자지급수단”이라 함은 이전 가능한 금전적 가치가 전자적 방법으로 저장되어 발행된 증표' +
        '(전자적 방법으로 변환되어 저장된 증표를 포함한다) 또는 그 증표에 관한 정보로서 ' +
        '발행인(대통령령으로 정하는 특수관계인을 포함한다) 외의 제3자로부터 재화 또는 용역을 구입하고 ' +
        '그 대가를 지급하는데 사용되는 것을 말한다. 다만, 전자화폐를 제외한다.',
    }
    const EXEMPT_ONE: StatuteQuote = {
      ref: '법 제28조제3항제1호 가목',
      text:
        '하나의 가맹점(가맹점의 사업주가 동일한 경우로 한정한다)에서만 사용되는 ' +
        '선불전자지급수단을 발행하는 자는 등록하지 아니하고 업무를 행할 수 있다.',
    }
    const EXEMPT_SIZE: StatuteQuote = {
      ref: '법 제28조제3항제1호 나목 · 영 제15조제5항',
      text:
        '[법] 선불전자지급수단의 발행잔액 및 연간 총발행액(두 종류 이상을 발행한 경우 각각을 합산한 금액)이 ' +
        '대통령령으로 정하는 금액 미만인 자는 등록하지 아니하고 업무를 행할 수 있다. ' +
        '[영] 발행잔액 30억원, 연간 총발행액 500억원.',
    }

    let level: Correspondence
    let note: string
    const related: StatuteQuote[] = []

    if (anyUnsure(a.prepaid)) {
      level = 'unsure'
      note = '충전식 잔액 발행 여부에 대한 답변이 없어 대조하지 않았습니다.'
    } else if (a.prepaid === 'no') {
      level = 'noMatch'
      note = '충전식 잔액을 발행하지 않는다고 답하셨습니다.'
    } else if (a.prepaidReach === 'unsure') {
      level = 'unsure'
      note = '사용처 범위에 대한 답변이 없어 대조하지 않았습니다.'
    } else if (a.prepaidReach === 'self') {
      level = 'noMatch'
      note =
        '발행사 안에서만 쓰인다고 답하셨습니다. 정의의 “발행인 … 외의 제3자로부터” 문언에 대응하지 않습니다.'
    } else if (a.prepaidReach === 'sameOwner') {
      level = 'exemption'
      note = '사업주가 동일한 하나의 가맹점에서만 쓰인다고 답하셨습니다. 아래 면제 조문이 함께 있습니다.'
      related.push(EXEMPT_ONE)
    } else if (anyUnsure(a.prepaidBalanceOver, a.prepaidIssueOver)) {
      level = 'unsure'
      note = '규모에 대한 답변이 없어 면제 조문 해당 여부를 대조하지 않았습니다.'
      related.push(EXEMPT_SIZE)
    } else if (a.prepaidBalanceOver === 'no' && a.prepaidIssueOver === 'no') {
      level = 'exemption'
      note =
        '발행잔액 30억 원 미만이면서 연간 총발행액 500억 원 미만이라고 답하셨습니다. ' +
        '아래 면제 조문이 함께 있습니다 — 두 기준 중 하나라도 넘으면 해당하지 않습니다.'
      related.push(EXEMPT_SIZE)
    } else {
      level = 'matches'
      note =
        '사업주가 다른 곳에서 쓰이고 규모 기준을 넘는다고 답하셨습니다. ' +
        '정의 문언에 대응하며 위 면제 조문에는 해당하지 않습니다.'
      related.push(EXEMPT_SIZE)
    }

    out.push({
      slug: 'prepaid',
      name: '선불전자지급수단 발행·관리업',
      license: '등록',
      definition: { now: DEF },
      now: level,
      note,
      related,
      capital: '20억 원 (영 제17조①3호)',
      serviceSlug: 'efin-license',
    })
  }

  // ── 결제대금예치 · 전자자금이체 · 전자고지결제 ───────────────────────────
  const simple: readonly {
    slug: string
    name: string
    capital: string
    def: StatuteQuote
    key: 'escrow' | 'transfer' | 'billing'
    yes: string
    no: string
  }[] = [
    {
      slug: 'escrow',
      name: '결제대금예치업 (에스크로)',
      capital: capitalFor(a.volume, '3억 원', '10억 원'),
      def: {
        ref: '법 제28조제2항제5호 · 영 제15조제3항제1호',
        text:
          '[법] 그 밖에 대통령령이 정하는 전자금융업무를 행하고자 하는 자는 금융위원회에 등록하여야 한다. ' +
          '[영] 「전자상거래 등에서의 소비자보호에 관한 법률」 제13조제2항제10호에 따라 결제대금을 예치받는 업무.',
      },
      key: 'escrow',
      yes: '통신판매에서 구매확정 때까지 대금을 맡아둔다고 답하셨습니다. 위 문언에 대응합니다.',
      no: '대금을 맡아두지 않는다고 답하셨습니다.',
    },
    {
      slug: 'transfer',
      name: '전자자금이체업',
      capital: '30억 원 (영 제17조①1호)',
      def: {
        ref: '법 제2조제12호',
        text:
          '“전자자금이체”라 함은 지급인과 수취인 사이에 자금을 지급할 목적으로 금융회사 또는 전자금융업자에 ' +
          '개설된 계좌에서 다른 계좌로 전자적 장치에 의하여 다음 각 목의 어느 하나에 해당하는 방법으로 ' +
          '자금을 이체하는 것을 말한다. ' +
          '가. 금융회사 또는 전자금융업자에 대한 지급인의 지급지시 ' +
          '나. 금융회사 또는 전자금융업자에 대한 수취인의 추심지시(추심이체).',
      },
      key: 'transfer',
      yes: '계좌 사이의 자금 이동 지시를 처리한다고 답하셨습니다. 위 문언에 대응합니다.',
      no: '계좌 사이의 자금 이동 지시를 처리하지 않는다고 답하셨습니다.',
    },
    {
      slug: 'billing',
      name: '전자고지결제업',
      capital: capitalFor(a.volume, '3억 원', '5억 원'),
      def: {
        ref: '법 제28조제2항제5호 · 영 제15조제3항제2호',
        text:
          '[영] 수취인을 대행하여 지급인이 수취인에게 지급하여야 할 자금의 내역을 전자적인 방법으로 ' +
          '지급인에게 고지하고, 자금을 직접 수수하며 그 정산을 대행하는 업무.',
      },
      key: 'billing',
      yes: '고지·자금 수수·정산 대행을 모두 한다고 답하셨습니다. 위 문언에 대응합니다.',
      no: '고지·자금 수수·정산 대행을 모두 하지는 않는다고 답하셨습니다.',
    },
  ]

  for (const s of simple) {
    const v = a[s.key]
    out.push({
      slug: s.slug,
      name: s.name,
      license: '등록',
      definition: { now: s.def },
      now: v === 'unsure' ? 'unsure' : v === 'yes' ? 'matches' : 'noMatch',
      note: v === 'unsure' ? '답변이 없어 대조하지 않았습니다.' : v === 'yes' ? s.yes : s.no,
      related: [],
      capital: s.capital,
      serviceSlug: 'efin-license',
    })
  }

  return out
}

// ── 등록 시 심사되는 것 (정보 제공) ─────────────────────────────────────────
//
// 이 도구의 무게중심은 "대상인가" 가 아니라 **"등록하려면 무엇이 필요한가"** 다.
// 아래는 전부 조문에 적힌 것을 옮긴 것이고, 해석이 들어가지 않는다.

/** 법 제31조제1항 — 허가·등록 요건 (제4·5호는 허가에만 적용) */
export const REVIEW_REQUIREMENTS: readonly StatuteQuote[] = [
  {
    ref: '법 제31조제1항제1호',
    text: '제30조의 규정에 의한 자본금 또는 기본재산을 보유할 것',
  },
  {
    ref: '법 제31조제1항제2호',
    text:
      '이용자의 보호가 가능하고 행하고자 하는 업무를 수행함에 있어서 ' +
      '충분한 전문인력과 전산설비 등 물적 시설을 갖추고 있을 것',
  },
  {
    ref: '법 제31조제1항제3호 · 영 제18조제2항',
    text:
      '[법] 대통령령이 정하는 재무건전성 기준을 충족할 것 ' +
      '[영] 자기자본·출자총액 또는 기본재산에 대한 부채총액의 비율이 ' +
      '100분의 200의 범위 안에서 금융위원회가 정하여 고시하는 비율 이하일 것.',
  },
]

/** 영 제20조제2항 — 등록신청서 첨부서류 (허가 전용 항목은 표시) */
export const REVIEW_DOCUMENTS: readonly string[] = [
  '정관 및 자본금 납입 증명서류',
  '재무제표와 그 부속서류',
  '주주의 구성 (허가의 경우만 해당)',
  '업무개시 후 3년 간의 사업계획서 (추정 재무제표 및 예산수입·지출 계산서 포함)',
  '전문인력 및 시설현황을 기재한 서류',
  '영업현황을 기재한 서류 (허가의 경우만 해당)',
  '그 밖에 금융위원회가 정하여 고시하는 서류',
]

/** 영 제20조제3항·제4항 — 처리기한 */
export const REVIEW_PERIOD = {
  register: '등록신청서 제출일부터 20일 이내 (영 제20조제4항)',
  license: '허가신청서 제출일부터 3월 이내 (영 제20조제3항)',
  note: '제출 서류에 보완이 필요하면 금융위원회가 보완을 요청할 수 있습니다 (영 제20조제5항).',
} as const

/**
 * 고시 제7조 — 법 제21조제2항의 "금융위원회가 정하는 기준" 8개 부문.
 *
 * 세부 기준은 고시 제8조부터 제36조에 있다. **이 부문들이 등록에서 가장 손이 많이 가는
 * 곳**이고, 이 도구가 상담으로 이어져야 할 자리이기도 하다.
 */
export const IT_SCOPE: readonly { no: string; name: string }[] = [
  { no: '1', name: '인력, 조직, 교육 및 예산 부문' },
  { no: '2', name: '건물, 설비, 전산실 등 시설 부문' },
  { no: '3', name: '단말기, 전산자료 및 정보처리시스템 등 정보기술부문' },
  { no: '4', name: '해킹, 악성코드 감염 등 정보보호부문' },
  { no: '5', name: '정보처리시스템 및 전자금융거래 관련 사업 부문' },
  { no: '6', name: '비상대책 등 업무지속성부문' },
  { no: '7', name: '전산원장통제, 프로그램 통제 등 정보기술부문 내부통제' },
  { no: '8', name: '그 밖에 전자금융업무의 안전성 확보를 위하여 필요한 사항' },
]

// ── 등록 이후에 붙는 의무 (정보 제공) ───────────────────────────────────────

/** 정의 문언에 대응하는 업종 수. 자본금 합산 안내를 낼지 결정한다. */
function matchCount(verdicts: Verdict[]): number {
  return verdicts.filter((v) => v.now === 'matches' || v.after === 'matches').length
}

/**
 * 현재 시행 기준으로 이미 붙어 있는 의무 중 놓치기 쉬운 것.
 *
 * ⚠️ 선불충전금 100% 별도관리는 개정으로 생기는 것이 아니라 **현행 의무**다
 *    (영 제13조의2②가 이미 100분의 100을 요구한다).
 */
export function currentDuties(a: Answers, verdicts: Verdict[]): string[] {
  const has = (slug: string) => verdicts.some((v) => v.slug === slug && v.now === 'matches')
  const duties: string[] = []

  if (has('prepaid')) {
    duties.push(
      '선불충전금 전액(100분의 100)을 은행 등을 통해 신탁·예치·지급보증보험으로 별도관리해야 합니다 ' +
        '(법 제25조의2① · 영 제13조의2②). 매 영업일 점검 의무도 함께 붙습니다(영 제13조의6①3호).',
    )
  }
  if (a.volume === 'under30' && (has('pg') || has('escrow') || has('billing'))) {
    duties.push(
      '소규모(분기 30억 원 이하) 기준으로 등록한 뒤 2분기 이상 계속 그 기준을 넘으면 ' +
        '금융위원회에 신고하고, 신고한 때로부터 6개월 이내에 상위 구간의 자본금 요건을 갖춰야 합니다 ' +
        '(법 제30조④ · 고시 제42조의2②).',
    )
  }
  if (matchCount(verdicts) > 1) {
    duties.push(
      '둘 이상의 업무를 함께 하면 자본금은 각 금액의 합계액입니다. ' +
        '다만 합계가 50억 원 이상이면 50억 원으로 봅니다 (영 제17조④).',
    )
  }
  return duties
}

/**
 * 2026. 12. 17. 시행 개정으로 새로 붙는 의무.
 *
 * 여기 적는 것은 전부 원문에서 확인한 것만이다 — 확인 못 한 것은 적지 않는다.
 */
export function upcomingDuties(a: Answers, verdicts: Verdict[]): string[] {
  const has = (slug: string) =>
    verdicts.some((v) => v.slug === slug && (v.now === 'matches' || v.after === 'matches'))
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
      `자본금 구간이 세 단계로 나뉩니다 — 답변하신 금액은 ${band}입니다 (법 제30조③ 개정). ` +
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
