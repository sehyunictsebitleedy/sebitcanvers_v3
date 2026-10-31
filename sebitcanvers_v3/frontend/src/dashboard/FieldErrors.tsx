import { useEffect, useId, useRef, useState } from "react";
import type { ZodIssue } from "zod";

const names: Record<string, string> = {
  title: "제목", value: "값", max: "최대값", unit: "단위", change: "증감", color: "색상",
  description: "설명", displayValue: "표시 값", message: "문구", label: "이름", url: "주소",
  name: "이름", labels: "라벨", datasets: "데이터셋", data: "데이터", rows: "행", columns: "컬럼",
  timestamp: "시간", items: "항목", theme: "테마", primary: "강조색", background: "배경색",
  surface: "카드색", text: "글자색", muted: "보조 글자색", border: "테두리색",
  project: "프로젝트", header: "헤더", date: "날짜", mainVisual: "메인 비주얼",
  navigation: "메뉴", logoText: "로고", sections: "섹션", cta: "버튼", visible: "표시",
};
function message(issue: ZodIssue) {
  if (/[가-힣]/.test(issue.message)) return issue.message;
  if (issue.code === "too_small") return `최소 ${issue.minimum}${issue.origin === "string" ? "자" : " 이상"}로 입력해 주세요.`;
  if (issue.code === "too_big") return `최대 ${issue.maximum}${issue.origin === "string" ? "자" : " 이하"}로 입력해 주세요.`;
  if (issue.code === "invalid_type") return "올바른 값을 입력해 주세요. 숫자 항목은 빈칸이나 문자를 사용할 수 없습니다.";
  if (issue.code === "invalid_format") return issue.format === "date"
    ? "실제 존재하는 날짜를 선택해 주세요." : "형식을 확인해 주세요. 색상은 #으로 시작하는 6자리 HEX입니다.";
  return "지원하는 값과 입력 형식을 확인해 주세요.";
}

export function useFieldErrors() {
  const [issues, setIssues] = useState<ZodIssue[]>([]);
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  const paths = issues.map(issue => issue.path.join("."));
  const field = (path: string) => {
    const matches = paths.flatMap((p, i) => p && (p === path || path.startsWith(p + ".") || p.startsWith(path + ".")) ? [i] : []);
    return { "data-field": path, "aria-invalid": matches.length ? true as const : undefined,
      "aria-describedby": matches.length ? matches.map(i => `${id}-${i}`).join(" ") : undefined };
  };
  useEffect(() => {
    if (issues.length) ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [issues]);
  const errors = issues.length ? (
    <ul className="field-errors form-error" role="alert">
      {issues.map((issue, i) => <li id={`${id}-${i}`} key={i}>
        <button type="button" onClick={() => {
          const inputs = ref.current?.querySelectorAll<HTMLElement>("[data-field]");
          [...(inputs ?? [])].find(input => input.getAttribute("aria-describedby")?.split(" ").includes(`${id}-${i}`))?.focus();
        }}>{issue.path.map(part => typeof part === "number" ? `${part + 1}번` : names[String(part)] ?? String(part)).join(" · ") || "입력값"}</button>
        : {message(issue)}
      </li>)}
    </ul>
  ) : null;
  return { ref, field, errors, setIssues };
}
