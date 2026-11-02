# Li Time Bluetooth Battery Monitor

Web app that monitors a Li Time LiFePO4 battery over Bluetooth (Web Bluetooth API). No server, no account, no Li Time app login: it is a single `index.html` of client-side JavaScript that also works offline once installed.

Forked from [chadj/litime-bluetooth-battery](https://github.com/chadj/litime-bluetooth-battery) and extended. Tested with the Li Time 12V 50Ah battery (advertises as `L-12050…`); the original code was written for the 100Ah Group 24 model.

Live: https://n1029676.github.io/litime-webapp/

Works in Chrome on Android and desktop (and Chromium derivatives). On Apple devices use [WebBLE](https://apps.apple.com/us/app/webble/id1193531073) or [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055). The battery accepts one connection at a time, so close the Li Time app first.

## Features

**Display**
- **Battery graphic** at the top: 20 bars (5% each). Bars are red at 10% or below, yellow at 25% or below, green above. While charging, the last lit bar pulses slowly (disabled if the device asks for reduced motion).
- **Last update** line with the time of the last valid frame and its age; turns red after 10 s without data.
- **Rows:** Charge Level (`99% (49.5/50 Ah)`), Watts, Charge State (time till charged / depleted), Battery Temp and BMS Temp (°C / °F), Voltage, Current (positive = charging), Cell Volts, Balancing (In progress / Not balancing). Values show units and two decimals.
- Dark theme (black, grey, yellow).

**Connecting**
- **Connect** opens Chrome's device picker, filtered by name prefix `L-` (the battery doesn't advertise its service UUID).
- A second button changes with the connection state: **Disconnect**, **Reconnect**, **Connecting… (2/3)**, **Retry 2/3 in 3s** (tap to cancel), **Cancel search**, or **Chrome only** when Web Bluetooth is unavailable.
- **Retries:** a failed attempt (`NetworkError: Connection attempt failed`) is retried up to 3 times, 3 s apart, with a countdown on the button. Other errors are not retried.
- **Auto-connect:** after the first manual Connect, the app remembers the battery (an opaque Chrome device id, not the MAC address) and connects on its own when opened, as soon as the battery is advertising. This relies on Chrome's `getDevices()` / `watchAdvertisements()`. If they aren't available, or permission isn't kept across reloads, you get the Connect button as before; if remembering never works, try `chrome://flags/#enable-web-bluetooth-new-permissions-backend`. The reason is written to the debug log.
- A lost connection stops polling and offers **Reconnect**.

**Offline / installable**
- Bootstrap CSS is vendored in `vendor/`; a cache-first service worker (`sw.js`) caches everything after the first online visit, and `manifest.webmanifest` lets Chrome install it to the home screen (menu → *Install app*). Serve it over HTTPS (e.g. GitHub Pages); Web Bluetooth requires a secure context.
- The footer shows the deployed version and the offline-cache status. A new version is picked up on the next visit; the footer then asks you to reload once.

**Debug switch**
- Shows the latest raw frame (hex, length, parsed values) in an on-page panel, with **Snapshot frame** (appends the frame to the log, to compare states) and **Copy log**. Frames are also logged to the console.
- Reads the properties of characteristics `0xFFE1`–`0xFFE3` and subscribes to `0xFFE3` notifications (only the standard notify-enable descriptor is written). Nothing has been observed on `0xFFE3` so far.

## Protocol notes

| Item | Value |
|---|---|
| Advertised name | `L-12050…` (match with `namePrefix: 'L-'`) |
| Service | `0xFFE0` |
| `0xFFE2` | write; request goes here |
| `0xFFE1` | notify; replies arrive here |
| `0xFFE3` | notify; purpose unknown |
| Request | `00 00 04 01 13 55 AA 17` (polled every 3 s) |
| Reply | one 105-byte notification, little-endian |

Do **not** write to service `f000ffc0-0451-4000-b000-000000000000`; it looks like a TI firmware-update service.

Reply fields (byte offsets):

| Offset | Type | Meaning |
|---|---|---|
| 12 | u32 | pack voltage, mV (equals the sum of the cells) |
| 16… | u16 × up to 16 | cell voltages, mV (zero = unused) |
| 48 | i32 | current, mA (positive = charging) |
| 52 / 54 | i16 | cell / BMS temperature, °C |
| 62 | u16 | amp-hour counter, ÷100 Ah. Can exceed rated capacity at full charge |
| 64 | u16 | capacity, ÷100 Ah. The BMS appears to raise it at full charge (50.00 → 51.01 seen) |
| 84 | u8 | cell balancing flag: 0 = not balancing, 1 = in progress. Matched the official app in four captured frames (see below) |
| 90 | u16 | state of charge, %. The app uses this, as the official app does |
| 92 | u16 | probably state of health, % (102 seen with 51.01 Ah). Unconfirmed |
| 104 | u8 | checksum: sum of bytes 0–103, modulo 256 (observed; not validated by the app) |

Balancing evidence (official app vs byte 84): charging at 12% / not balancing = 0; full, balancing = 1 (two frames); full, "balancing complete" = 0. Byte 72 (value 4) tracks the same state in those frames and may be a related field, e.g. a cell mask. "Not balancing" can't distinguish "complete" from "not needed".

Not yet decoded: bytes 68 (72 in every full-charge frame), 70, 72–73, 76, 88 and 96 hold unexplained flags or values. Use the debug **Snapshot frame** button to capture frames in different states and compare them with the official app.

## Development

- No build step; edit `index.html` and serve it over HTTPS (or `localhost`).
- **Before every commit that changes the app**, run `./bump-version.sh` and stage `version.js` and `sw.js`. It stamps the current time into both: the footer shows it, and because `sw.js` changes the browser installs a fresh offline cache. A pre-commit hook enforces this; enable it once per clone with `git config core.hooksPath .githooks`.
- There is no hardware in CI or cloud sessions. Test with a mocked `navigator.bluetooth` in headless Chromium (e.g. Playwright), feeding it captured frames.
- Don't commit the battery's MAC address or full serial number, and don't write to any characteristic other than `0xFFE2` without a good reason. See `CLAUDE.md`.

## License

See `LICENSE`.
