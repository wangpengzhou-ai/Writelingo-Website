// Writelingo · marketing site interactions
// Vanilla JS — zero dependencies.

(() => {
  // ── Nav shadow on scroll ─────────────────────────────
  const nav = document.getElementById('nav');
  let navScrolled = false;
  const onScroll = () => {
    const next = window.scrollY > 12;
    if (next === navScrolled) return;
    navScrolled = next;
    nav.classList.toggle('scrolled', navScrolled);
  };
  onScroll();

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

  // ── Hero stage: keep the desktop composition, scaled down when needed ─
  const heroStage = document.querySelector('.hero-stage');
  const heroStageInner = document.querySelector('.hero-stage-inner');
  const updateHeroStageScale = () => {
    if (!heroStage || !heroStageInner) return;

    const layoutWidth = 1040;
    const available = Math.max(280, window.innerWidth - 28);
    const layoutHeight = heroStageInner.offsetHeight || 620;
    const stageTop = heroStage.getBoundingClientRect().top;
    const availableHeight = Math.max(170, window.innerHeight - stageTop - 18);
    const widthScale = available / layoutWidth;
    const heightScale = availableHeight / layoutHeight;
    let scale;
    if (window.innerWidth >= 1100) {
      scale = 1;
    } else {
      const maxByWidth = Math.min(1, widthScale);
      const comfortMin =
        window.innerWidth >= 900 ? 0.68 :
        window.innerWidth >= 640 ? 0.56 :
        0.22;
      scale = Math.min(maxByWidth, Math.max(heightScale, comfortMin));
    }

    heroStage.classList.toggle('is-scaled', scale < 0.995);

    heroStage.style.setProperty('--hero-stage-layout-width', `${layoutWidth}px`);
    heroStage.style.setProperty('--hero-stage-scale', scale.toFixed(4));
    heroStage.style.setProperty('--hero-stage-scaled-height', `${Math.ceil(layoutHeight * scale)}px`);

    // The floating cards are absolutely positioned, so offsetHeight can miss
    // their visual bottom. Refine once from real post-transform bounds.
    if (scale < 0.995 && window.innerWidth < 640) {
      void heroStage.offsetHeight;
      const visibleBottom = window.innerHeight - 18;
      const bounds = [
        heroStage.querySelector('.app-mockup'),
        ...heroStage.querySelectorAll('.app-card-mini'),
      ].filter(Boolean).map((el) => el.getBoundingClientRect());
      const maxBottom = Math.max(...bounds.map((r) => r.bottom));
      if (maxBottom > visibleBottom) {
        const visualSpan = maxBottom - stageTop;
        const fit = scale * ((visibleBottom - stageTop) / visualSpan);
        scale = Math.max(0.22, Math.min(scale, fit));
        heroStage.style.setProperty('--hero-stage-scale', scale.toFixed(4));
        heroStage.style.setProperty('--hero-stage-scaled-height', `${Math.ceil(layoutHeight * scale)}px`);
      }
    }
  };
  updateHeroStageScale();
  requestAnimationFrame(updateHeroStageScale);
  setTimeout(updateHeroStageScale, 180);
  setTimeout(updateHeroStageScale, 520);

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
  const MINI_ORDER = ['float-tl', 'float-tr', 'float-bl', 'float-br'];
  const cardMeta = cards.map((card) => {
    const siblings = [...card.parentElement.children]
      .filter((c) => c.classList && c.classList.contains('app-card'));
    const orderIdx = MINI_ORDER.findIndex((cls) => card.classList.contains(cls));
    return {
      card,
      idx: siblings.indexOf(card),
      isMini: card.classList.contains('app-card-mini'),
      orderIdx: orderIdx === -1 ? 0 : orderIdx,
    };
  });

  const updateCardStates = () => {
    if (!cards.length) return;
    const vh = window.innerHeight;
    cardMeta.forEach(({ card, idx, isMini, orderIdx }) => {
      let next;
      if (isMini) {
        // Hero floating cards — fire in a fixed visual order: TL → TR → BL → BR
        // (regardless of DOM order). First flips fast (25 px), then 90 px gaps.
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

  // ── Quiz section: scroll-driven mouse + answer + card flip ──
  const quizStage = document.querySelector('.quiz-stage');
  let updateQuiz = null;
  if (quizStage) {
    const quizSec = quizStage.closest('.quiz-sec');
    let answeredAtScrollY = null;
    let answerGateArmed = false;
    let answerGateTimer = null;
    let flippedAtScrollY = null;
    let flipGateArmed = false;
    let flipGateTimer = null;
    let q4HoverAtScrollY = null;
    let q4AnswerGateArmed = false;
    let q4AnswerGateTimer = null;
    updateQuiz = () => {
      const r = quizSec.getBoundingClientRect();
      const vh = window.innerHeight;
      // Trigger off the stage's top entering the viewport from the bottom.
      const stageTop = quizStage.getBoundingClientRect().top;
      // Map scroll position to staged story beats:
      //   0 idle → 1 cursor arrives → 2 answer Q2 → 3 deal Q4
      //   → 4 hover Q4 answer → 5 answer Q4
      let stage = 0;
      if (stageTop < vh * 0.90) stage = 1;
      const answerAt = vh * 0.55;
      if (stageTop < answerAt) stage = 2;

      if (stage < 2) {
        answeredAtScrollY = null;
        answerGateArmed = false;
        flippedAtScrollY = null;
        flipGateArmed = false;
        q4HoverAtScrollY = null;
        q4AnswerGateArmed = false;
        if (answerGateTimer) {
          clearTimeout(answerGateTimer);
          answerGateTimer = null;
        }
        if (flipGateTimer) {
          clearTimeout(flipGateTimer);
          flipGateTimer = null;
        }
        if (q4AnswerGateTimer) {
          clearTimeout(q4AnswerGateTimer);
          q4AnswerGateTimer = null;
        }
      } else if (answeredAtScrollY == null) {
        answeredAtScrollY = window.scrollY;
        answerGateArmed = false;
        if (answerGateTimer) clearTimeout(answerGateTimer);
        answerGateTimer = setTimeout(() => {
          answeredAtScrollY = window.scrollY;
          answerGateArmed = true;
          scheduleScrollWork();
        }, 90);
      }

      if (
        stage >= 2 &&
        (
          (answerGateArmed &&
            answeredAtScrollY != null &&
            window.scrollY >= answeredAtScrollY + 100) ||
          stageTop < vh * 0.20
        )
      ) {
        stage = 3;
      }

      if (stage < 3) {
        flippedAtScrollY = null;
        flipGateArmed = false;
        if (flipGateTimer) {
          clearTimeout(flipGateTimer);
          flipGateTimer = null;
        }
      } else if (flippedAtScrollY == null) {
        flippedAtScrollY = window.scrollY;
        flipGateArmed = false;
        if (flipGateTimer) clearTimeout(flipGateTimer);
        flipGateTimer = setTimeout(() => {
          flippedAtScrollY = window.scrollY;
          flipGateArmed = true;
          scheduleScrollWork();
        }, 420);
      }

      if (
        stage >= 3 &&
        (
          (flipGateArmed &&
            flippedAtScrollY != null &&
            window.scrollY >= flippedAtScrollY + 56) ||
          stageTop < vh * 0.08
        )
      ) {
        stage = 4;
      }

      if (stage < 4) {
        q4HoverAtScrollY = null;
        q4AnswerGateArmed = false;
        if (q4AnswerGateTimer) {
          clearTimeout(q4AnswerGateTimer);
          q4AnswerGateTimer = null;
        }
      } else if (q4HoverAtScrollY == null) {
        q4HoverAtScrollY = window.scrollY;
        q4AnswerGateArmed = false;
        if (q4AnswerGateTimer) clearTimeout(q4AnswerGateTimer);
        q4AnswerGateTimer = setTimeout(() => {
          q4HoverAtScrollY = window.scrollY;
          q4AnswerGateArmed = true;
          scheduleScrollWork();
        }, 820);
      }

      if (
        stage >= 4 &&
        q4AnswerGateArmed &&
        (
          q4HoverAtScrollY == null ||
          window.scrollY >= q4HoverAtScrollY + 28 ||
          stageTop < vh * 0.08
        )
      ) {
        stage = 5;
      }
      // Past the section: settle on the final answered Q4 state.
      if (r.bottom < 0) stage = 5;
      if (quizStage.dataset.stage !== String(stage)) {
        quizStage.dataset.stage = String(stage);
      }
    };
  }

  let scrollWorkQueued = false;
  const runScrollWork = () => {
    scrollWorkQueued = false;
    onScroll();
    updateCardStates();
    if (updateQuiz) updateQuiz();
  };
  const scheduleScrollWork = () => {
    if (scrollWorkQueued) return;
    scrollWorkQueued = true;
    requestAnimationFrame(runScrollWork);
  };
  window.addEventListener('scroll', scheduleScrollWork, { passive: true });
  window.addEventListener('resize', () => {
    updateHeroStageScale();
    scheduleScrollWork();
  });
  requestAnimationFrame(runScrollWork);
  setTimeout(scheduleScrollWork, 160);
  setTimeout(scheduleScrollWork, 420);

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
