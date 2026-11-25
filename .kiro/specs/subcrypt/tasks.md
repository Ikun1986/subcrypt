# Implementation Plan: SubCrypt

Tasks are ordered so each step builds on the previous one and the app is runnable from task 4 onward. Requirement references use the numbering in `requirements.md`. Tasks marked `*` are optional.

- [x] 1. Scaffold the static app and repository hygiene
  - Create `index.html` with landmarks (`header`, `main`, RIP `section`), a CSP meta tag, a `<noscript>` message, and module entry `js/app.js`.
  - Create empty CSS files from the design file layout and `css/tokens.css` with every token from `.kiro/steering/design-tokens.md`.
  - Add `.nojekyll`, `404.html`, and a `.gitignore` that excludes only OS and editor files and does not exclude `.kiro/`.
  - _Requirements: 13.1, 13.2, 13.4, 13.5_

- [x] 2. Implement pure domain logic in `js/model.js`
  - [x] 2.1 Date helpers: `todayISO`, `daysBetween`, `addCycle` with month-end clamping, `rollForward`.
    - _Requirements: 5.1, 5.2_
  - [x] 2.2 Money helpers: `monthlyCents`, `yearlyCents`, `formatUSD`, `formatUSDShort`.
    - _Requirements: 7.7_
  - [x] 2.3 Classification: `isZombie`, `hauntDays`, `renewalLabel`, `confirmedLabel`.
    - _Requirements: 3.1, 4.1, 4.2, 8.5_
  - [x] 2.4 Aggregates: `totals`, `hauntingSummary`, `epitaph`, `sortForGraveyard`.
    - _Requirements: 1.4, 4.3, 6.5, 6.6, 7.2–7.5_
  - [x]* 2.5 Unit tests with `node:test` for 2.1–2.4, covering boundaries: 31 Jan → 28/29 Feb, zombie at 29 vs 30 days, haunt at 0, 7, and 8 days, yearly ÷ 12 rounding.

- [x] 3. Implement validation in `js/schema.js`
  - [x] 3.1 `validateDraft` for the Add Subscription form, with the exact error messages.
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 2.7_
  - [x] 3.2 `validateSubscription` and `validateExportFile` with size, JSON, format, version, count, and per-entry checks; drop unknown properties.
    - _Requirements: 10.2, 10.3, 10.4, 10.7_
  - [x]* 3.3 Unit tests for valid and invalid drafts and import files.

- [x] 4. Implement persistence, store, and demo data
  - [x] 4.1 `js/storage.js`: versioned key, `load` states (`empty`, `ok`, `corrupt`, `unavailable`), backup on corrupt, `save` returning success.
    - _Requirements: 9.1–9.5_
  - [x] 4.2 `js/demo.js`: four fictional subscriptions with dates relative to Today, per the design table.
    - _Requirements: 11.2, 11.3_
  - [x] 4.3 `js/store.js`: state, `subscribe`, actions (`addSubscription`, `confirmStillUsing`, `bury`, `replaceAll`, `dismissBanner`), roll-forward on load and import, demo seeding when storage is empty.
    - _Requirements: 2.4, 5.1, 5.3, 6.3, 8.2, 8.3, 10.6, 11.1_
  - [x] 4.4 `js/app.js` bootstrap: create store, load, render a plain unstyled tombstone list to confirm the data path end to end.

- [x] 5. Build the graveyard scene and tombstones
  - [x] 5.1 `css/graveyard.css` and SVG assets: night sky, moon, layered fog drift, flickering candles, ground. All decorative layers `aria-hidden`.
    - _Requirements: 1.3, 12.4_
  - [x] 5.2 `js/render/dom.js` helper using text nodes only, and `js/render/tombstone.js` showing name, price, cycle, renewal date, category, confirmed label, `Still using it` and `Bury it` buttons, and a visually hidden state summary.
    - _Requirements: 1.2, 1.6, 6.1, 8.1, 8.5, 10.7, 12.5_
  - [x] 5.3 `js/render/graveyard.js`: sorted grid, single column under 640px, empty state with Add control.
    - _Requirements: 1.1, 1.4, 1.5, 1.7_

- [x] 6. Zombie and haunting states
  - [x] 6.1 Zombie styling: tilt, green glow, floating ghost, `Zombie — burning $X/month` badge; upright transition when cleared.
    - _Requirements: 3.2, 3.3, 3.4, 8.4_
  - [x] 6.2 Haunting styling: ghost above tombstone, renewal label; combined treatment when also a zombie.
    - _Requirements: 4.2, 4.5_
  - [x] 6.3 `js/render/banner.js`: count and amount due, dismiss button keyed to the haunting set, polite live region.
    - _Requirements: 4.3, 4.4, 4.6_
  - [x] 6.4 Wire `Still using it` to `confirmStillUsing`.
    - _Requirements: 8.2, 8.3_

- [x] 7. Add Subscription dialog
  - Native `<dialog>` form with all fields and defaults, inline errors, focus on first invalid field, close and reset on success, focus return to opener.
  - _Requirements: 2.1–2.9, 12.2, 12.6_

- [x] 8. Burial flow and RIP section
  - [x] 8.1 Generic confirm dialog; burial confirmation copy with `Bury it` and `Keep haunting`.
    - _Requirements: 6.2, 6.8, 12.6_
  - [x] 8.2 Sinking animation, then `store.bury(id)` on `animationend` or immediately under reduced motion.
    - _Requirements: 6.3, 6.4, 12.1_
  - [x] 8.3 `js/render/rip.js`: epitaphs, buried dates, total saved per year, empty message.
    - _Requirements: 6.5, 6.6, 6.7_

- [x] 9. Burn dashboard
  - `js/render/dashboard.js` with Monthly total, Yearly total, Dead money per month, Total saved per year; re-render on every store change.
  - _Requirements: 7.1–7.7_

- [x] 10. Export, import, and demo reset
  - [x] 10.1 `Export` button producing `subcrypt-YYYY-MM-DD.json`.
    - _Requirements: 10.1_
  - [x] 10.2 `Import` file input: size check, validation, replace confirmation, error notices.
    - _Requirements: 10.2–10.6_
  - [x] 10.3 `Reset demo` with confirmation.
    - _Requirements: 11.4_
  - [x] 10.4 Status/notice area for storage and import messages.
    - _Requirements: 9.3, 9.4_

- [x] 11. Accessibility and motion pass
  - Gate all animation behind `prefers-reduced-motion: no-preference`; verify visible focus on every control; check contrast of text tokens against their backgrounds.
  - _Requirements: 12.1–12.6_

- [x] 12. Deploy and verify
  - [ ] 12.1 Enable GitHub Pages on `main` root; confirm the app loads under `/subcrypt/` with no console errors or external requests.
    - Done: Pages enabled on `main` root; app verified under a local `/subcrypt/` prefix with no console errors, no 4xx responses, and no external requests.
    - Remaining: confirm the live URL after the pull request is merged to `main`.
    - _Requirements: 13.1, 13.2_
  - [ ] 12.2 Manual checklist in Chrome, Firefox, and Safari: every acceptance criterion, keyboard-only pass, reduced-motion pass, a scan of UI copy for real trademarks.
    - Done in Chromium (scripted, 79 checks): acceptance criteria for Requirements 1–11, keyboard focus rings, reduced motion, mobile layout, unavailable and corrupt storage. Trademark scan is clean.
    - Remaining: a manual pass in Firefox and Safari (not available in this environment).
    - _Requirements: 11.2, 12.1, 12.2, 13.3, 13.4_
  - [x] 12.3 Update `README.md` with the pitch, a screenshot, the live link, and a short "Built with Kiro" section pointing to `.kiro/specs/subcrypt/`.
    - _Requirements: 13.5_
