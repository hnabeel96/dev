# Project handoff log

## 2026-09-03

1. Inspected the site: a static browser-game landing page using `index.html`, `styles.css`, and `script.js`.
2. Replaced the long brand **ButtonBloom Arcade** with **Zunlo** in the browser title, header, about copy, footer, and meta description.
3. Checked candidate names with web search. **Zunlo Arcade** returned no exact web result. This is a preliminary availability check only; it does not confirm domain or trademark availability.
4. Verified that `index.html` contains Zunlo in every branding location and no longer contains ButtonBloom.
5. Reframed the site as a personal games portfolio: removed the game-submission section and related navigation, and updated the hero, about copy, title, and description to say the games were designed and built by the owner.
6. Verified that no game-sharing or submission language remains in `index.html`.
7. Removed public-facing uses of “portfolio,” replacing them with direct language about original games designed and built by the owner.
8. Verified that “portfolio” is absent from the public website files; it remains only in this historical handoff log.
9. Simplified the About section to its heading only: “Made for a five-minute break.”
10. Verified that the About section contains no additional text or label.
11. Added a playable browser game, Edge Rush, at `edge-rush.html`; linked it as the first card on the home page. It uses clickable border sections, randomized rebounds, a reaction deadline, increasing speed, score tracking, and local best-score persistence.
12. Verified the Edge Rush home-page link and required game handlers statically. Automated in-browser testing could not open the local `file://` game page because of the browser URL policy; Node.js was also unavailable for shell syntax checking. Manual verification in the already-open local site is still recommended.
13. Made Edge Rush more forgiving: increased the edge-click window from 850ms to 1150ms and softened speed growth (6% per catch, lower continuous acceleration, 680 speed cap). Added a synthesized triangle-wave twang for each successful bounce; no audio asset is required.
14. Verified the longer reaction window, gentler speed values, and successful-bounce twang call in `edge-rush.js`.
15. Changed Edge Rush so the ball stops at the inner face of the edge tile (rather than the outer arena edge), then rebounds after a correct tile click. Tiles now start at 48px deep and shrink by 1.5px per score, to a minimum 18px.
16. Verified that the edge sizing CSS uses the dynamic tile-depth variable and that collision, resize, and scoring logic all use the current tile depth.
17. Restyled Edge Rush with a cyberpunk neon palette, grid arena, glowing effects, Orbitron display type, and futuristic tile motifs. Removed the visible numbers from edge tiles while retaining accessible labels; score and best-score numbers remain as game feedback.
18. Verified that the cyberpunk stylesheet is present and that edge-tile buttons no longer receive visible number text.
19. GitHub publishing was requested. This folder currently has no `.git` repository, and neither Git nor the GitHub CLI is available on this computer, so it has not yet been committed or pushed.
20. Git for Windows was installed at `C:\Program Files\Git\cmd\git.exe`. Initialized this folder as a new local Git repository on the `main` branch. Git author name and email are not configured yet, and no GitHub remote has been created.
21. User provided `https://github.com/hnabeel96/dev`. GitHub authentication is required to access this remote, and a Git commit author name/email is still needed before the initial commit can be made.
22. User supplied commit identity `hnabeel96 <nabeel96nn@gmail.com>` and completed GitHub sign-in. Publication is currently blocked because the active Codex shell user cannot write `.git/config.lock` in this repository; Git reports `Permission denied` when setting repository config. Run the Git commands in a user-owned Git Bash session or grant the Codex shell user write access to `.git`, then resume from this log.
23. Publishing was completed manually in Git Bash. Repository: `https://github.com/hnabeel96/dev.git`; local branch: `main`; remote: `origin/main`. The local site commit `3e260a8` (`Build Zunlo and Edge Rush`) was merged with the remote initial commit and pushed as `3e05b4a`.

24. Updated website branding from Zunlo to pineapp.win across `index.html` and `edge-rush.html`. Updated website description, hero copy, navigation, and section labels to shift away from first-person ('I', 'my') and focus on customer/player experience.

## 2026-09-05

25. Added Google Analytics tracking tag (gtag.js `G-WJCZS9H72H`) across the website in `<head>` of both `index.html` and `edge-rush.html`.

## 2026-09-06

26. Redesigned landing page hero layout and cleaned bottom game catalog:
    - Replaced the static hero illustration (`.hero-art`) in the top right of `index.html` with an interactive, responsive scrollable game selector. It features horizontal snap scrolling, smooth-scroll arrow navigation, position indicators, live status pills, and direct game launch buttons.
    - Removed unmade placeholder games (`Bubble Pop`, `Garden Quest`) from the bottom `#games` catalog in `script.js`; now only playable games (`Edge Rush`) are rendered and searchable at the bottom.
    - Added styled custom scrollbar, card glow hover effects, and responsive breakpoints for mobile in `styles.css`.
27. Transformed website theme to a dark aesthetic and simplified game selector cards:
    - Applied a dark theme with background `#0b0f0d`, dark card surfaces, and high-contrast popping light typography (`#f5f9f6`, `#b0c2b7`) with electric neon lime (`#d9f36a`) accents, buttons, and glow effects.
    - Removed all extra text from the scrollable game selector cards (no tags, pills, descriptions, or button text) leaving only the game name.
    - Enlarged game names inside the selector to bold typography (`clamp(2.2rem, 4.5vw, 3rem)`) that highlights with neon glow on hover.
28. Maximized glowing arcade selector and removed featured games section:
    - Removed the bottom featured games section (`#games`) from `index.html`.
    - Removed Starlight, Bubble Pop, and Garden Quest from the arcade selector, leaving only Edge Rush.
    - Maximized the arcade section layout to become the dominant hero centerpiece (`min-height: 540px`, responsive wide layout).
    - Added radiant multi-layered neon lime edge glow around the entire perimeter of the arcade selector.
    - Enlarged the game name to display scale (`clamp(3rem, 6.5vw, 4.8rem)`) and added 3D perspective tilt in `script.js`.
29. Added cache-busting version query string (`?v=2`) to `styles.css` and `script.js` in `index.html` to bypass Cloudflare and browser disk cache.
30. Built and integrated new arcade game 'Chrono Pendulum' (`pendulum.html`, `pendulum.css`, `pendulum.js`) on branch `feature/pendulum`:
    - Metallic pendulum physics: realistic harmonic motion starting slow with a multi-stop 3D polished chrome bob, specular reflections, metallic gradient rod, and mechanical top bearing pivot.
    - Random target circle placed along the pendulum's swing trajectory arc with rotating futuristic reticle brackets.
    - Hit detection & dynamic scoring:
      - Completely inside: 10 points with special effects (golden + cyan shockwaves, 45-particle spark burst, screen shake, golden perimeter flash, floating '+10 PERFECT!' text, and resonant procedural Web Audio crystal chime chord).
      - Partially inside: 1 point with clean metallic ping chime, sparks, and '+1 GOOD' popup.
      - Miss: deducts 1 shield (out of 3) with red warning flash, shake, and thud sound.
    - Acceleration: each accurate tap increases pendulum swing velocity.
    - Google Analytics (`G-WJCZS9H72H`) integrated in `<head>`.
    - Linked in `index.html` header navigation and hero call-to-action buttons.
31. Made arcade section scrollable with Chrono Pendulum as default:
    - Added interactive carousel track to the glowing arcade selector featuring Chrono Pendulum (default at index 0 with animated swinging chrome pendulum preview) and Edge Rush.
    - Added popping neon lime scroll buttons (`#arcade-prev`, `#arcade-next`) with high-intensity outer glows, scale animations, and dynamic boundary disabling.
    - Removed CTA buttons below "Small games. Big fun." in the hero section to focus visual attention on the glowing arcade console.
    - Incremented cache-busting version tags to `?v=3` in `index.html`.
32. Removed the dotted target circle preview (`.pendulum-target-ring`) from the swinging pendulum preview in the home screen arcade selector, keeping a clean swinging metallic pendulum, and bumped asset cache-busting version tags to `?v=4` in `index.html`.
33. Relocated Play Now button, halved pendulum acceleration, and optimized for mobile and web:
    - Removed 'Play now' button from top header navigation in `index.html`.
    - Added glowing 'Play now →' button below the arcade screen in the arcade footer (`.arcade-play-btn`) for both Chrono Pendulum and Edge Rush cards.
    - Halved pendulum speed increases in `pendulum.js`: perfect hit increment reduced from +0.085 to +0.0425, and good hit increment from +0.045 to +0.0225.
    - Mobile and web optimizations:
      - Capped devicePixelRatio to 2 to preserve mobile GPU resources and maintain high FPS on OLED/Retina displays.
      - Implemented dynamic proportional scaling for bobRadius and targetRadius on narrow viewports.
      - Switched canvas height to CSS clamp (`clamp(320px, 52vh, 420px)` on mobile) to keep game and HUD fully on-screen without vertical scrolling.
      - Prevented touch default behaviors on canvas container (`touch-action: none;`) to eliminate tap delays and accidental viewport zoom.
      - Added desktop keyboard navigation (ArrowLeft / ArrowRight) on arcade carousel track and Enter/Space support for pendulum.
      - Guarded 3D tilt with `matchMedia('(hover: hover) and (pointer: fine)')` to prevent mobile touch devices from freezing tilted cards.
      - Improved mobile navigation styling in header under 700px.
      - Bumped cache-busting query strings (`styles.css?v=5`, `script.js?v=5`, `pendulum.css?v=2`, `pendulum.js?v=2`).
34. Fixed mobile screen cutoff in Chrono Pendulum, updated back navigation text, and simplified top header nav:
    - In `pendulum.html`: Replaced '← Back to Arcade' with '← Back to games' to unify back link text across all games.
    - In `index.html`: Removed Chrono Pendulum and Edge Rush links from top header navigation, leaving only the 'About' link.
    - Fixed mobile screen cutoff in Chrono Pendulum:
      - Constrained pendulum swing length dynamically by arena width in `pendulum.js` (`safeHorizontalForBob` & `safeHorizontalForTarget`) so the bob and target circle never swing outside the horizontal canvas boundaries on narrow phone screens.
      - Bounded target circle spawn angles within safe visible arc coordinates to guarantee the target circle is 100% on-screen.
      - Restructured `.game-overlay` with `overflow-y: auto; -webkit-overflow-scrolling: touch;` and `.overlay-modal` with `margin: auto;` so modals are never cropped inside `.canvas-container`.
      - Added compact 4-column HUD grid and responsive modal sizing for mobile (< 600px/480px) to keep the entire game fitting within mobile viewport height.
      - Bumped cache-busting query strings (`styles.css?v=6`, `script.js?v=6`, `pendulum.css?v=3`, `pendulum.js?v=3`).
35. Added Google AdSense script (`ca-pub-6483520770446711`) into `<section class="ad-slot">` on homepage `index.html` on branch `feature/add-adsense`, verified via automated test script and local HTTP server.
36. Optimized Edge Rush mobile edge-brick geometry:
    - Changed mobile arenas to a square responsive layout constrained by viewport height.
    - Uses four equal-count segments on each side of the mobile arena instead of the desktop 6-by-4 layout.
    - Inset top and bottom rails to match the side-rail span, so every mobile brick has equal length and depth.
    - Updated hit detection to calculate the same inset playable span used by the visual rails.
    - Added cache-busting query strings for the Edge Rush CSS and JavaScript assets.
    - Verified the mobile and desktop renders with Chromium screenshots and passed `node --check edge-rush.js`.

37. Created branch `feature/addcontact` from `main` and implemented separate About and Privacy Policy pages:
    - Dedicated `about.html` containing exclusively "ABOUT PINEAPP.WIN", "Who Runs This Site", the creator story, and a Contact card featuring `pineappwin@gmail.com`.
    - Dedicated `privacy.html` containing the Privacy Policy (Google Analytics tracking and advertising/cookies disclosures).
    - Top navigation on `index.html`, `about.html`, and `privacy.html` includes distinct `About` and `Privacy Policy` tabs.
    - Simplified bottom footer across pages to keep only Contact and the email (`pineappwin@gmail.com`).
    - Added responsive styles in `styles.css?v=7` with centered footer and mobile breakpoints.
38. Updated Chrono Pendulum game page HUD title from 'PENDULUM' to 'CHRONO PENDULUM' (`pendulum.html`, `pendulum.css?v=4`), with responsive typography clamp for mobile screens.

## Resume checklist

1. Work from `C:\Users\Nabeel\Desktop\dev\website`.
2. The live source is tracked on GitHub at `hnabeel96/dev`, branch `main`.
3. Edge Rush is launched from `edge-rush.html`, `edge-rush.css`, and `edge-rush.js`.
4. Chrono Pendulum is launched from `pendulum.html`, `pendulum.css`, and `pendulum.js`.
5. Before handing off after later changes, append a numbered entry to this file, then commit and push it with the website changes.

## Current state

- Branding is pineapp.win.
- Website description and copy updated to focus on customer/player experience.
- Google Analytics (`G-WJCZS9H72H`) is integrated on all site pages (`index.html`, `edge-rush.html`, `pendulum.html`, `about.html`).
- Working on branch `feature/addcontact`.
- Update this file after each material work step so another agent can resume from the current state.
