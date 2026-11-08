# Li Time Bluetooth Battery Monitor

Web app that monitors a Li Time LiFePO4 battery over Bluetooth (Web Bluetooth API). No server, no account, no Li Time app login: it is a single `index.html` of client-side JavaScript that also works offline once installed.

Forked from [chadj/litime-bluetooth-battery](https://github.com/chadj/litime-bluetooth-battery) and extended. Tested with the Li Time 12V 50Ah battery (advertises as `L-12050…`); the original code was written for the 100Ah Group 24 model.

Live: https://n1029676.github.io/litime-webapp/

Works in Chrome on Android and desktop (and Chromium derivatives). On Apple devices use [WebBLE](https://apps.apple.com/us/app/webble/id1193531073) or [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055). The battery accepts one connection at a time, so close the Li Time app first.

## Features

**Display**
- **Battery graphic** at the top: 20 bars (5% each). Bars are red at 10% or below, yellow at 25% or below, green above. While charging, the last lit bar pulses slowly (disabled if the device asks for reduced motion).
- **Last update** line with the time of the last valid frame and its age; turns red after 10 s without data.
- **Rows:** Charge Level (`99% (49.5/50 Ah)`), Watts, Charge State (time till charged / depleted), Battery Temp and BMS Temp (°C / °F), Voltage, Current (positive = charging), Cell Volts, Balancing (In progress / Not balancing), Device (the battery's Bluetooth name as reported by Chrome; shown on the page only, never stored). Values show units and two decimals.
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

Reply layout, with a real capture decoded below (battery full and idle, balancing complete). All multi-byte values are little-endian.

```
00 00 65 01 93 55 AA 00 52 32 00 00 8E 34 00 00 0E 0D 30 0D 23 0D 2D 0D 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 10 00 10 00 00 00 00 00 00 00 ED 13 ED 13 00 00 48 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 04 00 64 00 66 00 00 00 02 00 00 00 74 00 00 00 AD
```

| Bytes | Raw | Field | Value | Status |
|---|---|---|---|---|
| 0–1 | `00 00` | fixed header | `00 00` | fixed |
| 2 | `65` | length = frame size − 4 | 101 | fixed (always 105-byte frames here) |
| 3 | `01` | version / type | 1 | fixed |
| 4 | `93` | command: request `0x13` with the top bit set | `0x93` | fixed |
| 5–6 | `55 AA` | magic | `55 AA` | fixed |
| 7 | `00` | unknown | 0 | zero in all four captures |
| 8–11 | `52 32 00 00` | u32 mV, unidentified; always a little below pack voltage | 12882 mV | unknown |
| 12–15 | `8E 34 00 00` | u32 pack voltage, mV (= sum of the cells) | 13454 mV = 13.45 V | matches official app |
| 16–47 | `0E 0D 30 0D 23 0D 2D 0D …` | 16 × u16 cell voltages, mV (0 = unused slot) | 3342, 3376, 3363, 3373 mV | sum equals pack voltage |
| 48–51 | `00 00 00 00` | i32 current, mA (positive = charging) | 0 mA | matches official app |
| 52–53 | `10 00` | i16 cell temperature, °C | 16 °C | matches official app |
| 54–55 | `10 00` | i16 BMS temperature, °C | 16 °C | likely (official app shows one temperature) |
| 56–61 | `00 00 00 00 00 00` | unknown | 0 | zero in all four captures |
| 62–63 | `ED 13` | u16 amp-hour counter, ÷100 Ah (can exceed rated capacity) | 51.01 Ah | plausible |
| 64–65 | `ED 13` | u16 capacity, ÷100 Ah (BMS raised it from 50.00 at full charge) | 51.01 Ah | matches official app (at 50.00) |
| 66–67 | `00 00` | unknown | 0 | zero in all four captures |
| 68–69 | `48 00` | u16 unknown | 72 | 0 in the charging capture, 72 in all full-charge captures |
| 70–71 | `01 00` | u16 unknown | 1 | 1 in all captures |
| 72 | `00` | u8 status; 4 while balancing | 0 | tracks balancing, see below |
| 73 | `00` | u8 unknown | 0 | 0x10 in the charging capture only (maybe a charging flag) |
| 74–83 | `00 00 00 00 …` | unknown | 0 | byte 76 was 4 once (5:56 PM capture) |
| 84 | `00` | **cell balancing flag**: 0 = not balancing, 1 = in progress | 0 | matches official app (4 captures) |
| 85–87 | `00 00 00` | unknown | 0 | zero in all four captures |
| 88 | `04` | u8 status; 1 while charging, 4 when full | 4 | unknown meaning |
| 89 | `00` | unknown | 0 | zero in all four captures |
| 90–91 | `64 00` | u16 state of charge, % | 100 % | matches official app |
| 92–93 | `66 00` | u16 state of health, % (51.01 ÷ 50.00 = 102) | 102 % | probable |
| 94–95 | `00 00` | unknown | 0 | zero in all four captures |
| 96–97 | `02 00` | u16 cycle count? | 2 | candidate: official app also shows 2 cycles |
| 98–99 | `00 00` | unknown | 0 | zero in all four captures |
| 100–101 | `74 00` | u16 unknown | 116 | 116 in all captures |
| 102–103 | `00 00` | unknown | 0 | zero in all four captures |
| 104 | `AD` | checksum = sum of bytes 0–103, modulo 256 | `0xAD` | verified on all four captures; not validated by the app |

"Matches official app" means the value agreed with what the Li Time app displayed at the same time. "Unknown" fields were zero or constant across the captures so far.

### Status bytes across four captures

Bytes whose value changed between captures, compared with what the official app showed at the time:

| Capture | Official app | 72 | 73 | 76 | 84 | 88 |
|---|---|---|---|---|---|---|
| Charging at 12%, 9.7 A | not balancing | 0 | 16 | 0 | 0 | 1 |
| Full, 5:56 PM | balancing | 4 | 0 | 4 | 1 | 4 |
| Full, 7:33 PM | balancing | 4 | 0 | 0 | 1 | 4 |
| Full, 2:07 AM | balancing complete | 0 | 0 | 0 | 0 | 4 |

Byte 84 and byte 72 both follow the official app's balancing state in these captures; the app uses byte 84. "Not balancing" can't distinguish "complete" from "not needed". Serial number, firmware versions and the rated capacity are not in this reply; the official app must get them with other commands (see below).

Not in this reply: serial number, model, firmware versions (BMS and Bluetooth). The only identifier we get is the Bluetooth name, which the app shows in the Device row. Other requests use other command bytes (the reply command is the request command with the top bit set); capture the official app's Bluetooth traffic (Android HCI snoop log) to find them. Use the debug **Snapshot frame** button to capture more frames.

## Development

- No build step; edit `index.html` and serve it over HTTPS (or `localhost`).
- **Before every commit that changes the app**, run `./bump-version.sh` and stage `version.js` and `sw.js`. It stamps the current time into both: the footer shows it, and because `sw.js` changes the browser installs a fresh offline cache. A pre-commit hook enforces this; enable it once per clone with `git config core.hooksPath .githooks`.
- There is no hardware in CI or cloud sessions. Test with a mocked `navigator.bluetooth` in headless Chromium (e.g. Playwright), feeding it captured frames.
- Don't commit the battery's MAC address or full serial number, and don't write to any characteristic other than `0xFFE2` without a good reason. See `CLAUDE.md`.

## License

See `LICENSE`.
