#!/usr/bin/env bash
# Reports which required tools are installed. Read-only; safe to run anytime.
set -u

check() {
  local name="$1" cmd="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    printf "  OK   %-22s %s\n" "$name" "$($cmd --version 2>&1 | head -1)"
  else
    printf "  MISSING  %-18s (install required)\n" "$name"
  fi
}

echo "Prerequisite check:"
check "Node.js"        node
check "npm"            npm
check "git"            git
check "Salesforce CLI" sf

echo
echo "Package manager (for installs):"
for pm in brew apt dnf winget; do
  if command -v "$pm" >/dev/null 2>&1; then
    printf "  found: %s\n" "$pm"
  fi
done

echo
echo "Salesforce auth:"
if command -v sf >/dev/null 2>&1; then
  sf org list 2>/dev/null | sed 's/^/  /' || echo "  (no authenticated orgs — run: sf org login web)"
else
  echo "  (sf not installed)"
fi
