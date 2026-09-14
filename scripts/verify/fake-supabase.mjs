/**
 * PostgREST 최소 스텁 — **검증 전용**
 * ===========================================================================
 *
 *   node scripts/verify/fake-supabase.mjs      # :4600 에서 대기
 *
 * `.env.local` 에 아래를 넣고 앱을 띄우면 Supabase 없이 등록 경로가 돈다.
 *
 *   SUPABASE_URL=http://localhost:4600
 *   NEXT_PUBLIC_SUPABASE_URL=http://localhost:4600
 *   SUPABASE_SECRET_KEY=local-stub-key-not-real
 *
 * ## 왜 필요한가
 *
 * 문의 등록·알림 경로는 **DB 쓰기를 타야 실행된다.** 로컬에 Supabase 가 없으면
 * `createInquiry` → `notifyInquiry` 를 한 번도 못 태워 보고 배포하게 된다.
 *
 * ## ⚠️ `.single()` 은 배열을 주면 조용히 실패한다
 *
 * supabase-js 의 `.single()` 은 `Accept: application/vnd.pgrst.object+json` 을
 * 보낸다. 그때 **배열을 돌려주면 에러가 나는데 원인이 드러나지 않는다.**
 * 이 스텁이 `Accept` 를 보고 단일 객체/배열을 갈라 주는 이유다.
 * 카운트 쿼리는 `Content-Range` 헤더를 읽으므로 그것도 함께 돌려준다.
 *
 * 그 둘만 맞으면 나머지는 대충이어도 동작한다.
 */
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const rows = new Map() // id -> inquiry

createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const url = new URL(req.url, 'http://x')
    const table = url.pathname.replace('/rest/v1/', '')
    const single = (req.headers.accept ?? '').includes('pgrst.object')
    const send = (code, payload, extra = {}) => {
      res.writeHead(code, { 'Content-Type': 'application/json', ...extra })
      res.end(JSON.stringify(payload))
    }
    console.log(`[db] ${req.method} ${table} single=${single}`)

    if (req.method === 'POST' && table === 'inquiries') {
      const input = JSON.parse(body)
      const id = randomUUID()
      rows.set(id, { id, created_at: new Date().toISOString(), ...input })
      return send(201, single ? { id } : [{ id }])
    }
    if (req.method === 'POST') return send(201, single ? {} : [])
    if (req.method === 'PATCH') return send(204, [])

    if (req.method === 'GET' && table === 'inquiries') {
      const idFilter = url.searchParams.get('id')
      if (idFilter?.startsWith('eq.')) {
        const row = rows.get(idFilter.slice(3))
        return send(200, single ? (row ?? null) : row ? [row] : [])
      }
      return send(200, single ? null : [...rows.values()], { 'Content-Range': '0-0/0' })
    }
    return send(200, single ? null : [], { 'Content-Range': '0-0/0' })
  })
}).listen(4600, () => console.log('fake supabase on 4600'))
