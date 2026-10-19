# Fablewood Rummy

Run `npm start` and open http://127.0.0.1:3010. Node.js 22+; no dependencies to install. `npm test` checks game rules, packing, names, and room behavior.

Hover a card for four seconds to see a large centered view with a purple glow and its name in Alagard. On a touch screen, hold the card for half a second instead; with the keyboard, press V on a focused card. Move away, tap or click, scroll, press Escape or move focus to dismiss it.

On phones and tablets the table adapts: in portrait the header splits into a players row and a controls row and the piles sit side by side above the melds; in landscape the board scrolls on the left while your turn and hand stay on the right. Labels are at least 11 px on these screens. The landing page's **Card Atelier** button opens the included collection, with a **Back to the game** button on every collection page. Game and Atelier share the same local artwork.

The centered entrance uses the supplied night-forest background and an animated violet heading. Empty names and bots draw from a forest/magic word list. Host names have a red wizard hat; bot names have the existing pixel robot icon.

Create an online, hot-seat, or practice table. Add human seats or bots in the player row, up to six seats. Share the eight-character code; uppercase and lowercase input are accepted. Hot-seat names appear beneath the lobby controls. Results appear only after a completed round.

The grimoire replaces the lobby’s inner panel. Use Back beside “Speak the truenames” to return before starting; the server also rejects starting while the grimoire is open. Compact buttons turn green when selected. Options include base hands of 7–14, a 31/51 opening, low/high/both ace positions, and whether jokers may sit at run ends. Finishing from hand options control enablement, minimum-opening requirements, joker eligibility, winner bonus, opponent penalty doubling, and cut-card finishes. Defaults follow [the selected Serbian Remi reference](https://www.remi51.rs/uputstvo_sr); bonus alternatives are explicit house rules.

Click compatible cards to move a potential group left. A pair gets one tight outer symbol border. A completed meld stays highlighted while another loose card can extend it; clicking elsewhere packs it into an overlapping capsule. Its bottom strip selects the whole group; the bottom-right × returns its cards to the loose hand. Sorting by rank or animal affects only loose cards. Groups are remembered per player and round. Select groups reaching the opening threshold, then press Open on a legal turn. Nothing opens automatically. No opening is made during the first lap or before drawing. After opening, select capsules and use Lay selected meld. Keep one final discard.

The top code block shows Table CODE, the current turn, and Copy code. It expands with abbreviated game rules on hover or keyboard focus; timer and undo are represented by their separate indicators. Compact player panels sit between the title and controls, with the playing indicator below the active player. The scoreboard aligns names left and scores right, with a cup beside each tied lowest scorer.

The horizontal cut card sits under the stock with half of its short side covered, and the equally sized stock/discard cards sit above and below that stack. A dashed divider separates the piles from table melds. Newly formed groups remain selected and lift together, with a purple outline outside the patterned shell and a centered points/select footer. Hover a group to reveal its circular ungroup control, or hover an individual card for one second to reveal a red remove button. Removing a card preserves a valid remaining group; an incomplete compatible remainder returns to a highlighted draft.

The move strip stays 76 pixels high, with equal-height action buttons and the selected-card count on the right. Discard is orange, opening/laying is green, ungrouping is violet, and Undo retains its imported icon and purple styling. The host's Start game button is green.

Two decks and four jokers make 108 uniquely identified cards. Scores accumulate and first player rotates. Tables reset when the server restarts. Stock exhaustion reshuffles discards while retaining their top card. This stock convention is unchanged. The finished card kit from “Build Rummy Forest card mockup” supplies all ordinary cards, four distinct mystical jokers, and the grimoire back. Artwork uses its original 1:2 proportions and Alagard lettering, including H/B/Q/E.

The temporary deterministic browser-QA helpers are in the chat’s `work/` directory and are not part of the game server or delivered game source.

