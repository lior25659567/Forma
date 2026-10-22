# Forma

Forma is an interior-design workspace: add a photo of a room, set a budget and style, generate
design directions for that same room, click a piece of furniture to find alternatives you can
afford, preview one in the room, apply it, and save the shopping list.

```
npm install
npm run dev        # http://localhost:5173
npm test           # logic tests (budget, matching, catalog, generation)
npm run build
```

## The main flow

Upload room (or try the sample) → choose style and budget → 3 design directions are generated →
click the sofa → in-budget alternatives, closest look first → **Preview in room** → Before/After,
price change and projected room total → **Apply** (or Cancel) → Undo if needed → **Save** →
shopping list with links and a budget breakdown.

## What is real and what is demo

| Area | Status in this build |
| --- | --- |
| Workspace, selection, panel, filters, budget logic, preview/apply/cancel/undo/redo, shopping list, saved projects & versions, multiple rooms | **Working.** Projects are saved in the browser (localStorage; photos in IndexedDB). |
| Design generation & product previews (sample room) | **Demo renderer.** A built-in parametric renderer draws the sample room in one-point perspective. Styles change furniture, upholstery, palette, lighting and decor; walls, window, door, ceiling and camera stay fixed, and flooring/wall colour only change if the user allows it. Previews draw the product from its listed dimensions, colour/variant, material and shape attributes, so the image really changes. Not AI-generated, not photorealistic. |
| Uploaded photos | **Partial.** No image-generation service is connected, so whole-room redesign is disabled for photos (the UI says so). Users mark furniture with a box; Forma samples its colour, asks for its current width (optional), and previews a product as a **rough overlay** in the marked area. Matching for photos compares colour (and width if entered) only, and never claims shape similarity. |
| Product data | **Sample catalog.** No IKEA Israel, ACE, Beitili or Floralis feed/API is connected. `src/catalog/sampleCatalog.ts` holds illustrative placeholder listings: invented names, plausible ILS prices, made-up stock; `url: null`, `checkedAt: null`, labelled “Sample” everywhere. Product images are illustrations drawn from attributes, labelled as such. |
| Room measurements | Never inferred from a photo. Fit checks use the wall length the user enters. |
| Inspiration images | Influence the colour palette only (dominant colours extracted in the browser), with a strength slider. |

The top bar's **Demo data** badge opens the same summary in the app.

## Loading a real catalog

“What works in this build” → **Load catalog file (JSON)** replaces the sample listings for the
categories the file covers. Format:

```json
{
  "products": [
    {
      "id": "12345",
      "category": "sofa",
      "name": "Exact product name",
      "retailer": "ikea-il",
      "url": "https://www.ikea.co.il/…/exact-product-page",
      "priceIls": 2490,
      "deliveryIls": 149,
      "assemblyIls": 199,
      "dims": { "widthCm": 214, "depthCm": 88, "heightCm": 80 },
      "material": "cotton",
      "colorName": "Light grey",
      "colorHex": "#bdbcb8",
      "variants": [{ "name": "Beige", "colorHex": "#d6c7ab", "priceIls": 2490 }],
      "availability": "in-stock",
      "checkedAt": "2026-10-20",
      "images": ["https://…/photo.jpg"],
      "render": { "arms": "track", "legs": "tapered-wood", "silhouette": "straight", "seatCushions": 3 }
    }
  ]
}
```

- `category`: `sofa | coffeeTable | rug | floorLamp`; `retailer`: `ikea-il | ace | beitili | floralis`.
- `url` and `images` must be `https://`. Rows that fail validation are skipped and counted.
- `render` holds shape attributes used for matching and the preview (sofa: `arms`, `legs`,
  `silhouette`, `seatCushions`, `legColor`; table: `top`, `base`; rug: `pattern`, `shape`,
  `accent`; lamp: `shade`, `baseColor`). Listings without `dims` can be browsed but not previewed.

A networked feed can replace `fetchProducts` in `src/catalog/catalog.ts` without UI changes.

## Code map

- `src/types.ts` — data model (rooms, designs, products, budget).
- `src/design/` — 12 styles and design-direction generation (seeded, so A/B/C are stable and different).
- `src/render/` — perspective projection, furniture drawing, room scene, selection outlines.
- `src/catalog/` — retailer registry, sample catalog, feed parsing, product → render shape.
- `src/logic/budget.ts` — room totals, per-item caps, projected totals.
- `src/logic/matching.ts` — similarity, plain-language reasons, filters, “no matches” suggestions.
- `src/state/` — project store with undo/redo, persistence.
- `src/screens/` — Home, Setup, and the workspace (canvas, panel, product cards, dialogs).

## Later

Whole-home scanning, 3D reconstruction, an image-generation backend for real photo redesign and
photoreal product insertion, and live retailer feeds.
