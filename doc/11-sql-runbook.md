# 11. SQL 런북 — 실행 가능한 쿼리 모음

**이 세션에서 실제로 쓴 쿼리를 목적별로 모았다.** 전부 Supabase SQL Editor 에
그대로 붙여넣어 실행할 수 있다.

- **스키마를 만드는 SQL 은 여기 없다** — `supabase/migrations/` 가 원본이다.
  여기 복사하면 둘이 갈린다.
- 관리자 계정·감사 로그 운영 쿼리는 `doc/10-admin.md` 에 있다. 중복하지 않는다.
- 배경과 판단은 `doc/04-decisions.md` (ADR-021, 029, 033).

---

## ⚠️ Supabase SQL Editor 의 함정 — 이것부터 읽는다

**여러 문장을 한 번에 실행하면 마지막 문장의 결과만 보여준다.**
앞 문장이 실패해도 화면에는 `Success` 만 뜬다. 실제로 마이그레이션 007 이
이렇게 조용히 안 걸린 적이 있다.

→ **중요한 문장은 하나씩 실행하고 반환값을 눈으로 본다.**
   특히 `cron.schedule()` 은 성공 시 **jobid(숫자)** 를 돌려준다.

**함수 본문 조각은 단독으로 실행되지 않는다.**

`supabase/migrations/*.sql` 의 함수 안에 있는 `v_cutoff`·`v_retained` 같은 `v_` 변수는
`declare` 로 선언된 **PL/pgSQL 지역 변수**다. 함수 밖에서는 존재하지 않는다.

| 위치 | `select … into x` |
|---|---|
| 일반 SQL | **테이블 `x` 를 생성** (`CREATE TABLE AS` 와 같다) |
| PL/pgSQL 블록 안 | **변수 `x` 에 대입** |

그래서 본문을 그대로 붙여넣으면 —

- `v_cutoff` → `ERROR: 42703 column "v_cutoff" does not exist`
- `select … into v_retained` → Supabase 린터가 **"RLS 없는 테이블 생성"** 으로 경고

  ⚠️ 이때 **`Run and enable RLS` 를 누르지 않는다.** 없는 테이블에 RLS 를 걸려다
     실패하는데, 위의 "마지막 문장 결과만 보인다" 함정과 겹쳐 어디까지 걸렸는지
     알 수 없게 된다.

→ 변수를 **실제 값으로 바꿔** 쓴다. 예: `v_cutoff` → `now() - interval '3 years'`.
  (2026-09-14 실제로 겪었다. ADR-047)

---

## 1. 마이그레이션 — 적용 전 점검

무엇이 이미 적용돼 있는지 본다. `1` = 적용됨, `0` = 미적용.

```sql
select '004 inquiry_status_history' as 항목, count(*) as 있음
from information_schema.tables
where table_schema = 'public' and table_name = 'inquiry_status_history'
union all
select '004 intake_channel', count(*) from information_schema.columns
where table_schema = 'public' and table_name = 'inquiries' and column_name = 'intake_channel'
union all
select '005 admin_audit_log.note', count(*) from information_schema.columns
where table_schema = 'public' and table_name = 'admin_audit_log' and column_name = 'note'
union all
select '005 admin_users', count(*) from information_schema.tables
where table_schema = 'public' and table_name = 'admin_users'
union all
select '006 data_retention_log', count(*) from information_schema.tables
where table_schema = 'public' and table_name = 'data_retention_log'
union all
select '006 inquiries.retain_until', count(*) from information_schema.columns
where table_schema = 'public' and table_name = 'inquiries' and column_name = 'retain_until'
union all
select '006 purge_expired_inquiries()', count(*)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'purge_expired_inquiries'
union all
select '007 pg_cron 확장', count(*) from pg_extension where extname = 'pg_cron';
```

## 2. 마이그레이션 — 적용 후 확인

**`Success` 를 믿지 않고 만들어진 객체를 직접 센다.**

```sql
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'inquiries'
       and column_name in ('retain_until', 'retain_reason'))          as 컬럼_2개,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'data_retention_log') as 이력테이블_1개,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'purge_expired%')   as 함수_2개;
-- 기대: 2 / 1 / 2
```

---

## 3. pg_cron — 잡 등록

⚠️ **한 문장씩 실행한다.** 각각 jobid(숫자)를 돌려줘야 성공이다.

```sql
select cron.schedule(
  'purge-expired-inquiries',
  '10 18 * * *',                              -- 매일 03:10 KST
  $$select public.purge_expired_inquiries('cron');$$
);
```

```sql
select cron.schedule(
  'purge-expired-audit-log',
  '30 18 * * *',                              -- 매일 03:30 KST
  $$select public.purge_expired_audit_log('cron');$$
);
```

⚠️ **cron 표현식은 UTC 다.** `10 18 * * *` = 03:10 KST (다음 날).
KST 로 적으면 9시간 어긋난다.

## 4. pg_cron — 등록 확인

```sql
select jobname, schedule, active from cron.job
where jobname in ('purge-expired-inquiries', 'purge-expired-audit-log');
-- 기대: 2행, active = true
```

## 5. pg_cron — **0행이 나왔을 때** (권한인지 진짜 없는지)

⚠️ **0행을 보고 "등록 안 됐다" 고 단정하지 않는다.** pg_cron 1.4+ 는
`cron.job` 에 `username = current_user` 정책이 걸려 있어 **만든 롤과 조회 롤이
다르면 행이 안 보인다.** 둘을 구분하는 쿼리다.

```sql
select
  current_user                                              as 현재롤,
  (select count(*) from cron.job)                           as 전체잡수,
  (select count(*) from cron.job where jobname like 'purge-%') as 파기잡수;
```

- `전체잡수 > 0` 인데 `파기잡수 = 0` → 잡은 있는데 우리 것만 없다. **등록 필요.**
- `전체잡수 = 0` → 이 롤로 보이는 잡이 하나도 없다. **정말 없거나 롤이 다르다.**
  Supabase SQL Editor 는 `postgres` 로 돈다. 잡도 같은 롤로 만들면 문제없다.

## 6. pg_cron — 잡 제거 / 재등록

```sql
select cron.unschedule('purge-expired-inquiries');
select cron.unschedule('purge-expired-audit-log');
```

같은 이름으로 `cron.schedule()` 을 다시 부르면 갱신되지만, **이름 규칙을 바꿀
때는 옛 잡을 명시적으로 지운다.** 안 그러면 둘 다 남아 중복 실행된다.

---

## 7. 파기 잡 — 수동 실행 (동작 확인용)

잡을 기다리지 않고 함수가 도는지 본다. `'manual'` 이 `triggered_by` 에 남는다.

```sql
select public.purge_expired_inquiries('manual');
select public.purge_expired_audit_log('manual');
```

```sql
select executed_at, target_table, deleted_count, retained_count, triggered_by
from public.data_retention_log
order by executed_at desc limit 10;
```

## 8. 파기 잡 — **자동 실행 확인 (다음 날)** ← 가장 중요

**잡이 등록됐다고 도는 것은 아니다.** 등록 다음 날 이걸 본다.

```sql
select executed_at, target_table, deleted_count, retained_count, triggered_by
from public.data_retention_log
where triggered_by = 'cron'
order by executed_at desc limit 10;
```

- **행이 있으면** 잡이 도는 것이다. `deleted_count = 0` 이어도 **그 0 행이 증거다** —
  삭제 대상이 없었을 뿐 함수는 실행됐다.
- **행이 없으면** 잡이 안 도는 것이다. 9번으로 원인을 본다.

## 9. 파기 잡이 안 돌 때 — 실패 사유

```sql
select jobid, status, return_message, start_time
from cron.job_run_details
order by start_time desc limit 20;
```

`status = 'failed'` 면 `return_message` 에 이유가 있다. 여기가 비어 있으면
**잡이 아예 발화하지 않은 것**이므로 4·5번으로 등록 상태부터 확인한다.

---

## 10. 보관기간 — 개별 문의 연장

계약 체결 등으로 더 보관해야 하는 건에 쓴다. 이유를 함께 남긴다.

```sql
update public.inquiries
set retain_until = now() + interval '5 years',
    retain_reason = '전자상거래법상 계약·청약철회 기록'
where id = '00000000-0000-0000-0000-000000000000';
```

⚠️ **`retain_reason` 없이 `retain_until` 만 늘리지 않는다.** 왜 남겨뒀는지
모르는 데이터가 되고, 그건 보관기간 정책이 없는 것과 같다.

---

## 관련 문서

| 무엇 | 어디 |
|---|---|
| 스키마 원본 (생성 SQL) | `supabase/migrations/` |
| 스키마 설명·RLS·환경변수 | `doc/03-supabase.md` |
| 관리자 계정·감사 로그 운영 | `doc/10-admin.md` |
| 왜 이렇게 정했나 | `doc/04-decisions.md` (ADR-021 보관기간, ADR-029 국외이전) |
| 마이그레이션 적용 절차 | `.claude/skills/homepage-supabase/SKILL.md` |
