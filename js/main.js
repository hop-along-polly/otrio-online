/* ===== Otrio – main.js ===== */
(() => {
  "use strict";

  // ── Constants ──────────────────────────────────────────────
  const COLORS = ["#E89C3F", "#1ED4B8", "#4ECDC4", "#2A7EDB"];
  const COLOR_NAMES = ["Orange", "Teal", "Cyan", "Blue"];
  const SIZES = ["large", "medium", "small"];
  const RING_RADII = { large: 45, medium: 30, small: 15 };
  const RING_STROKE = { empty: 1.5, placed: 5 };
  const CELL_ORIGINS = [
    [{ x: 170, y: 170 }, { x: 250, y: 170 }, { x: 330, y: 170 }],
    [{ x: 170, y: 250 }, { x: 250, y: 250 }, { x: 330, y: 250 }],
    [{ x: 170, y: 330 }, { x: 250, y: 330 }, { x: 330, y: 330 }],
  ];
  const LINES = [
    // rows
    [[0,0],[0,1],[0,2]],
    [[1,0],[1,1],[1,2]],
    [[2,0],[2,1],[2,2]],
    // cols
    [[0,0],[1,0],[2,0]],
    [[0,1],[1,1],[2,1]],
    [[0,2],[1,2],[2,2]],
    // diags
    [[0,0],[1,1],[2,2]],
    [[0,2],[1,1],[2,0]],
  ];

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
    playTone(523, 0.2); setTimeout(() => playTone(659, 0.2), 150);
    setTimeout(() => playTone(784, 0.3), 300);
  }

  // ── State ──────────────────────────────────────────────────
  let playerCount = 3;
  let players = []; // { name, color, colorIndex, isBot }
  let board = [];   // 3x3 of { small, medium, large }
  let currentPlayerIndex = 0;
  let moveHistory = [];  // { row, col, size, playerIndex }
  let gameOver = false;
  let pieces = {};  // colorIndex -> { small: count, medium: count, large: count }
  let twoPlayerColorMap = {}; // playerIndex -> [colorIndex, colorIndex]
  let twoPlayerTurnColor = {}; // playerIndex -> which color (0 or 1) to use next

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
  const playerPanel = $("#player-panel");
  const rulesPopover = $("#rules-popover");
  const gameoverModal = $("#gameover-modal");
  const gameoverText = $("#gameover-text");
  const themeBtn = $("#theme-btn");
  const soundBtn = $("#sound-btn");
  const undoBtn = $("#undo-btn");
  const menuBtn = $("#menu-btn");
  const rulesBtn = $("#rules-btn");

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
    gameoverModal.classList.add("hidden");
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

    if (playerCount === 2) {
      // Each player controls 2 colors
      for (let i = 0; i < 2; i++) {
        const c1 = i * 2;
        const c2 = i * 2 + 1;
        players.push({
          name: `Player ${i + 1}`,
          colorIndices: [c1, c2],
          isBot: playerConfigs[i].isBot,
        });
        twoPlayerColorMap[i] = [c1, c2];
        twoPlayerTurnColor[i] = 0; // start with first color
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
    renderPlayerPanel();
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
          circle.setAttribute("fill", occupant ? colorWithAlpha(occupant, 0.12) : "none");
          circle.setAttribute("data-row", r);
          circle.setAttribute("data-col", c);
          circle.setAttribute("data-size", size);

          if (occupant !== null) {
            circle.setAttribute("stroke", COLORS[occupant]);
            circle.setAttribute("stroke-width", RING_STROKE.placed);
            circle.classList.add("ring-slot", "placed");
          } else {
            circle.setAttribute("stroke", "var(--ring-empty)");
            circle.setAttribute("stroke-width", RING_STROKE.empty);
            circle.classList.add("ring-slot", "empty");
            if (!gameOver && isLegalForCurrentPlayer(r, c, size)) {
              circle.classList.add("legal");
              circle.addEventListener("click", onRingClick);
            }
          }
          gridCells.appendChild(circle);
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

  function isLegalForCurrentPlayer(r, c, size) {
    if (board[r][c][size] !== null) return false;
    const player = players[currentPlayerIndex];
    if (playerCount === 2) {
      const turnIdx = twoPlayerTurnColor[currentPlayerIndex];
      const colorIdx = twoPlayerColorMap[currentPlayerIndex][turnIdx];
      return pieces[colorIdx][size] > 0;
    } else {
      const colorIdx = player.colorIndices[0];
      return pieces[colorIdx][size] > 0;
    }
  }

  function getCurrentColor() {
    if (playerCount === 2) {
      const turnIdx = twoPlayerTurnColor[currentPlayerIndex];
      return twoPlayerColorMap[currentPlayerIndex][turnIdx];
    }
    return players[currentPlayerIndex].colorIndices[0];
  }

  // ── Player Panel ───────────────────────────────────────────
  function renderPlayerPanel() {
    playerPanel.innerHTML = "";
    players.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "panel-player" + (i === currentPlayerIndex ? " active-turn" : "");

      let colorDots = p.colorIndices.map((ci) =>
        `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${COLORS[ci]};"></span>`
      ).join(" ");

      let piecesInfo;
      if (playerCount === 2) {
        const turnIdx = twoPlayerTurnColor[i];
        const ci = twoPlayerColorMap[i][turnIdx];
        const pp = pieces[ci];
        piecesInfo = `Next: ${COLOR_NAMES[ci]} &middot; S:${pp.small} M:${pp.medium} L:${pp.large}`;
      } else {
        const ci = p.colorIndices[0];
        const pp = pieces[ci];
        piecesInfo = `S:${pp.small} M:${pp.medium} L:${pp.large}`;
      }

      div.style.color = COLORS[getCurrentColorForPlayer(i)];
      div.innerHTML = `
        <div class="panel-name">${p.name} ${p.isBot ? "(Bot)" : ""} ${colorDots}</div>
        <div class="pieces-left">${piecesInfo}</div>`;
      playerPanel.appendChild(div);
    });
  }

  function getCurrentColorForPlayer(i) {
    if (playerCount === 2) {
      const turnIdx = twoPlayerTurnColor[i];
      return twoPlayerColorMap[i][turnIdx];
    }
    return players[i].colorIndices[0];
  }

  function updateTurnIndicator() {
    const ci = getCurrentColor();
    turnDot.style.background = COLORS[ci];
    const p = players[currentPlayerIndex];
    turnText.textContent = `${p.name}${p.isBot ? " (Bot)" : ""} – ${COLOR_NAMES[ci]}`;
  }

  // ── Move Logic ─────────────────────────────────────────────
  function onRingClick(e) {
    if (gameOver) return;
    const player = players[currentPlayerIndex];
    if (player.isBot) return; // ignore clicks during bot turn

    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    const size = e.target.dataset.size;
    placeMove(r, c, size);
  }

  function placeMove(r, c, size) {
    const colorIdx = getCurrentColor();
    board[r][c][size] = colorIdx;
    pieces[colorIdx][size]--;
    moveHistory.push({ row: r, col: c, size, playerIndex: currentPlayerIndex, colorIdx });
    playPlace();

    // Check win
    const winner = checkAllWins(colorIdx);
    if (winner) {
      gameOver = true;
      renderBoard();
      highlightWin(winner.cells, winner.type);
      showGameOver(colorIdx);
      return;
    }

    // Check draw (no legal moves for anyone)
    if (checkDraw()) {
      gameOver = true;
      renderBoard();
      showGameOver(null);
      return;
    }

    // Advance turn
    advanceTurn();
    renderBoard();
    renderPlayerPanel();
    updateTurnIndicator();
    scheduleBot();
  }

  function advanceTurn() {
    if (playerCount === 2) {
      // Alternate the color within the player, then switch player
      twoPlayerTurnColor[currentPlayerIndex] =
        1 - twoPlayerTurnColor[currentPlayerIndex];
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    } else {
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    }

    // Skip players with no legal moves
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
    const saved = currentPlayerIndex;
    currentPlayerIndex = pi;
    let found = false;
    for (let r = 0; r < 3 && !found; r++)
      for (let c = 0; c < 3 && !found; c++)
        for (const size of SIZES)
          if (isLegalForCurrentPlayer(r, c, size)) { found = true; break; }
    currentPlayerIndex = saved;
    return found;
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
          return {
            cells: SIZES.map((s) => ({ r, c, size: s })),
            type: "concentric",
          };
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

  function showGameOver(winnerColorIdx) {
    gameoverModal.classList.remove("hidden");
    const rings = gameoverModal.querySelectorAll(".anim-ring");
    if (winnerColorIdx !== null) {
      const name = findPlayerByColor(winnerColorIdx);
      gameoverText.textContent = `${name} Wins!`;
      rings.forEach((r) => (r.style.stroke = COLORS[winnerColorIdx]));
      playWin();
    } else {
      gameoverText.textContent = "It's a Draw!";
      rings.forEach((r) => (r.style.stroke = "var(--ring-empty)"));
    }
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
    renderPlayerPanel();
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

    // Collect all legal moves
    const legalMoves = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        for (const size of SIZES)
          if (board[r][c][size] === null && pieces[colorIdx][size] > 0)
            legalMoves.push({ r, c, size });

    if (legalMoves.length === 0) {
      advanceTurn();
      renderBoard();
      renderPlayerPanel();
      updateTurnIndicator();
      scheduleBot();
      return;
    }

    // 1. Check for winning move
    for (const m of legalMoves) {
      board[m.r][m.c][m.size] = colorIdx;
      if (checkAllWins(colorIdx)) {
        board[m.r][m.c][m.size] = null;
        placeMove(m.r, m.c, m.size);
        return;
      }
      board[m.r][m.c][m.size] = null;
    }

    // 2. Block opponent wins
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

    // 3. Random legal move
    const pick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    placeMove(pick.r, pick.c, pick.size);
  }

  // ── Modals & Buttons ───────────────────────────────────────
  rulesBtn.addEventListener("click", () => rulesPopover.classList.remove("hidden"));
  rulesPopover.querySelector(".close-modal").addEventListener("click", () =>
    rulesPopover.classList.add("hidden")
  );
  rulesPopover.addEventListener("click", (e) => {
    if (e.target === rulesPopover) rulesPopover.classList.add("hidden");
  });

  $("#play-again-btn").addEventListener("click", () => {
    gameoverModal.classList.add("hidden");
    initGame();
  });

  $("#return-menu-btn").addEventListener("click", () => {
    gameoverModal.classList.add("hidden");
    gameScreen.classList.remove("active");
    setupScreen.classList.add("active");
  });

  // Theme toggle
  themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "" : "dark");
    themeBtn.textContent = isDark ? "\u263E" : "\u2600";
  });

  // Sound toggle
  soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? "\u266A" : "\u2715";
  });

  // ── Keyboard Support ───────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      rulesPopover.classList.add("hidden");
      gameoverModal.classList.add("hidden");
    }
    if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undoBtn.click();
    }
  });
})();
