# Adrian Yang — résumé site

A single-page résumé website, live at **https://engineisbroke.com**. Plain HTML, CSS and a little
JavaScript, no build step.

| File / folder            | What it holds                                                     |
| ------------------------ | ----------------------------------------------------------------- |
| `index.html`             | All the text — edit content here                                  |
| `style.css`              | Colors, type, layout, and the print stylesheet                    |
| `Adrian-Yang-Resume.pdf` | The résumé behind the "Print / download PDF" button               |
| `cad/`                   | The 3D model viewer in the Projects section (script and styles)   |
| `models/`                | The SolidWorks models, converted to compressed `.glb` files       |
| `favicon.svg`            | Browser tab icon                                                  |
| `CNAME`                  | Tells GitHub Pages to serve the site at engineisbroke.com — keep it |

## Preview

Serve the folder, e.g. run `npx serve .` here and open the address it prints. The page also opens
straight from `index.html`, but browsers won't load the 3D models from a local file.

## Update the content

Everything lives in `index.html`. Each job or activity is one `<article class="entry">` block —
copy one to add another. Mark a current role with `<em class="now">Present</em>` so it gets the
orange "current" dot.

When you update the résumé, also bump the **Rev** date in the title block at the bottom of the page.

## Résumé PDF

The "Print / download PDF" button opens `Adrian-Yang-Resume.pdf` in a new tab, where visitors can
print or save it. To update it, export your new résumé as a PDF and replace that file, keeping the
same name. Pressing Ctrl + P on the web page itself still prints a paper version of the page.

## The 3D CAD viewer

The Projects section shows three SolidWorks models in tabs: combustion stage, exhaust and main
shaft. Each tab's caption carries a `data-model` attribute pointing at its file in `models/`. To
hide the viewer, comment out the two blocks marked in `index.html`: one in `<head>`, one in the
Projects section.

## Hosting

GitHub Pages serves the `main` branch root. Pushing to `main` republishes the site in about a
minute. The domain is registered at Cloudflare, whose DNS points it at GitHub with records set to
**DNS only** (grey cloud): four A and four AAAA records for `@`, and a `www` CNAME to
`pibbleaco67.github.io`.
