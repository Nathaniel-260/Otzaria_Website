#!/usr/bin/env bash
set -euo pipefail

DEPLOY_REF=${1:?website commit required}
VALIDATOR_REF=${2:?validator commit required}
APP_DIR=${3:-/var/www/otzaria-web}
# Optional: a second instance (the preview site) runs from its own directory, pm2 process and
# port. The defaults are the production instance, so the existing workflow call is unchanged.
PM2_NAME=${4:-otzaria-web}
APP_PORT=${5:-3000}
[[ "$PM2_NAME" =~ ^[a-z0-9-]+$ && "$APP_PORT" =~ ^[0-9]+$ ]] || {
  echo 'Invalid pm2 process name or port' >&2; exit 1;
}
[[ "$DEPLOY_REF" =~ ^[a-f0-9]{40}$ && "$VALIDATOR_REF" =~ ^[a-f0-9]{40}$ ]] || {
  echo 'Deployment requires immutable commit SHAs' >&2; exit 1;
}
cd "$APP_DIR"
OLD_REF=$(git rev-parse HEAD)
STAGE=$(mktemp -d "$(dirname "$APP_DIR")/.otzaria-deploy.XXXXXX")
BACKUP="$STAGE/previous"
STOPPED=false
COMPLETE=false
MOVED_OLD=()
INSTALLED_NEW=()
RUNTIME_PATHS=(node_modules .next public/version.json public/export-editor/dicta-editor-offline.html)

check_health() {
  for attempt in 1 2 3 4 5 6; do
    if curl --fail --silent --max-time 3 http://127.0.0.1:$APP_PORT/version.json > "$STAGE/health.json" &&
       cmp -s "$APP_DIR/public/version.json" "$STAGE/health.json"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

cleanup() {
  local status=$?
  local rollback_failed=false
  trap - EXIT
  if [[ "$STOPPED" == true && "$COMPLETE" != true ]]; then
    echo 'Activation failed; restoring the previous code and build' >&2
    set +e
    pm2 stop "$PM2_NAME" || rollback_failed=true
    for item in ${INSTALLED_NEW[@]+"${INSTALLED_NEW[@]}"}; do rm -rf "$APP_DIR/$item" || rollback_failed=true; done
    for item in ${MOVED_OLD[@]+"${MOVED_OLD[@]}"}; do
      mkdir -p "$(dirname "$APP_DIR/$item")" || rollback_failed=true
      mv "$BACKUP/$item" "$APP_DIR/$item" || rollback_failed=true
    done
    git reset --hard "$OLD_REF" || rollback_failed=true
    pm2 restart "$PM2_NAME" || rollback_failed=true
    check_health || rollback_failed=true
    if [[ "$rollback_failed" == true ]]; then
      echo "Rollback failed; backup retained at $STAGE" >&2
      exit 1
    fi
  fi
  rm -rf "$STAGE"
  exit "$status"
}
trap cleanup EXIT

echo 'Preparing a separate build; the active installation stays intact'
git archive "$DEPLOY_REF" | tar -x -C "$STAGE"
for env_file in .env .env.local .env.production .env.production.local; do
  if [[ -f "$APP_DIR/$env_file" ]]; then ln -s "$APP_DIR/$env_file" "$STAGE/$env_file"; fi
done
# Persistent uploads/storage are runtime data and remain in APP_DIR. Linking
# them into the build exposes user-created external symlinks to Turbopack's
# filesystem sandbox and can abort compilation. Build only the Git snapshot.
cd "$STAGE"
npm ci --legacy-peer-deps
npm install "github:Otzaria/otzaria-plugin-validator#$VALIDATOR_REF" --legacy-peer-deps --no-save
node scripts/patch-plugin-validator.cjs
npm run test:plugin-safety
npm run test:deployment-regressions
npm run build
test -s .next/prerender-manifest.json
test -s .next/BUILD_ID
for item in "${RUNTIME_PATHS[@]}"; do test -e "$STAGE/$item"; done

echo 'Build verified; activating it with rollback available'
cd "$APP_DIR"
pm2 stop "$PM2_NAME"
STOPPED=true
git reset --hard "$DEPLOY_REF"
for item in "${RUNTIME_PATHS[@]}"; do
  mkdir -p "$(dirname "$BACKUP/$item")" "$(dirname "$APP_DIR/$item")"
  if [[ -e "$APP_DIR/$item" ]]; then
    mv "$APP_DIR/$item" "$BACKUP/$item"
    MOVED_OLD+=("$item")
  fi
  mv "$STAGE/$item" "$APP_DIR/$item"
  INSTALLED_NEW+=("$item")
done
pm2 restart "$PM2_NAME"

# Check the actual Node server and the exact build version, bypassing nginx caches.
if check_health; then
  COMPLETE=true
  echo 'Deployment healthy'
  exit 0
fi
echo 'New build did not pass its health check' >&2
exit 1
