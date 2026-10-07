import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Blocks,
  Check,
  CirclePlay,
  Code2,
  Folder,
  Hexagon,
  LayoutDashboard,
  Monitor,
  Plus,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import "./App.css";
import { Dashboard } from "./dashboard/Preview";
import { createSample } from "./dashboard/samples";
import { loadProject, saveProject } from "./dashboard/storage";
import type { DashboardSchema } from "./dashboard/schema";
import { dashboardSchema } from "./dashboard/schema";
import "./dashboard/workspace.css";
const Workspace = lazy(() =>
  import("./dashboard/Workspace").then((module) => ({
    default: module.Workspace,
  })),
);

const CreatePage = lazy(() =>
  import("./create/CreatePage").then((module) => ({
    default: module.CreatePage,
  })),
);

const types = [
  {
    id: 0,
    name: "분석",
    description: "데이터 속 인사이트를 한눈에",
    color: "#9373fa",
    icon: BarChart3,
  },
  {
    id: 1,
    name: "관리자",
    description: "시스템 운영과 현황 관리",
    color: "#6096fb",
    icon: LayoutDashboard,
  },
  {
    id: 3,
    name: "프로젝트",
    description: "팀의 업무와 프로젝트 진행 현황",
    color: "#e9a15f",
    icon: Folder,
  },
  {
    id: 4,
    name: "모니터링",
    description: "서비스 상태를 실시간으로 확인",
    color: "#e4778d",
    icon: Monitor,
  },
];
type Draft = { id: string; name: string; type: number; date: string };
const storageKey = "sebit-canvers-drafts-v1";
function readDrafts(): Draft[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (item): item is Draft =>
            !!item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.date === "string" &&
            Number.isInteger(item.type) &&
            item.type >= 0 &&
            item.type <= 4,
        )
      : [];
  } catch {
    return [];
  }
}
function Brand() {
  return (
    <span className="brand">
      <Hexagon size={28} strokeWidth={3} />
      <span>
        SEbit <strong>Canvers</strong>
      </span>
    </span>
  );
}

const features = [
  {
    icon: Sparkles,
    title: "AI 자동 생성",
    text: "원하는 조건을 선택하면, 화면 구성부터 샘플 데이터까지.",
    label: "선택에서 완성까지",
  },
  {
    icon: WandSparkles,
    title: "대화하듯 AI 수정",
    text: "“차트를 더 크게 보여줘.” 필요한 변경을 자연어로 간편하게.",
    label: "생각을 바로 화면으로",
  },
  {
    icon: SlidersHorizontal,
    title: "직접 다듬는 CMS Editor",
    text: "텍스트, 색상, 컴포넌트를 내 업무에 맞게 세밀하게 편집.",
    label: "디테일까지 내 방식대로",
  },
  {
    icon: Code2,
    title: "HTML / CSS / JS 다운로드",
    text: "완성한 대시보드를 코드로 내려받아 자유롭게 활용.",
    label: "결과물은 온전히 나의 것",
  },
];
function App() {
  const [creating, setCreating] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#create",
  );
  const [initialType, setInitialType] = useState<number | undefined>();
  const [workspace, setWorkspace] = useState<DashboardSchema | null>(null);
  const [year] = useState(() => new Date().getFullYear());
  const [drafts, setDrafts] = useState<Draft[]>(readDrafts);
  // Keep legacy records in storage, but only expose supported dashboard types.
  const availableDrafts = drafts.filter((draft) =>
    types.some((type) => type.id === draft.type),
  );
  const [modal, setModal] = useState<"preview" | null>(null);
  const [selected, setSelected] = useState(0);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!modal) return;
    const active = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      active?.focus();
    };
  }, [modal]);
  useEffect(() => {
    const sync = () => {
      setInitialType(undefined);
      setCreating(window.location.hash === "#create");
      if (window.location.hash !== "#workspace") setWorkspace(null);
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  const home = () => {
    setCreating(false);
    setWorkspace(null);
    window.history.pushState(null, "", "#");
  };
  const openCreate = (type?: number) => {
    close();
    setInitialType(type);
    setCreating(true);
    window.history.pushState(null, "", "#create");
  };
  const close = () => {
    dialog.current?.close();
    setModal(null);
  };
  const openWorkspace = (type: number, project: Draft) => {
    try {
      const existing = loadProject(localStorage, project.id);
      const sample = existing ?? createSample(type);
      if (!existing) {
        sample.project = {
          ...sample.project,
          id: project.id,
          name: project.name,
          createdAt: project.date,
          updatedAt: project.date,
        };
      }
      close();
      setWorkspace(dashboardSchema.parse(sample));
      setCreating(false);
      window.history.pushState(null, "", "#workspace");
    } catch {
      setNotice(
        "저장된 프로젝트를 복원할 수 없습니다. 기존 데이터는 유지했습니다. 새 프로젝트로 시작해 주세요.",
      );
    }
  };
  const startDashboard = (schema: DashboardSchema) => {
    const type = { analytics: 0, admin: 1, project: 3, monitoring: 4 }[
      schema.project.type
    ];
    const next = [
      {
        id: schema.project.id,
        name: schema.project.name,
        type,
        date: schema.project.updatedAt,
      },
      ...drafts,
    ];
    setDrafts(next);
    try {
      saveProject(localStorage, schema);
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setNotice(
        "프로젝트 목록 저장에 실패했습니다. 현재 작업은 편집 화면에서 계속 사용할 수 있습니다.",
      );
    }
    setCreating(false);
    setWorkspace(schema);
    window.history.pushState(null, "", "#workspace");
  };
  if (workspace)
    return (
      <Suspense
        fallback={
          <p role="status" style={{ padding: 32 }}>
            편집 화면을 준비하고 있습니다.
          </p>
        }
      >
        <Workspace
          initial={workspace}
          onBack={home}
          startInPreview={
            workspace.status === "generated" && !!workspace.settings.selections
          }
        />
      </Suspense>
    );
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      <header className="site-header">
        <nav className="container nav" aria-label="주 메뉴">
          <a href="#" aria-label="SEbit Canvers 홈">
            <Brand />
          </a>
          <div className="nav-links">
            <a href="#guide">사용방법</a>
            <button
              className="button primary nav-cta"
              onClick={() => openCreate()}
            >
              대시보드 만들기 <ArrowRight size={15} />
            </button>
            <a
              href="http://sebit.co.kr"
              target="_blank"
              rel="noopener noreferrer"
            >
              SEbit <ArrowUpRight size={14} />
              <span className="sr-only">새 창</span>
            </a>
          </div>
        </nav>
      </header>
      {creating ? (
        <Suspense
          fallback={<p role="status">제작 조건 화면을 준비하고 있습니다.</p>}
        >
          <CreatePage
            initialType={initialType}
            onHome={home}
            onStart={startDashboard}
          />
        </Suspense>
      ) : (
        <main id="main">
          <section className="hero-section">
            <div className="container hero-grid">
              <div className="hero-copy">
                <span className="eyebrow">
                  <Sparkles size={14} /> AI DASHBOARD BUILDER
                </span>
                <h1>
                  AI로 만드는
                  <br />
                  <span>나만의</span> 대시보드
                </h1>
                <p>
                  원하는 스타일과 구성만 선택하세요.
                  <br />
                  아이디어를 실제로 사용할 수 있는 대시보드로.
                </p>
                <ul className="hero-benefits">
                  <li>
                    <Check />
                    복잡한 코딩 없이, 원하는 모습 그대로
                  </li>
                  <li>
                    <Check />
                    AI 생성부터 직접 편집까지 한곳에서
                  </li>
                  <li>
                    <Check />
                    HTML / CSS / JS 코드로 자유롭게 활용
                  </li>
                </ul>
                <div className="hero-actions">
                  <button
                    className="button primary"
                    onClick={() => openCreate()}
                  >
                    대시보드 만들기 <ArrowRight size={17} />
                  </button>
                  <a className="button secondary" href="#examples">
                    <CirclePlay size={18} />
                    예시 보기
                  </a>
                </div>
                <div className="desktop-note">
                  <Monitor size={13} /> PC 환경에 최적화된 대시보드 제작 도구
                </div>
              </div>
              <div className="hero-preview">
                <div className="preview-label">
                  <span>
                    <span className="live-dot" /> 이렇게 완성할 수 있어요
                  </span>
                  <button
                    onClick={() => {
                      setSelected(0);
                      setModal("preview");
                    }}
                  >
                    크게 보기 <ArrowUpRight size={13} />
                  </button>
                </div>
                <Dashboard title="프로젝트 운영현황" />
                <div className="preview-caption">
                  <span>
                    <Blocks size={13} /> 원하는 구성으로, 필요한 데이터만
                  </span>
                  <span>샘플 데이터 기반 예시</span>
                </div>
              </div>
            </div>
          </section>
          <section className="container features" aria-label="주요 기능">
            {features.map(({ icon: Icon, title, text, label }) => (
              <article key={title}>
                <Icon className="feature-icon" size={24} />
                <div>
                  <small>{label}</small>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </section>
          <section className="container examples section" id="examples">
            <div className="section-heading">
              <h2>어떤 대시보드를 만들고 싶으신가요?</h2>
              <p>분석부터 운영까지, 내 업무에 맞는 대시보드를 만나보세요.</p>
            </div>
            <div className="template-grid">
              {types.map((item) => (
                <button
                  className="template-card"
                  key={item.name}
                  onClick={() => {
                    setSelected(item.id);
                    setModal("preview");
                  }}
                  style={{ "--type-color": item.color } as CSSProperties}
                >
                  <div className="template-image" aria-hidden="true">
                    <Dashboard type={item.id} compact />
                  </div>
                  <div className="template-info">
                    <div>
                      <item.icon size={17} />
                      <h3>{item.name} 대시보드</h3>
                      <ArrowUpRight size={15} />
                    </div>
                    <p>{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section className="guide-section" id="guide">
            <div className="container">
              <div className="section-heading centered">
                <h2>아이디어가 대시보드가 되는 4단계</h2>
                <p>복잡한 설정 없이, 누구나 쉽게 시작하세요.</p>
              </div>
              <ol className="steps">
                {[
                  {
                    icon: Settings2,
                    title: "조건 선택",
                    text: "유형, 스타일, 필요한 컴포넌트를 선택하세요.",
                  },
                  {
                    icon: Sparkles,
                    title: "AI 생성",
                    text: "선택한 조건에 맞춰 AI가 대시보드를 구성합니다.",
                  },
                  {
                    icon: SlidersHorizontal,
                    title: "수정 및 편집",
                    text: "AI에게 수정을 요청하거나 직접 디테일을 다듬으세요.",
                  },
                  {
                    icon: ArrowDownToLine,
                    title: "다운로드",
                    text: "HTML, CSS, JS 코드로 내려받아 바로 활용하세요.",
                  },
                ].map(({ icon: Icon, title, text }, i) => (
                  <li key={title}>
                    <div className="step-top">
                      <span className="step-icon">
                        <Icon size={25} />
                      </span>
                      <span className="step-number">0{i + 1}</span>
                      {i < 3 && <ArrowRight className="step-arrow" size={20} />}
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
          <section className="container recent section" id="recent">
            <div className="section-heading">
              <h2>최근 작업</h2>
              <p>이 브라우저에 저장한 프로젝트를 이어서 확인하세요.</p>
            </div>
            <p className="save-notice" role="status">
              {notice}
            </p>
            {availableDrafts.length ? (
              <div className="recent-grid">
                {availableDrafts.map((draft) => (
                  <button
                    className="draft-card"
                    key={draft.id}
                    onClick={() => {
                      openWorkspace(draft.type, draft);
                    }}
                  >
                    <Folder size={23} />
                    <span>
                      <strong>{draft.name}</strong>
                      <small>
                        {types.find((type) => type.id === draft.type)?.name}{" "}
                        대시보드 ·{" "}
                        {new Date(draft.date).toLocaleDateString("ko-KR")}
                      </small>
                    </span>
                    <span className="draft-tag">작업 열기</span>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <Folder size={25} />
                </span>
                <div>
                  <h3>첫 번째 대시보드를 만들어 보세요</h3>
                  <p>
                    아직 저장된 작업이 없습니다. 새로운 아이디어를 시작해
                    볼까요?
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => openCreate()}
                >
                  <Plus size={17} />새 프로젝트
                </button>
              </div>
            )}
          </section>
        </main>
      )}
      <footer className="site-footer">
        <div className="container footer-inner">
          <a href="#">
            <Brand />
          </a>
          <span>아이디어에서 대시보드까지.</span>
          <small>© {year} SEbit. All rights reserved.</small>
          <a href="#guide">사용방법</a>
          <a
            href="http://sebit.co.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
            SEbit <ArrowUpRight size={13} />
            <span className="sr-only">새 창</span>
          </a>
        </div>
      </footer>
      {modal && (
        <dialog
          ref={dialog}
          className="modal preview-modal"
          onCancel={close}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          aria-labelledby="modal-title"
        >
          <div className="modal-heading">
            <div>
              <h2 id="modal-title">
                {`${types.find((type) => type.id === selected)?.name} 대시보드 예시`}
              </h2>
              <p>화면 구성을 살펴보세요. 표시된 수치는 샘플 데이터입니다.</p>
            </div>
            <button className="icon-button" aria-label="닫기" onClick={close}>
              <X size={21} />
            </button>
          </div>

          <>
            <Dashboard key={selected} type={selected} />
            <div className="modal-footer">
              <p>샘플 KPI 편집과 ZIP 다운로드를 체험할 수 있습니다.</p>
              <button
                className="button primary"
                onClick={() => openCreate(selected)}
              >
                이 유형으로 편집 시작 <ArrowRight size={16} />
              </button>
            </div>
          </>
        </dialog>
      )}
    </>
  );
}
export default App;
