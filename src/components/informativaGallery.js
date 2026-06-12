// Galeria 3D de la Web informativa.
// initGallery(container, { onOpen }) engancha el comportamiento sobre un
// contenedor ya renderizado por React y devuelve una funcion de limpieza.
// onOpen(index) se llama al abrir una tarjeta y onOpen(-1) al cerrarla.
export function initGallery(container, { onOpen } = {}) {
  if (!container) return () => {};

  const items = Array.from(container.querySelectorAll(".item"));
  if (!items.length) return () => {};

  const bands = [
    "is-hover-main",
    ["is-left-1", "is-right-1"],
    ["is-left-2", "is-right-2"],
    ["is-left-3", "is-right-3"],
    ["is-left-4", "is-right-4"],
  ];

  let openIndex = -1;
  let hoverIndex = -1;

  let padLeft = 0;
  let firstCenter = 0;
  let step = 0;
  let epsBase = 12;
  let prevX = null;
  let prevT = 0;

  const notify = (idx) => {
    if (typeof onOpen === "function") onOpen(idx);
  };

  function metric() {
    const cs = getComputedStyle(container);
    padLeft = parseFloat(cs.paddingLeft) || 0;
    const w = items[0]?.offsetWidth || 0;
    const gap = parseFloat(cs.gap) || 0;
    step = w + gap;
    firstCenter = (items[0]?.offsetLeft || 0) + w / 2;
    epsBase = Math.max(10, step * 0.08);
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const indexFromX = (x) => clamp(Math.round((x - firstCenter) / step), 0, items.length - 1);
  const centerFor = (i) => firstCenter + i * step;

  function clearClasses() {
    items.forEach((el) => (el.className = "item"));
  }

  function applyHoverState(idx) {
    clearClasses();
    if (idx < 0) return;
    container.classList.add("hovering");
    items[idx].classList.add(bands[0]);
    for (let d = 1; d < bands.length; d += 1) {
      const L = idx - d;
      const R = idx + d;
      if (L >= 0) items[L].classList.add(bands[d][0]);
      if (R < items.length) items[R].classList.add(bands[d][1]);
    }
  }

  function centerItem(idx) {
    const wrap = container.getBoundingClientRect();
    const it = items[idx].getBoundingClientRect();
    const centerX = wrap.left + wrap.width / 2;
    const delta = centerX - (it.left + it.width / 2);
    const maxShift = wrap.width * 0.35;
    const clamped = clamp(delta, -maxShift, maxShift);
    container.style.setProperty("--shift", `${clamped.toFixed(1)}px`);
  }

  function resetShift() {
    container.style.setProperty("--shift", "0px");
  }

  function openItem(idx) {
    clearClasses();
    container.classList.add("is-open");
    items[idx].classList.add("is-open");
    openIndex = idx;
    centerItem(idx);
    notify(idx);
  }

  function closeOpen() {
    openIndex = -1;
    container.classList.remove("is-open");
    resetShift();
    clearClasses();
    notify(-1);
  }

  function ensureHoveringOnce() {
    if (container.classList.contains("hovering")) return;
    container.classList.add("hovering");
    requestAnimationFrame(metric);
  }

  function effectiveEPS(x) {
    if (prevX == null) return epsBase;
    const dx = Math.abs(x - prevX);
    const now = performance.now();
    const dt = Math.max(1, now - (prevT || now));
    const v = dx / dt;
    prevT = now;
    const k = clamp(1 - v * 0.8, 0.4, 1);
    return epsBase * k;
  }

  const onPointerEnter = () => {
    if (openIndex !== -1) return;
    ensureHoveringOnce();
  };

  const onPointerMove = (e) => {
    if (openIndex !== -1) return;
    ensureHoveringOnce();

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - padLeft;
    const idxRaw = indexFromX(x);

    let idx = idxRaw;
    if (hoverIndex >= 0) {
      const c = centerFor(hoverIndex);
      const movingRight = prevX == null ? true : x > prevX;
      const eps = effectiveEPS(x);
      if (movingRight && x < c + eps) idx = hoverIndex;
      if (!movingRight && x > c - eps) idx = hoverIndex;
    }

    prevX = x;

    if (idx !== hoverIndex) {
      hoverIndex = idx;
      applyHoverState(idx);
    }
  };

  const onPointerLeave = (e) => {
    if (openIndex !== -1) return;
    const r = container.getBoundingClientRect();
    const M = 48;
    if (e.clientX > r.left - M && e.clientX < r.right + M && e.clientY > r.top - M && e.clientY < r.bottom + M) {
      return;
    }
    hoverIndex = -1;
    prevX = null;
    prevT = 0;
    container.classList.remove("hovering");
    clearClasses();
  };

  const onClick = (e) => {
    const el = e.target.closest(".item");
    let idx = -1;
    if (el) idx = items.indexOf(el);
    else if (hoverIndex >= 0) idx = hoverIndex;
    if (idx < 0) return;
    if (openIndex === idx) closeOpen();
    else openItem(idx);
  };

  const onKeyDownContainer = (e) => {
    if (e.key === "Escape" && openIndex !== -1) {
      e.preventDefault();
      closeOpen();
    }
  };

  const itemKeyHandlers = items.map((el, idx) => {
    const handler = (e) => {
      if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
        e.preventDefault();
        if (openIndex === idx) closeOpen();
        else openItem(idx);
      }
    };
    el.addEventListener("keydown", handler);
    return handler;
  });

  const onDragStart = (e) => e.preventDefault();

  container.addEventListener("pointerenter", onPointerEnter);
  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerleave", onPointerLeave, { passive: true });
  container.addEventListener("click", onClick);
  container.addEventListener("keydown", onKeyDownContainer);
  container.addEventListener("dragstart", onDragStart);
  window.addEventListener("resize", metric);

  metric();

  return function cleanup() {
    container.removeEventListener("pointerenter", onPointerEnter);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerleave", onPointerLeave);
    container.removeEventListener("click", onClick);
    container.removeEventListener("keydown", onKeyDownContainer);
    container.removeEventListener("dragstart", onDragStart);
    window.removeEventListener("resize", metric);
    items.forEach((el, idx) => el.removeEventListener("keydown", itemKeyHandlers[idx]));
  };
}
