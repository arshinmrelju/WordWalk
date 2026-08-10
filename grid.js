// ============================================================
//  GRID — word-search puzzle generator + touch/mouse selection.
//
//  Easy mode: words are placed only horizontally (left-to-right)
//  and vertically (top-to-bottom). No diagonals, no backwards.
// ============================================================

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIRS = [
  [0, 1], // horizontal
  [1, 0] // vertical
];

export function normalizeWord(w) {
  return w.toUpperCase().replace(/[^A-Z]/g, "");
}

function randomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function gridSizeFor(words) {
  const longest = words.reduce((m, w) => Math.max(m, w.length), 0);
  return Math.max(8, Math.min(15, longest + 1));
}

export { gridSizeFor };

function canPlace(grid, word, r, c, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    const cell = grid[r + dr * i][c + dc * i];
    if (cell && cell !== word[i]) return false;
  }
  return true;
}

function place(grid, word, r, c, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    grid[r + dr * i][c + dc * i] = word[i];
  }
}

export function generatePuzzle(words, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const placements = [];
  const order = [...words].sort((a, b) => b.length - a.length);
  for (const word of order) {
    let placed = false;
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
      const rMax = dr === 0 ? size : size - word.length + 1;
      const cMax = dc === 0 ? size : size - word.length + 1;
      const r = Math.floor(Math.random() * rMax);
      const c = Math.floor(Math.random() * cMax);
      if (canPlace(grid, word, r, c, dr, dc)) {
        place(grid, word, r, c, dr, dc);
        placements.push({ word, row: r, col: c, dir: dr === 0 ? "h" : "v" });
        placed = true;
      }
    }
    if (!placed) return null;
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = randomLetter();
    }
  }
  return { grid, placements };
}

export class WordGrid {
  /**
   * @param {HTMLElement} container  where the grid renders
   * @param {Object} opts
   * @param {string} opts.answer    the answer word
   * @param {string[]} opts.decoys  decoy words
   * @param {Function} [opts.onReady]  called with the list of words actually placed
   * @param {Function} [opts.onFound]  called as (word, isAnswer)
   */
  constructor(container, { answer, decoys, onReady, onFound }) {
    this.container = container;
    this.answer = normalizeWord(answer);
    this.decoys = decoys.map(normalizeWord).filter((w) => w.length >= 2 && w !== this.answer);
    this.onReady = onReady;
    this.onFound = onFound;
    this.found = new Set();
    this.active = false;
    this.build();
  }

  build() {
    let placedWords = null;
    let puzzle = null;
    for (let decoysToUse = this.decoys.length; decoysToUse >= 0 && !puzzle; decoysToUse--) {
      const words = [this.answer, ...this.decoys.slice(0, decoysToUse)];
      const size = gridSizeFor(words);
      for (let attempt = 0; attempt < 40 && !puzzle; attempt++) {
        puzzle = generatePuzzle(words, size);
      }
      if (puzzle) placedWords = words;
    }
    this.puzzle = puzzle;
    if (!this.puzzle) {
      // Last-resort puzzle: just the answer word.
      const size = Math.max(this.answer.length + 1, 8);
      this.puzzle = generatePuzzle([this.answer], size);
      placedWords = [this.answer];
    }
    this.placementWords = placedWords;
    this.render();
    if (this.onReady) this.onReady(this.placementWords);
  }

  render() {
    const size = this.puzzle.grid.length;
    this.container.innerHTML = "";
    this.container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    const fs = size <= 8 ? 26 : size <= 9 ? 24 : size <= 10 ? 22 : 20;
    this.cells = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        const el = document.createElement("div");
        el.className = "cell";
        el.textContent = this.puzzle.grid[r][c];
        el.dataset.r = r;
        el.dataset.c = c;
        el.style.fontSize = fs + "px";
        this.container.appendChild(el);
        row.push(el);
      }
      this.cells.push(row);
    }
    this.attachEvents();
  }

  attachEvents() {
    this.container.addEventListener("pointerdown", (e) => this.onDown(e));
    this.container.addEventListener("pointermove", (e) => this.onMove(e));
    this.container.addEventListener("pointerup", (e) => this.onUp(e));
    this.container.addEventListener("pointercancel", (e) => this.onUp(e));
    this.container.addEventListener("pointerleave", (e) => {
      if (this.active) this.onUp(e);
    });
  }

  cellFromEvent(e) {
    const t = document.elementFromPoint(e.clientX, e.clientY);
    if (!t || !t.classList || !t.classList.contains("cell")) return null;
    return { r: +t.dataset.r, c: +t.dataset.c };
  }

  onDown(e) {
    const cell = this.cellFromEvent(e);
    if (!cell) return;
    e.preventDefault();
    this.active = true;
    this.start = cell;
    this.current = cell;
    this.pathCells();
  }

  onMove(e) {
    if (!this.active) return;
    const cell = this.cellFromEvent(e);
    if (!cell) return;
    this.current = cell;
    this.pathCells();
  }

  pathCells() {
    const { r: sr, c: sc } = this.start;
    const { r: er, c: ec } = this.current;
    const cells = [];
    if (sr !== er && sc !== ec) {
      // diagonal drag — ignore, keep straight lines only
    } else {
      const dr = Math.sign(er - sr);
      const dc = Math.sign(ec - sc);
      let r = sr,
        c = sc;
      while (true) {
        cells.push({ r, c });
        if (r === er && c === ec) break;
        r += dr;
        c += dc;
      }
    }
    this.path = cells;
    this.container.querySelectorAll(".cell.selected").forEach((el) => el.classList.remove("selected"));
    cells.forEach(({ r, c }) => this.cells[r][c].classList.add("selected"));
    return cells;
  }

  onUp(e) {
    if (!this.active) return;
    this.active = false;
    const cell = this.cellFromEvent(e);
    if (cell) {
      // Include the cell under the pointer on release, so a quick
      // swipe/flick that lifts early still resolves the full path.
      this.current = cell;
      this.pathCells();
    }
    const cells = this.path || [];
    const word = cells.map(({ r, c }) => this.puzzle.grid[r][c]).join("");
    this.container.querySelectorAll(".cell.selected").forEach((el) => el.classList.remove("selected"));
    this.path = null;
    this.start = null;
    this.current = null;
    if (word.length >= 2) this.evaluate(word, cells);
  }

  evaluate(word, cells) {
    const idx = this.placementWords.indexOf(word);
    if (idx === -1 || this.found.has(word)) return;
    this.found.add(word);
    cells.forEach(({ r, c }) => this.cells[r][c].classList.add("found"));
    const isAnswer = word === this.answer;
    if (this.onFound) this.onFound(word, isAnswer);
  }
}
