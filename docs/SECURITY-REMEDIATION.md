# 메디노티(Medinoti) 보안·구조 개선 가이드라인

> **이 문서의 목적**: 운영 중인 메디노티 사이트의 보안/개인정보/확장성 문제를
> 심각도 순으로 안전하게 해결하기 위한 작업 지시서다. Claude(Fable 5) 또는
> Opus 4.8이 이 문서만 읽고도 각 항목을 이어서 작업할 수 있도록 작성됐다.
>
> 작성: 2026-07-03 · 감사 대상: `src/` 전체(~4,500줄, 페이지 11개)

---

## 📌 진행 현황 (2026-07-04 갱신)

**완료 ✅**
- **M-1** `.env` git 추적 제거 + `.gitignore` 차단 + `.env.example` 추가 (커밋 `c306fc6`, main 배포).
  Google Maps 키에 HTTP 리퍼러 제한 + API 제한(Maps JS/Geocoding/Places) 적용 완료. *(키 로테이션은 미실시 — 필요 시 5단계 참고)*
- **C-0** Supabase RLS 활성화 확인 (`profiles`·`job_postings` 모두 `relrowsecurity = true`).
- **C-1 / C-2** 공개용 안전 뷰 `public_profiles` 생성(전화 마스킹·의료인 좌표 흐림·민감컬럼 제외) →
  Dashboard가 원본 `profiles` 대신 뷰를 조회하도록 변경(커밋 `55f7720`, main 병합 `77ceaf3`, 운영 배포·검증 완료) →
  원본 `profiles` SELECT 정책을 본인 행만(`auth.uid() = id`)으로 강화. **유출 경로 완전 차단.**
  - 적용된 뷰/함수 SQL과 정책 SQL은 아래 C-1, C-3 항목 및 세션 기록 참조.
- **C-3 / H-2** 쓰기 정책 점검 결과 이미 안전(`profiles` update/insert = `auth.uid()=id`,
  `job_postings` insert/update/delete = `auth.uid()=hospital_id`). SELECT까지 잠가 IDOR 경로 종료.

- **H-1** 역할(role) 가드 라우트 래퍼 완료 — `RouteGuard` 컴포넌트로 병원/의료인 전용
  경로 보호(커밋 `12833d6`, 병합 `747ea32`, 운영 배포·검증 완료). URL 직접 입력 시 `/dashboard`로 리다이렉트.
  - 함께 발견·수정: **SPA 라우팅 fallback 부재** → `vercel.json` rewrite 추가(커밋 `10e6bed`).
    딥링크/새로고침 시 Vercel 404 나던 잠재 버그 해결.
  - *후속 권장: 서버측 role 강제(job_postings insert 시 role='hospital' RLS 확인). 영향 낮아 미적용.*

**남음 (다음 순서)**
- **H-3** `kakao_link` 등 사용자 입력 URL 스킴 화이트리스트
- **M-2** 입력 검증 + 좌표 실패 `(0,0)` 데이터 정리 (예: 뷰 검증 중 발견된 '허혜선' 행)
- **M-3** `job_postings` 느슨한 `true` SELECT 정책·중복 정책 정리, 탈퇴 시 공고 고아화
- **L-1** 탈퇴 시 auth 계정까지 삭제(Edge Function) — *참고: `profiles`에 DELETE 정책이 없어 현재 탈퇴가 RLS에 막혀 실제로 안 될 가능성. 확인 필요.*
- **L-2** 민감정보 콘솔 로깅 정리 · **L-3** 하드코딩된 개인 이메일 교체

---

## 0. 절대 원칙 (모든 작업에서 위반 금지)

1. **운영 중인 사이트다. 가입자·실데이터가 있다. 무중단·무오류가 최우선.**
   - 기존 사용자의 로그인/공고/프로필 흐름을 절대 깨지 않는다.
   - 컬럼명·테이블명·`role` 값(`worker`/`hospital`)은 임의로 바꾸지 않는다.
   - DB 스키마 변경(뷰/RPC/RLS 추가)은 **기존 데이터를 삭제하지 않는 방식**으로만.
2. **위치 표시 규칙 (사업 핵심 요구사항)**
   - **병원(hospital)**: 지도에 **정확한 실제 위치**로 표시된다. 흐리지 않는다.
   - **의료인(worker)**: 지도에 **흐린(애매한) 위치**로 표시된다. 절대 정확한
     거주지가 특정되면 안 된다. (현재 `jitterCoords`로 ±약 330m 노이즈 적용 중)
   - 판별 기준: 코드 전반에서 `item.license_type`이 있으면 의료인, 없으면 병원으로 구분한다.
3. **각 항목은 독립 커밋으로**. 하나 끝날 때마다 빌드(`npm run build`) + 수동 확인 후 진행.
4. **RLS/뷰/RPC 등 DB 작업은 사용자(안상수)가 Supabase 대시보드에서 실행**해야 한다.
   Claude는 클라이언트 코드 수정 + 실행할 SQL 스크립트 제공까지 담당한다.
5. 확실하지 않으면 **추측해서 고치지 말고 사용자에게 확인**한다.

---

## 1. 아키텍처 현황 (반드시 이해하고 시작)

- **스택**: React 19 + Vite + TypeScript + Tailwind + react-router-dom v7
- **데이터**: Supabase (`@supabase/supabase-js`) — 브라우저가 **anon key로 DB 직접 접근**
- **백엔드 코드 없음**: Edge Function/서버 API 전무. 모든 로직이 클라이언트에 있음.
- **배포**: Vercel · **지도**: Google Maps (`@react-google-maps/api`)
- **저장소**: GitHub `ssangsoos/medilink` (main 브랜치)

### 이게 왜 중요한가
> 브라우저가 anon key로 DB에 직접 붙기 때문에, **화면에 보이는 모든 마스킹·권한
> 체크는 "장식"이고 실제 방어벽은 오직 Supabase RLS(Row Level Security)뿐이다.**
> `select('*')`로 받아온 데이터는 화면에서 가려도 브라우저 Network 탭에 원본이 그대로 있다.

### 테이블 구조 (코드에서 역추적)
- **`profiles`** — 회원 공용 테이블. `role`(`worker`/`hospital`)로 구분.
  - 공통: `id`(auth uid), `email`, `name`, `phone`, `address`, `latitude`, `longitude`, `role`, `is_exposed`
  - 의료인: `license_type`, `license_number`, `detail_address`, `desired_hourly_rate`, `work_radius`, `bio` 등
  - 병원: `hospital_name`, `hospital_type`, `business_number`, `mobile_phone` 등
- **`job_postings`** — 채용공고. `hospital_id`(= 병원 profiles.id)로 소유. `status`, `work_end_date`, `contact_phone`, `kakao_link` 등

---

## 2. 심각도별 작업 목록 (이 순서대로 진행)

각 항목: **[문제] → [근본 원인] → [해결 방향] → [검증]** 구조.
체크박스는 완료 시 `[x]`로 갱신한다.

---

### 🔴 C-0. Supabase RLS 실제 상태 확인 (모든 것의 전제 — 가장 먼저)

- [ ] 상태 확인 완료

**문제**: 코드만으로는 RLS 활성화 여부를 알 수 없다. RLS가 꺼져 있으면 아래
모든 클라이언트 수정은 무의미하다 (누구든 anon key로 DB를 직접 덤프/변조 가능).

**확인 방법** (사용자가 Supabase 대시보드에서):
1. Table Editor → `profiles`, `job_postings` 각각 RLS가 **Enabled**인지.
2. Authentication → Policies에서 다음 정책이 있는지:
   - `profiles`: 본인만 `update`/`delete` (`auth.uid() = id`)
   - `profiles`: `select`는 공개 대상만 (혹은 뒤의 뷰/RPC로 대체)
   - `job_postings`: 본인 병원만 `insert`/`update`/`delete` (`auth.uid() = hospital_id`)

**검증용 SQL** (Supabase SQL Editor에서 실행 → RLS 켜진 테이블 목록 확인):
```sql
select relname, relrowsecurity
from pg_class
where relname in ('profiles', 'job_postings');
-- relrowsecurity = true 여야 안전
```

**결과에 따라**:
- RLS 켜져 있고 정책 정상 → C-1부터 순서대로 진행.
- RLS 꺼져 있음 → **긴급**. C-3(RLS 도입)을 C-1보다 먼저 처리해야 함. 사용자에게 즉시 알릴 것.

---

### 🔴 C-1. 의료인 PII 원본이 네트워크로 전송됨 (`select('*')`)

- [ ] 완료

**문제**: 병원이 인재를 조회하면 의료인의 **전화번호 원본, 상세주소 원본,
면허번호, 정확한 GPS 좌표**가 전부 브라우저로 내려온다. 화면 마스킹
(`maskPhoneNumber`, `maskAddress`, `jitterCoords`)은 렌더링 눈속임일 뿐,
Network 탭엔 원본이 그대로 있다.

**위치**:
- `src/pages/Dashboard.tsx:109-113` — 병원이 의료인 조회 (`.select('*')`)
- `src/pages/Dashboard.tsx:116-119` — 의료인이 병원 조회 (`.select('*')`)

**근본 원인**: `select('*')` + 마스킹을 클라이언트에서만 수행.

**해결 방향** (2단계):

1. **1차(빠르고 안전한 완화)** — 클라이언트에서 `select('*')` 대신 **필요한 컬럼만
   명시**. 특히 병원이 의료인을 볼 때 `license_number`, `detail_address`,
   원본 `phone`, 정확 `latitude/longitude`를 **아예 select하지 않는다**.
   - 단, 거리 계산(`getDistanceKm`)과 지도 마커가 좌표를 쓰므로 **좌표를 완전히
     빼면 지도가 깨진다.** → C-2와 함께 "흐린 좌표" 전략을 먼저 정한 뒤 적용.
   - 전화번호는 목록 단계에서 필요 없다(연락은 상세/버튼 단계). 연락 수단은
     아래 2차의 서버 뷰에서 마스킹된 형태로만 제공.

2. **2차(근본 해결, 권장)** — Supabase에 **공개용 뷰(View) 또는 RPC** 생성.
   - 의료인 공개 뷰: `id, name, license_type, bio, is_exposed`,
     그리고 **서버에서 이미 흐려진 좌표**(`display_lat`, `display_lng`)와
     **버킷화된 거리 계산용 대략 좌표**만 노출. `phone/license_number/detail_address/원본좌표 제외`.
   - 병원 공개 뷰: 병원은 정확 좌표 노출 OK. 단 `business_number` 등 불필요 민감정보는 제외.
   - 클라이언트는 `from('profiles')` 대신 이 뷰/RPC를 호출.

**⚠️ 함정 (반드시 처리)**: 현재 `getDistanceKm`(Dashboard.tsx:236-246)는 **원본
좌표로 거리를 계산**한다. 좌표를 서버에서 흐리게만 내려주면 거리도 흐린 좌표
기준이 되는데, `formatDistance`가 어차피 "약 5km"처럼 버킷 표시라 **정확도 손실은
사업상 허용 범위**다. → 흐린 좌표로 거리 계산하도록 통일하면 원본 좌표를 클라이언트에
내려줄 이유가 사라진다. (이게 C-2의 핵심 해법과 맞물림)

**검증**:
- 병원 계정으로 로그인 → 브라우저 DevTools → Network → 의료인 조회 응답(JSON)에
  `phone` 원본/`license_number`/`detail_address`/원본 소수점 좌표가 **없는지** 확인.
- 지도 마커·거리 표시·필터가 여전히 정상 동작하는지 확인.

---

### 🔴 C-2. 의료인 정확 좌표 노출 (지도 흐림 무력화)

- [ ] 완료

**문제**: 의료인 마커는 `jitterCoords`로 흐리지만, 원본 `latitude/longitude`가
C-1과 같은 이유로 응답에 포함돼 정확한 집 위치를 특정 가능. 게다가 jitter가
**결정론적**(같은 id면 항상 같은 오프셋)이라 이론적으로 원점 복원 여지도 있음.

**위치**: `src/lib/distance.ts:29-41` (jitterCoords), `Dashboard.tsx:226-233` (getDisplayPosition)

**해결 방향**:
- **원본 좌표를 아예 클라이언트로 보내지 않는다.** 서버(뷰/RPC)에서 흐린 좌표를
  계산해 `display_lat/display_lng`로만 내려준다. (C-1 2차와 동일 작업)
- 병원은 정확 좌표 유지(요구사항). 뷰에서 role 분기: 의료인 행만 좌표를 흐림.
- jitter를 서버에서 수행하면, 결정론적이어도 클라이언트에 원본이 없으니 복원 불가.
- **거주지 저장은 정확하게 유지**(회원이 입력한 원본은 DB에 정확히 저장 — 매칭 정확도용).
  노출 시점에만 흐린다. 원본 좌표 접근은 본인만 가능하도록 RLS로 보호.

**검증**:
- 의료인 마커 위치가 실제 주소와 다른 흐린 지점에 찍히는지(현재 동작 유지).
- 병원 마커는 정확한 위치인지.
- Network 응답에 의료인 원본 좌표가 없는지.

---

### 🔴 C-3. 전체 보안이 RLS 단일 의존 — 없으면 anon key로 전면 장악

- [ ] 완료 (RLS 정책 적용 확인)

**문제**: 모든 쓰기 쿼리가 클라이언트가 스스로 넣는 `.eq('id', user.id)`에만
의존. RLS가 강제하지 않으면 임의 UUID로 남의 프로필/공고를 수정·삭제·덤프 가능.

**RLS 부재 시 최악 시나리오** (anon key는 이미 공개값):
- `from('profiles').select('*')` → 전 회원 PII 덤프 (비공개 의료인 포함)
- `from('profiles').update({...}).eq('id', <피해자 UUID>)` → 남의 이력서 변조/강제 노출
- `from('profiles').delete().eq('id', <피해자 UUID>)` → 남의 계정 삭제
- `job_postings` 무제한 열람/변조/삭제/스팸 삽입

**해결 방향** (사용자가 Supabase에서 실행할 SQL — Claude가 정확한 스크립트 제공):
```sql
-- profiles RLS
alter table profiles enable row level security;

-- 본인 행: 전체 접근
create policy "own profile - full access"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 타인 조회는 공개 뷰/RPC로만 (아래 뷰 참조). 원본 테이블 직접 select는 본인만.

-- job_postings RLS
alter table job_postings enable row level security;

create policy "anyone can read active postings"
  on job_postings for select
  using (status = 'active');

create policy "hospital manages own postings"
  on job_postings for all
  using (auth.uid() = hospital_id)
  with check (auth.uid() = hospital_id);
```
> ⚠️ 위 SQL은 **초안**이다. 실제 적용 전 사용자와 함께 현재 데이터/흐름에 맞게
> 검토하고, 스테이징 또는 백업 후 적용한다. 특히 "공개 조회를 뷰로 옮기는" 작업과
> 순서를 맞춰야 기존 조회가 깨지지 않는다.

**검증**: 다른 계정 UUID로 update/delete 시도 시 차단되는지 (RLS 정책 테스트).

---

### 🟠 H-1. 역할(role) 가드 부재 — 병원/의료인 페이지 상호 침범

- [ ] 완료

**문제**: `App.tsx`의 모든 라우트가 무방비. 각 페이지는 "로그인 여부"만 확인하고
**역할 검증이 없다.** URL 직접 입력으로:
- 의료인이 `/hospital/post` → 공고 생성 가능
- 의료인이 `/hospital/edit` → 병원 필드 덮어써 데이터 오염
- 병원이 `/worker/profile` → 의료인 필드 오염

**위치**: `src/App.tsx:15-40`, 관련 페이지: `PostJob.tsx`, `EditHospital.tsx`, `EditProfile.tsx`

**해결 방향**:
- `ProtectedRoute` / `RoleRoute` 래퍼 컴포넌트를 새로 만들어(**기존 페이지 코드 최소
  변경**) 라우트를 감싼다. 로그인 + `profile.role` 일치 확인, 불일치 시 리다이렉트.
- 서버 측에서도 RLS로 role 불일치 쓰기를 막는 게 이상적(예: `job_postings.insert`는
  role='hospital'인 경우만). 클라이언트 가드는 UX, RLS는 실제 방어.

**검증**: 의료인 계정으로 `/hospital/post` 직접 접근 → 차단/리다이렉트 확인.

---

### 🟠 H-2. 프로필 update/delete가 클라이언트 필터에만 의존 (IDOR)

- [ ] 완료 (C-3 RLS로 해소됨을 확인)

**문제**: `EditProfile`/`EditHospital`의 update/delete가 `.eq('id', user.id)`에만
의존. 방어의 유일한 근거가 RLS. → **C-3에서 RLS 정책을 걸면 근본 해소된다.**

**위치**: `EditProfile.tsx:143-146,174-177`, `EditHospital.tsx:113,140-143`, `Dashboard.tsx:160-163`

**해결 방향**: C-3의 `auth.uid() = id` 정책으로 커버됨. 별도 코드 변경은 불필요하나,
C-3 적용 후 실제로 남의 행 수정이 막히는지 반드시 테스트.

**참고**: `job_postings`는 이미 `.eq('id',...).eq('hospital_id', user.id)` 이중 필터라
상대적으로 나음(`MyJobs.tsx:56-61`, `EditJob.tsx:166-170`). 그래도 RLS 강제 필요.

---

### 🟠 H-3. 사용자 입력 URL(`kakao_link`)을 검증 없이 렌더 (피싱/`javascript:` 벡터)

- [ ] 완료

**문제**: 병원이 자유 입력한 `kakao_link`를 그대로 `<a href>`로 렌더. 악성 병원이
`javascript:...`나 피싱 URL을 넣으면 클릭한 의료인에게 스크립트 실행/피싱 가능(저장형).

**위치**: `src/pages/Dashboard.tsx:622-631` (렌더), 입력: `PostJob.tsx:27`, `EditJob.tsx:29`

**해결 방향**:
- 입력 저장 시 + 렌더 시 **URL 스킴 화이트리스트** 적용: `https://`만 허용,
  가능하면 `open.kakao.com` / `pf.kakao.com` 등 카카오 도메인으로 제한.
- 유효하지 않으면 링크를 렌더하지 않거나 무해한 텍스트로 표시.
- `getSmsHref`(Dashboard.tsx:191)의 전화번호도 숫자/하이픈만 허용하도록 정리.
- `dangerouslySetInnerHTML`은 전무(확인됨), 나머지는 React 이스케이프로 안전.

**검증**: `javascript:alert(1)`을 kakao_link에 넣어보고 링크가 무력화되는지.

---

### 🟡 M-1. `.env`가 git에 커밋됨 + Google Maps 키 노출

- [ ] 완료

**문제**: `.gitignore`가 `.env`를 빼먹어 `.env`(Google Maps 키, Supabase anon key)가
GitHub에 추적 중. anon key는 원래 공개값이라 무해하나, **Google Maps 키는 사용 제한이
없으면 도용→요금 폭탄** 위험.

**확인됨**: `git ls-files`에 `.env` 존재. `.gitignore`는 `.env*.local`만 무시.

**해결 방향**:
1. `.gitignore`에 `.env` 추가.
2. `git rm --cached .env` (파일은 로컬 유지, 추적만 해제) 후 커밋.
3. **Google Cloud Console에서 Maps API 키에 HTTP 리퍼러 제한**(`medinoti.com`,
   `*.vercel.app` 등) + **API 종류 제한**(Geocoding, Maps JS만) + 사용량 할당량 설정.
4. (선택) 키 로테이션: 노출된 키를 폐기하고 새 키 발급 후 Vercel 환경변수 교체.
   - ⚠️ Vercel 환경변수(`VITE_*`)와 로컬 `.env` 동기화 확인. 운영 배포가 키를
     어디서 읽는지(Vercel 대시보드) 먼저 확인하고 교체해야 사이트가 안 깨진다.

**검증**: `git ls-files | grep env` 결과에 `.env` 없음. 지도/좌표 조회 정상.

---

### 🟡 M-2. 입력 검증 얕음 — 형식·서버 검증 없이 insert

- [ ] 완료

**문제**: 면허번호/전화/사업자번호/좌표를 형식 검증 없이 insert. 특히 좌표 변환
실패 시 `lat=0,lng=0`으로 저장돼 지도에 엉뚱한 마커(아프리카 근처) 생성.

**위치**: `RegisterWorker.tsx:87-110`(+좌표 실패 처리 78·102행 부근), `RegisterHospital.tsx:84-87`, `geocode.ts`

**해결 방향**:
- 클라이언트: 전화(`^01[016-9]-?\d{3,4}-?\d{4}$`), 사업자번호 형식, 면허번호 필수/길이 검증.
- 좌표 변환 실패 시 `(0,0)` 저장 금지 → 저장 막고 "주소를 다시 확인" 유도.
- 기존 저장된 `(0,0)` 데이터가 있는지 점검 쿼리 필요(사용자와 함께).

**검증**: 잘못된 형식 입력 시 저장 차단. 주소 실패 시 (0,0) 저장 안 됨.

---

### 🟡 M-3. `is_exposed` 필터 비대칭 & 탈퇴 시 공고 고아화

- [ ] 완료

**문제**:
- 의료인이 병원 조회 시(`Dashboard.tsx:116-119`) `is_exposed` 필터 없음(의도일 수 있음 — 확인 필요).
- 탈퇴(`EditHospital.tsx:140-143`)가 `profiles`만 삭제, `job_postings`는 잔존 → 고아 공고 + `contact_phone` 잔류.

**해결 방향**:
- 병원 노출 정책을 사용자에게 확인 후 필요 시 필터 추가.
- 탈퇴 시 관련 `job_postings`도 정리(또는 DB에 `on delete cascade` 외래키). 아래 L-1과 함께 Edge Function으로.

---

### 🟢 L-1. auth 계정이 클라이언트에서 삭제 불가 — 탈퇴 불완전

- [ ] 완료

**문제**: 탈퇴가 `profiles` 행만 지우고 `supabase.auth` 계정(이메일 등)은 잔존.
"즉시 삭제" 안내와 불일치, 개인정보 완전 파기 미흡.

**위치**: `EditProfile.tsx:174-177`, `EditHospital.tsx:140-143`

**해결 방향**: `service_role` 키를 쓰는 Supabase **Edge Function**을 만들어
탈퇴 시 auth 계정 + profiles + job_postings를 원자적으로 삭제. (백엔드 도입 시작점)

---

### 🟢 L-2. 민감정보 로깅

- [ ] 완료

**문제**: `RegisterWorker.tsx:113`, `RegisterHospital.tsx:128`에서 사용자 UUID +
DB 에러 메시지를 `console.error`로 출력. (치명적 아님, 운영 콘솔 노출 수준)

**해결 방향**: 프로덕션 빌드에서 식별자/스키마 힌트가 콘솔에 남지 않도록 정리.

---

### 🟢 L-3. 하드코딩된 개인 연락처

- [ ] 완료

**문제**: `EditProfile.tsx:472`, `EditHospital.tsx:287`에 고객센터로 개인 Gmail
(`ssangsoos@gmail.com`) + `032-473-2222` 하드코딩. 시크릿은 아니나 개인 이메일
운영 노출 재검토 권장.

**해결 방향**: 운영용 대표 이메일로 교체 여부를 사용자와 확인.

---

## 3. 작업 순서 요약 (권장 실행 순)

1. **C-0** RLS 상태 확인 (사용자) → 결과에 따라 C-3 우선순위 조정
2. **C-1 + C-2** 함께 (공개 뷰/RPC 설계 → 클라이언트가 뷰 호출 → 원본 PII·좌표 차단)
3. **C-3** RLS 정책 전면 적용 (H-2 자동 해소)
4. **H-1** 역할 가드 라우트 래퍼
5. **H-3** URL 스킴 화이트리스트
6. **M-1** `.env` git 정리 + Maps 키 제한 *(코드와 독립 — 언제든 먼저 해도 안전)*
7. **M-2, M-3, L-1~L-3** 순차 정리
8. (별건) **다국어 i18n** — 영어/일본어 + 지역 자동 전환. DB/인증 무관 레이어라
   보안 작업 완료 후 안전하게 추가.

> **M-1은 코드 흐름과 완전히 독립적이고 되돌리기 쉬우므로, 원하면 가장 먼저 처리해도 된다.**

---

## 4. 각 작업 공통 체크리스트

작업 완료 전 매번:
- [ ] `npm run build` 통과 (`tsc -b && vite build`)
- [ ] 병원 계정 / 의료인 계정 각각으로 핵심 플로우 수동 확인
- [ ] 지도: 병원=정확, 의료인=흐림 유지 확인
- [ ] Network 탭에서 의료인 PII 원본 미노출 확인 (C-1/C-2 이후)
- [ ] 독립 커밋 + 명확한 커밋 메시지
- [ ] DB 변경은 사용자가 백업/스테이징 후 적용

---

## 5. 알아둘 기존 동작 (건드리면 안 되는 것)

- `formatDistance`: 거리를 "약 5km"처럼 버킷 표시(정확 거리 은닉) — 유지.
- `jitterCoords`: 의료인 흐림(±330m) — **로직 자체는 서버로 이전**하되 흐림 강도 유지.
- `getEffectiveMobile`(Dashboard.tsx:201): 공고 전용 번호 우선 로직 — 최근 커밋 반영됨, 유지.
- `role` 값 문자열(`worker`/`hospital`), `license_type` 유무로 의료인/병원 판별 — 유지.
- 이메일 확인(emailRedirect) 가입 흐름 — 유지.

---

*이 문서는 살아있는 문서다. 각 항목 완료 시 체크박스를 갱신하고, 설계 결정이
바뀌면 해당 섹션을 수정한다.*
