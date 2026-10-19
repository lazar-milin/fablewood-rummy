# Vector artwork

Every image under `public/art/` is an SVG. The artwork was made as pixel-art PNGs, and some earlier "SVG" files only wrapped one of those PNGs in base64. `tools/px2svg.py` turned each one into real vectors:

- It finds the image's pixel grid. The generated art has slightly uneven pixel sizes, so each grid line snaps to the nearest colour edge.
- It takes one colour per grid cell and reduces the image to at most 128 colours.
- It writes one crisp-edged path per colour in the original pixel coordinates. Image sizes, `viewBox` crops and card placement are unchanged.

The PNG originals are in git history at commit `5ba4355`.

To convert new art, run `pip install pillow numpy`. Then run `python3 tools/px2svg.py jobs.json`, where `jobs.json` is a list of `{"src": "in.png", "dst": "out.svg"}` entries. Check the result in the Card Atelier before replacing an asset.

# Active background

`public/art/card-kit/assets/ui/forest-night.svg` was vectorized from the user's supplied “Enchanted Pixel Forest at Night true size.pixel-16bit.png”.

# Active card artwork

The approved `rummyforest-card-kit-v2` from the chat **Build Rummy Forest card mockup** is now used for all 52 ordinary faces, four mystical jokers, and the grimoire deck back. Its referenced assets were copied into `public/art/card-kit/assets/` and later vectorized (see Vector artwork). Source metadata and the imported file list are in `public/art/card-kit/SOURCE.json`.

`public/card-art.js` contains the imported card compositions. `public/card-art.css` preserves their sprite placement and adapts sizes to the game. The numeric game values remain unchanged; displayed ranks use A, 2–9, H, B, Q, E. Joker 0 is the dragon, 1 the unicorn, 2 the phoenix, and 3 the griffin. No new image generation was used for this import.

`public/atelier/` includes the latest Card Atelier from that same chat. It shares `public/art/card-kit/assets/` with the game, including the additional reference and component assets. Only navigation back to the game and shared asset URLs were added to the imported pages.

# Grimoire sprite

File: `public/art/card-kit/assets/back/grimoire-book.svg`

Generated with the built-in Imagegen tool on a transparent background, then copied unchanged into the project.

Final prompt:

> Use case: stylized-concept. Asset type: isolated pixel art inventory sprite for a magical forest card game UI. A single clearly recognizable closed grimoire book, viewed almost front-on with a slight three-quarter tilt so its cream page block and thick spine show. Rich plum purple leather cover, maroon spine, gold corner guards and clasp, a little silver moon embossed in the cover. Crisp retro 16-bit pixel art with deliberately chunky square pixels and clear dark outlines, readable at 48px tall. Compact full book centered with modest transparent padding, no surrounding objects, no text or letters, no scenery, no cast shadow outside the sprite. Genuine transparent background.

# Earlier background (retained, unused)

File: `public/art/forest-pixel.svg`

Generated with the built-in Imagegen tool using the user's fox/toad/hare card mockup as a style reference. Existing card artwork was retained.

Final prompt:

> Use case: stylized-concept. Asset type: wide background for a pixel-art magical forest card game website. Use the attached card mockup only as an art-style and palette reference: crisp warm storybook pixel art, natural olive and sage leaves, brown trunks, cream light, burgundy mushroom caps. Create an empty enchanted woodland clearing, no cards, no UI, no text, no animals or characters. Grassy mossy ground along bottom fifth, a few small glowing mushrooms and flowers at lower corners; tall branching tree trunks frame left and right above the ground; dense green pixel leaf canopy at the top edge. Middle is quiet misty sage-green woodland depth with lots of clear low-contrast space behind interface panels. Firefly sparkles and subtle magical lilac highlights. Actual visible square pixel clusters, low resolution retro 8-bit game scenery scaled with hard nearest-neighbor edges, no smooth gradients or vector curves. Landscape 16:9 composition.

Font and control icons were copied from the user's Bugtile project, whose icon definitions were originally copied from Birdcard. The font is `public/fonts/vcr-osd-mono.ttf`; icons are in `public/icons.js`.

`public/fonts/alagard.ttf` is the user-supplied Alagard font, copied unchanged from the Rummy assets folder. The grimoire's ace sequence buttons use it.
