#!/usr/bin/env bash
# WEB-019: keep the development API's ADMIN_WEB_TRUSTED_ORIGINS equal to its
# non-preview origins plus the Vercel branch alias of every open pull request
# that has a ready admin preview (ADR-0084: exact origins, never a wildcard).
# The whole list is recomputed on every run, so a missed or repeated run
# corrects itself. Render is written, and redeployed, only when it changes.
set -euo pipefail

: "${VERCEL_TOKEN:?}" "${VERCEL_PROJECT_ID:?}" "${VERCEL_TEAM_SLUG:?}"
: "${RENDER_API_KEY:?}" "${RENDER_SERVICE_ID:?}" "${GITHUB_REPOSITORY:?}"

origins_key=ADMIN_WEB_TRUSTED_ORIGINS
# The backend's own default when the variable is unset (environment.ts); the
# variable must never be empty or the API refuses to start.
fallback_origin=http://localhost:5173
alias_pattern="^emma-pilates-admin-git-[a-z0-9-]+-${VERCEL_TEAM_SLUG}\\.vercel\\.app\$"

vercel() {
  curl -fsS "https://api.vercel.com$1" -H "Authorization: Bearer $VERCEL_TOKEN"
}
render() {
  curl -fsS "https://api.render.com/v1/services/$RENDER_SERVICE_ID$1" \
    -H "Authorization: Bearer $RENDER_API_KEY" -H 'Accept: application/json' "${@:2}"
}

open_branches=$(gh api "repos/$GITHUB_REPOSITORY/pulls?state=open&per_page=100" \
  --paginate --jq '.[].head.ref')

# Newest first, so the first ready deployment per open branch is its latest.
latest_ready=$(vercel "/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamSlug=$VERCEL_TEAM_SLUG&target=preview&limit=100" |
  jq -r --arg branches "$open_branches" '
    ($branches | split("\n") | map(select(. != ""))) as $open
    | [.deployments[] | select(.state == "READY" and (.meta.githubCommitRef as $ref | any($open[]; . == $ref)))]
    | reduce .[] as $d ({}; .[$d.meta.githubCommitRef] //= $d.uid)
    | .[]')

preview_origins=""
for deployment_uid in $latest_ready; do
  alias=$(vercel "/v13/deployments/$deployment_uid?teamSlug=$VERCEL_TEAM_SLUG" |
    jq -r --arg pattern "$alias_pattern" '[.alias[]? | select(test($pattern))][0] // empty')
  if [ -n "$alias" ]; then
    preview_origins+="https://$alias"$'\n'
  fi
done

current=$(render "/env-vars?limit=100" |
  jq -r --arg key "$origins_key" '.[] | .envVar | select(.key == $key) | .value')

desired=$(jq -rn --arg current "$current" --arg previews "$preview_origins" \
  --arg pattern "^https://${alias_pattern:1}" --arg fallback "$fallback_origin" '
    def items: split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(. != ""));
    ($current | items | map(select(test($pattern) | not))) as $kept
    | ($previews | split("\n") | map(select(. != ""))) as $open
    | ($kept + $open | unique) as $all
    | if $all == [] then $fallback else $all | join(",") end')

normalized_current=$(jq -rn --arg current "$current" \
  '$current | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(. != "")) | unique | join(",")')

echo "Current: ${current:-<unset>}"
echo "Desired: $desired"
if [ "$normalized_current" = "$desired" ]; then
  echo "No change"
  exit 0
fi
if [ "${DRY_RUN:-}" = 1 ]; then
  echo "Dry run: Render not changed"
  exit 0
fi

render "/env-vars/$origins_key" -X PUT -H 'Content-Type: application/json' \
  -d "$(jq -n --arg value "$desired" '{value: $value}')" > /dev/null
render "/deploys" -X POST -H 'Content-Type: application/json' -d '{}' > /dev/null
echo "Updated $origins_key and requested a deploy"
