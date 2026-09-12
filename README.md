# Adrian Yang — résumé site

A single-page résumé website. Plain HTML and CSS, no build step.

| File / folder | What it holds                                                        |
| ------------- | -------------------------------------------------------------------- |
| `index.html`  | All the text — edit content here                                     |
| `style.css`   | Colors, type, layout, and the print stylesheet                       |
| `favicon.svg` | Browser tab icon                                                     |
| `cad/`        | The 3D model viewer — built, but switched off (see below)            |
| `models/`     | The SolidWorks jet engine models as compressed `.glb` files (6.5 MB) |

## Preview

Open `index.html` in a browser.

## Update the content

Everything lives in `index.html`. Each job or activity is one `<article class="entry">` block —
copy one to add another. Mark a current role with `<em class="now">Present</em>` so it gets the
orange "current" dot.

When you update the résumé, also bump the **Rev** date in the title block at the bottom of the page.

## Print / PDF

The "Print / save as PDF" button uses a print stylesheet that drops the rocket drawing and the
footer, and fits the résumé on one letter page.

## The 3D CAD viewer (currently off)

The Projects section can show the SolidWorks jet engine as a 3D model: five tabs (combustion stage,
combustion chamber, exhaust, intake casing, main shaft), each turning slowly, drag to rotate and
Ctrl + scroll to zoom. It is finished and tested but commented out, so the page shows only the
text entry.

To switch it on, remove the `<!--` and `-->` around two blocks in `index.html`: one in `<head>`,
one in the Projects section. Both are marked with a comment.

Once it is on, the models won't load from a file opened directly in the browser — serve the folder
instead, e.g. run `npx serve .` here and open the address it prints.

The models came from your SolidWorks files, exported as STL and compressed for the web. Each tab's
caption carries a `data-model` attribute pointing at its file in `models/`.

## Publish with GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. The site goes live at `https://<username>.github.io/resume/` within a minute or two.
