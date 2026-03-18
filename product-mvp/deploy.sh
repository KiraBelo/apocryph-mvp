#!/bin/bash
set -e

SERVER=root@31.192.111.43
APP_DIR=/opt/apocryph

echo "Type-checking..."
npx tsc --noEmit

echo "Uploading..."
tar -czf /tmp/apocryph-deploy.tar.gz --exclude=node_modules --exclude=.env.local --exclude=.next .
scp /tmp/apocryph-deploy.tar.gz $SERVER:/tmp/

echo "Deploying with rollback support..."
ssh $SERVER << 'EOF'
  cd /opt/apocryph
  # Backup .env
  cp .env.local /tmp/.env.local.bak 2>/dev/null || true
  # Extract new code
  mkdir -p /tmp/apocryph-deploy
  tar -xzf /tmp/apocryph-deploy.tar.gz -C /tmp/apocryph-deploy
  rsync -a --delete --exclude=node_modules --exclude=.next --exclude=.env.local /tmp/apocryph-deploy/ .
  # Restore .env
  cp /tmp/.env.local.bak .env.local 2>/dev/null || true
  # Install deps if needed
  npm install
  # Build with rollback
  mv .next .next-old 2>/dev/null || true
  if npx next build; then
    rm -rf .next-old
    sudo systemctl restart apocryph
    echo "Deploy SUCCESS"
  else
    echo "Build FAILED — rolling back"
    mv .next-old .next
    sudo systemctl restart apocryph
    exit 1
  fi
  # Cleanup
  rm -rf /tmp/apocryph-deploy /tmp/apocryph-deploy.tar.gz
EOF

echo "Done!"
