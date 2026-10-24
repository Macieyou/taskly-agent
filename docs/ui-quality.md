# UI validation, 24 October 2026

Checked the production Docker build through nginx at localhost:8080, with real PostgreSQL data, in Chromium 156 on Windows. UI styling uses styled-components and shared theme tokens, plus global CSS for layout.

- At 390 × 844 and 320 × 720, the task list has no horizontal overflow. At 1440 × 900, filters and cards retain their desktop layout.
- Opening New task focuses its title input. Submitting an empty form marks the title invalid, displays its error, and focuses it. Escape dismisses the native dialog and restores focus to New task.
- axe-core 4.14.0, WCAG 2 A/AA and 2.1 AA tags: list 24 passing checks, invalid form 15 passing checks; both have zero violations and zero incomplete checks after the contrast fix. The original Completed badge failed at 3.48:1; the success text token was darkened and the audit repeated.
- A warm-cache, unthrottled localhost navigation measured DOMContentLoaded at 162 ms, load at 190 ms and first contentful paint at 208 ms. This is a single development-machine observation, not a Lighthouse score, mobile-network benchmark or field Core Web Vitals claim. The production JavaScript bundle is 333.20 kB / 103.35 kB gzip. Fonts are loaded from Google Fonts with swap and local fallbacks.
- Production container smoke verification covers HTML, health, and create/read/update/delete plus invalid input through nginx and PostgreSQL. The same smoke script runs in CI.

Evidence: [raw audit and timings](evidence/ui-audit.json), [desktop](evidence/ui-desktop.png), [mobile validation](evidence/ui-mobile-validation.png). Automated checks do not establish full WCAG conformance; screen-reader testing, additional browsers, larger datasets and throttled performance profiling remain production follow-ups.
