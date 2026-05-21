// Writelingo · marketing site interactions
// Vanilla JS — zero dependencies.

(() => {
  // ── Nav shadow on scroll ─────────────────────────────
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Reveal on scroll (Intersection Observer) ─────────
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  const all = document.querySelectorAll('.reveal, .reveal-lift');
  all.forEach((el) => {
    const parent = el.parentElement;
    if (parent) {
      const sibs = [...parent.children].filter((c) =>
        c.classList.contains('reveal') || c.classList.contains('reveal-lift')
      );
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.transitionDelay = `${Math.min(idx * 80, 320)}ms`;
    }
    io.observe(el);
  });

  // Failsafe: reveal anything already in the viewport on load so nothing
  // stays invisible if IntersectionObserver hasn't fired yet at first paint.
  requestAnimationFrame(() => {
    const vh = window.innerHeight;
    all.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add('in');
    });
  });

  // ── Hero typewriter cycle ───────────────────────────────────
  // Cycles through "Use it." → "Practice it." → "Write it." → ...
  const tw = document.getElementById('typewriter');
  if (tw && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    const words = (tw.dataset.words || tw.textContent || '').split('|').filter(Boolean);
    if (words.length > 1) {
      let i = 0;
      let charIdx = words[0].length; // start fully-typed
      let phase = 'hold-full';        // 'typing' | 'hold-full' | 'deleting' | 'hold-empty'
      const TYPE_MS = 75;
      const DEL_MS = 40;
      // "Use it." is the anchor / canonical headline — hold it longer.
      const holdFor = (word) => /use it/i.test(word) ? 4200 : 1800;
      const HOLD_EMPTY_MS = 240;

      const tick = () => {
        const cur = words[i];
        if (phase === 'typing') {
          charIdx++;
          tw.textContent = cur.slice(0, charIdx);
          if (charIdx >= cur.length) {
            phase = 'hold-full';
            setTimeout(tick, holdFor(cur));
            return;
          }
          setTimeout(tick, TYPE_MS);
        } else if (phase === 'deleting') {
          charIdx--;
          tw.textContent = cur.slice(0, Math.max(0, charIdx));
          if (charIdx <= 0) {
            phase = 'hold-empty';
            i = (i + 1) % words.length;
            charIdx = 0;
            setTimeout(tick, HOLD_EMPTY_MS);
            return;
          }
          setTimeout(tick, DEL_MS);
        } else if (phase === 'hold-full') {
          phase = 'deleting';
          tick();
        } else if (phase === 'hold-empty') {
          phase = 'typing';
          tick();
        }
      };
      // Kick off after first paint so initial 'Use it.' is visible briefly.
      setTimeout(() => {
        phase = 'hold-full';
        setTimeout(tick, holdFor(words[i]));
      }, 0);
    }
  }

  // ── Scroll-driven Polish state machine for the 4 app cards ───
  // As the user scrolls into the cards section, each card walks
  // idle → polishing → polished. Each card has a slight stagger so
  // they don't all flip at once.
  const cards = [...document.querySelectorAll('.app-card')];
  cards.forEach((c) => {
    // Hero mini cards live in the viewport already — start them in 'polishing'
    // so the very first scroll tick can flip the earliest one to 'polished'.
    const initial = c.classList.contains('app-card-mini') ? 'polishing' : 'idle';
    c.setAttribute('data-state', initial);
  });

  const STAGGER_VH = 0.06; // each subsequent card lags by 6% of viewport

  const updateCardStates = () => {
    if (!cards.length) return;
    const vh = window.innerHeight;
    cards.forEach((card) => {
      const siblings = [...card.parentElement.children]
        .filter((c) => c.classList && c.classList.contains('app-card'));
      const idx = siblings.indexOf(card);

      let next;
      if (card.classList.contains('app-card-mini')) {
        // Hero floating cards — fire in a fixed visual order: TL → TR → BL → BR
        // (regardless of DOM order). First flips fast (25 px), then 90 px gaps.
        const ORDER = ['float-tl', 'float-tr', 'float-bl', 'float-br'];
        let orderIdx = 0;
        for (let i = 0; i < ORDER.length; i++) {
          if (card.classList.contains(ORDER[i])) { orderIdx = i; break; }
        }
        const triggerPx = 25 + orderIdx * 90;  // 25, 115, 205, 295
        next = window.scrollY >= triggerPx ? 'polished' : 'polishing';
      } else {
        // Section cards — viewport-relative threshold, larger transition.
        const r = card.getBoundingClientRect();
        const stagger = idx * STAGGER_VH * vh;
        const start = vh * 0.95 - stagger;
        const middle = vh * 0.55 - stagger;
        if (r.top > start) next = 'idle';
        else if (r.top > middle) next = 'polishing';
        else next = 'polished';
      }

      if (card.dataset.state !== next) {
        card.dataset.state = next;
        // Re-trigger bloom + check-draw by restarting animations
        if (next === 'polished') {
          const pill = card.querySelector('.mini-pill');
          if (pill) {
            pill.style.animation = 'none';
            // force reflow
            void pill.offsetWidth;
            pill.style.animation = '';
          }
        }
      }
    });
  };

  window.addEventListener('scroll', updateCardStates, { passive: true });
  window.addEventListener('resize', updateCardStates);
  requestAnimationFrame(updateCardStates);

  // ── Quiz section: scroll-driven mouse + answer + card flip ──
  const quizStage = document.querySelector('.quiz-stage');
  if (quizStage) {
    const quizSec = quizStage.closest('.quiz-sec');
    const updateQuiz = () => {
      const r = quizSec.getBoundingClientRect();
      const vh = window.innerHeight;
      // Trigger off the stage's top entering the viewport from the bottom.
      const stageTop = quizStage.getBoundingClientRect().top;
      // Map scroll position to one of 4 stages:
      //   0 idle  → 1 cursor arrives → 2 click/highlight → 3 card flicks away
      let stage = 0;
      if (stageTop < vh * 0.90) stage = 1;
      const answerAt = vh * 0.55;
      if (stageTop < answerAt) stage = 2;
      if (stageTop < answerAt - 40) stage = 3;
      // Past the section: settle on stage 3 (Q2 visible)
      if (r.bottom < 0) stage = 3;
      if (quizStage.dataset.stage !== String(stage)) {
        quizStage.dataset.stage = String(stage);
      }
    };
    window.addEventListener('scroll', updateQuiz, { passive: true });
    window.addEventListener('resize', updateQuiz);
    requestAnimationFrame(updateQuiz);
  }

  // ── Build the sidebar heatmap (8 weeks × 7 days, col-major) ──
  // Same seeded-random method as panel-home.jsx's genDailyActivity().
  const hm = document.getElementById('heatmap');
  const months = document.getElementById('hm-months');
  if (hm) {
    const WEEKS = 8;
    const DAYS = WEEKS * 7;
    const anchor = new Date('2026-05-14');
    anchor.setHours(0, 0, 0, 0);

    let seed = 11;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    // Burn the first ~283 calls so we land on the same tail the real app shows.
    for (let k = 0; k < (371 - DAYS) * 2; k++) rnd();

    const cells = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i);
      const dow = d.getDay();
      const weekday = dow >= 1 && dow <= 5;
      const recency = 1 + (DAYS - i) / DAYS * 0.35;
      let count = Math.floor(((weekday ? 5 : 2) + rnd() * (weekday ? 9 : 5)) * recency);
      if (rnd() < 0.12) count = 0;
      if (rnd() < 0.06) count += Math.floor(8 + rnd() * 14);
      if (i === 0) count = 14;
      cells.push({ d, count });
    }

    const bucket = (c) => c === 0 ? 0 : c <= 3 ? 1 : c <= 7 ? 2 : c <= 14 ? 3 : 4;

    // 8 cols × 7 rows, fill row-by-row in DOM but column-major semantically:
    // index in cells[] = col*7 + row. We want grid filled row-major in DOM,
    // so cell at (row, col) -> cells[col*7 + row].
    hm.innerHTML = '';
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < WEEKS; c++) {
        const day = cells[c * 7 + r];
        const el = document.createElement('div');
        el.className = 'cell l' + bucket(day.count);
        el.title = `${day.count} polished · ${day.d.toDateString().slice(4, 10)}`;
        hm.appendChild(el);
      }
    }

    // Month labels — first column where month changes shows the month name.
    if (months) {
      const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const marks = new Array(WEEKS).fill('');
      let lastMonth = -1;
      for (let c = 0; c < WEEKS; c++) {
        const m = cells[c * 7].d.getMonth();
        if (m !== lastMonth) { marks[c] = MN[m]; lastMonth = m; }
      }
      months.innerHTML = marks.map((m) => `<span>${m}</span>`).join('');
    }
  }
})();
