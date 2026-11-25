/* Ellie Kim — portfolio
 * 1. Hero canvas: a small hand-drawn neural network. Signals travel left → right;
 *    nodes light up when you hover/tap near them.
 * 2. Scroll reveal: cards fade in as they enter the viewport.
 * 3. Skill filter: click a skill to highlight the projects that used it (index page only).
 * Respects prefers-reduced-motion (draws one still frame, no reveal animation).
 */
(function () {
  "use strict";

  document.documentElement.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 2. scroll reveal ---------------- */
  var items = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- 3. skill filter ----------------
   * Click a skill → projects whose data-skills list contains it are highlighted,
   * the rest are dimmed. Click it again (or "clear") to reset.
   */
  var filter = document.getElementById("skill-filter");
  var statusEl = document.getElementById("filter-status");
  if (filter && statusEl) {
    var targets = Array.prototype.slice.call(document.querySelectorAll("[data-skills]"));
    var buttons = filter.querySelectorAll("button[data-skill]");
    var active = null;

    var usesSkill = function (el, skill) {
      return el.getAttribute("data-skills").split(",").map(function (s) { return s.trim(); }).indexOf(skill) !== -1;
    };
    var projectName = function (el) {
      var h = el.querySelector("h3");
      return h ? h.textContent.trim() : "";
    };

    var apply = function (skill) {
      active = skill;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-skill") === skill)); });
      var names = [];
      targets.forEach(function (el) {
        var hit = skill !== null && usesSkill(el, skill);
        el.classList.toggle("is-match", hit);
        el.classList.toggle("is-dim", skill !== null && !hit);
        if (hit && names.indexOf(projectName(el)) === -1) names.push(projectName(el));
      });
      statusEl.textContent = "";
      if (skill === null) return;
      statusEl.appendChild(document.createTextNode(
        skill + " → used in " + names.length + (names.length === 1 ? " project: " : " projects: ") + names.join(", ")
      ));
      var clear = document.createElement("button");
      clear.type = "button";
      clear.textContent = "clear";
      clear.addEventListener("click", function () { apply(null); });
      statusEl.appendChild(clear);
    };

    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        var skill = b.getAttribute("data-skill");
        apply(active === skill ? null : skill);
      });
    });
  }

  /* ---------------- 1. hero network ---------------- */
  var canvas = document.getElementById("net");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var LAYERS = [3, 5, 6, 5, 3];
  var W = 0, H = 0, nodes = [], edges = [], signals = [], tick = 0;
  var pointer = { x: -999, y: -999 };
  var colors = {};
  var running = false, visible = true;

  function readColors() {
    var s = getComputedStyle(document.documentElement);
    colors = {
      edge: s.getPropertyValue("--net-edge").trim(),
      node: s.getPropertyValue("--net-node").trim(),
      fill: s.getPropertyValue("--net-fill").trim(),
      glow: s.getPropertyValue("--net-glow").trim(),
      signal: s.getPropertyValue("--net-signal").trim()
    };
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function build() {
    nodes = []; edges = [];
    // desktop: leave room for the sticky note at the bottom-right; mobile: note sits below the canvas
    var narrow = window.matchMedia("(max-width: 800px)").matches;
    var padX = W * 0.08, padTop = narrow ? H * 0.04 : H * 0.02, usableH = narrow ? H * 0.92 : H * 0.58;
    LAYERS.forEach(function (count, li) {
      for (var i = 0; i < count; i++) {
        var jitter = [];
        for (var k = 0; k < 8; k++) jitter.push(rand(-0.7, 0.7));
        nodes.push({
          li: li,
          x: padX + (W - 2 * padX) * li / (LAYERS.length - 1),
          y: padTop + (i + 0.5) * (usableH / count),
          j: jitter, glow: 0
        });
      }
    });
    for (var li = 0; li < LAYERS.length - 1; li++) {
      var A = nodes.filter(function (n) { return n.li === li; });
      var B = nodes.filter(function (n) { return n.li === li + 1; });
      A.forEach(function (a) {
        B.forEach(function (b) { if (Math.random() < 0.6) edges.push({ a: a, b: b, bend: rand(-3, 3) }); });
      });
    }
    signals = [];
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function wobblyCircle(n, r) {
    ctx.beginPath();
    for (var k = 0; k <= 8; k++) {
      var ang = k / 8 * Math.PI * 2, rr = r + n.j[k % 8];
      var px = n.x + Math.cos(ang) * rr, py = n.y + Math.sin(ang) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function edgePoint(e, t) {
    var mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2 + e.bend, u = 1 - t;
    return [u * u * e.a.x + 2 * u * t * mx + t * t * e.b.x,
            u * u * e.a.y + 2 * u * t * my + t * t * e.b.y];
  }

  function step() {
    tick++;
    nodes.forEach(function (n) {
      var d = Math.hypot(pointer.x - n.x, pointer.y - n.y);
      if (d < 48) n.glow = Math.min(1, n.glow + 0.2);
      n.glow *= 0.94;
    });
    if (tick % 10 === 0) {
      var starts = edges.filter(function (e) { return e.a.li === 0; });
      if (starts.length) signals.push({ e: starts[Math.floor(Math.random() * starts.length)], t: 0 });
    }
    var next = [];
    signals = signals.filter(function (s) {
      s.t += 0.03;
      if (s.t < 1) return true;
      var to = s.e.b;
      to.glow = Math.min(1, to.glow + 0.7);
      var out = edges.filter(function (e) { return e.a === to; });
      if (out.length && Math.random() < 0.8) next.push({ e: out[Math.floor(Math.random() * out.length)], t: 0 });
      return false;
    });
    signals = signals.concat(next).slice(-120);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.edge;
    edges.forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.quadraticCurveTo((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2 + e.bend, e.b.x, e.b.y);
      ctx.stroke();
    });
    ctx.fillStyle = colors.signal;
    signals.forEach(function (s) {
      var p = edgePoint(s.e, s.t);
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2); ctx.fill();
    });
    nodes.forEach(function (n) {
      wobblyCircle(n, 8);
      ctx.fillStyle = n.glow > 0.25 ? colors.glow : colors.fill;
      ctx.fill();
      ctx.strokeStyle = colors.node;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  function loop() {
    if (!running) return;
    step(); draw();
    requestAnimationFrame(loop);
  }
  function start() { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(loop); } }
  function stop() { running = false; }

  function setPointer(ev) {
    var r = canvas.getBoundingClientRect();
    pointer.x = ev.clientX - r.left; pointer.y = ev.clientY - r.top;
    if (reduceMotion) {           // still image: light up nearby nodes once, then redraw
      nodes.forEach(function (n) { n.glow = Math.hypot(pointer.x - n.x, pointer.y - n.y) < 48 ? 1 : 0; });
      draw();
    }
  }
  canvas.addEventListener("pointermove", setPointer);
  canvas.addEventListener("pointerdown", setPointer);
  canvas.addEventListener("pointerleave", function () { pointer.x = pointer.y = -999; });

  readColors();
  resize();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); if (reduceMotion) draw(); }, 120);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    readColors(); if (reduceMotion) draw();
  });

  if (reduceMotion) {
    // a frozen "mid-inference" frame
    for (var i = 0; i < 160; i++) step();
    draw();
    return;
  }

  // pause when the hero is off-screen or the tab is hidden (saves battery)
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
  start();
})();
