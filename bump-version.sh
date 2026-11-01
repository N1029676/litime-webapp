#!/bin/sh
# Stamp version.js and sw.js with the current UTC time. Run before every commit that changes the app:
# the footer shows this value, and the changed sw.js makes browsers install a fresh offline cache.
cd "$(dirname "$0")" || exit 1
v=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf 'var APP_VERSION = "%s";\n' "$v" > version.js
sed -i "s|^const VERSION = \".*\"; // stamped by bump-version.sh|const VERSION = \"$v\"; // stamped by bump-version.sh|" sw.js
echo "$v"
