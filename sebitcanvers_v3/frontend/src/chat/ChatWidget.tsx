import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUpRight, BookOpen, Bot, MessageCircle, RotateCcw, Send, X, Zap } from "lucide-react";
import { fetchChat } from "./chatClient";
import type { ChatClient } from "./chatClient";
import { actionLabels, chatGuide, chatNotice, chatShortcuts, chatWelcome } from "./chatGuide";
import { chatMessageLimit } from "./contracts";
import type { ChatAction, ChatPage, ChatResponse, ChatTurn } from "./contracts";
import "./chat.css";

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; text: string; answer?: ChatResponse; error?: boolean; retry?: string };

const infoLinks: Partial<Record<ChatAction, string>> = {
  "open-service-info": "#info/service",
  "open-terms": "#info/terms",
  "open-privacy": "#info/privacy",
};

/**
 * 화면 우측 하단의 "AI 챗봇 문의" 버튼과 상담 창.
 * 상담은 대시보드를 직접 바꾸지 않는다. 편집 화면의 수정 요청은 onAction("open-ai-edit")으로 넘긴다.
 */
export function ChatWidget({
  page,
  onAction,
  disabledActions = [],
  client = fetchChat,
}: {
  page: ChatPage;
  /** 이동 버튼 처리. 정보 페이지·SEbit 링크는 위젯이 링크로 처리한다. */
  onAction?: (action: ChatAction, answer: ChatResponse) => void;
  /** 다른 작업 중이라 잠시 실행할 수 없는 버튼 */
  disabledActions?: ChatAction[];
  client?: ChatClient;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const nextId = useRef(1);
  const inFlight = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const panelId = useId();
  const inputId = useId();

  useEffect(() => () => inFlight.current?.abort(), []);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, pending]);

  const push = (message: Omit<Extract<Message, { role: "user" }>, "id"> | Omit<Extract<Message, { role: "assistant" }>, "id">) =>
    setMessages((items) => [...items, { ...message, id: nextId.current++ } as Message]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending || inFlight.current || text.length > chatMessageLimit) return;
    const history: ChatTurn[] = messages
      .filter((message) => message.role === "user" || !message.error)
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.text.slice(0, 1000) }));
    push({ role: "user", text });
    setInput("");
    setShowGuide(false);
    setPending(true);
    const controller = new AbortController();
    inFlight.current = controller;
    try {
      const answer = await client({ message: text, page, history }, controller.signal);
      if (controller.signal.aborted) return;
      push({ role: "assistant", text: answer.reply, answer });
    } catch (error) {
      if (controller.signal.aborted) return;
      push({
        role: "assistant",
        text: error instanceof Error ? error.message : "상담 요청을 처리하지 못했습니다.",
        error: true,
        retry: text,
      });
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
      setPending(false);
    }
  };
  const cancel = () => {
    inFlight.current?.abort();
    inFlight.current = null;
    setPending(false);
    push({ role: "assistant", text: "질문을 취소했습니다.", error: true });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // 한글 IME 조합 중 Enter는 무시해 중복 전송을 막는다.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  };
  const fill = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };
  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };
  const runAction = (action: ChatAction, answer: ChatResponse) => {
    setOpen(false);
    onAction?.(action, answer);
  };

  const actionButton = (action: ChatAction, answer: ChatResponse) => {
    if (action === "open-sebit")
      return (
        <a key={action} className="chat-action" href="http://sebit.co.kr" target="_blank" rel="noopener noreferrer">
          {actionLabels[action]} <ArrowUpRight size={13} aria-hidden="true" />
          <span className="sr-only">새 창</span>
        </a>
      );
    const href = infoLinks[action];
    if (href)
      // 편집 화면에서는 작업을 벗어나지 않도록 안내 페이지를 새 창으로 연다.
      return page === "editor" ? (
        <a key={action} className="chat-action" href={href} target="_blank" rel="noopener noreferrer">
          {actionLabels[action]} <ArrowUpRight size={13} aria-hidden="true" />
          <span className="sr-only">새 창</span>
        </a>
      ) : (
        <a key={action} className="chat-action" href={href} onClick={() => setOpen(false)}>
          {actionLabels[action]}
        </a>
      );
    if (!onAction) return null;
    return (
      <button
        key={action}
        type="button"
        className={`chat-action ${action === "open-ai-edit" ? "primary" : ""}`}
        disabled={disabledActions.includes(action)}
        onClick={() => runAction(action, answer)}
      >
        {actionLabels[action]}
      </button>
    );
  };

  return (
    <>
      <section
        id={panelId}
        className="chat-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            if (pending) cancel();
            else close();
          }
        }}
      >
        <header className="chat-header">
          <span className="chat-avatar" aria-hidden="true">
            <Bot size={18} />
          </span>
          <div>
            <h2 id={titleId}>AI 상담</h2>
            <p>SEbit Canvers 이용 안내</p>
          </div>
          <button
            type="button"
            className={`chat-icon ${showGuide ? "active" : ""}`}
            aria-pressed={showGuide}
            onClick={() => setShowGuide((value) => !value)}
            title="질의 가이드"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span className="sr-only">질의 가이드</span>
          </button>
          <button type="button" className="chat-icon" onClick={close} title="상담 창 닫기">
            <X size={16} aria-hidden="true" />
            <span className="sr-only">상담 창 닫기</span>
          </button>
        </header>

        <div className="chat-body" ref={listRef}>
          <div className="chat-message assistant">
            <p>{chatWelcome[page]}</p>
          </div>
          {showGuide && (
            <section className="chat-guide" aria-label="질의 가이드">
              <h3>질의 가이드</h3>
              <p>예시를 누르면 입력창에 채워집니다. 고쳐서 보내도 됩니다.</p>
              {chatGuide[page].map((group, index) => (
                <details key={group.title} open={index === 0}>
                  <summary>{group.title}</summary>
                  <p>{group.description}</p>
                  <ul>
                    {group.examples.map((example) => (
                      <li key={example}>
                        <button type="button" disabled={pending} onClick={() => fill(example)}>
                          {example}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
              <p className="chat-scope">{chatNotice}</p>
            </section>
          )}
          <div className="chat-messages" role="log" aria-live="polite" aria-label="상담 대화">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="chat-message user">
                  <span className="sr-only">내 질문: </span>
                  {message.text}
                </div>
              ) : (
                <div key={message.id} className={`chat-message assistant ${message.error ? "error" : ""}`}>
                  <span className="sr-only">AI 답변: </span>
                  <p>{message.text}</p>
                  {message.answer?.editInstruction && (
                    <blockquote aria-label="AI 수정 창에 채울 요청">{message.answer.editInstruction}</blockquote>
                  )}
                  {message.answer?.notice && <small className="chat-note">{message.answer.notice}</small>}
                  {message.answer?.source === "guide" && !message.answer.notice && (
                    <small className="chat-note">기본 안내 답변</small>
                  )}
                  {!!message.answer?.actions.length && (
                    <div className="chat-actions">
                      {message.answer.actions.map((action) => actionButton(action, message.answer!))}
                    </div>
                  )}
                  {message.retry && (
                    <button type="button" className="chat-action" disabled={pending} onClick={() => void send(message.retry!)}>
                      <RotateCcw size={13} aria-hidden="true" /> 다시 질문
                    </button>
                  )}
                </div>
              ),
            )}
            {pending && (
              <div className="chat-message assistant pending" role="status">
                답변을 준비하고 있습니다…
                <button type="button" className="chat-action" onClick={cancel}>
                  질문 취소
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="chat-footer">
          <div className="chat-shortcuts" role="group" aria-label="바로가기">
            <span>
              <Zap size={12} aria-hidden="true" /> 바로가기
            </span>
            {chatShortcuts[page].map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                disabled={pending}
                title={shortcut.prompt}
                onClick={() => void send(shortcut.prompt)}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <label htmlFor={inputId} className="sr-only">
              AI 챗봇 질문
            </label>
            <textarea
              id={inputId}
              ref={inputRef}
              value={input}
              maxLength={chatMessageLimit}
              rows={2}
              placeholder={page === "editor" ? "궁금한 점이나 수정 요청을 입력하세요" : "궁금한 점을 입력하세요"}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <div className="chat-form-row">
              <span>
                {input.length}/{chatMessageLimit} · Enter 전송, Shift+Enter 줄바꿈
              </span>
              <button type="submit" className="chat-send" disabled={pending || !input.trim()}>
                <Send size={14} aria-hidden="true" />
                <span>보내기</span>
              </button>
            </div>
          </form>
        </footer>
      </section>

      <button
        ref={launcherRef}
        type="button"
        className={`chat-launcher ${open ? "open" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <X size={18} aria-hidden="true" /> : <MessageCircle size={18} aria-hidden="true" />}
        <span>{open ? "상담 닫기" : "AI 챗봇 문의"}</span>
        {pending && !open && <span className="chat-dot" role="img" aria-label="답변 준비 중" />}
      </button>
    </>
  );
}
