# Otrio Online

A strategy board game you can play right in your web browser — no downloads needed!

Otrio is a ring-placement game for 2-4 players. Place your colored rings on a 3x3 board and try to get three in a row before your opponents do. You can play with friends on the same device or challenge the computer bot.

---

## How to Play the Game

1. Open the file called `index.html` in your web browser (Chrome, Firefox, Safari, or Edge all work)
2. Pick how many players (2, 3, or 4)
3. Choose which players are humans and which are bots (computer players)
4. Click **Start Game**
5. Drag your rings from the tray at the bottom onto the board
6. First player to get three in a row wins!

There are actually **three different ways to win**:

- **Same Size** — Get three rings of the same size (all big, all medium, or all small) in a row, column, or diagonal
- **Ordered Size** — Get three rings in order from small to medium to large (or large to medium to small) in a row, column, or diagonal
- **Concentric** — Stack all three of your sizes (small, medium, and large) in the same single cell

---

## What's in This Project?

This project is a website made from scratch using just three languages: **HTML**, **CSS**, and **JavaScript**. That's it — no fancy frameworks or extra downloads. Here's what each file does:

```
otrio-online/
├── index.html       <- The structure of the page (what's on screen)
├── css/
│   └── style.css    <- The look and feel (colors, layout, animations)
├── js/
│   └── main.js      <- The brains (game logic, rules, the bot)
└── spec.md          <- A planning document that describes what to build
```

### `index.html` — The Skeleton

This file defines **what** appears on the page. Think of it like the blueprint of a house — it says "there's a board here, buttons here, a popup here" but doesn't decide how they look or what they do.

Things you'll find inside:
- The **setup screen** where you pick the number of players
- The **game board** area
- The **tutorial popup** that teaches you the rules
- The **game over banner** that shows who won

### `css/style.css` — The Paint and Decoration

This file controls **how everything looks**. It's like choosing the paint colors, furniture, and decorations for the house.

Things you'll find inside:
- The color scheme (there's a light mode AND a dark mode!)
- How the board and rings are sized and positioned
- Animations like the pulsing ring when you're about to drop a piece
- Rules that make the game look good on both phones and computers

### `js/main.js` — The Brain

This is the biggest file because it handles **everything that happens** when you interact with the game. It's the engine that makes the game work.

Things you'll find inside:
- **Game rules** — how to check if someone won
- **Drag and drop** — how pieces move from your tray to the board
- **The bot** — a simple AI that tries to win (or block you from winning!)
- **Sound effects** — little tones made with code (no audio files needed)
- **Undo** — lets you take back your last move
- **Turn management** — keeps track of whose turn it is

---

## How to Read the Code (Tips for Beginners)

If you've never looked at code before, here are some tips:

### Start with `index.html`

Open it in a text editor (like VS Code, or even TextEdit/Notepad). You'll see things that look like this:

```html
<button id="start-btn">Start Game</button>
```

The words inside the `< >` angle brackets are called **tags**. They tell the browser what kind of thing to display. A `<button>` is a clickable button. A `<div>` is a container that holds other stuff. Tags usually come in pairs — an opening tag `<button>` and a closing tag `</button>`.

### Then look at `style.css`

CSS is a list of rules that say "make this thing look like that." For example:

```css
.title {
  font-size: 2rem;
  color: #3E2C1C;
}
```

This says "find anything with the class `title` and make the text big and dark brown." The pattern is always: **what to style** `{` **how to style it** `}`.

### Finally, explore `main.js`

JavaScript is where the action happens. Look for **comments** — lines that start with `//`. These are notes that explain what the code does. They're written by the programmer to help readers (like you!) understand the code.

Some concepts you'll see:

- **Variables** — named containers that store information, like `let gameOver = false;`
- **Functions** — reusable blocks of code that do a specific job, like `function checkAllWins() { ... }`
- **If statements** — code that makes decisions, like `if (gameOver) { return; }`
- **Arrays** — lists of things, like the list of colors: `["#E74C3C", "#2ECC71", "#3498DB", "#9B59B6"]`

### Fun things to search for in the code

Try using your text editor's search feature (Ctrl+F or Cmd+F) to find these:

- **`playWin`** — Find the victory sound effect and see how musical notes are made with code
- **`botMove`** — See how the computer decides where to place its pieces
- **`checkConcentric`** — Read how the game checks for the three-in-one-cell win condition
- **`COLORS`** — Find where the four player colors are defined (they're hex codes like `#E74C3C` for red)
- **`drag`** — See how the game tracks your finger or mouse as you move a piece

---

## Try Changing Things!

The best way to learn is to experiment. Here are some safe things to try:

1. **Change a color** — In `js/main.js`, find the `COLORS` array near the top and change one of the color codes. Refresh the page and see what happens! (Google "hex color picker" to find new colors.)

2. **Change the bot speed** — Search for `400` and `800` in `main.js` — those numbers control how long the bot "thinks" in milliseconds. Make them bigger for a slower bot, or smaller for a lightning-fast one.

3. **Change the page title** — In `index.html`, find the `<title>` tag and change it to whatever you want.

4. **Change the background color** — In `css/style.css`, look for `--bg:` near the top of the file. Change the color code after it to change the background.

Don't worry about breaking anything — you can always undo your changes or re-download the original files!

---

## What is GitHub?

You're probably reading this on **GitHub**, which is a website where people store and share code. Think of it like Google Drive, but specifically for code projects.

- A **repository** (or "repo") is a project folder — like this one
- A **commit** is a saved snapshot of the project at a point in time (like saving a new version of a document)
- This **README.md** file is a special file that GitHub automatically displays on the project's main page — you're reading it right now!

The `.md` in `README.md` stands for **Markdown**, which is a simple way to format text with things like `#` for headings, `**` for **bold**, and `-` for bullet points.

---

## Glossary

Some words you might see in the code or on GitHub:

| Word | What It Means |
|------|--------------|
| **HTML** | HyperText Markup Language — the language that defines the structure of a web page |
| **CSS** | Cascading Style Sheets — the language that controls how a web page looks |
| **JavaScript** | A programming language that makes web pages interactive |
| **SVG** | Scalable Vector Graphics — a way to draw shapes (like the rings!) using code instead of image files |
| **DOM** | Document Object Model — how the browser organizes all the elements on a page into a tree structure |
| **function** | A named block of code that does a specific job and can be reused |
| **variable** | A named container for storing a piece of data |
| **array** | An ordered list of values, written with square brackets like `[1, 2, 3]` |
| **hex color** | A color written as a `#` followed by 6 characters, like `#E74C3C` for red |
| **responsive** | A design that adjusts to look good on different screen sizes (phone, tablet, computer) |
