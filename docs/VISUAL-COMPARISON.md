# Visual comparison checklist

Comparison performed against the five original screenshots and two additional lower-screen references at **402 × 874 CSS pixels**. Paired images show the supplied reference on the left and the React rendering on the right. The objective is a faithful interactive baseline; this is not a claim of pixel identity.

| Area | Verified match | Remaining difference |
| --- | --- | --- |
| Global | Pale canvas, large heavy headings, 30 px body insets, rounded white surfaces, 64 px floating navigation, active-tab treatment | Inter substitutes for the unavailable original font. Some glyph metrics and weight differ. Lucide utility icons and browser blur differ slightly from native iOS. |
| Home | Profile/action positions, centered balance, glass circles, desert/overlay layering, savings strip, rounded services panel, fixed nav | Desert is a generated approximation with a brighter horizon and different rocks. Fictional name and balance intentionally replace source data. The supplied marathon campaign artwork replaces the former approximation. The seven pagination marks are visual only; the other six campaigns were not supplied. |
| Rewards | Cream wash, cashback panel, row positions and dimensions, original wheel/quest illustrations, half-width marathon card | Decimal typography and small spacing differ. The marathon background motif is simplified; its countdown is a fixed demo value. |
| Cards | Container geometry, original three card artworks, list spacing, ordering and colors | Fictional last-four display identifiers replace the source values. Font metrics and a few pixel offsets differ. |
| Market | Six-category arrangement, illustration regions, pastel artwork panels, search geometry, text wrapping | Utility icons are Lucide equivalents. Small font/line-wrap differences may remain at narrower widths. |
| More | Three transfer tiles then one, Games, Youth Accounts, Payments and Rewards & Offers, original lower tile illustrations, sticky header and white tile dimensions | Native scrollbar is suppressed. Support and Baloot icons remain close vector equivalents. Status-bar time and network are fixed demonstration values. |
| Brand mark | Filled silhouette traced directly from the Products reference and reused in profile, service tiles and Rewards nav | Trace comes from screenshot pixels, not an official vector master; enlarged edges may differ. Card artwork retains its source marks. |
| Details / dialogs | Shared tokens, natural back navigation, touch feedback, keyboard focus containment | These screens were not supplied, so they are clearly simulated extensions rather than verified replicas. |

## Screen pairs

- [Home](comparisons/home.png)
- [Rewards](comparisons/rewards.png)
- [Cards](comparisons/cards.png)
- [Market](comparisons/market.png)
- [More / Products](comparisons/more.png)
- [Home lower section](comparisons/home-lower.png)
- [Products lower sections](comparisons/more-lower.png)

## Review status

- [x] All five references inspected before implementation.
- [x] Shared spacing, color, shape and type tokens established.
- [x] All baseline layouts rebuilt as interactive React components.
- [x] Isolated artwork retained without using a whole screenshot as a screen.
- [x] Side-by-side render comparison and spacing refinements completed.
- [x] Inaccurate initial logo replaced with a trace from the reference.
- [x] Fictional account and financial data used throughout the interactive views.
- [x] Mock state and navigation tested in a real browser.
- [x] Newly supplied lower-screen sections and marathon banner incorporated.
- [ ] Exact official font, clean desert photo and other carousel campaign assets not supplied.
- [ ] Physical iPhone/Safari visual verification not performed.
