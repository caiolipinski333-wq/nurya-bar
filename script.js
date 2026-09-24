/* ==============================================================
   Animação de scroll com sequência de imagens (canvas)
   ==============================================================
   Como funciona, resumido:
   1. Pré-carrega os 168 frames.
   2. Enquanto o usuário rola dentro da seção .sequence-pin, calcula
      um "progresso" de 0 a 1 baseado em quanto já rolou.
   3. Converte esse progresso num índice de frame e desenha esse
      frame no canvas, preenchendo a tela (como background-size:cover)
      sem distorcer a proporção da imagem.
   4. Se o usuário pediu "prefers-reduced-motion", a animação por
      scroll é desativada e mostramos um frame único, fixo.
================================================================= */

(() => {
  "use strict";

  /* ------------------------------------------------------------
     CONFIGURAÇÃO — ajuste estes valores para o seu caso
  ------------------------------------------------------------- */
  const CONFIG = {
    frameCount: 156,                 // total de frames (cortado no coentro, sem ir pro bife)
    framePath: (i) => `frames/frame-${String(i).padStart(4, "0")}.jpg`,
    scrollLengthVh: 350,             // distância de scroll da animação, em "vh"
                                       // (mais alto = scroll mais lento/longo por frame)
    reducedMotionFrame: 156,          // qual frame mostrar quando reduced-motion está ativo
  };

  /* Estações: qual bloco de texto (data-station) fica visível em cada
     faixa de frames. As faixas são frações do total de frames, então
     continuam corretas mesmo se você trocar a sequência por uma com
     mais ou menos imagens.
     Por enquanto só Hero + A Casa — as estações de cardápio entram
     depois, quando os pratos individuais estiverem prontos (basta
     adicionar mais entradas aqui e os data-station correspondentes
     no index.html). */
  const STATIONS = [
    { id: "hero", from: 0.00, to: 0.12 },
    { id: "casa", from: 0.12, to: 1.001 },
  ];

  /* ------------------------------------------------------------
     Elementos
  ------------------------------------------------------------- */
  const pinSection   = document.getElementById("sequencePin");
  const canvas       = document.getElementById("sequenceCanvas");
  const ctx          = canvas.getContext("2d");
  const loader       = document.getElementById("loader");
  const loaderFill   = document.getElementById("loaderFill");
  const loaderText   = document.getElementById("loaderText");
  const stationEls   = document.querySelectorAll(".station");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* aplica a distância de scroll via CSS custom property,
     assim styles.css consegue usar var(--scroll-length) */
  document.documentElement.style.setProperty(
    "--scroll-length",
    prefersReducedMotion ? "100vh" : `${CONFIG.scrollLengthVh}vh`
  );

  /* ------------------------------------------------------------
     Estado
  ------------------------------------------------------------- */
  const images = new Array(CONFIG.frameCount);
  let loadedCount = 0;
  let allLoaded = false;
  let currentFrame = 1;
  let lastDrawnFrame = -1;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2); // limita a 2x p/ performance

  /* ------------------------------------------------------------
     Pré-carregamento
  ------------------------------------------------------------- */
  function preloadImages() {
    for (let i = 1; i <= CONFIG.frameCount; i++) {
      const img = new Image();
      img.decoding = "async";
      img.onload = onImageLoaded;
      img.onerror = onImageLoaded; // não trava o carregamento se 1 frame falhar
      img.src = CONFIG.framePath(i);
      images[i - 1] = img;
    }
  }

  function onImageLoaded() {
    loadedCount++;
    const pct = Math.round((loadedCount / CONFIG.frameCount) * 100);
    loaderFill.style.width = pct + "%";
    loaderText.textContent = `Carregando ${pct}%`;

    // já dá pra desenhar o primeiro frame assim que ele chegar,
    // pra tela não ficar preta enquanto o resto carrega
    if (loadedCount === 1) {
      resizeCanvas();
      drawFrame(1);
    }

    if (loadedCount === CONFIG.frameCount) {
      allLoaded = true;
      loader.classList.add("is-hidden");
      loaderText.textContent = "Carregado";

      if (prefersReducedMotion) {
        drawFrame(CONFIG.reducedMotionFrame);
      } else {
        onScroll(); // desenha o frame correto pra posição atual de scroll
      }
    }
  }

  /* ------------------------------------------------------------
     Canvas responsivo
  ------------------------------------------------------------- */
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvasWidth = Math.max(1, Math.round(rect.width));
    canvasHeight = Math.max(1, Math.round(rect.height));

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // redesenha o frame atual na nova resolução
    lastDrawnFrame = -1;
    drawFrame(currentFrame);
  }

  /* Desenha a imagem preenchendo o canvas inteiro, preservando a
     proporção (equivalente a background-size: cover) — recorta o
     excesso em vez de distorcer. */
  function drawFrame(frameNumber) {
    const img = images[frameNumber - 1];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    if (frameNumber === lastDrawnFrame) return;
    lastDrawnFrame = frameNumber;
    currentFrame = frameNumber;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      // canvas mais largo que a imagem: ajusta pela largura
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      // canvas mais alto (relativo) que a imagem: ajusta pela altura
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
      offsetY = 0;
      offsetX = (canvasWidth - drawWidth) / 2;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    updateStations(frameNumber);
  }

  /* ------------------------------------------------------------
     Estações de texto: mostra o bloco (data-station) cuja faixa
     contém o frame atual, esconde os demais.
  ------------------------------------------------------------- */
  let activeStationId = null;

  function updateStations(frameNumber) {
    const t = (frameNumber - 1) / (CONFIG.frameCount - 1); // 0..1
    const match =
      STATIONS.find((s) => t >= s.from && t < s.to) ||
      STATIONS[STATIONS.length - 1];

    if (match.id === activeStationId) return;
    activeStationId = match.id;

    stationEls.forEach((el) => {
      el.classList.toggle("is-active", el.dataset.station === match.id);
    });
  }

  /* ------------------------------------------------------------
     Scroll → progresso → frame
  ------------------------------------------------------------- */
  let ticking = false;

  function onScroll() {
    if (prefersReducedMotion || !allLoaded) return;
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const rect = pinSection.getBoundingClientRect();
      const sectionHeight = pinSection.offsetHeight;
      const viewportH = window.innerHeight;

      // distância total que dá pra rolar dentro da seção
      const scrollableDistance = sectionHeight - viewportH;

      // quanto já rolamos dentro da seção (0 no topo dela, positivo conforme desce)
      const scrolledIntoSection = -rect.top;

      let progress = scrollableDistance > 0
        ? scrolledIntoSection / scrollableDistance
        : 0;

      progress = Math.min(1, Math.max(0, progress));

      const frameNumber = Math.min(
        CONFIG.frameCount,
        Math.max(1, Math.round(progress * (CONFIG.frameCount - 1)) + 1)
      );

      drawFrame(frameNumber);
      ticking = false;
    });
  }

  /* ------------------------------------------------------------
     Resize (debounced com rAF)
  ------------------------------------------------------------- */
  let resizeTicking = false;
  function onResize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(() => {
      resizeCanvas();
      resizeTicking = false;
    });
  }

  /* ------------------------------------------------------------
     Reveal on scroll (Ambiente / Equipe) + parallax leve nas fotos
     de fundo. Independente do canvas acima — só entra em ação fora
     da seção pinada.
  ------------------------------------------------------------- */
  function setupRevealAndParallax() {
    const revealEls = document.querySelectorAll(".reveal");
    const parallaxTargets = [
      document.getElementById("atmosphereMedia"),
      document.getElementById("teamMedia"),
      document.getElementById("reserveMedia"),
    ].filter(Boolean);

    if (prefersReducedMotion) {
      // sem observer, sem parallax: mostra tudo já visível e parado
      revealEls.forEach((el) => el.classList.add("is-visible"));
      document.querySelectorAll(".atmosphere, .team, .reserve").forEach((el) =>
        el.classList.add("is-visible")
      );
      return;
    }

    // stagger: dá um atraso crescente pros irmãos dentro do mesmo
    // container de texto, criando o efeito de cascata
    const groups = new Map();
    revealEls.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach((els) => {
      els.forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.12}s`;
      });
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));

    // o zoom-relax da foto de fundo (scale 1.12 → 1.02) é disparado
    // pela própria seção (.atmosphere / .team) ganhar .is-visible
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            sectionObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".atmosphere, .team, .reserve").forEach((el) =>
      sectionObserver.observe(el)
    );

    // parallax sutil: desloca cada foto de fundo verticalmente
    // conforme sua seção passa pela tela (efeito clássico de
    // profundidade, bem discreto — no máximo ~6% da altura da seção)
    if (parallaxTargets.length) {
      let parallaxTicking = false;
      const updateParallax = () => {
        const viewportH = window.innerHeight;
        parallaxTargets.forEach((wrapper) => {
          const section = wrapper.closest(".atmosphere, .team, .reserve");
          const rect = section.getBoundingClientRect();
          const progress = (viewportH - rect.top) / (viewportH + rect.height);
          const offset = (progress - 0.5) * 40; // px, bem sutil
          wrapper.style.transform = `translateY(${offset}px)`;
        });
        parallaxTicking = false;
      };
      window.addEventListener(
        "scroll",
        () => {
          if (parallaxTicking) return;
          parallaxTicking = true;
          requestAnimationFrame(updateParallax);
        },
        { passive: true }
      );
      updateParallax();
    }
  }

  /* ------------------------------------------------------------
     Inicialização
  ------------------------------------------------------------- */
  function init() {
    resizeCanvas();
    preloadImages();
    setupRevealAndParallax();
    setupDishCards();

    window.addEventListener("resize", onResize, { passive: true });

    if (!prefersReducedMotion) {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  /* ------------------------------------------------------------
     Cardápio: cards estilo App Store (expand/collapse via
     View Transition API). O nome de transição só é atribuído no
     instante do clique — dar nome fixo a todos os cards faria o
     navegador animar os outros cards (que só estão borrando/saindo)
     junto, causando um efeito bugado.
  ------------------------------------------------------------- */
  function setupDishCards() {
    const grid = document.querySelector(".dish-grid");
    if (!grid) return;

    /* Decodifica todas as fotos dos pratos assim que a página carrega,
       em segundo plano — assim quando o usuário clicar, o navegador
       já tem a imagem pronta pra desenhar em tela cheia. */
    grid.querySelectorAll(".card-photo").forEach((img) => {
      if (img.decode) img.decode().catch(() => {});
    });

    /* ------------------------------------------------------------
       Animação manual (técnica "FLIP"), sem depender da View
       Transition API — o suporte e a qualidade dela variam demais
       entre navegadores (é provavelmente por isso que continuava
       pesada). Aqui a gente controla 100% do processo:

       1. Mede a posição/tamanho atuais do card (First).
       2. Cria um CLONE fora da grade, já no estado "expandido"
          (tela cheia) — assim a grade original nunca precisa se
          reorganizar (o card original só fica invisível, mas
          continua ocupando o mesmo espaço, sem gerar reflow).
       3. Aplica no clone um transform que faz ele PARECER que ainda
          está no tamanho pequeno original (Invert).
       4. Anima só esse transform até "none" — e transform é a
          única coisa que a GPU move sem redesenhar nada, então fica
          leve mesmo em celular mais simples.
    ------------------------------------------------------------- */
    const DURATION = 550;
    const EASE = "cubic-bezier(0.22,1,0.36,1)"; // abrir: rápido no início, assenta no final
    const CLOSE_DURATION = 350; // fechar mais rápido que abrir
    const CLOSE_EASE = "cubic-bezier(0.65,0,0.35,1)"; // fechar: uniforme do início ao fim —
      // a curva de abrir concentra o encolhimento nos primeiros instantes, o que faz
      // parecer que "já acabou" rápido demais; essa aqui distribui o movimento por
      // igual, então dá pra sentir o encolhimento inteiro, não só o comecinho
    let activeClone = null;

    function flip(el, firstRect, extraProps, duration = DURATION, ease = EASE) {
      const lastRect = el.getBoundingClientRect();
      const scaleX = firstRect.width / lastRect.width;
      const scaleY = firstRect.height / lastRect.height;
      const dx = firstRect.left - lastRect.left;
      const dy = firstRect.top - lastRect.top;

      el.style.transformOrigin = "0 0";
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
      if (extraProps) Object.assign(el.style, extraProps.from);

      // força o navegador a aplicar o estado inicial antes de animar
      // (senão ele "pula" direto pro resultado final)
      el.getBoundingClientRect();

      requestAnimationFrame(() => {
        el.style.transition = `transform ${duration}ms ${ease}` +
          (extraProps ? `, ${extraProps.property} ${duration}ms ${ease}` : "");
        el.style.transform = "none";
        if (extraProps) Object.assign(el.style, extraProps.to);
      });
    }

    function buildClone(card) {
      const clone = card.cloneNode(true);
      clone.classList.add("dish-clone", "expanded");
      clone.style.position = "fixed";
      clone.style.visibility = "visible"; // garante que não herda o "hidden" do original
      document.body.appendChild(clone);
      return clone;
    }

    function openCard(card) {
      const firstRect = card.getBoundingClientRect();
      const clone = buildClone(card); // clona ANTES de esconder o original
      card.style.visibility = "hidden"; // some da grade sem gerar reflow
      grid.classList.add("has-expanded");
      document.body.classList.add("dish-open");

      activeClone = clone;

      flip(clone, firstRect, {
        property: "border-radius",
        from: { borderRadius: "22px" },
        to: { borderRadius: "0px" },
      });

      const finishOpen = (e) => {
        if (e && e.target !== clone) return; // ignora transições de filhos (ex: hover da foto)
        clone.querySelector(".content-container").classList.remove("hidden");
        clone.removeEventListener("transitionend", finishOpen);
      };
      clone.addEventListener("transitionend", finishOpen);
      setTimeout(finishOpen, DURATION + 80); // rede de segurança

      const closeFromClone = () => closeCard(card, clone);
      clone.addEventListener("click", closeFromClone);
      clone.querySelector(".close-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        closeFromClone();
      });
    }

    function closeCard(card, clone) {
      if (!clone || clone !== activeClone) return;
      activeClone = null;
      document.body.classList.remove("dish-open");

      const firstRect = clone.getBoundingClientRect();
      clone.classList.remove("expanded");
      clone.querySelector(".content-container").classList.add("hidden");
      // volta pro tamanho/posição exatos do card original na grade
      clone.style.position = "fixed";
      const targetRect = card.getBoundingClientRect();
      clone.style.top = targetRect.top + "px";
      clone.style.left = targetRect.left + "px";
      clone.style.width = targetRect.width + "px";
      clone.style.height = targetRect.height + "px";
      clone.style.aspectRatio = "auto";

      flip(clone, firstRect, {
        property: "border-radius",
        from: { borderRadius: "0px" },
        to: { borderRadius: "22px" },
      }, CLOSE_DURATION, CLOSE_EASE);

      const finishClose = (e) => {
        if (e && e.target !== clone) return; // ignora transições de filhos (ex: hover da foto)
        grid.classList.remove("has-expanded");
        card.style.visibility = "";
        clone.remove();
        clone.removeEventListener("transitionend", finishClose);
      };
      clone.addEventListener("transitionend", finishClose);
      setTimeout(finishClose, CLOSE_DURATION + 80); // rede de segurança
    }

    grid.querySelectorAll(".dish-card").forEach((card) => {
      card.addEventListener("click", () => openCard(card));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && activeClone) {
        const card = grid.querySelector(
          '.dish-card[data-id="' + activeClone.dataset.id + '"]'
        );
        closeCard(card, activeClone);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
