# fxtiion-sys.github.io

Personal portfolio of **Nahyun (Ellie) Kim**, a Computer Science student at Western University.

Live site: https://fxtiion-sys.github.io

Plain HTML, CSS and a little JavaScript. No framework and no build step.

## Structure

```
index.html          # home: hero, currently building, skill filter, project log, contact
projects/*.html     # one case-study page per project (what / diagram / why / results / learned)
css/style.css       # notebook theme, light/dark mode, mobile layout
js/main.js          # hero neural-net canvas, scroll reveal, skill filter
assets/favicon.svg  # tab icon
.nojekyll           # tells GitHub Pages to serve files as-is (no Jekyll)
```

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Push to `main`. In the repo's **Settings → Pages**, set the source to **Deploy from a branch**, branch `main`, folder `/ (root)`.

## Editing

- All text lives in `index.html`. Search for `[TODO]` to find the parts still to fill in.
- Colours are CSS variables at the top of `css/style.css` (light first, then the dark-mode block).
