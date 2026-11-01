#!/bin/sh
# Stamp version.js with the current UTC time. Run before every commit that changes the app:
# the footer shows this value, and the service worker uses it to invalidate its cache.
cd "$(dirname "$0")" && printf 'var APP_VERSION = "%s";\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > version.js && cat version.js
