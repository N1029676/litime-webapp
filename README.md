# Li Time Bluetooth Battery Data Read
Web application to monitor the Li Time 100Ah Group 24 LiFePO4 Battery over bluetooth (w/ Web Bluetooth API).  No server needed.  All client side javascript.  This is a simple app to demonstrate the code and protocol needed to read battery states such as temperature, volts and current.  Feel free reuse and adapt this code for your own project.

This code has only been tested with the Li Time 100Ah Group 24 LiFePO4 Battery w/ Bluetooth.  That's the only one I own.  I developed this code to learn how to read the temperature off of the battery.

See this code in action at: https://chadj.github.io/litime-bluetooth-battery/

This web app will only work in Chrome (android / desktop / derivatives).  On Apple devices you can use [WebBLE](https://apps.apple.com/us/app/webble/id1193531073) or [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055).

## Offline use / installing
The app is a PWA: Bootstrap is vendored in `vendor/`, and a cache-first service worker (`sw.js`) caches everything after the first online visit. Serve it over HTTPS (e.g. GitHub Pages), open it once while online, then use Chrome's menu → *Install app* / *Add to Home screen*. After that it works with no connectivity. The footer shows the deployed version and offline-cache status.

When you change the app, run `./bump-version.sh` before committing (a pre-commit hook enforces this; enable it once per clone with `git config core.hooksPath .githooks`). It stamps `version.js`, which the footer displays and the service worker uses to refresh its cache. A new version is picked up on the next visit and applies after one reload.

## Auto-connect
After the first manual **Connect**, the app remembers the battery (an opaque Chrome device id, not the MAC address) and reconnects on its own when opened, as soon as the battery is advertising. This relies on Chrome's `getDevices()`/`watchAdvertisements()`; if your Chrome lacks them, or the permission is cleared, the Connect button is shown as before.
