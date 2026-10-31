import { useEffect, useRef } from "react";
import { thirdPartyNotices } from "./thirdPartyNotices";
import "./info.css";
import { infoPages } from "./infoRoutes";
import type { InfoPageId } from "./infoRoutes";

export function InfoPage({ page }: { page: InfoPageId }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previous = document.title;
    document.title = `${infoPages[page]} | SEbit Canvers`;
    title.current?.focus();
    window.scrollTo(0, 0);
    return () => { document.title = previous; };
  }, [page]);
  return <main id="main" tabIndex={-1} className="info-page container">
    <header className="info-heading">
      <p className="eyebrow">SEbit Canvers · 이용 안내</p>
      <h1 ref={title} tabIndex={-1}>{infoPages[page]}</h1>
      <p>PC에서 대시보드를 만들고, 저장하고, 활용하기 전에 확인해 주세요.</p>
    </header>
    <nav className="info-nav" aria-label="이용 안내 메뉴">
      {Object.entries(infoPages).map(([id, label]) => <a key={id} href={`#info/${id}`} aria-current={id === page ? "page" : undefined}>{label}</a>)}
    </nav>
    {page !== "service" && <aside className="info-draft" aria-label="정책 검토 상태">
      <strong>공개 전 검토본 · 2026-10-31 작성</strong>
      <p>현재 기능을 기준으로 작성한 초안입니다. 운영 주체·문의처·시행일과 최종 이용 조건은 아직 확정되지 않았으며, 확정된 약관이나 동의 절차로 사용하지 않습니다.</p>
    </aside>}
    <article className="info-content">
      {page === "service" ? <>
        <section><h2>어떤 서비스인가요?</h2>
          <p>분석·관리자·프로젝트·모니터링 유형의 PC용 대시보드를 만드는 도구입니다. 회원가입 없이 샘플 데이터로 제작하며, 실제 업무 데이터나 실시간 시스템에 연결되는 서비스는 아닙니다.</p>
          <p>1280px 이상 PC 화면을 기준으로 합니다. 제작 조건 선택 → AI 생성 또는 샘플 미리보기 → AI/CMS 수정 → 확정 → ZIP 다운로드 순서로 사용하세요.</p></section>
        <section><h2>AI 사용과 입력 내용</h2>
          <p>AI 생성 시 제작 조건과 추가 요청을, AI 수정 시 현재 대시보드의 텍스트·샘플 데이터 및 수정 요청을 서버와 AI 제공업체에 전달합니다. 개인정보·비밀번호·API 키·회사 기밀을 입력하지 마세요.</p>
          <p>업로드 이미지 원본은 브라우저에 저장하며 현재 AI 요청에 포함하지 않습니다. AI를 사용하지 않으려면 샘플 미리보기와 CMS 편집을 이용할 수 있습니다.</p>
          <p>현재 무료로 제공하며 AI 사용 한도는 생성·수정 화면에서 확인할 수 있습니다. 검증에 성공한 요청을 차감하고 실패한 요청은 성공 횟수에 포함하지 않습니다. 진행 중 요청은 한도에 임시 반영되며, 한국시간 자정에 일일 기준이 바뀝니다.</p></section>
        <section><h2>브라우저 저장과 삭제</h2>
          <p>프로젝트·제작 조건은 Local Storage, 이미지 원본은 IndexedDB에 저장됩니다. 같은 브라우저와 사이트 주소에서 다시 열 수 있으며 계정 동기화나 서버 프로젝트 백업은 제공하지 않습니다.</p>
          <p>최근 작업의 삭제는 해당 프로젝트의 현재본·최초 생성본·백업·복구 보관본을 지웁니다. 이미지는 별도의 미사용 이미지 정리 기능으로 정리합니다. 다른 탭의 오래된 저장을 막는 삭제 표시는 남습니다.</p>
          <p>브라우저의 사이트 데이터 삭제는 프로젝트·이미지·제작 조건을 함께 지울 수 있으며 되돌릴 수 없습니다. 삭제 전에 필요한 결과를 ZIP으로 내려받으세요. ZIP과 저장 원문 파일을 편집기로 다시 가져오는 기능은 아직 없으며, 저장 원문 파일에는 이미지가 포함되지 않습니다.</p></section>
        <section><h2>결과물 확인과 이용</h2>
          <p>ZIP 압축을 풀고 index.html을 PC 브라우저에서 직접 열 수 있습니다. 내용은 HTML, 디자인은 CSS에서 수정합니다. JSON은 기록용이며 JSON만 바꿔도 화면이 자동 갱신되지는 않습니다.</p>
          <p>AI가 만든 수치·문구·링크·코드는 오류가 있을 수 있습니다. 실제 활용 전에 검토하고, 업로드 이미지와 외부 자료의 사용 권한을 확인하세요. 상업적 이용을 포함한 최종 서비스 이용 조건은 공개 전 확정 예정입니다.</p></section>
        <section><h2>오픈소스 안내</h2>
          <p>화면 구성과 직렬화에 React, ZIP 작성에 JSZip, 아이콘에 Lucide를 사용합니다. 아이콘에는 Feather 유래 항목이 포함됩니다. 각 라이선스 고지는 아래와 다운로드 ZIP의 THIRD_PARTY_NOTICES.txt에 제공합니다.</p>
          <details><summary>라이선스 원문 보기</summary><pre className="license-text">{thirdPartyNotices}</pre></details></section>
      </> : page === "terms" ? <>
        <section><h2>1. 목적과 제공 범위</h2><p>SEbit Canvers는 샘플 데이터 기반 대시보드 디자인과 정적 소스 파일을 제작하는 도구입니다. 실제 업무 시스템의 구축·운영, 데이터 정확성 또는 특정 업무에 대한 적합성을 보장하는 서비스가 아닙니다.</p></section>
        <section><h2>2. 이용 방법과 제한</h2><p>현재 회원가입 없이 무료로 제공하며, AI 요청에는 화면에 표시되는 사용 한도와 처리 제한이 적용됩니다. 보안 우회, 한도 회피, 악성 코드 삽입, 타인의 권리 침해 또는 불법적인 용도의 이용은 허용하지 않는 방향으로 운영 기준을 마련합니다.</p></section>
        <section><h2>3. 입력 자료와 결과물</h2><p>개인정보·인증 정보·기밀은 입력하지 마세요. 업로드하거나 입력하는 자료에 대한 사용 권한을 확인해야 합니다. 생성 결과는 사용 전에 정확성·보안·타인 권리 침해 여부를 검토해야 합니다.</p><p>결과물의 수정·재배포·상업적 이용 조건과 서비스 제공자의 책임 범위는 최종 확정 전입니다. 외부 라이브러리·아이콘의 라이선스와 사용자 자료의 권리는 각각 따릅니다.</p></section>
        <section><h2>4. 저장·변경·중단</h2><p>프로젝트는 브라우저에 보관됩니다. 브라우저 데이터 삭제, 기기 변경, 저장 공간 부족 등에 대비해 필요한 결과를 직접 다운로드하세요. 운영·보안·유지보수에 따른 서비스 변경·중단 및 사전 안내 기준은 공개 전에 확정합니다.</p></section>
        <section><h2>5. 운영자와 문의</h2><p>정식 운영 주체, 연락처, 분쟁 처리 절차, 책임 범위와 시행일은 확인 중입니다. 확정본을 게시하기 전 이 검토본을 이용 동의의 근거로 사용하지 않습니다.</p></section>
      </> : <>
        <section><h2>1. 처리 범위</h2><p>회원가입을 위한 이름·이메일·전화번호 입력란은 없습니다. 다만 AI 요청 내용, 접속 IP와 사용량 식별 정보가 처리될 수 있으므로 ‘개인정보를 전혀 처리하지 않는 서비스’는 아닙니다. 입력 내용에 개인정보를 포함하지 마세요.</p></section>
        <section><h2>2. 저장 위치와 목적</h2>
          <div className="info-table"><table><thead><tr><th>항목</th><th>목적·저장 위치</th><th>현재 보관 동작</th></tr></thead><tbody>
            <tr><td>프로젝트·제작 조건·이미지</td><td>작업 복원 / 사용자 브라우저</td><td>사용자 삭제 또는 브라우저 정리까지. 서버 프로젝트 저장 없음</td></tr>
            <tr><td>sebit_ai 쿠키</td><td>AI 사용 한도 구분 / 브라우저</td><td>발급 시 유효기간 1년. 인증·회원 계정용 쿠키가 아님</td></tr>
            <tr><td>변환된 사용 식별자·IP, 요청 종류·일자·차감 상태</td><td>한도 집행 / 서비스 서버</td><td>7일 전 날짜보다 오래된 기록을 다음 요청 접수 시 정리</td></tr>
            <tr><td>요청 식별값·시간·성공/오류 코드·처리 시간·토큰 수</td><td>장애·비용 점검 / 서비스 서버</td><td>30일 초과 기록을 다음 기록 저장 시 정리</td></tr>
          </tbody></table></div>
          <p>IP는 요청 처리와 제한 판단에 사용하고 사용량 저장소에는 변환값을 기록합니다. 위 보관 동작은 정해진 시각의 자동 삭제 보장이 아닙니다. 호스팅·접속 로그·백업의 처리와 최종 보관 기간은 운영 환경 확정이 필요합니다.</p></section>
        <section><h2>3. 외부 AI 처리</h2><p>현재 OpenAI API에 생성 조건·요청과 수정 대상 대시보드 내용을 전송합니다. 업로드 이미지 원본 대신 이미지 참조값만 전달하며, 서비스의 사용량·오류 기록에는 요청 본문과 응답 원문을 저장하지 않습니다.</p>
          <p>OpenAI 공식 안내에 따르면 API 데이터는 별도 공유 동의가 없는 한 모델 학습에 사용되지 않지만, 악용 방지 기록에는 내용이 포함되고 기본적으로 최대 30일 보관될 수 있으며 예외가 있습니다. 이 서비스가 제공업체의 무보관을 보장하지는 않습니다. <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noopener noreferrer">OpenAI 데이터 처리 안내 (새 창)</a></p>
          <p>실제 계약 상대·처리 국가·이전 시점과 방법·보관 조건·거부 방법 등 국외 처리 관련 고지는 운영 계정과 계약을 확인한 후 확정합니다. AI 전송을 원하지 않으면 AI 생성·수정을 사용하지 않고 샘플과 CMS를 이용할 수 있습니다.</p></section>
        <section><h2>4. 쿠키·삭제와 권리 행사</h2><p>브라우저 설정에서 쿠키를 차단하거나 사이트 데이터를 삭제할 수 있습니다. 쿠키 차단은 AI 사용 한도 확인에 영향을 줄 수 있고 사이트 데이터 삭제는 작업 손실로 이어질 수 있습니다. 브라우저 데이터 삭제가 서버 기록이나 이미 전달된 AI 요청을 삭제하는 것은 아닙니다.</p><p>열람·정정·삭제·처리정지 요청을 위한 담당자와 연락처, 본인 확인 및 처리 절차는 공개 전 확정해야 합니다. 현재 이 화면에서 서버 기록 삭제 요청을 접수하지 않습니다.</p></section>
        <section><h2>5. 공개 전 확정 사항</h2><p>운영 주체·담당자·문의처, 처리 근거, 수탁자·국외 처리 조건, 파기 및 안전조치, 실제 서버·백업 보관 기간과 시행일이 남아 있습니다. 현재 구현 설명을 확정된 개인정보처리방침으로 오인하지 않도록 검토본 상태를 표시합니다.</p></section>
      </>}
    </article>
    <a className="button secondary" href="#">홈으로 돌아가기</a>
  </main>;
}
