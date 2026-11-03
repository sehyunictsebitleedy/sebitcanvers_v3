// Decorative concept previews for the Home type selector, not generated output.
export function TypeThumbnail({ type }: { type: number }) {
  const title = type === 0 ? "성과 분석" : type === 1 ? "사용자 및 권한" : type === 3 ? "프로젝트 워크스페이스" : "서비스 상태";
  return <svg className="type-thumbnail" viewBox="0 0 320 190" aria-hidden="true" focusable="false">
    <rect width="320" height="190" fill="#101927" />
    <path d="M0 32H320" stroke="#2a374b" />
    <text x="14" y="21" className="thumb-heading">{title}</text>
    <text x="304" y="21" textAnchor="end" className="thumb-muted">샘플</text>
    {type === 0 ? <>
      <text x="14" y="53" className="thumb-muted">이번 달 방문</text>
      <text x="14" y="79" className="thumb-value">24,860</text>
      <text x="121" y="76" className="thumb-positive">↗ 18.6%</text>
      <text x="214" y="53" className="thumb-muted">유입 경로</text>
      {[['검색', 66], ['직접', 43], ['소셜', 27]].map(([label, width], i) => <g key={label}>
        <text x="214" y={76 + i * 30} className="thumb-muted">{label}</text>
        <rect x="214" y={81 + i * 30} width={Number(width)} height="5" rx="2" fill="currentColor" opacity={1 - i * .2} />
      </g>)}
      {[104, 129, 154].map(y => <path key={y} d={`M14 ${y}H195`} stroke="#253348" />)}
      <path d="M14 149L39 138L65 142L91 116L117 123L143 96L169 101L195 88V155H14Z" fill="currentColor" opacity=".13" />
      <path d="M14 149L39 138L65 142L91 116L117 123L143 96L169 101L195 88" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <text x="14" y="175" className="thumb-muted">01일</text><text x="173" y="175" className="thumb-muted">30일</text>
    </> : type === 1 ? <>
      <rect x="12" y="44" width="70" height="134" rx="5" fill="#182438" />
      {['전체 사용자', '접근 권한', '승인 요청', '활동 기록'].map((label, i) => <g key={label}>
        {i === 0 && <rect x="17" y="51" width="60" height="24" rx="3" fill="currentColor" opacity=".16" />}
        <text x="22" y={67 + i * 30} className={i === 0 ? 'thumb-heading' : 'thumb-muted'}>{label}</text>
      </g>)}
      <text x="96" y="57" className="thumb-heading">팀 멤버</text><text x="300" y="57" textAnchor="end" className="thumb-muted">활성 48명</text>
      <path d="M94 67H306" stroke="#2a374b" />
      {['운영팀', '디자인팀', '개발팀', '지원팀'].map((label, i) => <g key={label}>
        <rect x="96" y={77 + i * 25} width="17" height="17" rx="5" fill="currentColor" opacity=".23" />
        <text x="122" y={89 + i * 25} className="thumb-heading">{label}</text>
        <text x="197" y={89 + i * 25} className="thumb-muted">{i === 0 ? '관리자' : '멤버'}</text>
        <rect x="267" y={78 + i * 25} width="33" height="16" rx="8" fill="#163c38" />
        <text x="283" y={89 + i * 25} textAnchor="middle" className="thumb-positive">활성</text>
      </g>)}
    </> : type === 3 ? <>
      <text x="14" y="53" className="thumb-muted">웹사이트 리뉴얼</text>
      <text x="304" y="53" textAnchor="end" className="thumb-muted">이번 스프린트</text>
      {[
        { label: '예정', tasks: ['요구사항 정리', '콘텐츠 수집'] },
        { label: '진행 중', tasks: ['화면 설계', '컴포넌트 개발'] },
        { label: '완료', tasks: ['일정 수립'] },
      ].map((column, i) => <g key={column.label}>
        <rect x={12 + i * 101} y="64" width="94" height="114" rx="5" fill="#182438" />
        <text x={20 + i * 101} y="81" className="thumb-heading">{column.label}</text>
        <text x={97 + i * 101} y="81" textAnchor="end" className="thumb-muted">{column.tasks.length}</text>
        {column.tasks.map((task, j) => <g key={task}>
          <rect x={18 + i * 101} y={91 + j * 41} width="82" height="35" rx="4" fill="#243249" />
          <rect x={18 + i * 101} y={91 + j * 41} width="3" height="35" rx="1" fill="currentColor" opacity={i === 1 ? 1 : .4} />
          <text x={26 + i * 101} y={105 + j * 41} className="thumb-heading">{task}</text>
          <text x={26 + i * 101} y={119 + j * 41} className="thumb-muted">{i === 2 ? '검토 완료' : '담당 팀 배정'}</text>
        </g>)}
      </g>)}
    </> : <>
      <rect x="12" y="43" width="296" height="27" rx="5" fill="#17362f" />
      <circle cx="25" cy="56" r="3" fill="#7de0bb" />
      <text x="35" y="60" className="thumb-positive">모든 시스템 정상 운영 중</text>
      <text x="14" y="89" className="thumb-muted">응답 시간</text><text x="304" y="89" textAnchor="end" className="thumb-heading">124 ms</text>
      <path d="M14 123H306M14 103H306" stroke="#253348" />
      <path d="M14 118L39 118L48 111L57 125L67 96L77 118L124 118L135 107L146 121L156 115L195 115L205 98L215 120L227 113L259 113L269 108L279 119L306 116" fill="none" stroke="currentColor" strokeWidth="2" />
      {['API', 'Database', 'Storage'].map((label, i) => <g key={label}>
        <rect x={12 + i * 101} y="140" width="94" height="38" rx="4" fill="#182438" />
        <text x={20 + i * 101} y="154" className="thumb-muted">{label}</text>
        <text x={20 + i * 101} y="170" className="thumb-positive">정상</text>
        <text x={97 + i * 101} y="170" textAnchor="end" className="thumb-heading">{[99.9, 99.8, 100][i]}%</text>
      </g>)}
    </>}
  </svg>;
}
