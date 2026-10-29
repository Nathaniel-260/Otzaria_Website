#!/usr/bin/env bash
set -euo pipefail

DEPLOY_REF=${1:?website commit required}
VALIDATOR_REF=${2:?validator commit required}
LIVE_PATH=${3:-/var/www/otzaria-web}
ROOT_DIR=${DEPLOY_ROOT:-$(dirname "$LIVE_PATH")}
BUILD_DIR=${BUILD_DIR:-$ROOT_DIR/otzaria-build}
RELEASES_DIR=${RELEASES_DIR:-$ROOT_DIR/otzaria-releases}
SHARED_DIR=${SHARED_DIR:-$ROOT_DIR/otzaria-shared}
PM2_APP=${PM2_APP:-otzaria}

[[ "$DEPLOY_REF" =~ ^[a-f0-9]{40}$ && "$VALIDATOR_REF" =~ ^[a-f0-9]{40}$ ]] || {
  echo 'Deployment requires immutable commit SHAs' >&2
  exit 1
}

pm2 describe "$PM2_APP" >/dev/null

LEGACY_PATH=
PREVIOUS_RELEASE=
RELEASE_ID="$DEPLOY_REF-$VALIDATOR_REF"
NEW_RELEASE="$RELEASES_DIR/$RELEASE_ID"
ACTIVATED=false
COMPLETE=false
PROCESS_STOPPED=false
# TODO(one-time atomic-release migration): once production has successfully
# migrated and LIVE_PATH is permanently a symlink, remove MIGRATION, the
# LEGACY_PATH branch in restore_previous(), migrate_shared_data(), and the
# migration activation branch below. Keep the normal atomic symlink path.
MIGRATION=false
if [[ -d "$LIVE_PATH" && ! -L "$LIVE_PATH" ]]; then MIGRATION=true; fi

check_health() {
  local expected=$1 response
  for attempt in 1 2 3 4 5 6; do
    if response=$(curl --fail --silent --max-time 3 http://127.0.0.1:3000/version.json) &&
       cmp -s "$expected" <(printf '%s' "$response"); then
      return 0
    fi
    sleep 1
  done
  return 1
}

restore_previous() {
  if [[ -n "$LEGACY_PATH" ]]; then
    rm -f "$LIVE_PATH"
    mv "$LEGACY_PATH" "$LIVE_PATH"
  elif [[ -n "$PREVIOUS_RELEASE" ]]; then
    rm -f "$LIVE_PATH.rollback"
    ln -s "$PREVIOUS_RELEASE" "$LIVE_PATH.rollback"
    mv -Tf "$LIVE_PATH.rollback" "$LIVE_PATH"
  fi
}

migrate_shared_data() {
  local data_path env_file
  mkdir -p "$SHARED_DIR/public"
  for data_path in storage var public/uploads public/tessdata; do
    mkdir -p "$SHARED_DIR/$(dirname "$data_path")"
    if [[ ! -e "$SHARED_DIR/$data_path" && ! -L "$SHARED_DIR/$data_path" &&
          ( -e "$LIVE_PATH/$data_path" || -L "$LIVE_PATH/$data_path" ) ]]; then
      mv "$LIVE_PATH/$data_path" "$SHARED_DIR/$data_path"
    elif [[ -e "$SHARED_DIR/$data_path" && -e "$LIVE_PATH/$data_path" &&
            ! -L "$LIVE_PATH/$data_path" ]]; then
      echo "Migration conflict: both live and shared $data_path exist" >&2
      return 1
    fi
    mkdir -p "$SHARED_DIR/$data_path" "$LIVE_PATH/$(dirname "$data_path")"
    rm -rf "$LIVE_PATH/$data_path"
    ln -s "$SHARED_DIR/$data_path" "$LIVE_PATH/$data_path"
  done
  for env_file in .env .env.local .env.production .env.production.local; do
    if [[ ! -e "$SHARED_DIR/$env_file" && -f "$LIVE_PATH/$env_file" ]]; then
      mv "$LIVE_PATH/$env_file" "$SHARED_DIR/$env_file"
    elif [[ -f "$SHARED_DIR/$env_file" && -f "$LIVE_PATH/$env_file" &&
            ! -L "$LIVE_PATH/$env_file" ]]; then
      echo "Migration conflict: both live and shared $env_file exist" >&2
      return 1
    fi
    rm -f "$LIVE_PATH/$env_file"
    if [[ -f "$SHARED_DIR/$env_file" ]]; then ln -s "$SHARED_DIR/$env_file" "$LIVE_PATH/$env_file"; fi
  done
}

cleanup() {
  local status=$? rollback_failed=false
  trap - EXIT
  if [[ "$ACTIVATED" == true && "$COMPLETE" != true ]]; then
    echo 'Activation failed; restoring the previous release' >&2
    set +e
    restore_previous || rollback_failed=true
    pm2 restart "$PM2_APP" || rollback_failed=true
    if [[ -n "$PREVIOUS_RELEASE" ]]; then
      check_health "$PREVIOUS_RELEASE/public/version.json" || rollback_failed=true
    elif [[ -s "$LIVE_PATH/public/version.json" ]]; then
      check_health "$LIVE_PATH/public/version.json" || rollback_failed=true
    fi
    if [[ "$rollback_failed" == true ]]; then
      echo "Rollback failed; failed release retained at $NEW_RELEASE" >&2
      exit 1
    fi
  elif [[ "$PROCESS_STOPPED" == true ]]; then
    # A one-time migration can fail while moving shared data, before the live
    # path is replaced. Bring the untouched/linked legacy checkout back up.
    pm2 restart "$PM2_APP" || exit 1
  fi
  if [[ "$COMPLETE" != true ]]; then rm -rf "$NEW_RELEASE"; fi
  exit "$status"
}
trap cleanup EXIT

echo 'Preparing the persistent build workspace'
if ! git -C "$BUILD_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  [[ -d "$LIVE_PATH/.git" ]] || {
    echo "Neither $BUILD_DIR nor the legacy live path is a Git checkout" >&2
    exit 1
  }
  ORIGIN_URL=$(git -C "$LIVE_PATH" remote get-url origin)
  git clone "$ORIGIN_URL" "$BUILD_DIR"
fi
git -C "$BUILD_DIR" fetch --depth 1 origin "$DEPLOY_REF"
git -C "$BUILD_DIR" reset --hard "$DEPLOY_REF"
git -C "$BUILD_DIR" clean -fd
rm -rf "$BUILD_DIR/storage" "$BUILD_DIR/var" "$BUILD_DIR/public/uploads" "$BUILD_DIR/public/tessdata"

# Preserve only Next's reusable compiler cache. Every other build output is
# tied to a particular commit and is regenerated.
CACHE_HOLD=$(mktemp -d "$ROOT_DIR/.otzaria-cache.XXXXXX")
if [[ -d "$BUILD_DIR/.next/cache" ]]; then
  mv "$BUILD_DIR/.next/cache" "$CACHE_HOLD/cache"
fi
rm -rf "$BUILD_DIR/.next"
mkdir -p "$BUILD_DIR/.next"
if [[ -d "$CACHE_HOLD/cache" ]]; then mv "$CACHE_HOLD/cache" "$BUILD_DIR/.next/cache"; fi
rmdir "$CACHE_HOLD"
rm -f "$BUILD_DIR/public/version.json" "$BUILD_DIR/public/export-editor/dicta-editor-offline.html"

# The migration build reads the legacy production env; later builds read the
# shared env files. Mutable data is never linked into the build workspace.
for env_file in .env .env.local .env.production .env.production.local; do
  rm -f "$BUILD_DIR/$env_file"
  if [[ -f "$SHARED_DIR/$env_file" ]]; then
    ln -s "$SHARED_DIR/$env_file" "$BUILD_DIR/$env_file"
  elif [[ -f "$LIVE_PATH/$env_file" ]]; then
    ln -s "$LIVE_PATH/$env_file" "$BUILD_DIR/$env_file"
  fi
done

cd "$BUILD_DIR"
npm ci --legacy-peer-deps --prefer-offline --no-audit --no-fund
npm install "github:Otzaria/otzaria-plugin-validator#$VALIDATOR_REF" --legacy-peer-deps --no-save --prefer-offline --no-audit --no-fund
npm run build
test -s .next/prerender-manifest.json
test -s .next/BUILD_ID
test -s public/version.json

mkdir -p "$RELEASES_DIR" "$SHARED_DIR"
if [[ -L "$LIVE_PATH" ]]; then PREVIOUS_RELEASE=$(readlink -f "$LIVE_PATH"); fi
if [[ -n "$PREVIOUS_RELEASE" && "$PREVIOUS_RELEASE" == "$NEW_RELEASE" ]]; then
  echo "Release already active: $NEW_RELEASE"
  COMPLETE=true
  exit 0
fi

# Remove the older previous release before materialising the candidate. There
# are therefore never more than active + candidate/previous release trees.
for release in "$RELEASES_DIR"/*; do
  [[ -e "$release" ]] || continue
  if [[ -n "$PREVIOUS_RELEASE" && "$release" -ef "$PREVIOUS_RELEASE" ]]; then continue; fi
  rm -rf "$release"
done
rm -rf "$NEW_RELEASE"
mkdir -p "$NEW_RELEASE"
# Preserve the established `next start` runtime layout. Releases contain the
# tracked source snapshot, complete production build and installed dependency
# tree, but neither Git metadata nor the reusable compiler cache.
git archive "$DEPLOY_REF" | tar -x -C "$NEW_RELEASE"
cp -a .next "$NEW_RELEASE/.next"
rm -rf "$NEW_RELEASE/.next/cache"
cp -a node_modules "$NEW_RELEASE/node_modules"
cp -a public/. "$NEW_RELEASE/public/"

# Runtime data is shared rather than copied into immutable releases. During
# the one-time migration the targets are populated only after PM2 stops.
mkdir -p "$SHARED_DIR/public"
for data_path in storage var public/uploads public/tessdata; do
  mkdir -p "$SHARED_DIR/$(dirname "$data_path")"
  if [[ "$MIGRATION" != true ]]; then mkdir -p "$SHARED_DIR/$data_path"; fi
  mkdir -p "$NEW_RELEASE/$(dirname "$data_path")"
  rm -rf "$NEW_RELEASE/$data_path"
  ln -s "$SHARED_DIR/$data_path" "$NEW_RELEASE/$data_path"
done
for env_file in .env .env.local .env.production .env.production.local; do
  if [[ -f "$SHARED_DIR/$env_file" || ( "$MIGRATION" == true && -f "$LIVE_PATH/$env_file" ) ]]; then
    ln -s "$SHARED_DIR/$env_file" "$NEW_RELEASE/$env_file"
  fi
done

echo 'Activating the immutable release'
if [[ "$MIGRATION" == true ]]; then
  # TODO(one-time atomic-release migration): remove this branch after the
  # first successful production deployment. It keeps the stopped legacy tree
  # only until the new layout passes its health check.
  LEGACY_PATH="$ROOT_DIR/.otzaria-legacy.$RELEASE_ID"
  pm2 stop "$PM2_APP"
  PROCESS_STOPPED=true
  migrate_shared_data
  mv "$LIVE_PATH" "$LEGACY_PATH"
  ACTIVATED=true
  ln -s "$NEW_RELEASE" "$LIVE_PATH"
else
  rm -f "$LIVE_PATH.next"
  ln -s "$NEW_RELEASE" "$LIVE_PATH.next"
  mv -Tf "$LIVE_PATH.next" "$LIVE_PATH"
  ACTIVATED=true
fi
pm2 restart "$PM2_APP"
PROCESS_STOPPED=false

if ! check_health "$NEW_RELEASE/public/version.json"; then
  echo 'New release did not pass its health check' >&2
  exit 1
fi

COMPLETE=true
if [[ -n "$LEGACY_PATH" ]]; then rm -rf "$LEGACY_PATH"; fi
echo "Deployment healthy: $NEW_RELEASE"
