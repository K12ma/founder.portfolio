/* ============================================================
   Souya Komatsu — Portfolio
   Scroll animations / magnetic buttons / photo parallax
   (no external libraries)
   ============================================================ */

(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------
     1. Curtain — ローディング & ページ遷移を同じ幕で統一
        入場: 幕が画面を覆った状態 → ブランド文字がせり上がる → 幕が上に抜ける
        退場: リンククリック → 幕が下からせり上がって覆う → ページ移動
  ------------------------------------------------------------ */
  const curtain = document.getElementById("curtain");
  const panel = document.getElementById("curtainPanel");
  const brand = curtain ? curtain.querySelector(".curtain__brand") : null;

  // ブランド文字を1文字ずつ分割(スタッガー用)
  if (brand) {
    const text = brand.textContent;
    brand.textContent = "";
    brand.setAttribute("aria-label", text);
    [...text].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "b-char";
      span.setAttribute("aria-hidden", "true");
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.style.transitionDelay = `${i * 0.035}s`;
      brand.appendChild(span);
    });
  }

  // ---- 入場アニメーション ----
  let curtainOpened = false;
  const openCurtain = () => {
    if (curtainOpened || !curtain) return;
    curtainOpened = true;
    // 文字がせり上がる
    requestAnimationFrame(() => curtain.classList.add("is-intro"));
    // 少し見せてから幕が上に抜ける
    setTimeout(() => {
      curtain.classList.add("is-open");
      document.body.classList.add("is-loaded");
    }, prefersReduced ? 0 : 1500);
  };

  window.addEventListener("load", openCurtain, { once: true });
  setTimeout(openCurtain, 3200); // フォールバック

  // ---- 退場アニメーション(ページ間リンクを横取り) ----
  const closeCurtainAndGo = (href) => {
    if (!curtain || !panel) {
      location.href = href;
      return;
    }
    curtain.classList.remove("is-open");
    // 幕を画面下に瞬間移動させてから、下→上に覆う
    panel.style.transition = "none";
    panel.style.transform = "translateY(118%)";
    void panel.offsetHeight; // reflow
    panel.style.transition = "";
    panel.style.transform = "translateY(0)";
    setTimeout(() => { location.href = href; }, prefersReduced ? 0 : 1050);
  };

  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (a.target === "_blank") return;
    let url;
    try { url = new URL(href, location.href); } catch { return; }
    // 同一サイト(ローカル or GitHub Pages)のページ遷移のみアニメーション
    const sameSite =
      url.origin === location.origin ||
      url.href.includes("k12ma.github.io/founder.portfolio");
    if (!sameSite) return;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      closeCurtainAndGo(url.href);
    });
  });

  // 戻る/進む(bfcache)で幕が残らないようにリセット
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && curtain && panel) {
      panel.style.transition = "none";
      panel.style.transform = "";
      curtain.classList.add("is-intro", "is-open");
      document.body.classList.add("is-loaded");
      void panel.offsetHeight;
      panel.style.transition = "";
    }
  });

  /* ------------------------------------------------------------
     2. Split text — [data-split] を1文字ずつ / [data-split-lines] を行ごとに分割
  ------------------------------------------------------------ */
  const splitChars = (el) => {
    const text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", text);
    [...text].forEach((ch, i) => {
      const wrap = document.createElement("span");
      wrap.className = "char-wrap";
      wrap.setAttribute("aria-hidden", "true");
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.style.transitionDelay = `${i * 0.03}s`;
      wrap.appendChild(span);
      el.appendChild(wrap);
    });
  };

  const splitLines = (el) => {
    // 文節ごとにspan化 → 実際の折り返し位置を測って行単位に再構成
    const text = el.textContent.trim();
    const segments = text.split(/(?<=[。、])|\s+/).filter(Boolean);
    el.textContent = "";
    el.setAttribute("aria-label", text);
    const probes = segments.map((seg) => {
      const s = document.createElement("span");
      s.textContent = seg;
      s.style.display = "inline-block";
      el.appendChild(s);
      return s;
    });
    // 行ごとにグループ化
    const lines = [];
    let currentTop = null;
    probes.forEach((s) => {
      const top = s.offsetTop;
      if (top !== currentTop) { lines.push([]); currentTop = top; }
      lines[lines.length - 1].push(s.textContent);
    });
    el.textContent = "";
    lines.forEach((words, i) => {
      const wrap = document.createElement("span");
      wrap.className = "line-wrap";
      wrap.setAttribute("aria-hidden", "true");
      const line = document.createElement("span");
      line.className = "line";
      line.textContent = words.join("");
      line.style.transitionDelay = `${i * 0.12}s`;
      wrap.appendChild(line);
      el.appendChild(wrap);
    });
  };

  document.querySelectorAll("[data-split]").forEach(splitChars);
  document.querySelectorAll("[data-split-lines]").forEach(splitLines);

  /* ------------------------------------------------------------
     3. Scroll reveal — IntersectionObserver
  ------------------------------------------------------------ */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-inview");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  document
    .querySelectorAll(".reveal, [data-split], [data-split-lines], .photo-reveal")
    .forEach((el) => io.observe(el));

  /* ------------------------------------------------------------
     4. Magnetic buttons — .magnetic
  ------------------------------------------------------------ */
  if (!prefersReduced && window.matchMedia("(hover: hover)").matches) {
    const STRENGTH = 0.35;
    document.querySelectorAll(".magnetic").forEach((el) => {
      let raf = null;

      const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate(${x * STRENGTH}px, ${y * STRENGTH}px)`;
        });
      };

      const onLeave = () => {
        if (raf) cancelAnimationFrame(raf);
        el.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "translate(0, 0)";
        setTimeout(() => (el.style.transition = ""), 600);
      };

      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
    });
  }

  /* ------------------------------------------------------------
     4.5 Fill-hover — ホバーした位置(縁)から色が広がる
  ------------------------------------------------------------ */
  document.querySelectorAll(".fill-hover").forEach((el) => {
    const setOrigin = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // 侵入/退出した点から要素全体を覆いきれる直径を計算
      const dx = Math.max(x, rect.width - x);
      const dy = Math.max(y, rect.height - y);
      const d = Math.hypot(dx, dy) * 2;
      el.style.setProperty("--x", `${x}px`);
      el.style.setProperty("--y", `${y}px`);
      el.style.setProperty("--d", `${d}px`);
    };
    el.addEventListener("mouseenter", setOrigin);
    el.addEventListener("mouseleave", setOrigin);
  });

  /* ------------------------------------------------------------
     5. Custom cursor
  ------------------------------------------------------------ */
  const cursor = document.getElementById("cursor");
  if (cursor && window.matchMedia("(hover: hover)").matches) {
    let cx = -100, cy = -100, tx = -100, ty = -100;

    window.addEventListener("mousemove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
    });

    const tick = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    tick();

    document.querySelectorAll("[data-cursor='hover'], a, button").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ------------------------------------------------------------
     6. Photo parallax — [data-parallax]
  ------------------------------------------------------------ */
  if (!prefersReduced) {
    const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
    let ticking = false;

    const updateParallax = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((img) => {
        const rect = img.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        // -1(画面下) 〜 1(画面上) に正規化
        const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
        const shift = progress * -6; // %
        const scale = img.closest(".photo-reveal").classList.contains("is-inview") ? 1.08 : 1.15;
        img.style.transform = `scale(${scale}) translateY(${shift}%)`;
      });
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateParallax);
      }
    }, { passive: true });
    updateParallax();
  }

  /* ------------------------------------------------------------
     7. Header — 下スクロールで隠す / 上スクロールで表示
  ------------------------------------------------------------ */
  const header = document.querySelector(".header");
  let lastY = window.scrollY;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 60);
    if (y > 200 && y > lastY) {
      header.classList.add("is-hidden");
    } else {
      header.classList.remove("is-hidden");
    }
    lastY = y;
  }, { passive: true });

  /* ------------------------------------------------------------
     8. Mobile menu
  ------------------------------------------------------------ */
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");

  burger.addEventListener("click", () => {
    burger.classList.toggle("is-open");
    menu.classList.toggle("is-open");
    document.body.style.overflow = menu.classList.contains("is-open") ? "hidden" : "";
  });

  menu.querySelectorAll(".menu__link").forEach((link) => {
    link.addEventListener("click", () => {
      burger.classList.remove("is-open");
      menu.classList.remove("is-open");
      document.body.style.overflow = "";
    });
  });
})();
