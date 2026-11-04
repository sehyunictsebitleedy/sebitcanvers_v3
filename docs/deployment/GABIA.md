# 가비아 통합 배포

## 현재 상태 — 2026-11-04

서버에 앱 설치와 백엔드 실행을 완료했습니다. **가비아 외부 TCP 80·443 허용과 HTTPS 인증서 발급은 대기 중이며 공개 서비스 완료 상태가 아닙니다.** 외부 80번 접속은 시간 초과였고 서버 자체 UFW는 비활성입니다. 가비아 방화벽/보안그룹 규칙 확인이 필요합니다.

| 항목 | 설정 |
|---|---|
| 서버 | `1.201.110.199`, Ubuntu 24.04.4 LTS, 1 vCPU / 2GB / 50GB |
| SSH | ubuntu, 22번, 사용자 로컬 키페어 사용 |
| 구성 | 프론트 정적 파일 + Nginx + Node.js 24.22.2 API |
| 예정 주소 | `https://1.201.110.199/` (HTTPS 활성화 후) |
| 코드 | `/srv/sebit/releases/20261104-d8934e7`, `/srv/sebit/current` 링크 |
| 웹 루트 | `/srv/sebit/current/sebitcanvers_v3/frontend/dist` |
| 백엔드 | `sebit.service`, `127.0.0.1:3001`, sebit 전용 계정 |
| 비공개 설정 | `/etc/sebit/backend.env`, root:sebit 0640 |
| 영속 데이터 | `/var/lib/sebit` 0700, SQLite 3개 0600 |
| 백업 | `/var/backups/sebit`, 매일 KST 03시 이후, 약 14일 보관 |

로컬 CMS 계정·초안·게시본, 사용량 및 AI 이벤트 DB를 SQLite 일관된 스냅샷으로 이전했습니다. 관리자 비밀번호는 기존 것을 사용하되 로그인 세션은 이전하지 않았으므로 새 서버에서 다시 로그인해야 합니다. 브라우저에만 저장된 최근 작업은 주소가 바뀌면 자동 이전되지 않습니다. 새 서버 사용 후 로컬 DB를 다시 덮어쓰지 마세요.

## 외부 공개를 마무리하는 순서

1. 가비아 콘솔에서 해당 서버 보안그룹/방화벽에 인바운드 **TCP 80·443, 소스 0.0.0.0/0** 허용. 3001은 공개하지 않습니다. SSH 22는 운영자 접속용입니다.
2. SSH 접속 후 준비한 스크립트 실행:

   ```bash
   bash ~/.sebit-stage/gabia-enable-https.sh
   ```

   이 스크립트는 Let's Encrypt IP 인증서를 발급한 뒤 Nginx HTTPS 설정과 자동 갱신 타이머를 활성화합니다. 실패하면 출력을 확인하고 중단 원인을 해결하세요. 현재 HTTP는 ACME 검증 경로만 제공하며 나머지는 503을 반환하도록 준비했습니다.
3. 외부에서 홈, `/api/health`의 `{"ready":true}`, `/#create` 사용량, `/admin` 로그인과 마스터 면제, 생성·수정·상담, 게시본을 검수합니다.
4. 인증서 갱신 리허설과 타이머 확인:

   ```bash
   sudo /opt/certbot/bin/certbot renew --dry-run
   systemctl list-timers sebit-certbot.timer
   ```

IP 인증서는 유효 기간이 6일이므로 갱신은 필수입니다. Certbot 5.9.0과 하루 2회 점검 타이머를 준비했습니다. [Let's Encrypt 공식 안내](https://letsencrypt.org/2026/03/11/shorter-certs-certbot)를 기준으로 webroot 및 shortlived 프로필을 사용합니다. 인증서 계정은 이메일 없이 등록하므로 타이머/실패 로그를 운영자가 확인해야 합니다.

## 운영 명령

```bash
sudo systemctl status sebit nginx
sudo journalctl -u sebit -n 50 --no-pager
sudo systemctl restart sebit
sudo systemctl start sebit-backup.service
systemctl list-timers sebit-backup.timer
cd /srv/sebit/current/backend
sudo -u sebit /usr/local/bin/node --env-file=/etc/sebit/backend.env --import tsx src/checkDeployment.ts
```

백업은 SQLite `.backup`으로 생성하고 무결성을 확인합니다. 서버 내부 백업이므로 서버 전체 장애에 대비한 별도 보관은 후속 운영 작업입니다. 복원은 서비스 중지 후 `COMPLETE`가 있는 백업에서 3개 DB를 복원하고 소유자 sebit, 권한 0600을 유지해야 합니다. 실제 운영 데이터에 대한 복원 리허설은 아직 하지 않았습니다.

## 후속 배포

로컬 프론트 빌드 결과와 추적된 소스만 새 릴리스 디렉터리에 전달합니다. `.env`, 키페어, DB, Windows node_modules는 릴리스에 포함하지 않습니다. 백엔드는 프론트의 스키마를 참조하므로 프론트 소스와 해당 런타임 의존성도 필요합니다. 서버에서 backend는 `npm ci --include=dev`, frontend는 `npm ci --omit=dev`로 설치했습니다. tsx는 현재 백엔드 실행에 필요합니다.

배포 점검 후 current 링크를 새 릴리스로 바꾸고 sebit을 재시작합니다. 문제가 있으면 이전 링크로 복구합니다. 데이터·설정 경로는 릴리스 밖에 유지하며 코드 롤백만으로 DB를 되돌리지 않습니다. Vercel 자동 배포와 가비아 배포는 별개이며 Git push만으로 가비아 코드가 갱신되지는 않습니다.
