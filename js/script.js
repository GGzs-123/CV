/* ==========================================================================
   Cendrey Hemres S. Perez — Portfolio
   NOTE on storage: theme preference and "have I glitched yet" state are kept
   in plain JS variables (in-memory) rather than localStorage/sessionStorage,
   so they reset on refresh. See README for a 3-line snippet to persist them
   once this is hosted on its own domain.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- Theme toggle ---------------- */
  const htmlEl = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  let theme = 'light';
  themeToggle.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    htmlEl.setAttribute('data-theme', theme);
    themeToggle.classList.toggle('is-dark', theme === 'dark');
  });

  /* ---------------- Mobile nav collapse ---------------- */
  const sideNav = document.querySelector('.side-nav');
  const navCollapseBtn = document.getElementById('navCollapseBtn');
  const navBackdrop = document.querySelector('.nav-backdrop');

  const openNav = () => { sideNav.classList.add('open'); navBackdrop.classList.add('show'); navCollapseBtn.setAttribute('aria-expanded','true'); };
  const closeNav = () => { sideNav.classList.remove('open'); navBackdrop.classList.remove('show'); navCollapseBtn.setAttribute('aria-expanded','false'); };

  navCollapseBtn.addEventListener('click', () => {
    sideNav.classList.contains('open') ? closeNav() : openNav();
  });
  navBackdrop.addEventListener('click', closeNav);
  document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', closeNav));

  /* ---------------- Panel navigation ----------------
     The portfolio never scrolls or slides on its own. Each <section id="…">
     inside <main> is a full-panel that is shown/hidden only when a side-nav
     button (or another in-page link) is clicked. */
  const panels = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  const panelReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function forceReflow(el) { void el.offsetWidth; }

  function resetPanelAnimations(panel) {
    // Reveal elements: drop the visible state so the transition can replay.
    panel.querySelectorAll('.reveal').forEach(el => el.classList.remove('in-view'));

    // Skill bars: snap back to 0 with no transition so the fill can replay.
    // This now runs for every panel, including Skills — its content stays
    // in place (no more slide-in/out loop) and simply re-fills each visit.
    panel.querySelectorAll('.skill-fill').forEach(fill => {
      fill.style.transition = 'none';
      fill.style.width = '0%';
    });
    forceReflow(panel);
    panel.querySelectorAll('.skill-fill').forEach(fill => { fill.style.transition = ''; });

    // Stat counters: stop any run in progress and reset the displayed number.
    panel.querySelectorAll('.num[data-count-to]').forEach(el => {
      if (el._countTimer) { clearInterval(el._countTimer); el._countTimer = null; }
      el.textContent = '0' + (el.dataset.suffix || '');
    });
  }

  function playPanelAnimations(panel) {
    requestAnimationFrame(() => {
      panel.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
      panel.querySelectorAll('.skill-row').forEach(row => {
        const fill = row.querySelector('.skill-fill');
        if (fill) fill.style.width = fill.dataset.level + '%';
      });
    });

    // Stat count-up: shows one number at a time, finishing the whole count
    // in 2.5s total regardless of the target — replays on every panel visit.
    const COUNT_TOTAL_MS = 2500;
    panel.querySelectorAll('.num[data-count-to]').forEach(el => {
      const target = parseInt(el.dataset.countTo, 10) || 0;
      const suffix = el.dataset.suffix || '';
      if (panelReduceMotion || target <= 0) { el.textContent = target + suffix; return; }
      const stepMs = COUNT_TOTAL_MS / target;
      let current = 0;
      el._countTimer = setInterval(() => {
        current++;
        el.textContent = current + suffix;
        if (current >= target) { clearInterval(el._countTimer); el._countTimer = null; }
      }, stepMs);
    });
  }

  function activatePanelContent(panel) {
    resetPanelAnimations(panel);
    playPanelAnimations(panel);
  }

  function showPanel(id, { focus = false } = {}) {
    const target = document.getElementById(id);
    if (!target || !target.matches('main section[id]')) return;

    panels.forEach(p => p.classList.toggle('panel-active', p === target));
    navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
    target.scrollTop = 0;
    activatePanelContent(target);
    if (focus) target.focus({ preventScroll: true });

    // The Skills panel has its own video backdrop — hide the PCB/particle/
    // binary-rain canvas there so the two don't compete visually.
    const bgCanvas = document.getElementById('bg-canvas');
    if (bgCanvas) bgCanvas.classList.toggle('is-suppressed', id === 'skills');
    if (window.setBgTraceProfile) window.setBgTraceProfile(id);

    // The skills panel runs its own slide-in/dwell/slide-out/video loop —
    // start it only while that panel is visible, stop it the moment we leave.
    if (window.skillsPanel) {
      if (id === 'skills') window.skillsPanel.start();
      else window.skillsPanel.stop();
    }

    // About panel: typewriter intro plays once (first time the panel is
    // opened this visit), same "plays once, not replayed" convention as the
    // hero description typewriter on Home — not on every reveal replay.
    if (window.aboutPanel && id === 'about') window.aboutPanel.start();
  }

  // Any in-page link (side-nav, hero buttons, project "case study" links, etc.)
  // switches panels instead of scrolling.
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    const id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showPanel(id, { focus: true });
    });
  });

  panels.forEach(p => p.setAttribute('tabindex', '-1'));

  /* ---------------- Skills panel: delayed-start looping video + minimal matrix rain ----------------
     The skill list itself no longer slides off/on screen — it stays put and
     its progress bars simply reset-and-refill each time the panel opens
     (handled generically above, alongside every other panel's .reveal +
     .skill-fill animation). All this controller does now is: wait 3s after
     the panel becomes active, then play the background video on a native
     loop, and run a sparse Matrix-style rain overlay for as long as the
     panel stays open. */
  (function initSkillsPanel() {
    const panel = document.getElementById('skills');
    const video = panel.querySelector('.skills-bg-video');
    const matrixCanvas = panel.querySelector('.skills-matrix');
    if (!video) return;

    const START_DELAY_MS = 3000;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    video.loop = true; // once it starts, it just keeps looping on its own

    let playTimer = null;

    function playVideo() {
      try {
        video.currentTime = 0;
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* autoplay may be blocked until user interacts once; safe to ignore */ }
    }

    /* ---- minimal matrix-rain overlay (sparse 1/0 characters, low opacity) ---- */
    const mCtx = matrixCanvas ? matrixCanvas.getContext('2d') : null;
    let mw = 0, mh = 0, mdpr = 1, mDrops = [], mRaf = null;

    function resetMatrixDrop(d) {
      d.x = Math.random() * mw;
      d.y = -Math.random() * mh * 0.6;
      d.speed = 0.5 + Math.random() * 0.7;
      d.char = Math.random() > 0.5 ? '1' : '0';
      return d;
    }

    function sizeMatrix() {
      if (!matrixCanvas) return;
      mdpr = Math.min(window.devicePixelRatio || 1, 2);
      mw = matrixCanvas.clientWidth || matrixCanvas.parentElement.clientWidth;
      mh = matrixCanvas.clientHeight || matrixCanvas.parentElement.clientHeight;
      matrixCanvas.width = mw * mdpr;
      matrixCanvas.height = mh * mdpr;
      mCtx.setTransform(mdpr, 0, 0, mdpr, 0, 0);
      // Minimal: a sparse column count, well below the main background's rain.
      const cols = Math.max(6, Math.min(16, Math.floor(mw / 110)));
      mDrops = Array.from({ length: cols }, () => resetMatrixDrop({}));
    }

    function drawMatrix() {
      mCtx.clearRect(0, 0, mw, mh);
      const dark = htmlEl.getAttribute('data-theme') === 'dark';
      const rgb = dark ? '157,130,255' : '46,111,163';
      mCtx.font = '13px monospace';
      mDrops.forEach(d => {
        d.y += d.speed;
        mCtx.fillStyle = `rgba(${rgb},0.5)`;
        mCtx.fillText(d.char, d.x, d.y);
        if (d.y > mh + 30) resetMatrixDrop(d);
      });
      mRaf = requestAnimationFrame(drawMatrix);
    }

    function startMatrix() {
      if (!matrixCanvas || reduceMotion || mRaf) return;
      sizeMatrix();
      drawMatrix();
    }

    function stopMatrix() {
      if (mRaf) { cancelAnimationFrame(mRaf); mRaf = null; }
      if (mCtx) mCtx.clearRect(0, 0, mw, mh);
    }

    window.addEventListener('resize', () => { if (mRaf) sizeMatrix(); });

    window.skillsPanel = {
      start() {
        clearTimeout(playTimer);
        video.pause();
        video.currentTime = 0;
        playTimer = setTimeout(playVideo, START_DELAY_MS);
        startMatrix();
      },
      stop() {
        clearTimeout(playTimer);
        video.pause();
        stopMatrix();
      }
    };
  })();

  /* ---------------- About panel: typewriter intro ----------------
     Plays once per site visit — the first time the About panel is opened —
     then leaves the full text in place on every later visit, same "plays
     once, not replayed" convention as the Home hero description typewriter
     above (no localStorage, so it resets on refresh).
     The education timeline's one-by-one build-up (logo + school, then the
     next appears below and stays) is handled by the site's existing generic
     .reveal / .reveal-stagger system in resetPanelAnimations/
     playPanelAnimations — see the .tl-item.reveal-stagger rule in CSS for
     the per-item timing. */
  (function initAboutPanel() {
    const panel = document.getElementById('about');
    if (!panel) return;
    const textEl = document.getElementById('aboutTypewriter');
    const fullText = textEl ? textEl.textContent.trim() : '';
    let hasStarted = false;

    function typeText() {
      if (!textEl) return;
      if (panelReduceMotion) { textEl.textContent = fullText; return; }
      textEl.textContent = '';
      textEl.classList.add('is-typing');
      const SPEED_MS = 16;
      let i = 0;
      (function step() {
        textEl.textContent = fullText.slice(0, i);
        i++;
        if (i <= fullText.length) {
          setTimeout(step, SPEED_MS);
        } else {
          textEl.classList.remove('is-typing');
        }
      })();
    }

    window.aboutPanel = {
      start() {
        if (hasStarted) return; // already played this visit — leave the finished text as-is
        hasStarted = true;
        typeText();
      }
    };
  })();

  /* ---------------- Bear mascot: wave hello + first-visit greeting bubble ----------------
     Plays once per page load — same "first visit" convention as the name
     glitch below (no localStorage, so it resets on refresh, consistent
     with the rest of the site). */
  (function initBearGreeting() {
    const avatar = document.querySelector('.brand-mark .brand-avatar');
    const bubble = document.getElementById('bearBubble');
    if (!avatar) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let greeted = false;
    let hideTimer = null;

    function greet() {
      if (greeted) return;
      greeted = true;
      if (!reduceMotion) {
        avatar.classList.add('waving');
        avatar.addEventListener('animationend', () => avatar.classList.remove('waving'), { once: true });
      }
      if (bubble) {
        bubble.classList.add('show');
        hideTimer = setTimeout(() => bubble.classList.remove('show'), 4200);
      }
    }

    // Give the page a beat to settle in, then wave.
    setTimeout(greet, 900);

    // On narrow screens the sidebar starts off-canvas — if nobody has
    // seen the greeting yet by the time they open it, greet right then.
    navCollapseBtn.addEventListener('click', () => { if (!greeted) setTimeout(greet, 250); });

    // Tapping the bear dismisses the bubble early.
    avatar.style.cursor = 'pointer';
    avatar.addEventListener('click', () => {
      clearTimeout(hideTimer);
      if (bubble) bubble.classList.remove('show');
    });
  })();

  /* ---------------- Glitch effect on name (plays once per page load only —
     NOT replayed on panel revisits, unlike the reveal/skill/count animations) ---------------- */
  const nameEl = document.querySelector('.name-glitch');
  if (nameEl) {
    requestAnimationFrame(() => nameEl.classList.add('glitching'));
    setTimeout(() => nameEl.classList.remove('glitching'), 3000);
  }

  /* ---------------- Typewriter (holds on the first role, without cycling further,
     until the hero description below has finished typing) ---------------- */
  const roles = ['Computer Engineering Student', 'Hardware & Embedded Systems Enthusiast', 'Networking Fundamentals', 'Problem Solver'];
  const twEl = document.getElementById('typewriter');
  let descriptionTypingDone = false;
  let resumeRoleCycle = null;

  if (twEl) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      twEl.textContent = roles[0];
    } else {
      let roleIdx = 0, charIdx = 0, deleting = false;
      const tick = () => {
        const full = roles[roleIdx];
        if (!deleting) {
          charIdx++;
          twEl.textContent = full.slice(0, charIdx);
          if (charIdx === full.length) {
            if (roleIdx === 0 && !descriptionTypingDone) {
              // Hold here (no deleting, no cycling) until the description finishes typing.
              resumeRoleCycle = () => { deleting = true; setTimeout(tick, 400); };
              return;
            }
            deleting = true;
            setTimeout(tick, 1400);
            return;
          }
        } else {
          charIdx--;
          twEl.textContent = full.slice(0, charIdx);
          if (charIdx === 0) { deleting = false; roleIdx = (roleIdx + 1) % roles.length; }
        }
        setTimeout(tick, deleting ? 35 : 55);
      };
      tick();
    }
  }

  /* ---------------- Hero description typewriter (plays once per page load, then stops) ---------------- */
  const descEl = document.getElementById('heroDescText');
  const descCursor = document.getElementById('heroDescCursor');
  if (descEl) {
    const fullDesc = descEl.textContent;
    const reduceMotionDesc = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finishDescription = () => {
      descriptionTypingDone = true;
      if (resumeRoleCycle) { resumeRoleCycle(); resumeRoleCycle = null; }
    };
    if (reduceMotionDesc) {
      descEl.textContent = fullDesc;
      if (descCursor) descCursor.classList.add('done');
      finishDescription();
    } else {
      descEl.textContent = '';
      let dIdx = 0;
      const typeDesc = () => {
        dIdx++;
        descEl.textContent = fullDesc.slice(0, dIdx);
        if (dIdx < fullDesc.length) {
          setTimeout(typeDesc, 22);
        } else {
          if (descCursor) descCursor.classList.add('done');
          finishDescription();
        }
      };
      setTimeout(typeDesc, 500);
    }
  } else {
    // No description on the page — don't leave the role typewriter waiting forever.
    descriptionTypingDone = true;
  }

  /* ---------------- Home intro: photo + availability card + buttons pixelate in (plays on every visit) ---------------- */
  (function () {
    const photoOverlay = document.getElementById('photoPixelOverlay');
    const dotWrap = document.getElementById('availDotWrap');
    const availTextEl = document.getElementById('availText');
    const availCursor = document.getElementById('availTextCursor');
    const btnWorkOverlay = document.getElementById('btnWorkPixelOverlay');
    const btnAboutOverlay = document.getElementById('btnAboutPixelOverlay');
    if (!photoOverlay || !dotWrap || !availTextEl || !btnWorkOverlay || !btnAboutOverlay) return;

    const AVAIL_TEXT = 'Open to Work';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const showFinalState = () => {
      photoOverlay.remove();
      btnWorkOverlay.remove();
      btnAboutOverlay.remove();
      dotWrap.classList.add('show');
      availTextEl.textContent = AVAIL_TEXT;
      if (availCursor) availCursor.classList.add('done');
    };

    if (reduceMotion) {
      showFinalState();
      return;
    }

    const PHOTO_START_DELAY = 300;
    const PHOTO_DURATION = 1300;

    const TILE_COLORS = ['var(--accent-700)', 'var(--accent-500)', 'var(--accent-300)', 'var(--glitch-a)'];

    const buildTiles = (overlay, cols, rows) => {
      const frag = document.createDocumentFragment();
      const tiles = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tile = document.createElement('div');
          tile.className = 'pixel-tile';
          tile.style.left = (c / cols * 100) + '%';
          tile.style.top = (r / rows * 100) + '%';
          tile.style.width = (100 / cols) + '%';
          tile.style.height = (100 / rows) + '%';
          tile.style.background = TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
          frag.appendChild(tile);
          tiles.push(tile);
        }
      }
      overlay.appendChild(frag);
      return tiles;
    };

    const revealTiles = (tiles, totalDuration, onDone) => {
      const order = tiles.slice();
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const step = totalDuration / order.length;
      order.forEach((tile, i) => {
        setTimeout(() => tile.classList.add('hide'), i * step);
      });
      setTimeout(onDone, totalDuration + 450);
    };

    const typeAvailText = () => {
      let idx = 0;
      const tick = () => {
        idx++;
        availTextEl.textContent = AVAIL_TEXT.slice(0, idx);
        if (idx < AVAIL_TEXT.length) {
          setTimeout(tick, 45);
        } else if (availCursor) {
          availCursor.classList.add('done');
        }
      };
      tick();
    };

    const runButtons = () => {
      const workTiles = buildTiles(btnWorkOverlay, 8, 8);
      const aboutTiles = buildTiles(btnAboutOverlay, 8, 8);
      setTimeout(() => {
        revealTiles(workTiles, PHOTO_DURATION, () => btnWorkOverlay.remove());
        revealTiles(aboutTiles, PHOTO_DURATION, () => btnAboutOverlay.remove());
      }, PHOTO_START_DELAY);
    };

    const runAvailCard = () => {
      // No pixel effect here anymore — just the dot fading in, then the text typing out.
      setTimeout(() => {
        dotWrap.classList.add('show');
        setTimeout(typeAvailText, 300);
      }, PHOTO_START_DELAY);
    };

    const photoTiles = buildTiles(photoOverlay, 8, 8);
    setTimeout(() => {
      revealTiles(photoTiles, PHOTO_DURATION, () => {
        photoOverlay.remove();
      });
    }, PHOTO_START_DELAY);

    runButtons();
    runAvailCard();
  })();

  /* ---------------- Modals (contact + certificate preview) ---------------- */
  const closeModal = (modal) => modal.classList.remove('show');
  const closeAllModals = () => document.querySelectorAll('.modal-backdrop.show').forEach(closeModal);

  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });

  const contactModal = document.getElementById('contactModal');
  document.querySelectorAll('[data-open-contact]').forEach(btn => {
    btn.addEventListener('click', () => contactModal.classList.add('show'));
  });

  /* ---------------- Thank-you popup (after message sent) ---------------- */
  const thankYouModal = document.getElementById('thankYouModal');
  document.querySelectorAll('[data-thankyou-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(thankYouModal));
  });
  document.querySelectorAll('[data-thankyou-again]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(thankYouModal);
      contactModal.classList.add('show');
    });
  });

  /* ---------------- Certificate preview modal ---------------- */
  const certModal = document.getElementById('certModal');
  const certModalImg = document.getElementById('certModalImg');
  const certModalTitle = document.getElementById('certModalTitle');
  const certModalIssuer = document.getElementById('certModalIssuer');
  const certModalDate = document.getElementById('certModalDate');
  const certModalOpenPdf = document.getElementById('certModalOpenPdf');

  document.querySelectorAll('[data-cert-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { title, issuer, date, preview, pdf } = btn.dataset;
      certModalImg.src = preview;
      certModalImg.alt = `${title} certificate preview`;
      certModalTitle.textContent = title;
      certModalIssuer.textContent = issuer;
      certModalDate.textContent = date;
      certModalOpenPdf.href = pdf;
      certModal.classList.add('show');
    });
  });

  /* ---------------- Experience gallery / slideshow modal ---------------- */
  const expGalleryModal = document.getElementById('expGalleryModal');
  if (expGalleryModal) {
    const expGalleryImg = document.getElementById('expGalleryImg');
    const expGalleryTitle = document.getElementById('expGalleryTitle');
    const expGalleryCount = document.getElementById('expGalleryCount');
    const expGalleryDots = document.getElementById('expGalleryDots');
    const expGalleryPrev = document.getElementById('expGalleryPrev');
    const expGalleryNext = document.getElementById('expGalleryNext');
    const expGalleryExit = document.getElementById('expGalleryExit');

    let expImages = [];
    let expIndex = 0;

    const renderExpSlide = () => {
      if (!expImages.length) return;
      expGalleryImg.src = expImages[expIndex];
      expGalleryImg.alt = `${expGalleryTitle.textContent} — photo ${expIndex + 1} of ${expImages.length}`;
      expGalleryCount.textContent = `${expIndex + 1} / ${expImages.length}`;
      expGalleryDots.querySelectorAll('.gallery-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === expIndex);
      });
    };

    const goToExpSlide = (i) => {
      expIndex = (i + expImages.length) % expImages.length;
      renderExpSlide();
    };

    const openExpGallery = (title, images) => {
      expImages = images;
      expIndex = 0;
      expGalleryTitle.textContent = title;
      expGalleryDots.innerHTML = '';
      images.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'gallery-dot';
        dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
        dot.addEventListener('click', () => goToExpSlide(i));
        expGalleryDots.appendChild(dot);
      });
      renderExpSlide();
      expGalleryModal.classList.add('show');
    };

    document.querySelectorAll('[data-exp-gallery]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { title, images } = btn.dataset;
        const list = images.split(',').map(s => s.trim()).filter(Boolean);
        openExpGallery(title, list);
      });
    });

    expGalleryPrev.addEventListener('click', () => goToExpSlide(expIndex - 1));
    expGalleryNext.addEventListener('click', () => goToExpSlide(expIndex + 1));
    expGalleryExit.addEventListener('click', () => closeModal(expGalleryModal));
    expGalleryModal.addEventListener('click', (e) => { if (e.target === expGalleryModal) closeModal(expGalleryModal); });

    document.addEventListener('keydown', (e) => {
      if (!expGalleryModal.classList.contains('show')) return;
      if (e.key === 'ArrowLeft') goToExpSlide(expIndex - 1);
      if (e.key === 'ArrowRight') goToExpSlide(expIndex + 1);
    });
  }

  /* ---------------- Contact form (Formspree) ---------------- */
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = form.getAttribute('action');
    if (!endpoint || endpoint.includes('YOUR_FORM_ID')) {
      status.textContent = 'Contact form isn\u2019t connected yet \u2014 see README.md to plug in your Formspree ID.';
      status.className = 'form-status err';
      return;
    }
    status.textContent = 'Sending\u2026';
    status.className = 'form-status';
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (res.ok) {
        status.textContent = 'Message sent \u2014 thank you! I\u2019ll get back to you soon.';
        status.className = 'form-status ok';
        form.reset();
        closeModal(contactModal);
        thankYouModal.classList.add('show');
      } else {
        status.textContent = 'Something went wrong sending that. Please try again.';
        status.className = 'form-status err';
      }
    } catch (err) {
      status.textContent = 'Network error \u2014 please check your connection and try again.';
      status.className = 'form-status err';
    }
  });

  /* ---------------- Animated background: PCB traces + circuit nodes + binary rain ----------------
     Each panel gets its own trace "profile" — different density, segment
     length, line weight, and node size — so the circuit-board effect feels
     tailored to that section rather than identical everywhere. Home and
     Projects run a bolder, bigger trace pattern; About and Certificates run
     a quieter, finer one. */
  const traceProfiles = {
    home:         { density: 1.2,  seg: 300, lineWidth: 1.6, nodeR: 3.4 },
    about:        { density: 0.8,  seg: 190, lineWidth: 0.9, nodeR: 2.1 },
    experience:   { density: 1,    seg: 230, lineWidth: 1.1, nodeR: 2.6 },
    projects:     { density: 1.35, seg: 320, lineWidth: 1.7, nodeR: 3.6 },
    certificates: { density: 0.75, seg: 180, lineWidth: 0.9, nodeR: 2.1 },
    contact:      { density: 1.05, seg: 250, lineWidth: 1.2, nodeR: 2.8 }
  };
  let currentTraceProfile = traceProfiles.home;

  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, traces = [], particles = [], drops = [];

  function isDark() { return htmlEl.getAttribute('data-theme') === 'dark'; }

  function buildTraces() {
    traces = [];
    const p = currentTraceProfile;
    const count = Math.max(6, Math.floor((w / 170) * p.density));
    for (let i = 0; i < count; i++) {
      let x = Math.random() * w, y = Math.random() * h;
      const points = [[x, y]];
      const segs = 3 + Math.floor(Math.random() * 4);
      for (let s = 0; s < segs; s++) {
        if (Math.random() > 0.5) x += (Math.random() - 0.5) * p.seg; else y += (Math.random() - 0.5) * p.seg;
        points.push([x, y]);
      }
      const nodeIdx = [...new Set([1, Math.floor(segs / 2), segs].filter(n => n < points.length))];
      traces.push({ points, nodeIdx });
    }
  }

  // Called by showPanel() whenever the active section changes, so the
  // trace pattern regenerates to match that panel's profile.
  window.setBgTraceProfile = function (id) {
    currentTraceProfile = traceProfiles[id] || traceProfiles.home;
    if (w && h) buildTraces();
  };

  function buildParticles() {
    const count = Math.max(18, Math.min(70, Math.floor((w * h) / 34000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      r: 1.3 + Math.random() * 1.3
    }));
  }

  function resetDrop(d) {
    d.x = Math.random() * w;
    d.y = -Math.random() * h * 0.5;
    d.speed = 0.35 + Math.random() * 0.55;
    d.char = Math.random() > 0.5 ? '1' : '0';
    d.life = 0;
    d.span = h * 0.9 + 250 + Math.random() * 250;
    return d;
  }
  function buildDrops() {
    const cols = Math.min(46, Math.floor(w / 30));
    drops = Array.from({ length: cols }, () => resetDrop({}));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildTraces(); buildParticles(); buildDrops();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const dark = isDark();
    const traceColor = dark ? 'rgba(157,130,255,0.30)' : 'rgba(46,111,163,0.26)';
    const nodeColor  = dark ? 'rgba(185,167,255,0.62)'  : 'rgba(46,111,163,0.52)';
    const partColor  = dark ? 'rgba(185,167,255,0.6)'  : 'rgba(46,111,163,0.5)';
    const rainRGB    = dark ? '157,130,255' : '46,111,163';

    ctx.lineWidth = currentTraceProfile.lineWidth;
    ctx.strokeStyle = traceColor;
    traces.forEach(t => {
      ctx.beginPath();
      t.points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.stroke();
      ctx.fillStyle = nodeColor;
      t.nodeIdx.forEach(ni => {
        const [x, y] = t.points[ni];
        ctx.beginPath(); ctx.arc(x, y, currentTraceProfile.nodeR, 0, Math.PI * 2); ctx.fill();
      });
    });

    if (!reduceMotion) {
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      });
    }
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(${rainRGB},${(dark ? 0.24 : 0.2) * (1 - dist / 120)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.fillStyle = partColor;
    particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });

    if (!reduceMotion) {
      ctx.font = '13px monospace';
      drops.forEach(d => {
        d.y += d.speed; d.life += d.speed;
        const progress = d.life / d.span;
        let op = progress < 0.15 ? progress / 0.15 : progress > 0.85 ? (1 - progress) / 0.15 : 1;
        op = Math.max(0, Math.min(1, op)) * 0.62;
        ctx.fillStyle = `rgba(${rainRGB},${op})`;
        ctx.fillText(d.char, d.x, d.y);
        if (d.life >= d.span || d.y > h + 40) resetDrop(d);
      });
    }
  }

  function loop() {
    draw();
    if (!reduceMotion) requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', () => { resize(); if (reduceMotion) draw(); });
  loop();

  showPanel('home');
});
