/* =========================================================================
   Сделали мой день — режиссёрский тритмент
   Навигация колесом/клавишами/свайпом · музыка · reveal
   ========================================================================= */
(() => {
  'use strict';

  const deck = document.getElementById('deck');
  const panels = Array.from(deck.querySelectorAll('.panel'));
  const railList = document.querySelector('.rail__list');
  const progress = document.querySelector('.topbar-progress__fill');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 0;
  let locked = false;

  /* ---- строим боковую рейку глав ------------------------------------- */
  panels.forEach((panel, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'rail__item';
    btn.type = 'button';
    btn.setAttribute('aria-current', i === 0 ? 'true' : 'false');
    btn.setAttribute('aria-label', `Глава ${i}: ${panel.dataset.label || ''}`);
    btn.innerHTML =
      `<span class="rail__dot"></span><span class="rail__name">${panel.dataset.label || ''}</span>`;
    btn.addEventListener('click', () => goTo(i));
    li.appendChild(btn);
    railList.appendChild(li);
  });
  const railItems = Array.from(railList.querySelectorAll('.rail__item'));

  /* ---- переход к главе ------------------------------------------------ */
  function goTo(i) {
    i = Math.max(0, Math.min(panels.length - 1, i));
    if (i === current && locked) return;
    current = i;
    panels[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    lock();
  }
  function lock() {
    locked = true;
    clearTimeout(lock._t);
    lock._t = setTimeout(() => { locked = false; }, reduce ? 120 : 780);
  }

  /* ---- reveal-контента: срабатывает даже для панелей выше экрана -------
     (низкий порог — иначе высокая панель никогда не наберёт 55% видимости
     и её содержимое так и осталось бы невидимым) */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in-view'); });
  }, { threshold: 0.12 });
  panels.forEach((p) => revealIO.observe(p));

  /* ---- активная глава = та, что пересекает линию ~42% высоты вьюпорта --
     надёжно для панелей любой высоты (в отличие от порога видимости) */
  function updateCurrent() {
    const line = window.innerHeight * 0.42;
    let idx = current;
    for (let i = 0; i < panels.length; i++) {
      const r = panels[i].getBoundingClientRect();
      if (r.top <= line && r.bottom > line) { idx = i; break; }
    }
    panels[idx].classList.add('in-view');
    if (idx === current) return;
    current = idx;
    railItems.forEach((it, k) => it.setAttribute('aria-current', k === idx ? 'true' : 'false'));
    progress.style.width = (idx / (panels.length - 1) * 100) + '%';
    document.body.classList.toggle('is-cover', idx === 0);
  }
  let ticking = false;
  deck.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateCurrent(); ticking = false; });
  }, { passive: true });

  /* ---- колесо мыши: один щелчок = одна глава (только тонкий указатель) - */
  const fine = matchMedia('(pointer: fine)').matches;
  if (fine) {
    let acc = 0;
    deck.addEventListener('wheel', (e) => {
      // низкий экран — отдаём прокрутку браузеру
      if (window.innerHeight < 700) return;

      const sec = panels[current];
      const dir = e.deltaY > 0 ? 1 : -1;

      // если глава выше вьюпорта — даём доскроллить её содержимое, ловим только край
      if (sec.offsetHeight > window.innerHeight + 4) {
        const r = sec.getBoundingClientRect();
        if (dir > 0 && r.bottom > window.innerHeight + 2) return;
        if (dir < 0 && r.top < -2) return;
      }

      e.preventDefault();
      if (locked) return;
      acc += e.deltaY;
      if (Math.abs(acc) < 24) return;
      goTo(current + dir);
      acc = 0;
    }, { passive: false });
  }

  /* ---- клавиатура ---------------------------------------------------- */
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(k)) { e.preventDefault(); goTo(current + 1); }
    else if (['ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); goTo(current - 1); }
    else if (k === 'Home') { e.preventDefault(); goTo(0); }
    else if (k === 'End') { e.preventDefault(); goTo(panels.length - 1); }
  });

  /* ---- тач-устройства -------------------------------------------------
     На телефоне за прокрутку и снап отвечает нативный CSS scroll-snap
     (proximity): один свайп — один экран, а высокие панели можно спокойно
     дочитать. Раньше здесь был свой goTo на touchend — он срабатывал ПОВЕРХ
     нативного снапа и вызывал резкие перескакивания через страницу. Убрано. */

  /* ---- кнопки-переходы (Начать / К началу / любые [data-goto]) -------- */
  document.querySelectorAll('[data-goto]').forEach((b) => {
    b.addEventListener('click', () => goTo(parseInt(b.dataset.goto, 10) || 0));
  });

  /* ---- видео: автозапуск только для активной панели ------------------- */
  const safePlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const vids = Array.from(document.querySelectorAll('video.vframe'));

  // проигрываем, когда кадр в зоне видимости, и ставим на паузу, когда ушёл —
  // так одновременно работает 1–2 ролика, а не все сразу (экономим ресурсы).
  const vIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!reduce && !v.dataset.userPaused) safePlay(v);
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { threshold: 0.35 });
  vids.forEach((v) => vIO.observe(v));

  // клик по кадру (или кнопке play) — ручная пауза/воспроизведение + смена иконки
  document.querySelectorAll('.videoframe__media').forEach((media) => {
    const v = media.querySelector('video.vframe');
    const btn = media.querySelector('.playbtn');
    if (!v) {
      // плейсхолдер без видео (пэкшот/логошот) — только лёгкий отклик кнопки
      if (btn) btn.addEventListener('click', () => btn.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }],
        { duration: 220, easing: 'ease' }));
      return;
    }
    const frame = media.closest('.videoframe, .vcard');
    const useEl = btn && btn.querySelector('use');
    const sync = () => {
      const playing = !v.paused;
      if (frame) frame.classList.toggle('is-playing', playing);
      if (useEl) useEl.setAttribute('href', playing ? '#i-pause' : '#i-play');
    };
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    media.addEventListener('click', () => {
      if (v.paused) { delete v.dataset.userPaused; safePlay(v); }
      else { v.pause(); v.dataset.userPaused = '1'; }
    });
  });

  /* ---- фоновая музыка / музыкальный референс -------------------------- */
  const audio = document.getElementById('bg-audio');
  const toggle = document.querySelector('.sound-toggle');
  const refBtn = document.querySelector('.ref-toggle');
  let wantsSound = false;

  function setSound(on) {
    wantsSound = on;
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', on ? 'Выключить фоновую музыку' : 'Включить фоновую музыку');
    if (refBtn) {
      refBtn.setAttribute('aria-pressed', String(on));
      const label = refBtn.querySelector('.ref-toggle__label');
      if (label) label.textContent = on ? 'Выключить референс' : 'Включить референс';
    }
    if (on) {
      audio.play().catch(() => {/* нет файла или блок автоплея — ждём клика */ });
    } else {
      audio.pause();
    }
  }
  // музыку включает сам пользователь (кнопка звука или референс в разделе 09)
  toggle.addEventListener('click', () => setSound(!wantsSound));
  if (refBtn) refBtn.addEventListener('click', () => setSound(!wantsSound));

  /* стартовое состояние */
  panels[0].classList.add('in-view');
  document.body.classList.add('is-cover');
  updateCurrent();
})();
