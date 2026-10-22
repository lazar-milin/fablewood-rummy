# Fablewood Rummy

A magical-forest card game for online tables and local play with humans and bots. Classic Rummy follows Serbian Remi 51 with configurable house rules. Rummikub is available beside Classic Rummy in the lobby.

## Moving cards

Moving cards is the default way to play. Run with `npm start`, or set `PORT` for a separate local playtest.

Clicking selects; selecting a second unit groups them. Groups can contain arbitrary cards. Drag any member to move the entire group; drop over another hand unit to merge, or in gaps to reorder. The left x splits a group. Purple groups are meldable and show their value; symbol outlines are ordinary groups. The unsorted hand preserves deal and manual order; the two sort buttons rearrange it only once.

Drop loose cards or groups into the green field after drawing and after the first lap. Click field units to select and join them, drag onto groups to merge, or use gaps to reorder. Unfinished groups are visible to all players; only their owner can edit them. Complete groups lay automatically after opening; before opening, valid groups combine automatically at the configured threshold. Incomplete groups return to hand when you discard, and a legal discard then ends the turn. Invalid additions or joker exchanges return their source cards. Returned field cards carry a light-blue Returned badge until hovered, clicked or moved. The x on each card inside a hand or unfinished field group removes that card into its own hand unit; permanent melds do not get these controls.

After opening, drop additions on table melds, exact exchange cards on jokers, and discards on their pile. Click a table meld to reveal its button controls. The Discard label opens all cards currently in the pile, newest first. Mouse hover previews and keyboard V remain available; touch hold on hand cards is reserved for movement.

## Run locally

Use Node.js 22.9 or newer. There are no runtime dependencies or build step.

```sh
npm start
```

Open http://127.0.0.1:3010. `npm start` reads settings from a `.env` file if there is one; copy [.env.example](.env.example) to start. Locally, the server listens only on this computer (`127.0.0.1`). On Render (`RENDER=true`), it automatically listens on `0.0.0.0` and uses Render’s `PORT`. An explicit `HOST` overrides the default; use `HOST=0.0.0.0` for other hosting providers or to let devices on your network join. `PORT` defaults to 3010. For hosting, run it as a Node web service with `npm start`.

For Render, choose a **Web Service** using branch `main`, build command `npm install`, start command `npm start`, and health check path `/`. Let Render supply `PORT`; no `.env` file is required. Leave `HOST` unset or set it to `0.0.0.0` (remove any `127.0.0.1` override). Set `TRUST_PROXY=true` for Render’s reverse proxy. Keep one instance because tables are held in memory. Online-game continuation codes encrypt the saved hands and are valid across server restarts when `TABLE_RESUME_SECRET` is configured to the same private value; without it, codes are tied to the current server process.

Each address may send 1,800 API requests a minute and create 20 tables a minute; more get `429 Too Many Requests`. Behind one reverse proxy, such as a hosting provider's, set `TRUST_PROXY=true` so these limits count each player's address instead of the proxy's. Card art and fonts are cached by the browser for a week, and text assets are sent gzip-compressed.

Tables, scores, and games live in server memory. Restarting or redeploying the server clears them, and a table is removed after 24 hours without activity. Run a single server instance: room state is not shared between processes.

## Start a table

Enter a name, or leave it blank for a forest-inspired name, and create a table. Choose Online play for separate devices, or Local for humans and bots sharing this screen. Use the Player / Bot buttons in each seat to choose opponents. With several humans, a pass-screen cover hides the next hand until that player reveals it; with one human, bot turns keep your hand visible. Add human or bot seats in the player panels, up to six seats. Online players join using the eight-character table code or an open table on the landing page. Codes accept either case. If a player leaves a running game, a bot plays their seat for the rest of it, and if the host leaves, the next player becomes host. A table closes when its last player leaves.

The host chooses the rules through the grimoire, then returns to the lobby and starts the game. Timer and Undo preferences are in the header controls. Undo can be configured only in the lobby. The host may change the timer during play; a changed duration restarts the current turn’s countdown. Results appear on the scoreboard after the first completed round. Win conditions are optional and configured in the grimoire.

## Win conditions

With Win conditions off, the table keeps scores without victory popups or player cups. Choose None, Round victories, Stacking point scores, or a multi-round limit from the Win condition box.

- **Round victories:** each completed round shows its scores, and the last round winner holds the cup.
- **Stacking point scores:** each round shows the cumulative leaderboard, with the cup beside the lowest total.
- **Multi-round scoring (≥101, ≥151, ≥301, or ≥501):** rounds continue automatically after a shared five-second countdown. No cup is awarded until someone reaches the selected cumulative limit. The lowest total then wins; tied lowest totals share victory. The final screen includes every round’s points. Starting a new match clears those totals and the breakdown.

## Simple cards

The always-expanded, text-only launch-screen Simple cards button is a personal preference saved in this browser. It replaces face artwork with the animal suit marker and one large rank; jokers have JOKER written vertically without a marker. Simple cards retain the original suit borders; simplified backs retain the original gold border and glyph background with a small crescent moon. It applies to the hand, table, discard history, previews and card flights. A Simple cards label follows the game mode while enabled. Card Atelier stays available below the launch panel and always shows the full artwork.

## Duplicate starting cards

Dealing duplicates counts pairs of identical animal-and-rank cards; jokers are excluded. **Do not deal more than** defaults to 3, while **Choice to re-deal** defaults off. The two settings are mutually exclusive: choosing a threshold in one row clears any selection in the other, and all four buttons remain available. A chosen **Do not deal more than** threshold of 3 or 4 rejects every starting deal where any player has that many pairs or more. A chosen **Choice to re-deal** threshold gives each qualifying human a Keep hand / Re-deal cards decision before play. Everyone else sees who is deciding; their cards and pair counts remain private. A redeal replaces the entire starting deal, keeps the same round and first player, and checks the settings again. Bots keep their deals. Turn timers begin after the last decision.

## Rules as implemented

- The deck has two copies of four animal suits and four jokers: 108 cards. Foxes, hares, toads, and owls replace the traditional suits. Displayed ranks are A, 2–9, H (10), B (11), Q (12), and E (13).
- Players normally receive 14 cards. The first player receives one extra and starts by discarding. Opening is unavailable during the first lap.
- After the first turn, draw from the stock or the top discard, play legal groups if permitted, and discard to end the turn. Always keep a final discard.
- Sets contain at least three equal ranks in distinct animal suits. Runs contain at least three consecutive ranks in one animal suit. Aces may be low, high, or both according to the table preference; a run cannot wrap from high to low.
- Your first opening combines new groups worth at least 51 points by default. Drop complete groups onto the field. They remain provisional until their total reaches the requirement, then the opening commits automatically. Reset or return the provisional melds to the hand to abandon the attempt. After opening, you may lay more groups, extend table melds, and replace a joker with the card it represents.
- A closed player taking the discard after the first lap must open that turn. The cut card is available only for an eligible finish from hand. A forced opening or cut-card draw can be cancelled before completing its requirement.
- A reclaimed joker must go into a fresh meld before the turn ends, or be buried with an ordinary card under the implemented burying rule. Each opening group may contain at most one joker; new melds after opening may contain multiple jokers. A set joker represents any missing animal of its rank, so either missing animal may extend the set or replace it. When a run has multiple legal joker positions, choose one before laying it; run positions then remain fixed.
- Finishing from hand means opening and playing your own groups in one turn without laying off onto existing melds, then making the final discard. Host preferences determine eligibility, bonuses, and penalties.
- Stock exhaustion reshuffles the discard pile while retaining its top card.

The default rules are based on [Serbian Remi 51](https://www.remi51.rs/uputstvo_sr). The choices below include explicit house rules.

## Host preferences

| Preference | Choices | Default |
| --- | --- | --- |
| Starting hand | 7–14 cards; first player gets one extra | 14 |
| Opening threshold | 31 or 51 | 51 |
| Aces in runs | Low, high, or both | Both |
| Jokers at run ends | Allowed or forbidden | Allowed |
| Finishing from hand | Enabled or disabled | Enabled |
| Opening threshold for a hand finish | Required or waived | Required |
| Jokers in a hand finish | Allowed or forbidden | Allowed |
| Hand-finish winner bonus | −80 or −100 | −80 |
| Double opponents' penalties for a hand finish | On or off | On |
| Cut-card finish | Enabled or disabled | Enabled |
| Cut-card winner bonus | −120 or −140 | −120 |
| Turn timer | Off, 30, 60, or 120 seconds | Off |
| Undo | Enabled or disabled | Enabled |

An ordinary winner scores −40. Other opened players score the value of their remaining cards; closed players score 100. Aces are worth 10, numbered cards their rank capped at 10, and jokers 20. Eligible hand finishes apply the configured winner bonus and opponent multiplier. Scores accumulate across rounds and the first player rotates.

Undo is limited to your current turn. It cannot undo a stock draw to reveal a hidden card or take back a completed discard. The timer completes an expired turn automatically.

## Hand controls and card inspection

Click compatible cards to draft a group. A completed group stays editable while another card in hand can extend it; choosing something else packs it into one capsule. Select a capsule using its footer. Its close button ungroups it, and an individual card's remove control takes that card out. Sorting affects loose cards only.

Hover a card for four seconds to inspect a large version. On touch screens, hold it for half a second; with a keyboard, press **V** on a focused card. Move away, click or tap, scroll, move focus, or press Escape to dismiss the preview.

The landing page's **Card Atelier** opens the complete deck and artwork collection. Every Atelier page has a **Back to the game** link.

## Development

```sh
npm test
```

Tests cover the engine, rules, bots, hand packing, room privacy, undo, static serving, and artwork links. Server tests start temporary localhost services on ports 3011, 3013, 3015, 3017, 3019, and 3021. The same suite runs in GitHub Actions. See [CLAUDE.md](CLAUDE.md) for architecture and contribution conventions.

## Artwork and licence

The card illustrations and decorative sprites were generated with OpenAI's image-generation tools, then converted from pixel artwork into vector SVGs with `tools/px2svg.py`. The forest background was supplied for this project and converted to SVG as well. [ASSETS.md](ASSETS.md) records provenance and credits.

The project is distributed under [GPL-3.0-only](LICENSE). Third-party fonts retain their authors' terms: Alagard by Hewett Tsoi (Pix3M), and VCR OSD Mono by Riciery Leal (MrManet). Their notices are included in [public/fonts/](public/fonts/).

Table updates use one held HTTP request per client, waiting up to 25 seconds for a change. Unchanged tables return 204. Authenticated changes require the displayed `revision`; stale or missing revisions return 409 and the latest private table view. Creating or joining a table is an admission request and does not require a prior private revision. The entrance table list refreshes every 15 seconds only while visible.

## Rummikub local playtest

Run `./start-rummikub.ps1` on Windows, or set `PORT=3044` and run `npm start`. Open http://127.0.0.1:3044, create a table, and choose **Rummikub** under **Choose game variant**. Local play supports human and bot seats; online play uses the same private-rack API. Two to six players are supported.

With 2–4 players the pool contains 106 tiles (two copies of 1–13 for each forest animal, plus two jokers). With 5–6 players it automatically uses 160 tiles (three copies of each number and animal, plus four jokers). It uses 14 tiles per rack, a 30-point rack-only opening, and no discards. Numbers are always low; 13 cannot wrap to 1. Drawing resets the workspace and ends the turn. Use **Play turn** to commit a valid table with at least one newly played rack tile. Your rack can empty without a final discard. Table manipulation unlocks on your next turn after opening.

Click rack tiles to group, then drag them to the field. Click field groups to combine them, or drag over groups to join them. The group X splits a group into loose tiles; a card X detaches one table tile into the workspace, or returns a staged rack tile. Shared table tiles can never enter a rack. Every run/set must be legal before the turn commits, including reused jokers. **Reset turn** restores the committed table. Bots play legal openings and additions, but do not search complex shared-table rearrangements.

Scoring follows this app’s lower-is-better scoreboard: rack tiles score their number, jokers 30, and the winner receives the negative sum of the other penalties. This reverses the sign of the official scoring convention. Timers are optional; timeout restores an unfinished workspace and draws up to three penalty tiles. With an empty pool, a complete lap of passes ends the game, with the lowest rack winning. Tied lowest racks use seat order in this first build.

Rules reference: [manufacturer’s 2025 Classic rules](https://rummikub.com/wp-content/uploads/2025/06/4600-0236-0013-EN-_rummikub-Classic.pdf). This is a local experimental adaptation using Fablewood artwork, not an official Rummikub product.

Rummikub always uses the shared Simple-card design with numeric 1–13 ranks, plain vertical JOKER lettering, and the crescent back. The personal Simple-cards toggle continues to control Classic Rummy only. Simple suit markers keep their original sizes and share the hare’s original bottom baseline.

Drag an individual card’s X outside its stack to move only that card with the normal drop targets; a click still ungroups it. In Rummikub, shared tiles remain on the field. Group controls wait for arrival/packing animations to finish. Field origin labels sit left of the centered status badge.

Rummikub’s grimoire offers 7–14 starting kubs and an opening of 30 or 31; dealing, human turns and bots all respect these settings. Both variant panels include a matching rules-summary box. Variant text glows only while selected: yellow for Classic and red for Rummikub.

The in-game How to play button displays the same short, settings-aware rules summary as the selected variant’s grimoire panel. It is hidden on the launch screen and in the lobby.

Classic defaults to four jokers. The grimoire’s **Jokers in deck:** setting also offers eight, adding a second copy of each mythical creature (112 cards total).

Classic Rummy has a host setting for Ace values in a low series: Aces score 10 points by default, or 1 point in a sequence such as A–2–3. This affects meld and opening totals; Aces in sets and leftover hands continue to score 10.

Classic Rummy first-lap discard rule: by default a player may take the top discard but cannot open until the first lap is over. The host can instead disable discard pickups during that lap.
