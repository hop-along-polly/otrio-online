/* ===== Otrio – main.js ===== */
(() => {
  "use strict";

  // ── Constants ──────────────────────────────────────────────
  const COLORS = ["#E74C3C", "#2ECC71", "#3498DB", "#9B59B6"];
  const COLOR_NAMES = ["Red", "Green", "Blue", "Purple"];
  const SIZES = ["large", "medium", "small"];
  const RING_RADII = { large: 44, medium: 30, small: 14 };
  const RING_STROKE = { empty: 2, placed: 6 };
  // Cells spaced 120px apart in a 600x600 SVG, centered at 300
  const CELL_ORIGINS = [
    [{ x: 180, y: 180 }, { x: 300, y: 180 }, { x: 420, y: 180 }],
    [{ x: 180, y: 300 }, { x: 300, y: 300 }, { x: 420, y: 300 }],
    [{ x: 180, y: 420 }, { x: 300, y: 420 }, { x: 420, y: 420 }],
  ];
  const LINES = [
    [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]],
  ];
  // Tray cell: 3 concentric rings in a mini cell (like the board)
  const TRAY_CELL_SIZE = 80; // viewBox & display size
  const TRAY_RING_RADII = { large: 34, medium: 24, small: 11 };
  const TRAY_RING_STROKE = 4;

  // ── Audio ──────────────────────────────────────────────────
  let audioCtx = null;
  let soundEnabled = true;

  function playTone(freq, duration, type = "sine") {
    if (!soundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playPlace() { playTone(520, 0.15); }
  function playWin() {
    playTone(523, 0.2);
    setTimeout(() => playTone(659, 0.2), 150);
    setTimeout(() => playTone(784, 0.3), 300);
  }

  // ── State ──────────────────────────────────────────────────
  let playerCount = 3;
  let players = [];
  let board = [];
  let currentPlayerIndex = 0;
  let moveHistory = [];
  let gameOver = false;
  let pieces = {};
  let twoPlayerColorMap = {};
  let twoPlayerTurnColor = {};

  // Drag state
  let dragging = null; // { colorIdx, size, element }

  // ── DOM refs ───────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const setupScreen = $("#setup-screen");
  const gameScreen = $("#game-screen");
  const playerSlots = $("#player-slots");
  const startBtn = $("#start-btn");
  const turnDot = $("#turn-color-dot");
  const turnText = $("#turn-text");
  const gridCells = $("#grid-cells");
  const playerCarousel = $("#player-carousel");
  const tutorialModal = $("#tutorial-modal");
  const tutorialSteps = $$("#tutorial-steps .tutorial-step");
  const tutorialDotsContainer = $("#tutorial-dots");
  const tutorialPrev = $("#tutorial-prev");
  const tutorialNext = $("#tutorial-next");
  const tutorialClose = $("#tutorial-close");
  const howToPlayBtn = $("#how-to-play-btn");
  const gameoverTemplate = $("#gameover-banner-template");
  const themeBtn = $("#theme-btn");
  const soundBtn = $("#sound-btn");
  const undoBtn = $("#undo-btn");
  const menuBtn = $("#menu-btn");
  const rulesBtn = $("#rules-btn");
  const dragGhost = $("#drag-ghost");
  const dragGhostCircle = dragGhost.querySelector("circle");

  // ── Setup Screen Logic ─────────────────────────────────────
  const playerConfigs = [
    { isBot: false },
    { isBot: true },
    { isBot: true },
    { isBot: true },
  ];

  function renderPlayerSlots() {
    playerSlots.innerHTML = "";
    for (let i = 0; i < playerCount; i++) {
      const slot = document.createElement("div");
      slot.className = "player-slot";

      let colorsHtml;
      if (playerCount === 2) {
        const c1 = i === 0 ? 0 : 2;
        const c2 = i === 0 ? 1 : 3;
        colorsHtml = `
          <span class="color-swatch" style="background:${COLORS[c1]};"></span>
          <span class="color-swatch" style="background:${COLORS[c2]};"></span>`;
      } else {
        colorsHtml = `<span class="color-swatch" style="background:${COLORS[i]};"></span>`;
      }

      slot.innerHTML = `
        ${colorsHtml}
        <span class="player-label">Player ${i + 1}</span>
        <button class="type-toggle ${playerConfigs[i].isBot ? "bot" : ""}"
                data-index="${i}">${playerConfigs[i].isBot ? "Bot" : "Human"}</button>`;
      playerSlots.appendChild(slot);
    }

    $$(".type-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index);
        playerConfigs[idx].isBot = !playerConfigs[idx].isBot;
        btn.textContent = playerConfigs[idx].isBot ? "Bot" : "Human";
        btn.classList.toggle("bot", playerConfigs[idx].isBot);
      });
    });
  }

  $$(".count-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".count-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      playerCount = parseInt(btn.dataset.count);
      renderPlayerSlots();
    });
  });

  renderPlayerSlots();

  // ── Start Game ─────────────────────────────────────────────
  startBtn.addEventListener("click", () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    initGame();
    setupScreen.classList.remove("active");
    gameScreen.classList.add("active");
  });

  menuBtn.addEventListener("click", () => {
    gameScreen.classList.remove("active");
    setupScreen.classList.add("active");
    removeBanner();
  });

  function initGame() {
    board = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => ({ small: null, medium: null, large: null }))
    );
    moveHistory = [];
    gameOver = false;
    currentPlayerIndex = 0;
    players = [];
    pieces = {};
    twoPlayerColorMap = {};
    twoPlayerTurnColor = {};
    dragging = null;

    if (playerCount === 2) {
      for (let i = 0; i < 2; i++) {
        const c1 = i * 2;
        const c2 = i * 2 + 1;
        players.push({
          name: `Player ${i + 1}`,
          colorIndices: [c1, c2],
          isBot: playerConfigs[i].isBot,
        });
        twoPlayerColorMap[i] = [c1, c2];
        twoPlayerTurnColor[i] = 0;
        pieces[c1] = { small: 3, medium: 3, large: 3 };
        pieces[c2] = { small: 3, medium: 3, large: 3 };
      }
    } else {
      for (let i = 0; i < playerCount; i++) {
        players.push({
          name: `Player ${i + 1}`,
          colorIndices: [i],
          isBot: playerConfigs[i].isBot,
        });
        pieces[i] = { small: 3, medium: 3, large: 3 };
      }
    }

    renderBoard();
    renderPlayerTrays();
    updateTurnIndicator();
    scheduleBot();
  }

  // ── Board Rendering ────────────────────────────────────────
  function renderBoard() {
    gridCells.innerHTML = "";
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const { x, y } = CELL_ORIGINS[r][c];
        for (const size of SIZES) {
          const radius = RING_RADII[size];
          const cell = board[r][c];
          const occupant = cell[size];
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", x);
          circle.setAttribute("cy", y);
          circle.setAttribute("r", radius);
          circle.setAttribute("data-row", r);
          circle.setAttribute("data-col", c);
          circle.setAttribute("data-size", size);

          const isPeg = size === "small";

          if (occupant !== null) {
            if (isPeg) {
              circle.setAttribute("fill", COLORS[occupant]);
              circle.setAttribute("stroke", COLORS[occupant]);
              circle.setAttribute("stroke-width", 0);
            } else {
              circle.setAttribute("fill", colorWithAlpha(occupant, 0.15));
              circle.setAttribute("stroke", COLORS[occupant]);
              circle.setAttribute("stroke-width", RING_STROKE.placed);
            }
            circle.classList.add("ring-slot", "placed");
          } else {
            if (isPeg) {
              circle.setAttribute("fill", "var(--ring-empty)");
              circle.setAttribute("stroke", "none");
              circle.setAttribute("stroke-width", 0);
            } else {
              circle.setAttribute("fill", "none");
              circle.setAttribute("stroke", "var(--ring-empty)");
              circle.setAttribute("stroke-width", RING_STROKE.empty);
            }
            circle.classList.add("ring-slot", "empty");
          }
          gridCells.appendChild(circle);
        }
      }
    }
  }

  function updateDropTargets() {
    // Remove all drop-target classes
    gridCells.querySelectorAll(".drop-target").forEach((el) =>
      el.classList.remove("drop-target")
    );

    if (!dragging || gameOver) return;

    const { size } = dragging;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (board[r][c][size] === null) {
          const ring = gridCells.querySelector(
            `[data-row="${r}"][data-col="${c}"][data-size="${size}"]`
          );
          if (ring) ring.classList.add("drop-target");
        }
      }
    }
  }

  function colorWithAlpha(colorIndex, alpha) {
    const hex = COLORS[colorIndex];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function getCurrentColor() {
    if (playerCount === 2) {
      const turnIdx = twoPlayerTurnColor[currentPlayerIndex];
      return twoPlayerColorMap[currentPlayerIndex][turnIdx];
    }
    return players[currentPlayerIndex].colorIndices[0];
  }

  function getCurrentColorForPlayer(i) {
    if (playerCount === 2) {
      const turnIdx = twoPlayerTurnColor[i];
      return twoPlayerColorMap[i][turnIdx];
    }
    return players[i].colorIndices[0];
  }

  // ── Player Trays (carousel: active player first) ────────────
  function renderPlayerTrays() {
    playerCarousel.innerHTML = "";

    // Build order: current player first, then next players in turn order
    const order = [];
    for (let i = 0; i < players.length; i++) {
      order.push((currentPlayerIndex + i) % players.length);
    }

    order.forEach((pi) => {
      const p = players[pi];
      const tray = document.createElement("div");
      tray.className = "player-tray" + (pi === currentPlayerIndex ? " active-turn" : "");
      tray.style.color = COLORS[getCurrentColorForPlayer(pi)];

      // Header
      const header = document.createElement("div");
      header.className = "tray-header";
      let dots = p.colorIndices.map((ci) =>
        `<span class="color-dot" style="background:${COLORS[ci]}"></span>`
      ).join("");
      header.innerHTML = `${p.name}${p.isBot ? " (Bot)" : ""} ${dots}`;
      tray.appendChild(header);

      // 3 concentric-ring cells per color, like mini board cells
      const piecesDiv = document.createElement("div");
      piecesDiv.className = "tray-pieces";

      p.colorIndices.forEach((ci) => {
        const isActive = pi === currentPlayerIndex && !p.isBot && !gameOver;
        const isCorrectColor = playerCount === 2
          ? ci === getCurrentColorForPlayer(pi)
          : true;
        const canDrag = isActive && isCorrectColor;

        // 3 cells, each with concentric S/M/L rings
        for (let slot = 0; slot < 3; slot++) {
          const sz = TRAY_CELL_SIZE;
          const cx = sz / 2;
          const cy = sz / 2;
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("viewBox", `0 0 ${sz} ${sz}`);
          svg.setAttribute("width", sz);
          svg.setAttribute("height", sz);
          svg.classList.add("tray-cell");

          // Draw all three rings: large, medium, small
          for (const size of SIZES) {
            const radius = TRAY_RING_RADII[size];
            const hasRemaining = pieces[ci][size] > slot;

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", cx);
            circle.setAttribute("cy", cy);
            circle.setAttribute("r", radius);

            const isPeg = size === "small";

            if (hasRemaining) {
              if (isPeg) {
                circle.setAttribute("fill", COLORS[ci]);
                circle.setAttribute("stroke", "none");
                circle.setAttribute("stroke-width", 0);
              } else {
                circle.setAttribute("fill", colorWithAlpha(ci, 0.1));
                circle.setAttribute("stroke", COLORS[ci]);
                circle.setAttribute("stroke-width", TRAY_RING_STROKE);
              }
              circle.classList.add("tray-ring", "available");
              if (isPeg) circle.classList.add("peg");
              circle.dataset.colorIdx = ci;
              circle.dataset.size = size;
              circle.dataset.slot = slot;

              if (canDrag) {
                circle.classList.add("draggable");
                circle.addEventListener("pointerdown", onPiecePointerDown);
              } else {
                circle.classList.add("inactive");
              }
            } else {
              if (isPeg) {
                circle.setAttribute("fill", "var(--ring-empty)");
                circle.setAttribute("stroke", "none");
                circle.setAttribute("stroke-width", 0);
              } else {
                circle.setAttribute("fill", "none");
                circle.setAttribute("stroke", "var(--ring-empty)");
                circle.setAttribute("stroke-width", 1);
              }
              circle.classList.add("tray-ring", "used");
            }

            svg.appendChild(circle);
          }

          piecesDiv.appendChild(svg);
        }
      });

      tray.appendChild(piecesDiv);
      playerCarousel.appendChild(tray);
    });
  }

  function updateTurnIndicator() {
    const ci = getCurrentColor();
    turnDot.style.background = COLORS[ci];
    const p = players[currentPlayerIndex];
    turnText.textContent = `${p.name}${p.isBot ? " (Bot)" : ""} – ${COLOR_NAMES[ci]}`;
  }

  // ── Drag & Drop (pointer events for mouse + touch) ─────────
  function onPiecePointerDown(e) {
    if (gameOver) return;
    const player = players[currentPlayerIndex];
    if (player.isBot) return;

    e.preventDefault();
    const el = e.currentTarget; // the circle element inside tray SVG
    const colorIdx = parseInt(el.dataset.colorIdx);
    const size = el.dataset.size;

    dragging = { colorIdx, size, element: el };

    // Size the ghost to match the board ring's on-screen pixel size
    const boardSvg = document.getElementById("board-svg");
    const boardRect = boardSvg.getBoundingClientRect();
    const viewBoxSize = 380; // viewBox width
    const scale = boardRect.width / viewBoxSize;
    const boardRadius = RING_RADII[size];
    const boardStroke = RING_STROKE.placed;
    const pixelDiameter = (boardRadius * 2 + boardStroke) * scale;
    const ghostPixelSize = Math.round(pixelDiameter);

    // Set ghost SVG to match
    const ghostViewSize = (boardRadius + boardStroke) * 2;
    const ghostCenter = ghostViewSize / 2;
    dragGhost.setAttribute("viewBox", `0 0 ${ghostViewSize} ${ghostViewSize}`);
    dragGhost.setAttribute("width", ghostPixelSize);
    dragGhost.setAttribute("height", ghostPixelSize);
    dragGhostCircle.setAttribute("cx", ghostCenter);
    dragGhostCircle.setAttribute("cy", ghostCenter);
    dragGhostCircle.setAttribute("r", boardRadius);

    if (size === "small") {
      dragGhostCircle.setAttribute("stroke", "none");
      dragGhostCircle.setAttribute("stroke-width", 0);
      dragGhostCircle.setAttribute("fill", COLORS[colorIdx]);
    } else {
      dragGhostCircle.setAttribute("stroke", COLORS[colorIdx]);
      dragGhostCircle.setAttribute("stroke-width", boardStroke);
      dragGhostCircle.setAttribute("fill", colorWithAlpha(colorIdx, 0.15));
    }

    // Store half-size for centering
    dragging.ghostHalf = ghostPixelSize / 2;

    dragGhost.classList.remove("hidden");
    moveGhost(e.clientX, e.clientY);

    el.style.opacity = "0.3";

    updateDropTargets();

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  }

  function moveGhost(x, y) {
    const half = dragging ? dragging.ghostHalf || 40 : 40;
    dragGhost.style.left = (x - half) + "px";
    dragGhost.style.top = (y - half) + "px";
  }

  function onPointerMove(e) {
    if (!dragging) return;
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);

    // Highlight the drop target under pointer
    gridCells.querySelectorAll(".drop-hover").forEach((el) =>
      el.classList.remove("drop-hover")
    );
    const target = getDropTarget(e.clientX, e.clientY);
    if (target) target.classList.add("drop-hover");
  }

  function onPointerUp(e) {
    if (!dragging) return;
    e.preventDefault();

    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);

    dragGhost.classList.add("hidden");
    gridCells.querySelectorAll(".drop-hover").forEach((el) =>
      el.classList.remove("drop-hover")
    );
    gridCells.querySelectorAll(".drop-target").forEach((el) =>
      el.classList.remove("drop-target")
    );

    if (dragging.element) dragging.element.style.opacity = "";

    const target = getDropTarget(e.clientX, e.clientY);
    if (target) {
      const r = parseInt(target.dataset.row);
      const c = parseInt(target.dataset.col);
      const size = target.dataset.size;
      if (size === dragging.size && board[r][c][size] === null) {
        placeMove(r, c, size);
      }
    }

    dragging = null;
  }

  function getDropTarget(clientX, clientY) {
    const svg = document.getElementById("board-svg");
    const rect = svg.getBoundingClientRect();
    // Convert client coords to SVG viewBox coords
    // viewBox is "110 110 380 380"
    const svgX = 110 + ((clientX - rect.left) / rect.width) * 380;
    const svgY = 110 + ((clientY - rect.top) / rect.height) * 380;

    if (!dragging) return null;
    const { size } = dragging;
    const radius = RING_RADII[size];

    let closest = null;
    let closestDist = Infinity;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (board[r][c][size] !== null) continue;
        const { x, y } = CELL_ORIGINS[r][c];
        const dist = Math.hypot(svgX - x, svgY - y);
        // Allow generous hit area
        if (dist < radius + 20 && dist < closestDist) {
          closestDist = dist;
          closest = gridCells.querySelector(
            `[data-row="${r}"][data-col="${c}"][data-size="${size}"]`
          );
        }
      }
    }
    return closest;
  }

  // ── Move Logic ─────────────────────────────────────────────
  function placeMove(r, c, size) {
    const colorIdx = getCurrentColor();
    board[r][c][size] = colorIdx;
    pieces[colorIdx][size]--;
    moveHistory.push({ row: r, col: c, size, playerIndex: currentPlayerIndex, colorIdx });
    playPlace();

    const winner = checkAllWins(colorIdx);
    if (winner) {
      gameOver = true;
      renderBoard();
      renderPlayerTrays();
      highlightWin(winner.cells);
      showGameOver(colorIdx);
      return;
    }

    if (checkDraw()) {
      gameOver = true;
      renderBoard();
      renderPlayerTrays();
      showGameOver(null);
      return;
    }

    advanceTurn();
    renderBoard();
    renderPlayerTrays();
    updateTurnIndicator();
    scheduleBot();
  }

  function advanceTurn() {
    if (playerCount === 2) {
      twoPlayerTurnColor[currentPlayerIndex] =
        1 - twoPlayerTurnColor[currentPlayerIndex];
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    } else {
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    }

    let checked = 0;
    while (checked < players.length && !hasAnyLegalMove(currentPlayerIndex)) {
      if (playerCount === 2) {
        twoPlayerTurnColor[currentPlayerIndex] =
          1 - twoPlayerTurnColor[currentPlayerIndex];
      }
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
      checked++;
    }
  }

  function hasAnyLegalMove(pi) {
    let colorIndices;
    if (playerCount === 2) {
      const turnIdx = twoPlayerTurnColor[pi];
      colorIndices = [twoPlayerColorMap[pi][turnIdx]];
    } else {
      colorIndices = players[pi].colorIndices;
    }

    for (const ci of colorIndices) {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          for (const size of SIZES)
            if (board[r][c][size] === null && pieces[ci][size] > 0)
              return true;
    }
    return false;
  }

  function checkDraw() {
    for (let i = 0; i < players.length; i++) {
      if (hasAnyLegalMove(i)) return false;
    }
    return true;
  }

  // ── Win Detection ──────────────────────────────────────────
  function checkAllWins(colorIdx) {
    return checkSameSize(colorIdx) || checkOrderedSize(colorIdx) || checkConcentric(colorIdx);
  }

  function checkSameSize(colorIdx) {
    for (const size of SIZES) {
      for (const line of LINES) {
        if (line.every(([r, c]) => board[r][c][size] === colorIdx)) {
          return { cells: line.map(([r, c]) => ({ r, c, size })), type: "same-size" };
        }
      }
    }
    return null;
  }

  function checkOrderedSize(colorIdx) {
    const orders = [
      ["small", "medium", "large"],
      ["large", "medium", "small"],
    ];
    for (const order of orders) {
      for (const line of LINES) {
        if (line.every(([r, c], i) => board[r][c][order[i]] === colorIdx)) {
          return { cells: line.map(([r, c], i) => ({ r, c, size: order[i] })), type: "ordered" };
        }
      }
    }
    return null;
  }

  function checkConcentric(colorIdx) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = board[r][c];
        if (cell.small === colorIdx && cell.medium === colorIdx && cell.large === colorIdx) {
          return { cells: SIZES.map((s) => ({ r, c, size: s })), type: "concentric" };
        }
      }
    }
    return null;
  }

  function highlightWin(cells) {
    cells.forEach(({ r, c, size }) => {
      const ring = gridCells.querySelector(
        `[data-row="${r}"][data-col="${c}"][data-size="${size}"]`
      );
      if (ring) ring.classList.add("win-highlight");
    });
  }

  function removeBanner() {
    const existing = document.getElementById("gameover-banner");
    if (existing) existing.remove();
  }

  function showGameOver(winnerColorIdx) {
    removeBanner();

    const clone = gameoverTemplate.content.cloneNode(true);
    const banner = clone.querySelector("#gameover-banner");
    const textEl = clone.querySelector("#gameover-text");
    const rings = clone.querySelectorAll(".anim-ring");

    if (winnerColorIdx !== null) {
      const color = COLORS[winnerColorIdx];
      const name = findPlayerByColor(winnerColorIdx);
      textEl.textContent = `${name} Wins!`;
      textEl.style.color = color;
      banner.style.color = color;
      rings.forEach((r) => (r.style.stroke = color));
      playWin();
    } else {
      textEl.textContent = "It's a Draw!";
      rings.forEach((r) => (r.style.stroke = "var(--ring-empty)"));
    }

    // Wire up buttons
    clone.querySelector("#play-again-btn").addEventListener("click", () => {
      removeBanner();
      initGame();
    });
    clone.querySelector("#return-menu-btn").addEventListener("click", () => {
      removeBanner();
      gameScreen.classList.remove("active");
      setupScreen.classList.add("active");
    });

    // Insert banner at top of game area, after the header
    const gameArea = gameScreen.querySelector(".game-area");
    gameArea.insertBefore(clone, gameArea.firstChild);
  }

  function findPlayerByColor(colorIdx) {
    for (const p of players) {
      if (p.colorIndices.includes(colorIdx)) return p.name;
    }
    return "Unknown";
  }

  // ── Undo ───────────────────────────────────────────────────
  undoBtn.addEventListener("click", () => {
    if (gameOver || moveHistory.length === 0) return;
    const last = moveHistory.pop();
    board[last.row][last.col][last.size] = null;
    pieces[last.colorIdx][last.size]++;
    currentPlayerIndex = last.playerIndex;
    if (playerCount === 2) {
      twoPlayerTurnColor[currentPlayerIndex] =
        1 - twoPlayerTurnColor[currentPlayerIndex];
    }
    renderBoard();
    renderPlayerTrays();
    updateTurnIndicator();
  });

  // ── Bot AI ─────────────────────────────────────────────────
  function scheduleBot() {
    if (gameOver) return;
    const player = players[currentPlayerIndex];
    if (!player.isBot) return;
    setTimeout(() => botMove(), 400 + Math.random() * 400);
  }

  function botMove() {
    if (gameOver) return;
    const colorIdx = getCurrentColor();

    const legalMoves = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        for (const size of SIZES)
          if (board[r][c][size] === null && pieces[colorIdx][size] > 0)
            legalMoves.push({ r, c, size });

    if (legalMoves.length === 0) {
      advanceTurn();
      renderBoard();
      renderPlayerTrays();
      updateTurnIndicator();
      scheduleBot();
      return;
    }

    // 1. Win
    for (const m of legalMoves) {
      board[m.r][m.c][m.size] = colorIdx;
      if (checkAllWins(colorIdx)) {
        board[m.r][m.c][m.size] = null;
        placeMove(m.r, m.c, m.size);
        return;
      }
      board[m.r][m.c][m.size] = null;
    }

    // 2. Block
    const opponentColors = [];
    for (let ci = 0; ci < 4; ci++) {
      if (ci !== colorIdx && (playerCount !== 2 || !players[currentPlayerIndex].colorIndices.includes(ci))) {
        opponentColors.push(ci);
      }
    }

    for (const m of legalMoves) {
      for (const oc of opponentColors) {
        board[m.r][m.c][m.size] = oc;
        if (checkAllWins(oc)) {
          board[m.r][m.c][m.size] = null;
          placeMove(m.r, m.c, m.size);
          return;
        }
        board[m.r][m.c][m.size] = null;
      }
    }

    // 3. Random
    const pick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    placeMove(pick.r, pick.c, pick.size);
  }

  // ── Tutorial Modal ──────────────────────────────────────────
  let tutorialStep = 0;
  const totalSteps = tutorialSteps.length;

  // Build dot indicators
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.createElement("span");
    dot.className = "tutorial-dot" + (i === 0 ? " active" : "");
    dot.dataset.step = i;
    dot.addEventListener("click", () => goToTutorialStep(i));
    tutorialDotsContainer.appendChild(dot);
  }

  function openTutorial() {
    tutorialStep = 0;
    updateTutorial();
    tutorialModal.classList.remove("hidden");
  }

  function closeTutorial() {
    tutorialModal.classList.add("hidden");
  }

  function goToTutorialStep(step) {
    tutorialStep = Math.max(0, Math.min(step, totalSteps - 1));
    updateTutorial();
  }

  function updateTutorial() {
    tutorialSteps.forEach((el, i) => {
      el.classList.toggle("active", i === tutorialStep);
    });
    tutorialDotsContainer.querySelectorAll(".tutorial-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === tutorialStep);
    });
    tutorialPrev.style.visibility = tutorialStep === 0 ? "hidden" : "visible";
    tutorialNext.textContent = tutorialStep === totalSteps - 1 ? "Got it!" : "Next";
  }

  tutorialNext.addEventListener("click", () => {
    if (tutorialStep === totalSteps - 1) {
      closeTutorial();
    } else {
      goToTutorialStep(tutorialStep + 1);
    }
  });

  tutorialPrev.addEventListener("click", () => {
    goToTutorialStep(tutorialStep - 1);
  });

  tutorialClose.addEventListener("click", closeTutorial);
  tutorialModal.addEventListener("click", (e) => {
    if (e.target === tutorialModal) closeTutorial();
  });

  howToPlayBtn.addEventListener("click", openTutorial);
  rulesBtn.addEventListener("click", openTutorial);

  themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "" : "dark");
    themeBtn.textContent = isDark ? "\u263E" : "\u2600";
  });

  soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? "\u266A" : "\u2715";
  });

  // ── Keyboard Support ───────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeTutorial();
    }
    if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undoBtn.click();
    }
  });
})();
