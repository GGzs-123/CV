# Cendrey Hemres S. Perez — Portfolio

A responsive, single-page portfolio site built with plain HTML, CSS, and JavaScript (no build step, no framework). Circuit-board / PCB visual theme throughout, light and dark mode, animated background, and a working contact form.

## Folder structure

```
index.html
css/styles.css
js/script.js
assets/
  fonts/         Space Grotesk + Inter, self-hosted (no external font requests)
  images/        profile photo + 3 school seals
  certificates/  4 Cisco Networking Academy certificates (PDF)
  cv/            downloadable CV (PDF)
```

## Preview it right now

Just double-click `index.html` (or right-click → Open With → your browser). Everything is relative-linked, so it works straight off your hard drive with no server needed.

## Hosting it for real (both free)

**GitHub Pages**
1. Create a new GitHub repo and upload everything in this folder to it.
2. Repo Settings → Pages → set source to your main branch, root folder.
3. Your site goes live at `https://yourusername.github.io/reponame`.

**Netlify**
1. Go to [netlify.com](https://netlify.com), sign up free.
2. Drag this whole folder onto the "Deploy manually" box on your dashboard.
3. You get a live URL immediately; you can rename it or attach a custom domain later.

## Connecting the contact form (2 minutes)

The form currently points at a placeholder endpoint, so submissions won't go anywhere until you connect it:

1. Create a free account at [formspree.io](https://formspree.io).
2. Create a new form — Formspree gives you an endpoint like `https://formspree.io/f/abc123`.
3. Open `index.html`, find this line near the bottom:
   ```html
   <form id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```
4. Replace `https://formspree.io/f/YOUR_FORM_ID` with your real endpoint. Save.

That's it — messages will land in your Formspree inbox (and forward to your email) from then on.

## Things worth knowing

- **Theme + intro animation reset on refresh.** Dark/light mode and the name glitch don't use `localStorage`, so they don't persist across page reloads. This was intentional to keep the file dependency-free; if you want the theme choice to stick between visits once this is hosted on its own domain, add:
  ```js
  // at the top of the theme toggle logic in js/script.js
  let theme = localStorage.getItem('theme') || 'light';
  // inside the click handler, after setAttribute:
  localStorage.setItem('theme', theme);
  ```
- **Skill bar percentages** (Python 82%, C/C++ 75%, etc. in `index.html` under `#skills`) are illustrative placeholders — adjust the `data-level` values to whatever feels right to you.
- **TESDA, DOLE, and DICT** appear as styled text badges rather than their official logos (I wasn't able to fetch the real logo image files). If you have those logo images, send them over and they can be swapped in directly.
- **LinkedIn / GitHub icons** in the nav sidebar link to `#` placeholders — add your real profile URLs in `index.html` when ready.
- **Project thumbnails** use simple icon graphics rather than real photos, since none were provided. Swap in real project photos any time by replacing the `<svg>` inside each `.project-thumb` with an `<img>`.

## Credits

Fonts: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) and [Inter](https://fonts.google.com/specimen/Inter), both open-source (OFL), self-hosted in `assets/fonts`.
