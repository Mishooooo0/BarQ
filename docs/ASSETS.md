# Asset provenance

This independent, unofficial prototype uses the user's supplied images only as reference material for the requested product proposal. Branding and third-party artwork belong to their respective owners. There is no claim of official affiliation.

## Reference artwork

| Local asset | Supplied file | Use |
| --- | --- | --- |
| `src/assets/card-artwork.png` | ChatGPT Image Oct 28, 2026, 12_18_08 AM.png | Only the three card-art rectangles; account/card labels are rebuilt with fictional identifiers. |
| `src/assets/market-artwork.png` | ChatGPT Image Oct 28, 2026, 12_18_14 AM.png | Only category illustration regions and their immediate background. |
| `src/assets/reward-artwork.jpg` | ChatGPT Image Oct 28, 2026, 12_18_01 AM.jpg | Only money-bag, wheel, quest and marathon illustration regions. |
| `src/assets/barq-mark.json` | ChatGPT Image Oct 28, 2026, 12_18_19 AM.png | Editable filled vector contour traced from the black mark at source bounds x226–264, y606–666. |

`Artwork.tsx` uses tightly scoped SVG viewports to display the illustration regions. The source bitmaps themselves are retained unchanged. None is used as a complete app screen, and their UI labels and personal data are not rendered as interface elements. All main headings, labels, numbers, cards, buttons, search fields and navigation are separately implemented.

Additional supplied files:

- `src/assets/products-lower-artwork.jpg` is `photo_2026-10-28_00-39-52.jpg`; only the Youth Accounts, salary and Offers illustration regions are displayed.
- `src/assets/home-promotion-artwork.jpg` is `photo_2026-10-28_00-39-45.jpg`; only the marathon campaign rectangle at x55, y745, width478, height259 is displayed inside a live button. The rest of Home remains React/CSS.

## Generated background

File: `src/assets/desert.png`

Generated with the built-in image generation tool, using the supplied Home screenshot as a visual reference. It is a replacement photo rather than the original image. The prompt used was:

> Use case: photorealistic-natural. Create a clean background photograph asset for a rebuilt mobile interface. Reference image is ONLY a composition and scenery reference, not a UI to reproduce. Recreate ONLY the Saudi AlUla desert rocky landscape visible behind the top part of this screenshot. Output a square photographic image: dusty blue-gray sky at top quarter, low sun glow far left, layered eroded sandstone buttes in the distant center, amber sandy floor, a large very dark rugged stone formation in right foreground occupying lower two thirds, smaller rock foreground lower left. Match the subdued cinematic dawn lighting and realistic aerial oblique perspective closely. The image will be covered by independent HTML UI. No text, no numbers, no logos, no icons, no status bar, no buttons, no cards, no interface, no borders, no watermark. Fill entire canvas with desert scenery. Do not reproduce the white bottom portion of reference.

## Other assets

- Inter is locally bundled via `@fontsource/inter` (SIL Open Font License).
- Utility icons use Lucide React (ISC license).
- The Home outline, Baloot cards and Saudi riyal symbol are code-native SVG approximations. The barq glyph is traced from the reference.
- The lower Home promotion uses the complete campaign artwork from the follow-up screenshot. Its surrounding heading, spacing, click target and pagination indicators are React/CSS.

No runtime image/font CDN, external banking endpoint or analytics service is used.

## AI Analyst character

`src/assets/analyst/*.png` are eleven poses cropped, unscaled, from the pixel-art character sheet supplied by the project owner on 2026-10-28 (hero, thumbs, think, idea, celebrate, coin, laptop, receipt, places, piggy, growth). They are shown with `image-rendering: pixelated`.
