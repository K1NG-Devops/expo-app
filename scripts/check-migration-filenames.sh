#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

failures=0
warnings=0

check_dir() {
  local dir="$1"
  [ -d "$dir" ] || return 0

  echo -e "${BLUE}Checking migration filenames in: ${dir}${NC}"

  # Find all non-hidden files in the directory (depth 1)
  while IFS= read -r -d '' file; do
    base="$(basename "$file")"

    # Allow sentinel
    if [[ "$base" == ".lint_padding" ]]; then
      continue
    fi

    # Allow backups/skips but warn
    if [[ "$base" =~ ^[0-9]{14}_.+\.sql\.(bak|skip)$ ]]; then
      echo -e "${YELLOW}WARN${NC}: Legacy/backup file present: ${dir}/${base}"
      warnings=$((warnings+1))
      continue
    fi

    # Allow initial 01/02/03 migrations
    if [[ "$base" =~ ^(01|02|03)_[A-Za-z0-9][A-Za-z0-9._-]*\.sql$ ]]; then
      continue
    fi

    # Strongly preferred pattern: 14-digit timestamp + underscore + name + .sql
    if [[ "$base" =~ ^[0-9]{14}_[A-Za-z0-9][A-Za-z0-9._-]*\.sql$ ]]; then
      continue
    fi

    # Legacy pattern that we allow but warn: 8-digit date + _ + 6-digit time + _ + name.sql
    if [[ "$base" =~ ^[0-9]{8}_[0-9]{6}_[A-Za-z0-9][A-Za-z0-9._-]*\.sql$ ]]; then
      echo -e "${YELLOW}WARN${NC}: Legacy timestamp pattern (YYYYMMDD_HHMMSS_) detected: ${dir}/${base}"
      warnings+=1
      continue
    fi

    echo -e "${RED}ERROR${NC}: Invalid migration filename: ${dir}/${base}"
    echo "       Expected: <YYYYMMDDHHMMSS>_name.sql (or 01_/02_/03_ for initial)."
    failures=$((failures+1))
  done < <(find "$dir" -maxdepth 1 -type f -print0)
}

# Check both common migration directories
check_dir "migrations"
check_dir "supabase/migrations"

if (( failures > 0 )); then
  echo -e "${RED}✖ Migration filename check failed with ${failures} error(s) and ${warnings} warning(s).${NC}"
  exit 1
fi

if (( warnings > 0 )); then
  echo -e "${YELLOW}⚠ Migration filename check passed with ${warnings} warning(s).${NC}"
else
  echo -e "${GREEN}✔ Migration filename check passed with no issues.${NC}"
fi
