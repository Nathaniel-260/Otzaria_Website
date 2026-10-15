#!/usr/bin/env bash
# preview-sync.sh — מעדכן את אתר התצוגה המקדימה (preview.otzaria.org) מענף העיצוב החדש.
#
# רץ בשרת עצמו מ-cron (למשל כל 5 דקות), כך שאין צורך בסודות GitHub: הענף נמצא ב-fork,
# ופעולות GitHub ב-fork אינן מקבלות את פרטי ההתחברות לשרת. אם בענף יש commit חדש — פורס
# אותו דרך scripts/deploy-web.sh (אותה פריסה בטוחה של האתר הראשי: בנייה בתיקיית הכנה,
# בדיקת תקינות, וחזרה אוטומטית לגרסה הקודמת בכישלון), בתיקייה, בתהליך pm2 ובפורט של
# אתר התצוגה. האתר הראשי (/var/www/otzaria-web, otzaria-web, 3000) לא נוגע בו.
#
# שימוש (cron של המשתמש שמריץ את האתר):
#   */5 * * * * /var/www/otzaria-preview/scripts/preview-sync.sh >> /var/log/otzaria-preview-sync.log 2>&1
set -euo pipefail

PREVIEW_DIR=${PREVIEW_DIR:-/var/www/otzaria-preview}
PREVIEW_REPO_URL=${PREVIEW_REPO_URL:-https://github.com/Nathaniel-260/Otzaria_Website.git}
PREVIEW_BRANCH=${PREVIEW_BRANCH:-redesign}
PREVIEW_PM2=${PREVIEW_PM2:-otzaria-preview}
PREVIEW_PORT=${PREVIEW_PORT:-3001}
VALIDATOR_URL=https://github.com/Otzaria/otzaria-plugin-validator

# ריצה אחת בכל פעם — פריסה ארוכה לא תתנגש בהפעלה הבאה של cron
exec 9>"${TMPDIR:-/tmp}/otzaria-preview-sync.lock"
flock -n 9 || { echo "$(date -Is) sync already running"; exit 0; }

cd "$PREVIEW_DIR"
sha=$(git ls-remote "$PREVIEW_REPO_URL" "refs/heads/$PREVIEW_BRANCH" | cut -f1)
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || { echo "$(date -Is) branch $PREVIEW_BRANCH not found" >&2; exit 1; }
if [[ "$sha" == "$(git rev-parse HEAD)" ]]; then
  exit 0
fi

refs=$(git ls-remote "$VALIDATOR_URL" refs/tags/v1 'refs/tags/v1^{}')
validator=$(printf '%s\n' "$refs" | awk '$2 == "refs/tags/v1^{}" { print $1 }')
[[ -n "$validator" ]] || validator=$(printf '%s\n' "$refs" | awk '$2 == "refs/tags/v1" { print $1 }')
[[ "$validator" =~ ^[a-f0-9]{40}$ ]] || { echo "$(date -Is) validator v1 tag not found" >&2; exit 1; }

echo "$(date -Is) deploying $sha (validator $validator)"
git fetch --depth 1 "$PREVIEW_REPO_URL" "$sha"
deploy_script="$(git show "$sha:scripts/deploy-web.sh")"
printf '%s\n' "$deploy_script" | bash -s -- "$sha" "$validator" "$PREVIEW_DIR" "$PREVIEW_PM2" "$PREVIEW_PORT"
