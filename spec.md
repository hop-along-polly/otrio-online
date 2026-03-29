# Otrio Online - Application Specification

**Purpose**: Complete specification for building a responsive, mobile-friendly Otrio web game using only HTML, CSS, and JavaScript.

**Project Name:** Otrio  
**Target Platform:** Static GitHub Pages (single `index.html` + `style.css` + `script.js`)  
**Tech Stack:** Vanilla HTML5, CSS3 (Flexbox/Grid + custom properties), JavaScript (ES6+), inline SVG  
**No external dependencies • No WebSockets • No backend**

## 1. Overview

A fully playable, responsive, single-screen local version of **Otrio** (2–4 players, ages 8+).  

All players (human or bot) share the same device in **hot-seat** style. Players can play alone against 1–3 bots or with friends on the same screen.  

The UI is designed to visually match the provided game board image: a clean cross-shaped aesthetic with a prominent central 3×3 grid of nested concentric rings, decorative outer rings, soft gray outlines, and the exact color palette shown.

### Win Conditions
You win by being the first to get three pieces of your color in one of these ways:
1. **Same Size** — Three pieces of the same size in a row, column, or diagonal.
2. **Ordered Size** — Three pieces in ascending or descending size order in a row, column, or diagonal.
3. **Concentric** — Three pieces of different sizes (small, medium, large) all stacked in the **same single cell**.

## 2. Core Features

### Setup Screen
- Choose total players: **2, 3, or 4**
- For each player slot: toggle **Human** or **Bot**
- Supports 1–3 bots when playing solo (e.g., 1 Human + 3 Bots = full 4-player game)
- Color assignment:
  - **2-player mode**: Each player controls **two opposite colors** and alternates between them automatically.
  - **3- or 4-player mode**: Each player controls **one color**.

### Game Screen
- Responsive board that mirrors the attached image
- Clear turn indicator with current player name and color
- Win / Draw announcement with “Play Again” button
- Optional undo last move
- Quick rules reference popover

### Bots
- 1 to 3 AI opponents available
- Simple but effective AI: checks for immediate win → blocks opponent win → makes random legal move
- Short “thinking” delay for realism

### Accessibility & Polish
- Mobile-first, touch-optimized (large tap targets)
- Keyboard support for desktop
- Dark / Light mode toggle (defaults to clean look matching the image)
- Optional sound effects (Web Audio API)

## 3. UI Layout & Responsiveness

**Mobile-First Responsive Design**

- Uses Flexbox and CSS Grid
- Board scales gracefully from mobile phones to tablets and desktops
- On small screens: board takes ~90vw, player panel scrolls horizontally if needed
- Minimum tap target size: 44px

### Board Visuals (SVG)
- Single `<svg>` element renders the full cross-shaped board exactly as shown in the image
- Central 3×3 grid is interactive
- Each of the 9 cells contains **three nested concentric circles**:
  - Large (outer)
  - Medium
  - Small (inner)
- Empty rings: thin gray strokes
- Placed rings: thick colored strokes with subtle fill using exact player colors
- Decorative non-interactive rings in the four arms of the cross (top, bottom, left, right)
- Central 3×3 area has soft rounded square highlight border

## 4. Game State & Logic

### Board Representation
```js
board = Array(3).fill().map(() => Array(3).fill().map(() => ({
  small: null,   // color string or null
  medium: null,
  large: null
})));
```

### Player Colors (from image)

 - Orange: #E89C3F
 - Teal: #1ED4B8
 - Cyan accent: #4ECDC4 
 - Blue: #2A7EDB

Turn Flow

1. Highlight all legal empty ring slots
2. Human taps a ring → place piece → check win conditions
3. Bot automatically chooses move after short delay
4. If no legal moves remain → auto-skip turn

### Win Detection
Three separate checks:

 - `checkSameSize(color)`
 - `checkOrderedSize(color)`
 - `checkConcentric(color)`

## 5. Screens

1. Landing / Setup Screen
 - Title with board teaser
 - Player count selection (2 / 3 / 4)
 - Human/Bot toggles per slot
 - Color previews
 - “Start Game” button

2. Game Screen
 - Large responsive SVG board
 - Player status panel
 - Current turn display

3. Game Over Modal
 - Winner announcement with animated rings
 - “Play Again” and “Return to Menu” options

## 6. File Structure (GitHub Pages Ready)
```
/otrio-online/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
└── README.md
```

## 7. Implementation Notes

100% static – perfect for GitHub Pages hosting
All board graphics created with inline SVG (no external images needed)
Fully playable offline
Easy to extend later with online multiplayer if desired
Estimated JavaScript size: ~600–800 lines (single-file friendly)