# Artwork and third-party credits

## Card artwork

The card kit supplies 52 ordinary faces, four mystical jokers, and a crescent-grimoire back. The animal suits are fox, hare, toad, and owl. Illustrations, suit heads, counting pips, frames, ornaments, and grimoire artwork were generated using OpenAI's image-generation tools, assembled into card compositions, and converted to vector SVGs. The original PNG artwork is retained in Git history at commit `5ba4355`.

`public/art/card-kit/assets/` is the shared artwork directory for the game and Card Atelier. `public/card-art.js` contains the card compositions; `public/card-art.css` positions their components. The original 1:2 card proportions are preserved. Game values remain numeric; displayed face ranks use H/B/Q/E. Joker variants are dragon, unicorn, phoenix, and griffin. The game favicon uses `assets/heads/toad-head.svg` from that shared kit.

The active unicorn is `assets/jokers/unicorn-equine.svg`. The earlier unicorn and moon illustrations, the superseded forest background, and obsolete standalone preview pages have been retired.

## Background and interface

`public/art/card-kit/assets/ui/forest-night.svg` was vectorized from the project owner's supplied image, “Enchanted Pixel Forest at Night true size.pixel-16bit.png”. It is the active night-forest background.

`assets/back/grimoire-book.svg` is the generated purple-and-gold book sprite used by the lobby's rule controls and the card back. `public/icons.js` contains the code-defined control icons shared with the author's Birdcard and Bugtile games. The Online and Local mode buttons use original pixel night-sky and forest scenes defined in the same file. Layout, card frames, and decorative patterns are also defined in the project's CSS and SVG markup.

## Vector conversion and production records

`tools/px2svg.py` detects the pixel grid, samples its colour cells, reduces the palette to at most 128 colours, and emits crisp SVG paths in the original coordinates. It preserves intrinsic dimensions and viewBox crops. The current SVG artwork contains vector geometry rather than embedded bitmap images.

Art generation prompts, validation notes, layout records, and the historical import inventory are kept in [docs/art/](docs/art/), outside the served `public/` directory. The live Atelier retains the deck, palette, joker, and asset manifests used for its reference collection.

To convert new art, install Pillow and NumPy in a Python environment, then run:

```sh
python tools/px2svg.py jobs.json
```

`jobs.json` is an array of `{"src":"input.png","dst":"output.svg"}` entries. Inspect new assets in the Atelier before changing the shared card compositions.

## Fonts

The game and Atelier both load the single copies in `public/fonts/`. Font files are unmodified and retain their authors' terms separately from the project GPL licence.

| Font | Creator | Published permission and credit |
| --- | --- | --- |
| Alagard | Hewett Tsoi, credited in the font as Pix3M | The [author's distribution page](https://www.dafont.com/alagard.font) lists it as 100% Free and requires credit. The author's permission is recorded in [LICENSE-alagard.txt](public/fonts/LICENSE-alagard.txt). |
| VCR OSD Mono | Riciery Leal, credited in the font as MrManet | The [author's distribution page](https://www.dafont.com/vcr-osd-mono.font) lists it as 100% Free. The author explicitly permits commercial use in a [24 February 2017 comment](https://www.dafont.com/font-comment.php?file=vcr_osd_mono). See [LICENSE-vcr-osd-mono.txt](public/fonts/LICENSE-vcr-osd-mono.txt). |

The original distribution archives were checked on 19 October 2026; each contains only its font file and no separate licence document. The included notices preserve the published author attribution and permission statements; they do not assign a different licence to the fonts.
