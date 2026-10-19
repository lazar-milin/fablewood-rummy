# Fablewood Rummy contributor guide

## Commands and structure

Use Node.js 22.9 or newer. There are no runtime packages or build step.

- `npm start` loads `.env` if present and runs `server.mjs`, serving `public/` and the room API on `HOST` (default 127.0.0.1) and `PORT` (default 3010). `.env.example` lists the settings.
- `npm test` runs `node --test tests/*.test.mjs`. The HTTP tests use temporary ports 3011, 3013, 3015, 3017, 3019, and 3021; these must be free and localhost sockets must be allowed.
- GitHub Actions runs the same suite on pushes and pull requests.

Keep changes focused. Run the relevant tests, and run the complete suite before publishing a change. Check responsive UI work in a browser at phone and desktop widths. Do not restart an existing local server unnecessarily: room state lives in memory.

## Engine

`public/engine.js` is the shared, DOM-independent rules engine. `createGame()` deals a new state. `play()` validates an action and returns a cloned next state. `resolveMeld()`, opening search, and bot planning share the table's rules. `DEFAULT_RULES` supplies the Serbian Remi 51 defaults; README.md documents the selectable house rules.

Preserve unique card IDs and conservation of all 108 cards across hands, stock, discard, cut card, and melds. Animal suits are fox, hare, toad, and owl. Ranks remain numeric internally; H/B/Q/E are display labels only. Do not implement rule changes solely in the UI: validate them in the engine or server and cover rule edge cases in tests.

The first player begins with one extra card and discards without a draw. Opening is forbidden during the first lap. Later turns draw, optionally play melds, then discard. A final discard is required, including a finish from hand. Respect forced-opening draws, cut-card finishes, assigned joker values, reclaimed-joker obligations, and host preferences. Bots and timed-out turns use validated engine actions; `botMove()` falls back to a legal discard when a plan is rejected.

## Server and private state

`server.mjs` uses Node's HTTP server and a process-local `Map` of rooms. Room codes have eight hexadecimal characters. A bearer token identifies a seated human. Host-only changes and mode/phase restrictions are validated server-side. The room's `host` field holds the host's seat index. In the lobby the host always sits in seat 0, which hot-seat and practice logic rely on. In a running game a bot takes over a leaving player's seat, and a leaving host passes the host controls to the next player. A table is deleted only when its last player leaves. Player names come from `public/names.js` when omitted. Deals, reshuffles, and generated names use the server's `crypto.randomInt()`-based `random`; pass it to `createGame()`, `play()`, and `forestName()`.

Throw `PlayerError` (from `public/engine.js`) for messages meant for players; they answer 400. Any other error is a server fault: it is logged and answers 500 with a generic message, so never rely on a plain `Error` reaching the player. `limits.mjs` holds the per-address rate limits (1,800 API requests and 20 new tables a minute) and the 24-hour expiry of untouched tables; every room request updates `touched`. With `TRUST_PROXY=true` the limits count the address a single reverse proxy appends to `X-Forwarded-For`; otherwise that header is ignored, so clients cannot choose their own address.

All room responses go through `view()`. Never return the raw room or raw game state. In online/practice play, other players' hand entries are replaced with `{hidden:true}`. Stock entries are always hidden. Hot-seat mode intentionally reveals human hands to the shared device, and the client provides the pass-screen flow. Seat tokens must not be exposed in public player lists or table listings. Keep the privacy and static-path traversal tests passing.

Only `public/` is served. The static handler resolves file paths inside that directory and rejects paths outside it. It sends types from its map (unknown types as `application/octet-stream`), `nosniff`, and weak ETags; art and fonts are cached for a week, and other files are revalidated on every load. Keep production notes, prompts, licences for the project, and contributor documents outside `public/`; font notices stay beside the publicly distributed fonts.

## Undo, turn boundaries, and scores

Undo is constrained to the current turn and cannot reveal the stock: a stock draw is not undoable, and a completed discard cannot be taken back after another player sees it. Actions after a visible discard draw may be undone if the host enabled Undo. Preserve server history and turn-backup handling rather than adding client-only rollback. Forced-opening/cut draws have a separate Cancel draw path.

`scoreRound()` records each completed round once. Totals accumulate and the first player rotates. The scoreboard is hidden until a round has completed. A timer completes an expired turn through legal automatic actions and clears obsolete undo history.

## Client and responsive layout

`public/app.js` renders the landing page, lobby, header, play surface, and preferences. It polls the same-origin HTTP API. State-changing actions are serialized through `run()`; `accept()` updates the room and renders. `public/packing.js` handles local hand grouping without changing game ownership or rule validity. Sorting affects loose cards only, and opening always requires the explicit Open action.

`public/index.html` loads the CSS layers in order: base, remi, fablewood, refinements, table layout, card art, card preview, then responsive overrides. Header controls retain 47px square collapsed buttons, expand labels on hover, and slide as one row. `fitHeader()` measures collapsed control widths so hovering does not change header layout. Player tiles move below when needed and center in that row. Their status text and reserved badge space must match between active and inactive players.

Turn descriptions wrap. When text and actions no longer fit together, natural-width action buttons form centered rows. Editable inputs remain selectable; game surfaces and artwork are otherwise not draggable/selectable. Preserve the Alagard title font and Woodland/VCR interface font. `public/card-preview.js` supports hover, touch hold, and keyboard inspection.

## Artwork pipeline

`public/card-art.js` and `public/card-art.css` compose the cards from vector sprites in `public/art/card-kit/assets/`. Both the game and `public/atelier/` use those same assets and the single font copies in `public/fonts/`. Do not duplicate fonts or artwork to add a new consumer.

Art prompts and historical records belong in `docs/art/`, never in the served directory. `ASSETS.md` records current provenance and third-party font terms. `tools/px2svg.py` converts pixel artwork to real vector paths; its optional Python dependencies are Pillow and NumPy. Inspect the result in Card Atelier, preserve viewBox crops and proportions, and validate every local HTML/CSS asset reference before replacing files. Obsolete preview pages and unused sprites should be removed instead of kept publicly without navigation.

The project uses GPL-3.0-only. Third-party fonts retain the separate author permissions in `public/fonts/LICENSE-*.txt`; preserve attribution when changing the asset pipeline.

## GitHub issues

Use the repository's existing labels: `bug` for incorrect behavior, `enhancement` for new behavior, `documentation` for contributor/player documents, and `accessibility` for accessibility barriers. The repository also has standard triage labels such as `question`, `duplicate`, `help wanted`, and `good first issue`; do not assume area labels exist. Reference the issue numbers addressed by a commit or pull request and describe the final behavior plus validation. Only close an issue once its requested work is complete.
