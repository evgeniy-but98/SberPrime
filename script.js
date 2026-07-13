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

  /* ---- отслеживание активной главы ----------------------------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const idx = panels.indexOf(e.target);
      if (idx < 0) return;
      current = idx;
      e.target.classList.add('in-view');
      railItems.forEach((it, k) => it.setAttribute('aria-current', k === idx ? 'true' : 'false'));
      progress.style.width = ((idx) / (panels.length - 1) * 100) + '%';
      document.body.classList.toggle('is-cover', idx === 0);
    });
  }, { threshold: 0.55 });
  panels.forEach((p) => io.observe(p));

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

  /* ---- подсказка «листайте» + кнопка «к началу» ---------------------- */
  const hint = document.querySelector('.scroll-hint');
  if (hint) hint.addEventListener('click', () => goTo(1));
  const restart = document.querySelector('.restart');
  if (restart) restart.addEventListener('click', () => goTo(0));

  /* ---- фоновая музыка ------------------------------------------------- */
  const audio = document.getElementById('bg-audio');
  const toggle = document.querySelector('.sound-toggle');
  let wantsSound = false;

  function setSound(on) {
    wantsSound = on;
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', on ? 'Выключить фоновую музыку' : 'Включить фоновую музыку');
    if (on) {
      audio.play().catch(() => {/* нет файла или блок автоплея — просто ждём клика */ });
    } else {
      audio.pause();
    }
  }
  toggle.addEventListener('click', () => setSound(!wantsSound));

  // мягкая попытка запустить музыку при первом взаимодействии со страницей
  const kickstart = () => {
    if (!wantsSound) { setSound(true); }
    window.removeEventListener('pointerdown', kickstart);
    window.removeEventListener('keydown', kickstart);
  };
  window.addEventListener('pointerdown', kickstart, { once: true });
  window.addEventListener('keydown', kickstart, { once: true });

  /* ---- кнопки play на видео-фреймах (заглушка под наполнение) --------- */
  document.querySelectorAll('.playbtn').forEach((b) => {
    b.addEventListener('click', () => {
      b.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }],
        { duration: 220, easing: 'ease' }
      );
      // здесь позже подключается реальное <video>.play()
    });
  });

  /* стартовое состояние */
  panels[0].classList.add('in-view');
  document.body.classList.add('is-cover');
})();
