import { DAYS } from "../days.js";
import { generatePuzzle, gridSizeFor, normalizeWord } from "../grid.js";

function check(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("ok - " + msg);
}

let failures = 0;
for (const day of DAYS) {
  const words = [day.answer, ...day.decoys]
    .map(normalizeWord)
    .filter((w) => w.length >= 2);
  const answer = normalizeWord(day.answer);
  check(words.includes(answer), `Day ${day.id}: answer ${answer} in word list`);

  const size = gridSizeFor(words);
  const puzzle = generatePuzzle(words, size);
  check(puzzle !== null, `Day ${day.id}: puzzle generated (${size}x${size}, ${words.length} words)`);

  if (!puzzle) {
    failures++;
    continue;
  }
  check(puzzle.grid.length === size && puzzle.grid.every((r) => r.length === size), `Day ${day.id}: grid is ${size}x${size}`);
  check(puzzle.placements.length === words.length, `Day ${day.id}: all ${words.length} words placed`);

  for (const p of puzzle.placements) {
    const letters = [];
    for (let i = 0; i < p.word.length; i++) {
      const r = p.row + (p.dir === "v" ? i : 0);
      const c = p.col + (p.dir === "h" ? i : 0);
      letters.push(puzzle.grid[r][c]);
    }
    check(letters.join("") === p.word, `Day ${day.id}: placement ${p.word} intact (${p.dir} @ ${p.row},${p.col})`);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      check(/^[A-Z]$/.test(puzzle.grid[r][c]), `Day ${day.id}: all cells are letters`);
    }
  }
}

// Determinism: a few samples never crash with random layouts
for (let i = 0; i < 200; i++) {
  const day = DAYS[i % DAYS.length];
  const words = [day.answer, ...day.decoys].map(normalizeWord).filter((w) => w.length >= 2);
  const p = generatePuzzle(words, gridSizeFor(words));
  check(p !== null, `sample ${i}: generation succeeds`);
}

// Long words (up to grid cap) must place reliably
for (const word of ["RIGHTEOUSNESS", "PRACTITIONER", "REHABILITATION"]) {
  const words = [word, "HOPE", "FAITH", "LOVE", "PEACE"];
  const size = gridSizeFor(words);
  const p = generatePuzzle(words, size);
  check(p !== null, `long word ${word}: generated at ${size}x${size}`);
  if (p) {
    const wp = p.placements.find((x) => x.word === word);
    check(!!wp, `long word ${word}: actually placed`);
  }
}

if (failures) {
  console.error(`${failures} failures`);
  process.exit(1);
}
console.log("All grid tests passed.");
