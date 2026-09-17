# 의료인 연락 동의 및 문자 연결 구현 상태

## 사용자 요구

목록에는 의료인 번호를 마스킹하되, 연락에 명시적으로 동의한 의료인에게 로그인한 병원 회원이 문자·전화로 연락할 수 있어야 한다. PC는 실제 번호와 `안녕하세요. 메디노티 보고 연락드립니다.`를 담은 직접 SMS QR을 표시한다. 모바일은 기존 문자 초안을 유지한다. 자동 전송·문자 중계 서버·추가 연락 페이지를 만들지 않는다.

## 구현 범위

- 가입 시 선택 동의와 프로필에서 동의·철회. 기본 체크하지 않으며 기존 회원을 일괄 동의 처리하지 않는다.
- 제공자, 수신 병원 회원, 제공 항목, 채용 연락 목적, 보유·이용 기준, 거부·철회 방법 안내. 문자/전화 앱 및 QR에서 실제 번호가 보이며 이미 전달된 번호를 원격 회수할 수 없음을 설명.
- 동의 여부·안내 버전 저장 및 응답 readback 검사. 서버 트리거가 동의 변경 시각 기록. 관련 없는 프로필 수정은 기존 동의 기록 보존.
- 기존 의료인에게 대시보드의 동의 설정 안내 표시.
- 실제 번호를 사전 조회하지 않는다. 연락 클릭 시 `resolve_worker_contact` RPC로 대상 한 명의 번호만 조회. 공개/마스킹 프로필에서 번호 추측·복구·우회하지 않는다.
- RPC에서 병원 역할, 대상 의료인, 공개 상태, 현 버전 명시적 동의, 기존 연락 거부를 확인. 비로그인·의료인 호출 및 비공개·철회·미동의·잘못된 번호를 거부.
- 같은 병원으로 가장하기 위한 클라이언트 역할/ID 변경 방어는 migration 테스트로 확인한다. 병원 기관 실재성·면허 인증 시스템을 새로 도입한 것은 아니다.
- PC QR: 로컬 생성, 기기별 URI, 짧은 인사말. 모바일: 문자 앱 열기 및 비동기 호출 후 자동 열기가 차단되는 브라우저용 수동 링크. 사용자가 직접 전송.

## 최종 로컬 검증 결과

- 전체 테스트 **18개 파일, 313/313 통과**. 이 중 실제 PostgreSQL 엔진의 migration/권한 테스트 **60개 통과**.
- TypeScript + Vite 운영 빌드, 변경한 소스·단위 테스트 ESLint, `git diff --check` 통과.
- 독립 프런트 검토: 중요한 추가 차단 오류 없음. 독립 보안 검토에서 발견한 역할 변경 우회는 트리거 가드 및 회귀 테스트로 수정하고 전체 테스트를 다시 실행했다.
- PC 실제 QR 이미지 해독: iPhone/Android 두 payload 모두 수신번호·고정 인사말 일치.
- 브라우저 모의 모바일 두 기기: 문자 앱 URI 연결, 수동 열기 링크, 권한 거부 시 이전 링크 삭제, 동의 안내 표시 검증.
- 기존 지도 회귀: 320/390/1280 너비 통과, 제품 JS 예외 0, 실제 백엔드 요청 0.
- 기존 브라우저 데이터 갱신/번들 크기 경고는 남아 있다. 실물 휴대폰 및 운영 DB 테스트 완료를 의미하지 않는다.

## 검증 방법

```sh
npm test
npm run build
npx eslint src/components/PrivacyConsent.tsx src/components/WorkerContactConsent.tsx src/components/map/ContactActions.tsx src/components/map/TalentCard.tsx src/lib/workerContact.ts src/lib/workerContactConsent.ts src/pages/Dashboard.tsx src/pages/EditProfile.tsx src/pages/RegisterWorker.tsx src/pages/PrivacyPolicy.tsx tests/PrivacyConsent.test.tsx tests/WorkerConsentPersistence.test.tsx tests/WorkerContactActions.test.tsx tests/WorkerContactConsent.test.tsx tests/workerContact.test.ts tests/workerContactConsent.test.ts tests/workerContactMigration.test.ts tests/Dashboard.test.tsx
git diff --check
```

브라우저 도구는 QA 전용 외부 경로에 설치했고 운영 의존성에 추가하지 않았다. Playwright 및 jsqr 모듈 경로를 환경변수로 지정한다.

```sh
# 실행 중인 로컬 Vite의 URL과 QA 모듈 경로를 설정한 뒤 실행
QA_BASE_URL=http://127.0.0.1:5192 \
PLAYWRIGHT_MODULE=/tmp/medinoti-sms-qa/node_modules/playwright \
JSQR_MODULE=/tmp/medinoti-sms-qa/node_modules/jsqr \
QA_OUT=/tmp/medinoti-worker-contact-qa \
node tests/browser-worker-contact.cjs
```

- SQL: 실제 migration을 PGlite PostgreSQL 엔진에서 실행. 실제 역할 전환·RLS·권한·트리거를 시험하되 운영 DB 복제본은 아님.
- UI: Vitest의 가입·프로필 저장/철회·readback·미동의 처리 및 기존 병원 연락 회귀 검증.
- 브라우저: 모의 의료인과 모의 서버 응답만 사용. 실제 resolver 클라이언트와 TalentCard를 연결해 사전 조회 없음, 권한 재조회, 거부 시 이전 링크 삭제, 기본 미선택 동의 표시 확인.
- 생성된 QR 이미지를 jsQR로 다시 해독하여 iPhone/Android 각각 실제 테스트 번호·짧은 본문 확인.
- 휴대폰 문자 앱으로 넘어가는 외부 동작만 테스트에서 가로챈다. 실물 휴대폰 스캔·SMS 수신/발송 검증으로 과장하지 않는다.
- 기존 지도 화면 320/390/1280 너비 회귀 QA 별도 실행.
- 브라우저의 개발용 Vite HMR WebSocket 로컬 네트워크 경고는 있었으나 제품 JS 예외 및 실제 Supabase 요청은 없었다.

## 운영 반영 차단 사항 — 중요

**이 문서는 운영 배포 완료 보고가 아니다.**

2026-09-18 작업 시 로컬 프로젝트 환경에는 Supabase 공개 클라이언트 키만 있었고, Supabase 관리 대시보드는 로그인 화면으로 연결됐다. 관리자 DB 접근을 추측하거나 우회하지 않았다. 기존 회원의 실제 번호·동의는 조회/변경하지 않았다.

추가 읽기 전용 확인: 운영 JS 자산 `/assets/index-Dh-e4d6i.js`의 Supabase 대상이 로컬 `.env`/`.env.local`과 일치했고 새 resolver는 아직 포함되지 않았다. 해당 DB에서 `profiles?select=worker_contact_consent&limit=0` 조회는 HTTP 400 / PostgreSQL `42703` / `column profiles.worker_contact_consent does not exist`를 반환했다. 행 데이터는 요청하지 않았다. 따라서 운영 DB에 동의 컬럼이 아직 없다는 점까지 확인했고 프런트 단독 배포를 중단했다.

**운영 DB migration → 실제 스키마·역할·RLS·공개 뷰 readback → 프런트 배포** 순서가 필요하다. DB 컬럼/함수 없이 프런트만 배포하면 신규 가입/프로필 저장이 실패할 수 있으므로 `main` 병합 및 운영 배포를 보류한다. 운영 배포가 막혔다고 공개 뷰를 통째로 풀거나 임의 동의 처리하지 않는다.

다음 작업의 시작점:
1. 프로젝트 운영자의 Supabase 관리 로그인 또는 승인된 DB 관리 연결 확보. 비밀번호를 채팅에 붙여넣지 않는다.
2. `docs/worker-contact-consent-migration.md`의 preflight 실행: 대상 프로젝트, 기존 정책·뷰·역할·트리거 확인.
3. 검증된 SQL을 원자적으로 적용하고 정확한 대상의 컬럼/함수/ACL/트리거를 읽어 확인.
4. 실제 사용자에게 임의 연락하거나 동의를 만드는 대신 승인된 테스트 계정으로 검증.
5. 프런트 운영 배포 후 배포 자산·가입/프로필 화면 확인. 마지막 실물 폰 문자 작성 단계는 전송 없이 번호/문구 확인 가능.

주의: 기존 회원은 새 동의를 직접 선택·저장해야 한다. 로그인/배포만으로 미동의 회원 모두에게 연락 가능해지는 것은 아니다.
