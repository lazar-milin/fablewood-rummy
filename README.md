# Fablewood Rummy

A magical-forest card game for online tables, hot-seat play, and practice against bots. Classic Rummy follows Serbian Remi 51 with configurable house rules. Rummikub and additional variants are not implemented yet.

## Moving cards

Moving cards is the default way to play. Run with `npm start`, or set `PORT` for a separate local playtest.

Clicking selects; selecting a second unit groups them. Groups can contain arbitrary cards. Drag any member to move the entire group; drop over another hand unit to merge, or in gaps to reorder. The left x splits a group. Purple groups are meldable and show their value; symbol outlines are ordinary groups. The unsorted hand preserves deal and manual order; the two sort buttons rearrange it only once.

Drop complete melds on the field to attempt opening. The engine reserves them provisionally until the table threshold is reached, then opens automatically. Return them to the hand or use Reset open attempt to cancel the attempt. A required opening from a discard/cut draw still applies. Incomplete attempts block discarding. After opening, drop groups on the field, additions on table melds, exact exchange cards on jokers, and discards on their pile. Click a table meld to reveal its button controls. The Discard label opens a right-side panel of all cards currently in the pile, newest first. Only the previous top stays visible beneath an incoming discard until it lands. Mouse hover previews and keyboard V remain available; touch hold on hand cards is reserved for movement.

## Run locally

Use Node.js 22.9 or newer. There are no runtime dependencies or build step.

```sh
npm start
```

Open http://127.0.0.1:3010. `npm start` reads settings from a `.env` file if there is one; copy [.env.example](.env.example) to start. The server listens only on this computer (`HOST=127.0.0.1`). Set `HOST=0.0.0.0` to let other devices on your network join, or when your hosting provider requires it. `PORT` defaults to 3010. For hosting, run it as a Node web service with `npm start`.

Each address may send 1,800 API requests a minute and create 20 tables a minute; more get `429 Too Many Requests`. Behind one reverse proxy, such as a hosting provider's, set `TRUST_PROXY=true` so these limits count each player's address instead of the proxy's. Card art and fonts are cached by the browser for a week, and text assets are sent gzip-compressed.

Tables, scores, and games live in server memory. Restarting or redeploying the server clears them, and a table is removed after 24 hours without activity. Run a single server instance: room state is not shared between processes.

## Start a table

Enter a name, or leave it blank for a forest-inspired name, and create a table. Choose online play, hot-seat play, or a practice game. Add human or bot seats in the player panels, up to six seats. Online players join using the eight-character table code or an open table on the landing page. Codes accept either case. If a player leaves a running game, a bot plays their seat for the rest of it, and if the host leaves, the next player becomes host. A table closes when its last player leaves.

The host chooses the rules through the grimoire, then returns to the lobby and starts the game. Timer and Undo preferences are in the header controls. Results appear on the scoreboard after the first completed round. Win conditions are optional and configured in the grimoire.

## Win conditions

With Win conditions off, the table keeps scores without victory popups or player cups. Choose None, Round victories, Stacking point scores, or a multi-round limit from the Win condition box.

- **Round victories:** each completed round shows its scores, and the last round winner holds the cup.
- **Stacking point scores:** each round shows the cumulative leaderboard, with the cup beside the lowest total.
- **Multi-round scoring (≥301 or ≥501):** rounds continue automatically after a shared five-second countdown. No cup is awarded until someone reaches the selected cumulative limit. The lowest total then wins; tied lowest totals share victory. The final screen includes every round’s points. Starting a new match clears those totals and the breakdown.

## Simple cards

The launch-screen Simple cards button is a personal preference saved in this browser. It replaces face artwork with the animal suit marker and one large rank; all jokers share a plain star and JOKER label. It applies to the hand, table, discard history, previews and card flights. A Simple cards label follows the game mode while enabled. Card Atelier stays available below the launch panel and always shows the full artwork.

## Duplicate starting cards

Dealing duplicates counts pairs of identical animal-and-rank cards; jokers are excluded. Both settings may be off. Enabling a hard dealing limit clears and disables optional redeal choices. A chosen **Do not deal more than** threshold of 3 or 4 rejects every starting deal where any player has that many pairs or more. A chosen **Choice to re-deal** threshold gives each qualifying human a Keep hand / Re-deal cards decision before play. Everyone else sees who is deciding; their cards and pair counts remain private. A redeal replaces the entire starting deal, keeps the same round and first player, and checks the settings again. Bots keep their deals. Turn timers begin after the last decision.

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
