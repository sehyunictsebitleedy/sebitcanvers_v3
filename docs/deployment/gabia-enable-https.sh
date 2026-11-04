#!/bin/bash
# Run on the Gabia server after allowing inbound TCP 80 and 443.
set -euo pipefail
cd "$(dirname "$0")"
sudo /opt/certbot/bin/certbot certonly --non-interactive --agree-tos \
    --register-unsafely-without-email --preferred-profile shortlived \
    --webroot --webroot-path /var/www/acme --ip-address 1.201.110.199
sudo install -m 644 gabia-nginx.conf /etc/nginx/sites-available/sebit
sudo nginx -t
sudo systemctl reload nginx
sudo install -m 644 sebit-certbot.service sebit-certbot.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sebit-certbot.timer
curl --fail --silent --show-error https://1.201.110.199/api/health
