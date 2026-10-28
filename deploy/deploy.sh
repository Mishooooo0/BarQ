#!/usr/bin/env bash
# Deploys the committed HEAD of this repo to the ring server (ssh host "ring") and restarts the container.
# Usage, from the repo root: bash deploy/deploy.sh
set -euo pipefail
HOST="${1:-ring}"
git diff --quiet HEAD || echo "Note: uncommitted changes are not deployed; only HEAD is."
# ~/barq/data holds the databases; the container runs as uid 1000 ("node"), so that user must own it.
ssh "$HOST" 'mkdir -p ~/barq/data && sudo chown 1000:1000 ~/barq/data && rm -rf ~/barq/app.new && mkdir ~/barq/app.new && touch ~/barq/.env && chmod 600 ~/barq/.env'
git archive --format=tar HEAD | ssh "$HOST" 'tar -x -C ~/barq/app.new'
scp -q deploy/compose.yml "$HOST":~/barq/compose.yml
ssh "$HOST" 'cd ~/barq && rm -rf app && mv app.new app && docker compose up -d --build && docker compose ps'
ssh "$HOST" 'for i in $(seq 1 60); do curl -fsS http://127.0.0.1:5352/api/health && echo && exit 0; sleep 2; done; echo "BarQ did not become healthy"; docker logs --tail 50 barq; exit 1'
