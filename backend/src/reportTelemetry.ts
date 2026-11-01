import { readTelemetryReport } from "./telemetryReport";

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !/^\d+$/.test(args[0]))) throw new Error();
  const report = readTelemetryReport(process.env.AI_TELEMETRY_DB ?? "./data/ai-events.sqlite", args.length ? Number(args[0]) : 24);
  console.log(JSON.stringify(report, null, 2));
} catch {
  console.error("집계 실패: 기간은 1~720시간이어야 합니다. 기존 진단 DB의 경로·읽기 권한·테이블을 확인하세요. DB 생성이나 AI 호출은 하지 않습니다.");
  process.exitCode = 1;
}
