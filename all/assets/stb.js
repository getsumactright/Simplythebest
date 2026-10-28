/* Simply The Best Drywall — shared behaviour for all four options.
 *
 * Skim     [data-skim]      A hairline crack draws itself across the element,
 *                           then a taping knife wipes it away. Plays once when
 *                           scrolled into view. Fires `skim:done` on the element.
 *                           [data-skim-replay="#id"] on a button replays it.
 * Compare  [data-compare]   Before/after slider driven by a native range input,
 *                           so keyboard and screen readers work for free.
 * Reveal   [data-reveal]    Adds .is-in when an element enters the viewport.
 *
 * Everything respects prefers-reduced-motion: the crack is never shown, the
 * slider doesn't auto-sweep, and reveals are instant.
 */
(function () {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Skim ---------- */

  function seeded(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function crackPaths(r) {
    const W = 1000, H = 200;
    // A real settlement crack: a gentle overall drift with fine, sharp jitter.
    let x = 0, y = H * (0.42 + r() * 0.16), drift = (r() - 0.5) * 0.4;
    const pts = [[x, y]];
    while (x < W) {
      x += W * (0.008 + r() * 0.022);
      if (r() < 0.12) drift = (r() - 0.5) * 0.5;
      y += drift * H * 0.05 + (r() - 0.5) * H * 0.07;
      y = Math.max(H * 0.28, Math.min(H * 0.72, y));
      pts.push([Math.min(x, W), y]);
    }
    const main = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    let branch = '';
    for (let i = 0; i < 4; i++) {
      let [bx, by] = pts[4 + Math.floor(r() * (pts.length - 8))];
      const dir = r() < 0.5 ? -1 : 1;
      branch += 'M' + bx.toFixed(1) + ' ' + by.toFixed(1);
      for (let j = 0; j < 4; j++) {
        bx += W * (0.006 + r() * 0.012);
        by += dir * H * (0.02 + r() * 0.05);
        branch += ' L' + bx.toFixed(1) + ' ' + by.toFixed(1);
      }
    }
    return { main, branch };
  }

  const KNIFE = `
    <svg viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skimSteel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="var(--skim-steel-hi, #f4f6f7)"/>
          <stop offset=".55" stop-color="var(--skim-steel, #b9c0c6)"/>
          <stop offset="1" stop-color="var(--skim-steel-lo, #8a939b)"/>
        </linearGradient>
      </defs>
      <path d="M58 64 L112 8 L118 8 L118 162 L112 162 L58 106 Z" fill="url(#skimSteel)"/>
      <path d="M112 8 L118 8 L118 162 L112 162 Z" fill="var(--skim-edge, #ffffff)" opacity=".7"/>
      <rect x="44" y="62" width="18" height="46" rx="3" fill="var(--skim-steel-lo, #8a939b)"/>
      <rect x="2" y="68" width="46" height="34" rx="12" fill="var(--skim-handle, #2a2f33)"/>
      <circle cx="16" cy="85" r="5" fill="var(--skim-hole, rgba(255,255,255,.35))"/>
    </svg>`;

  function buildSkim(el, index) {
    const r = seeded(Number(el.dataset.skimSeed) || 97 + index * 131);
    const { main, branch } = crackPaths(r);
    const layer = document.createElement('div');
    layer.className = 'skim';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
      <svg class="skim-crack" viewBox="0 0 1000 200" preserveAspectRatio="none">
        <path class="skim-crack-lip" d="${main}" pathLength="1"/>
        <path class="skim-crack-line" d="${main}" pathLength="1"/>
        <path class="skim-crack-branch" d="${branch}" pathLength="1"/>
      </svg>
      <div class="skim-track"><div class="skim-sheen"></div><div class="skim-knife${el.dataset.skimKnife ? ' skim-knife--img' : ''}">${
        el.dataset.skimKnife ? `<img src="${el.dataset.skimKnife}" alt="" decoding="async">` : KNIFE
      }</div></div>`;
    el.appendChild(layer);
    return layer;
  }

  function playSkim(el) {
    const layer = el.querySelector('.skim');
    if (!layer || el.dataset.skimPlaying) return;
    const done = () => {
      delete el.dataset.skimPlaying;
      el.classList.add('is-skimmed');
      el.dispatchEvent(new CustomEvent('skim:done', { bubbles: true }));
    };
    el.classList.remove('is-skimmed');
    if (reduce.matches || !layer.animate) {
      layer.style.visibility = 'hidden';
      done();
      return;
    }
    el.dataset.skimPlaying = '1';
    layer.style.visibility = '';

    const crack = layer.querySelector('.skim-crack');
    const lines = layer.querySelectorAll('.skim-crack-lip, .skim-crack-line');
    const branch = layer.querySelector('.skim-crack-branch');
    const track = layer.querySelector('.skim-track');
    const knife = layer.querySelector('.skim-knife');
    const sheen = layer.querySelector('.skim-sheen');

    const draw = [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }];
    const WIPE_AT = 1350, WIPE = 1500;
    const wipeEase = 'cubic-bezier(.55,.05,.25,1)';

    lines.forEach(l => l.animate(draw, { duration: 1000, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'both' }));
    branch.animate(draw, { duration: 600, delay: 550, easing: 'ease-out', fill: 'both' });
    crack.animate([{ opacity: 1 }], { duration: 1, fill: 'both' });

    // The crack is clipped away at exactly the knife's leading edge.
    crack.animate(
      [{ clipPath: 'inset(-10% 0 -10% 0%)' }, { clipPath: 'inset(-10% 0 -10% 100%)' }],
      { duration: WIPE, delay: WIPE_AT, easing: wipeEase, fill: 'both' }
    );
    // The track is zero-width and slides by `left`, so it never extends the page.
    track.animate(
      [{ left: '0%' }, { left: '100%' }],
      { duration: WIPE, delay: WIPE_AT, easing: wipeEase, fill: 'both' }
    );
    knife.animate(
      [
        { opacity: 0, rotate: '-14deg' },
        { opacity: 1, rotate: '-9deg', offset: 0.12 },
        { opacity: 1, rotate: '-6deg', offset: 0.86 },
        { opacity: 0, rotate: '-3deg' },
      ],
      { duration: WIPE + 250, delay: WIPE_AT - 120, easing: 'linear', fill: 'both' }
    );
    sheen.animate(
      [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0.9, offset: 0.8 }, { opacity: 0 }],
      { duration: WIPE + 500, delay: WIPE_AT, easing: 'ease-out', fill: 'both' }
    ).finished.then(done);
  }

  function initSkim() {
    const els = document.querySelectorAll('[data-skim]');
    els.forEach((el, i) => buildSkim(el, i));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          setTimeout(() => playSkim(e.target), Number(e.target.dataset.skimDelay) || 250);
        }
      });
    }, { threshold: 0.6 });
    els.forEach(el => io.observe(el));

    document.querySelectorAll('[data-skim-replay]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.querySelector(btn.dataset.skimReplay);
        if (target) playSkim(target);
      });
    });
  }

  /* ---------- Compare ---------- */

  function initCompare() {
    document.querySelectorAll('[data-compare]').forEach(fig => {
      const input = fig.querySelector('input[type="range"]');
      const set = v => {
        fig.style.setProperty('--pos', v + '%');
        input.setAttribute('aria-valuetext', `${Math.round(v)}% before`);
      };
      set(input.value);
      input.addEventListener('input', () => { fig.dataset.touched = '1'; set(input.value); });

      if (reduce.matches || !('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const start = performance.now(), from = Number(input.value);
        const hint = t => {
          if (fig.dataset.touched) return;
          const k = Math.min((t - start) / 2200, 1);
          const v = from + Math.sin(k * Math.PI * 2) * 18 * (1 - k);
          input.value = v;
          set(v);
          if (k < 1) requestAnimationFrame(hint);
        };
        setTimeout(() => requestAnimationFrame(hint), 500);
      }, { threshold: 0.7 });
      io.observe(fig);
    });
  }

  /* ---------- Reveal ---------- */

  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (reduce.matches || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ---------- Demo form ---------- */

  function initForms() {
    document.querySelectorAll('form[data-demo-form]').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const note = form.querySelector('[data-form-status]');
        if (note) note.textContent = 'Demo only. This form gets connected to Ray’s inbox at launch.';
      });
    });
  }

  /* ---------- Loops: play only while on screen; never under reduced motion ---------- */

  function initVideo() {
    document.querySelectorAll('video[data-loop]').forEach(v => {
      if (reduce.matches) { v.removeAttribute('autoplay'); v.pause(); v.controls = true; return; }
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      }, { threshold: 0.25 });
      io.observe(v);
    });
  }

  function init() { initSkim(); initCompare(); initReveal(); initForms(); initVideo(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.Skim = { play: playSkim };
})();
