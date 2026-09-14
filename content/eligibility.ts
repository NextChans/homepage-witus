/**
 * 전자금융업 등록 대상 자가진단 — 질문과 판정 규칙
 *
 * ## ⚠️ 공개 전 반드시 법무 검토를 받는다
 *
 * 이 파일의 금액·조문·판정 기준은 **공개 자료를 종합한 것**이며 법령 원문을
 * 한 줄씩 대조하지 않았다(법제처가 SPA 라 본문 추출 실패). 기준일은
 * `LAW_BASIS.checkedAt` 이다. **틀리면 도구의 값이 0이 아니라 음수가 된다** —
 * 규제를 안다고 내건 회사가 규제를 틀리게 안내한 것이 되기 때문이다.
 *
 * → `features.eligibilityCheck` 가 꺼져 있는 이유다. 검토 후 켠다.
 *
 * ## 왜 결정 트리가 아니라 독립 판정인가
 *
 * **하나의 서비스가 여러 업종에 동시에 해당한다.** 플랫폼이 대금을 정산하면서
 * (PG) 포인트도 발행하고(선불) 구매확정까지 대금을 잡아두면(결제대금예치)
 * 셋 다이다. 트리는 답을 하나만 내므로 **둘을 놓친다.**
 *
 * 유지보수도 이쪽이 낫다 — 법이 바뀌어 한 업종 기준이 달라져도 그 줄만 고친다.
 *
 * ## 왜 '모르겠다' 가 기능인가
 *
 * 어느 질문이든 판정에 필요한 답이 `unsure` 면 그 업종은 `확인 필요` 로 뺀다.
 * 추정해서 답하면 이 도구의 유일한 값(정확성)이 무너진다. 그리고 애매한
 * 케이스는 원래 사람이 봐야 하므로 **상담 전환에도 이쪽이 낫다.**
 */

/** 근거 기준일. 법령이 바뀌면 이 값과 아래 기준을 함께 고친다. */
export const LAW_BASIS = {
  /** 이 파일의 기준을 확인한 날 */
  checkedAt: '2026-09-14',
  /** 현재 시행 중인 주요 개정 */
  current: '2024. 9. 15. 시행 (2023. 9. 14. 공포)',
  /** 곧 시행되는 개정 — 결과를 이 시점 전후로 나눠 보여주는 근거 */
  upcoming: { date: '2026-12-17', promulgated: '2025-12-16' },
} as const

export type Answer = 'yes' | 'no' | 'unsure'
/** 선불 사용처 범위. 2024 개정으로 **가맹점 수**가 기준이 됐다(업종 기준 폐지). */
export type Reach = 'self' | 'one' | 'many' | 'unsure'

export type Answers = {
  /** 고객 대금이 우리 명의 계좌를 거쳐 판매자에게 가는가 */
  funds: Answer
  /** (funds=yes) 결제대행이 주된 사업인가, 중개 플랫폼의 부수 정산인가 */
  fundsPrimary: Answer
  /** 충전식 잔액(포인트·머니)을 발행하는가 */
  prepaid: Answer
  /** (prepaid=yes) 발행사 외 몇 곳에서 쓸 수 있는가 */
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
  /** 분기 전자금융거래 총액이 300억을 넘는가 (2026 개정 자본금 기준) */
  volumeOver: Answer
}

export const EMPTY_ANSWERS: Answers = {
  funds: 'unsure',
  fundsPrimary: 'unsure',
  prepaid: 'unsure',
  prepaidReach: 'unsure',
  prepaidBalanceOver: 'unsure',
  prepaidIssueOver: 'unsure',
  escrow: 'unsure',
  transfer: 'unsure',
  billing: 'unsure',
  volumeOver: 'unsure',
}

// ── 질문 ────────────────────────────────────────────────────────────────────
//
// ⚠️ **비전문가가 답할 수 있는 말로 쓴다.** "전자지급결제대행에 해당하십니까"
//    는 물어봐야 소용이 없다. 자금이 어떻게 흐르는지를 묻는다.

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
    key: 'funds',
    text: '고객이 낸 대금이 우리 명의 계좌를 거쳐 판매자에게 가나요?',
    help: '고객이 판매자에게 직접 송금하고 우리는 중개만 한다면 "아니오" 입니다.',
    choices: YES_NO,
  },
  {
    key: 'fundsPrimary',
    text: '결제대행이 주된 사업인가요?',
    help:
      '중개 플랫폼(오픈마켓·예약 등)을 운영하면서 부수적으로 정산만 대신하는 경우라면 "아니오" 입니다. ' +
      '2026. 12. 17. 시행 개정에서 이 경우를 적용 대상에서 제외합니다.',
    onlyIf: '위 질문에 "예" 라고 답하신 경우',
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
    text: '그 잔액을 발행사인 우리 말고 다른 사업자에게도 쓸 수 있나요?',
    help: '2024. 9. 15. 개정으로 업종 기준이 없어지고 가맹점 수가 기준이 되었습니다.',
    onlyIf: '충전식 잔액을 발행하는 경우',
    choices: [
      { value: 'self', label: '우리에게만 쓴다' },
      { value: 'one', label: '다른 곳 1군데' },
      { value: 'many', label: '다른 곳 2군데 이상' },
      { value: 'unsure', label: '모르겠다' },
    ],
  },
  {
    key: 'prepaidBalanceOver',
    text: '아직 쓰이지 않은 충전잔액 총액이 30억 원 이상인가요?',
    onlyIf: '충전식 잔액을 발행하는 경우',
    choices: YES_NO,
  },
  {
    key: 'prepaidIssueOver',
    text: '연간 총발행액이 500억 원 이상인가요?',
    help: '충전잔액 기준과 발행액 기준을 **둘 다** 밑돌아야 면제됩니다.',
    onlyIf: '충전식 잔액을 발행하는 경우',
    choices: YES_NO,
  },
  {
    key: 'escrow',
    text: '구매확정·배송완료 때까지 대금을 잡아뒀다가 판매자에게 주나요?',
    choices: YES_NO,
  },
  {
    key: 'transfer',
    text: '고객 계좌에서 직접 출금(계좌이체)을 우리가 일으키나요?',
    choices: YES_NO,
  },
  {
    key: 'billing',
    text: '공과금·보험료처럼 고지 내역을 대신 보여주고 수납받나요?',
    choices: YES_NO,
  },
  {
    key: 'volumeOver',
    text: '분기 전자금융거래 총액이 300억 원을 넘나요?',
    help: '2026. 12. 17. 시행 개정에서 이 구간의 PG 자본금 요건이 올라갑니다.',
    onlyIf: '결제대행에 해당하는 경우',
    choices: YES_NO,
  },
]

// ── 판정 ────────────────────────────────────────────────────────────────────

export type Level = 'likely' | 'exempt' | 'unlikely' | 'unsure'

export type Verdict = {
  slug: string
  name: string
  /** 등록인지 허가인지 */
  license: '등록' | '허가'
  capital: string
  /** 현재(2024. 9. 15. 시행 기준) 판정 */
  now: Level
  /** 2026. 12. 17. 이후 판정. 현재와 같으면 생략 가능 */
  after?: Level
  /** 왜 그렇게 봤는지 — 화면에 그대로 보여준다 */
  reason: string
  /** 이어질 서비스 페이지 slug */
  serviceSlug: string
}

/** 판정에 쓰이는 답이 하나라도 `unsure` 면 판정하지 않는다. */
function anyUnsure(...values: string[]): boolean {
  return values.includes('unsure')
}

export function evaluate(a: Answers): Verdict[] {
  const out: Verdict[] = []

  // ── 전자지급결제대행 (PG) ────────────────────────────────────────────────
  {
    const now: Level = anyUnsure(a.funds) ? 'unsure' : a.funds === 'yes' ? 'likely' : 'unlikely'
    // 2026. 12. 17. — 중개업 부수 정산은 적용 대상에서 제외된다.
    const after: Level =
      now === 'likely' && a.fundsPrimary === 'no'
        ? 'unlikely'
        : now === 'likely' && a.fundsPrimary === 'unsure'
          ? 'unsure'
          : now
    out.push({
      slug: 'pg',
      name: '전자지급결제대행업 (PG)',
      license: '등록',
      capital: '10억 원 (소규모 3억 원)',
      now,
      after,
      // ⚠️ 시점 이야기를 여기 쓰지 않는다. 화면이 `after` 를 따로 보여주므로
      //    사유에도 넣으면 "2026. 12. 17. 이후에는…" 이 두 번 나온다(초안이 그랬다).
      reason:
        now === 'likely'
          ? a.fundsPrimary === 'no'
            ? '대금이 귀사 계좌를 거치지만 중개업의 부수 정산으로 보입니다.'
            : '고객 대금이 귀사 명의 계좌를 거쳐 판매자에게 갑니다.'
          : now === 'unlikely'
            ? '고객이 판매자에게 직접 지급하는 구조로 보입니다.'
            : '자금 흐름에 대한 답이 없어 판정하지 않았습니다.',
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
      reason = '발행사 안에서만 쓰이는 자가형으로 보입니다.'
    } else if (a.prepaidReach === 'one') {
      level = 'exempt'
      reason = '가맹점이 1곳이면 등록이 면제될 수 있습니다. 2곳이 되는 순간 대상이 됩니다.'
    } else if (anyUnsure(a.prepaidBalanceOver, a.prepaidIssueOver)) {
      level = 'unsure'
      reason = '규모 기준에 대한 답이 없어 판정하지 않았습니다.'
    } else if (a.prepaidBalanceOver === 'no' && a.prepaidIssueOver === 'no') {
      level = 'exempt'
      reason =
        '충전잔액 30억 원 미만이면서 연간 총발행액 500억 원 미만이라 등록이 면제될 수 있습니다. ' +
        '두 기준 중 하나라도 넘으면 대상이 됩니다.'
    } else {
      level = 'likely'
      reason = '가맹점이 2곳 이상이고 규모 기준을 넘어 등록 대상으로 보입니다.'
    }
    out.push({
      slug: 'prepaid',
      name: '선불전자지급수단 발행·관리업',
      license: '등록',
      capital: '20억 원',
      now: level,
      reason,
      serviceSlug: 'efin-license',
    })
  }

  // ── 결제대금예치 · 전자자금이체 · 전자고지결제 ───────────────────────────
  const simple: readonly {
    slug: string
    name: string
    capital: string
    key: keyof Answers
    yes: string
    no: string
  }[] = [
    {
      slug: 'escrow',
      name: '결제대금예치업 (에스크로)',
      capital: '10억 원 (소규모 3억 원)',
      key: 'escrow',
      yes: '구매확정 시점까지 대금을 보관하는 구조로 보입니다.',
      no: '대금을 보관하지 않는 것으로 보입니다.',
    },
    {
      slug: 'transfer',
      name: '전자자금이체업',
      capital: '30억 원',
      key: 'transfer',
      yes: '고객 계좌에서 직접 출금을 일으키는 구조로 보입니다.',
      no: '직접 출금을 일으키지 않는 것으로 보입니다.',
    },
    {
      slug: 'billing',
      name: '전자고지결제업',
      capital: '5억 원 (소규모 3억 원)',
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
      serviceSlug: 'efin-license',
    })
  }

  return out
}

/**
 * 2026. 12. 17. 시행 개정에서 추가로 걸리는 의무.
 *
 * 등록 여부와 별개로 **이미 등록한 사업자에게도** 새로 생기는 의무라서 따로 낸다.
 */
export function upcomingDuties(a: Answers, verdicts: Verdict[]): string[] {
  const has = (slug: string) =>
    verdicts.some((v) => v.slug === slug && (v.now === 'likely' || v.after === 'likely'))
  const duties: string[] = []

  if (has('pg')) {
    duties.push(
      '정산대상금액을 은행 등을 통해 신탁·예치·지급보증보험으로 외부관리해야 합니다. ' +
        '시행 시 60%, 1년 후 80%, 2년 후 100%로 단계 적용됩니다.',
    )
    if (a.volumeOver === 'yes') {
      duties.push('분기 거래총액 300억 원 초과 구간이라 자본금 요건이 올라갑니다(구체 금액은 대통령령).')
    }
  }
  if (has('prepaid')) {
    duties.push('선불충전금 전액(100%)을 신탁·예치·지급보증보험으로 별도관리해야 합니다.')
  }
  if (duties.length > 0) {
    duties.push('대주주가 바뀌면 사유 발생일부터 15일 이내에 금융위원회의 변경승인·변경등록이 필요합니다.')
  }
  return duties
}
