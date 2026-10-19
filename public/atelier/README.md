# Rummyforest · Card kit, edition 02

Open **index.html** in a browser. Everything runs locally and works without installation or internet. The rejected first edition is kept in a separate folder.

## What is included

- **52 individually labelled HTML cards**, in `cards/`.
- **16 distinct transparent animal illustrations**, in `/art/card-kit/assets/illustrations/`.
- **4 head-only animal suit markers**, in `/art/card-kit/assets/heads/`. These PNGs can also be used directly as favicons.
- **4 transparent PNG counting symbols**, in `/art/card-kit/assets/pips/`: berries, stars, clovers, mushrooms, generated directly from the supplied pixel-art examples.
- **8 generated pixel ornaments**: four side strips and four rank flourishes. `/art/card-kit/assets/motifs/` contains the self-contained SVG layout pieces (complete strip, upper half, lower half, flourish); original transparent PNGs are in `/art/card-kit/assets/motifs/source/`.
- **4 blank capsule frames**, in `/art/card-kit/assets/frames/`.
- The supplied **Alagard font**, copied unchanged to `/art/card-kit/assets/fonts/alagard.ttf`.
- `palettes.json`, `evolutions.json`, `deck.json`, `deck.csv`, and `asset-manifest.json` document the exact mapping.
- `PROMPTS.json` records the image-generation prompts.

The gallery has four views: complete deck, evolution comparisons, downloadable components, and exact palette swatches. Click any card for a larger inspection and links to its parts. Filter by suit, or filter the deck to number/picture cards.

## Rank mapping

| Display | Standard rank | Artwork |
| --- | --- | --- |
| A | Ace | Baby animal |
| 2–9 | 2–9 | Exactly that many counting symbols |
| H | 10 / Hero | Exactly ten counting symbols |
| B | Jack | Mature animal |
| Q | Queen | Rare or magical animal |
| E | King | Mythic guardian |

The Queen is displayed as uppercase **Q** throughout the gallery, standalone cards, filenames and manifests. Example: `fox-Q.html` uses `fox-Q.svg`.

## The four evolution chains

| Suit | A | B | Q | E | 2–H symbol |
| --- | --- | --- | --- | --- | --- |
| Fox | Fox kit | Red Fox | Silver Fox | Kitsune | Berries |
| Owl | Owlet | Wood Owl | Great Owl | Moon Owl | Stars |
| Hare | Leveret | Brown Hare | Snow Hare | Moon Hare | Clovers |
| Toad | Toadlet | Forest Toad | Moss Toad | Elder Toad | Mushrooms |

Fox progresses from natural red adult to a refined silver form, then a three-tailed spirit. The blue-indigo owl becomes more imposing and finally celestial. The taupe hare becomes a pale Snow Hare and then a hornless lunar guardian. The olive toad gains moss and mushrooms, then a fungus crown, luminous marking and a small potion vial.

The Brown Hare's green mantle follows the supplied card reference. The final standardized palettes take precedence over the earlier brown owl / brown toad colour suggestions. Snow and silver stages use pale suit tones while keeping related shadows and accents.

## Palettes: original supplied hex values

Animal colours are ordered outline → shadow → body → light body → pale fur/belly → highlight.

| Suit | Animal palette | Card | Counting-symbol accent |
| --- | --- | --- | --- |
| Fox | #2E1A14 · #6A2E1E · #D9672B · #F08B3E · #F6DFC0 · #FFF1DD | #F3DFC0 | #B6383A |
| Owl | #20243D · #464F71 · #7D88B3 · #B3BCDF · #ECEAF3 · #FFF9E9 | #CAD4E6 | #C99832 |
| Hare | #29231C · #5B5242 · #9C8A6E · #CDB99A · #F3E8D8 · #FFF8EF | #DBE1BA | #527A3A |
| Toad | #222D26 · #4C6144 · #7B9567 · #ADC493 · #E8EDCF · #FFF9E6 | #C8DCD6 | #B34A3C |

**Card fills, ranks, and SVG ornament colours use these codes directly. Generated PNG sprites are palette-guided, not restricted to exactly six pixel colours; their shading can contain additional shades.**

## Card construction

Cards use a **240 × 480** logical frame, a 1:2 capsule proportion. The head marker occupies the upper cap; the rank is shown once, centered near the bottom cap in Alagard.

Number cards have two continuous side strips, joined through the middle, plus a pair of small rank flourishes. Only the central pip field counts toward the value. The seven is arranged **2 / 3 / 2** as in the reference. H has ten pips.

Picture cards have the two upper side ornaments and the same pair of rank flourishes. The distinct animal illustration occupies the center/lower region; there is no lower side ornament pair on picture cards. The large bottom rank remains visible.

Reusable card structure is in each standalone HTML page and in the gallery's `.forest-card` elements. Shared styling is in `style.css`. There is no external dependency or gameplay code.

## Asset naming examples

- `/art/card-kit/assets/heads/fox-head.svg` — top fox suit marker / favicon.
- `/art/card-kit/assets/pips/fox-berries.svg` — one counting pip, repeated on 2–H.
- `/art/card-kit/assets/motifs/fox-side.svg` — complete side strip for reference.
- `/art/card-kit/assets/motifs/fox-side-upper.svg` — upper border piece; mirror for the right side.
- `/art/card-kit/assets/motifs/fox-side-lower.svg` — lower piece, used only on number cards.
- `/art/card-kit/assets/motifs/source/fox-side.svg` — original transparent generated strip.
- `/art/card-kit/assets/motifs/fox-footer.svg` — shaded flourish beside the rank, mirrored for the other side.
- `/art/card-kit/assets/motifs/source/fox-footer.svg` — original transparent generated rank flourish.
- `/art/card-kit/assets/frames/fox-capsule.svg` — blank four-ring card frame.
- `/art/card-kit/assets/illustrations/fox-A.svg` — Fox kit.
- `/art/card-kit/assets/illustrations/fox-B.svg` — Red Fox.
- `/art/card-kit/assets/illustrations/fox-Q.svg` — Silver Fox, displayed Q.
- `/art/card-kit/assets/illustrations/fox-E.svg` — Kitsune.
- `cards/fox-H.html` — complete ten-berry card, labelled H.

## Sources and production

The user's two attached capsule-card images are included in `references/`. Palette hex values and evolution names come directly from the user's pasted design conversation. Head markers and 16 animal stages were created using the built-in Imagegen tool, referencing those card images. The frames are editable vectors. Ornament SVGs are self-contained layout containers with the generated PNG artwork embedded unchanged. The current counting pips are generated transparent PNGs based on the three supplied pip references.

The supplied Alagard font is included unchanged. Retain its applicable licence when distributing the kit.

## Latest refinements

Queens now display uppercase Q throughout. The earlier vector pips have been superseded by shaded pixel-art PNG sprites made from the supplied berry, star and mushroom examples. Side ornaments have been replaced by the richer reference-matched generated artwork described below. The Snow Hare Q wears a silver willow-leaf circlet with a green stone, plus a sage mantle and ivory embroidery; E keeps the stronger lunar effects.

## Reference-matched counting pips

The active pips are transparent PNGs generated with built-in Imagegen using the three supplied sprite images as direct style references. They preserve richer pixel shading, plump forms, dark outlines and bright highlights. Fox uses a three-berry cluster; Owl uses a tall four-point gold star; Hare uses a dimensional four-leaf clover with a curved stem; Toad uses a rounded speckled fly agaric. They are repeated on all 36 number cards. The component library downloads these same PNGs. The three source crops are saved under `references/pip-*.png`, and all four prompts are in `PIP-PROMPTS.json`. Raster shading introduces additional palette shades.

## Reference-matched ornaments and rank flourishes

The latest side strips follow the supplied owl reference: richer shaded foliage and pale accents. Every strip has an upper and lower layout piece; number cards now use the full joined strip on each side, while picture cards keep the upper pair. Generated pixels are preserved inside self-contained SVG layout windows; raw transparent PNGs are also included in `/art/card-kit/assets/motifs/source/`.

Small mirrored flourishes now frame the number at a readable size. They avoid all four counting symbols: no berries, stars, clovers or mushrooms. Fox uses copper oak leaves and an acorn; Owl uses blue feather leaves, an ivory flower and a crescent; Hare uses green willow leaves, a meadow flower and a seed head; Toad uses a curled fern, a small lily pad and dew drops. Prompts are in `ORNAMENT-PROMPTS.json`.

`ornament-preview.html` and `ornament-preview.png` show the four complete ornament sets side by side. The component library offers both self-contained SVG pieces and their original PNG downloads.

## Latest spacing refinement

Rank flourishes are 20% smaller in both dimensions, shifted slightly up and inward, and appear on all 52 cards including A, B, Q and E. Number-card side motifs are now continuous full strips with no join gap; fox and hare strips are slightly larger and longer. Picture cards retain the upper pair with the same small rank flourishes. Moon Owl E has narrower, more upright wings and a slightly lower, narrower placement.
