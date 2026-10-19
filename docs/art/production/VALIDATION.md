# Verification

- 52 unique cards: 13 in each of four suits.
- 36 number cards and 16 distinct picture cards.
- Exact central pip counts, including ten on H.
- A/B/Q/E illustrations match the supplied evolution chains.
- Two continuous side strips on number cards; two upper motifs on picture cards; two rank flourishes on every card.
- All HTML asset references and component download links resolve locally.
- Supplied Alagard font is byte-for-byte unchanged.
- Card frame fills contain the exact supplied hex codes. Generated PNG pips follow the supplied accent palettes with additional shading colours.
- Browser check: all 52 deck cards and all 16 evolution cards are present; no broken visible images; Alagard loaded; no horizontal page overflow at the available viewport.
- Browser check: suit filtering, evolution tab, palette tab, component library and enlarged card inspector work.
- All 16 evolution cards visually inspected in the browser.

`preview.png` shows the completed gallery; `evolution-preview.png` shows all sixteen evolution cards. Generated PNG sprites follow the supplied palette direction, with additional raster shading colours. Exact source palettes are in `palettes.json`.

## Refinement check

All four Queens display uppercase Q; zero lowercase queen ranks remain in the deck. The four detailed counting pips and four expanded side motifs load in the gallery. The revised Snow Hare Q is visible with its silver willow circlet and embroidered sage mantle. Original card counts, exact central pip counts, motif counts and all asset references still pass. Saved previews and the ZIP package have been refreshed.

## Reference-pip replacement

Four transparent PNG pips, made with built-in Imagegen using the supplied berry, star and mushroom images as direct style references, replace the vector pips. All 36 number cards reference the new PNGs; the top gallery comparison shows seven of each symbol. No broken visible images in the browser, and each comparison card has exactly seven central pips. The full 52-card link/count checks pass. `PIP-PROMPTS.json` records all four prompts.

## Side ornaments and rank flourishes

Eight original shaded pixel-art PNG ornaments generated with built-in Imagegen from the supplied owl references. Self-contained SVG views preserve the generated PNG pixels and provide complete, upper and lower strip pieces. All four rank flourishes were visually checked: none includes berries, stars, clovers or mushrooms. Picture cards retain two upper pieces and two small rank flourishes; number cards use two continuous side strips and two mirrored rank flourishes. All assets rendered successfully in the browser. The component library contains 44 clearly labelled items and includes original PNG links for ornament pieces.

## Latest spacing and Moon Owl check

All 52 cards have two rank flourishes. Width and height are both 80% of the previous values, shifted slightly up and inward. Number cards use full joined side strips with no middle split; fox and hare strips are longer/larger. All 16 picture cards visibly include their two flourishes. Moon Owl E was edited with built-in Imagegen to bring both wings inward and was placed slightly lower while preserving body proportions. All card links, pip counts, Queen labels and common components pass checks; no broken images in the browser.
