# AI 수정 구현 및 실호출 검수

작업 브랜치: `feat/ai-edit-patches` (기준 `bb809ac`).

## 현재 검수 상태

실제 생성 검수부터 확인했으나 `backend/.env`, `OPENAI_API_KEY`, `OPENAI_MODEL`이 없어
실행 중인 `/api/health`가 `ready: false`를 반환했습니다. 실제 AI 생성·수정 호출은 설정 대기입니다.
사용자에게 키를 로컬 파일에 설정하고 완료를 알려 달라고 안내했습니다. 키를 채팅·로그·Git에 기록하지 않습니다.

실제 제공업체를 대신한 테스트 응답으로 Patch 검증, API, 브라우저 수정 흐름을 검수했습니다.
이 자동 검증은 실제 모델의 응답 품질·계정 권한·요금 한도 확인을 대체하지 않습니다.

## 사용 흐름

1. Preview 또는 CMS Toolbar의 **AI 수정**을 누릅니다.
2. 전체 대시보드 또는 현재 선택한 컴포넌트를 대상으로 자연어 요청을 입력합니다(최대 1,000자).
3. **AI 수정 적용**을 누르면 최신 Schema를 기준으로 서버가 Patch를 생성합니다.
4. 서버와 브라우저에서 검증한 변경을 한 번에 적용하고 변경 요약을 표시합니다.
5. **최근 변경 실행 취소**로 직전 AI/CMS 변경을 되돌릴 수 있습니다. History는 메모리의 1단계 Snapshot입니다.

처리 중에는 중복 요청·CMS 변경·확정·Undo를 잠급니다. 수정 취소와 Escape로 요청을 중단할 수 있습니다.
실패·취소·지원하지 않는 요청에서는 원본 Schema와 입력 요청을 유지하며 같은 버튼으로 재시도합니다.
기준 Revision과 현재 Snapshot이 달라진 응답은 적용하지 않습니다. 취소 뒤 늦게 도착한 결과도 무시합니다.
적용 후에는 `editing`으로 전환하고 기존 확정 결과를 해제합니다. 다운로드하려면 다시 확정해야 합니다.

## Patch 계약

`POST /api/edit` 입력: `{ schema, instruction, baseRevision, targetId? }`.
출력: `{ patch, summary, baseRevision, repaired, requestId }`.

| action | 허용 변경 |
|---|---|
| update | 기존 컴포넌트의 제목·표시·너비·유형별 데이터. ID·type 변경 금지 |
| add | 기존 Section에 지원 컴포넌트 추가 |
| remove | ID로 컴포넌트 제거. 마지막 표시 데이터 항목은 제거 불가 |
| move | 기존 Section 내/간 이동, 제거 후 배열 기준 0부터 시작하는 index |
| themeChange | 허용된 Theme 속성 |
| headerChange | Header 제목·설명 |
| layoutChange | Gap·Density. PC 폭·Grid 수 변경 금지 |
| visualChange | Main Visual 텍스트·유형·높이·Overlay·정렬·CTA. 이미지 참조 변경 금지 |
| navigationChange | Navigation 위치·로고·메뉴 |
| sectionChange | Section 제목·표시 여부 |

Patch는 최대 20개 action을 포함합니다. 임의 JSON 경로·코드 실행·프로젝트 ID/유형·저장 설정 수정은 허용하지 않습니다.
객체 속성은 지정된 키만 병합하며, CTA 하위 속성도 기존 값을 유지합니다. 데이터 배열은 전체 교체합니다.
최종 전체 Schema를 검증한 뒤 한 번에 적용하므로 중간 action만 반영되는 일이 없습니다.
중복 ID·잘못된 차트/표·위험한 URL·지원하지 않는 필드·빈 대시보드를 차단합니다.
선택 항목 범위에서는 해당 컴포넌트의 `update`만 허용합니다. 추가·삭제·이동은 전체 범위에서 요청합니다.
변경 요약은 실제 Patch에서 만들며 AI가 임의로 제공한 요약을 그대로 표시하지 않습니다.

서버는 유효하지 않은 Patch를 1회 Repair합니다. 지원하지 않는 요청은 안내 후 종료합니다.
`/api/generate`와 요청 제한·동시 실행 제한·점검 모드·취소·타임아웃 정책을 공유합니다.
수정 요청은 기존 Schema를 포함하므로 최대 512KB, 생성 요청은 기존 32KB를 유지합니다.
서버 로그는 작업 종류와 요청 ID·성공 여부·오류 코드·처리 시간만 기록합니다.

## 실제 AI 검수 재개

`backend/.env.example`을 참고하여 `.env`에 키와 모델을 로컬에서 설정합니다.
`APP_ORIGIN`은 실제 접속 주소와 정확히 같아야 합니다. 기본 `http://localhost:5173`과
`http://127.0.0.1:5173`은 서로 다른 출처입니다. 기존 백엔드는 설정 후 재시작해야 합니다.

```powershell
cd backend
npm.cmd run dev
```

실제 제공업체 검수 명령:

```powershell
cd backend
npm.cmd run test:live
```

이 명령은 실제 API를 호출합니다. 분석·관리자·프로젝트·모니터링 생성 각 1회와
생성 결과의 컴포넌트 제목 수정 1회를 수행합니다(각 호출 검증 실패 시 Repair 최대 1회).
키·원문 응답은 출력하지 않고 각 시나리오의 성공·복구 여부만 표시합니다.
설정이 없으면 외부 호출 없이 설정 대기로 종료합니다.

그다음 브라우저에서 `Create → AI 생성 → Preview → AI 수정 → CMS 추가 편집 → Undo → Finalize → ZIP`을 확인합니다.
API 호출 실패 시 원본 데이터가 유지되는지와 실제 요청한 제목·데이터가 반영되는지도 확인합니다.

## 자동 검증

- 프론트엔드: 기존 20개 + Patch 원자성·불변성·금지 필드·범위·마지막 데이터 보호 3개.
- 백엔드: 기존 5개 + 수정 Repair·지원 범위/취소·API 제한 공유 3개.
- Chromium: 기존 5개 + AI 수정·요약·Undo·CMS 값 보존, 실패/잘못된 응답/버전 불일치, 취소/늦은 응답 3개.
- 타입 검사, 프로덕션 빌드, 린트.

```powershell
# frontend
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run lint
# backend
npm.cmd run check
npm.cmd test
```

후속 범위: 실제 모델 품질 검수, 전체 재생성 시 백업·복원, 추가 V1 컴포넌트,
공개 배포용 공용 Rate Limit 저장소와 운영 비용 한도. 현재 기능을 전체 V1 완료로 간주하지 않습니다.
