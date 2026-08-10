// ============================================================
//  DAILY CONTENT — this is the file you edit.
//
//  Each day is one object. The flow is:
//    Read passage -> answer the question -> find the answer
//    hidden in the word grid.
//
//  - question: a clue that points to one specific word.
//  - answer:   the word they must find in the grid.
//  - decoys:   3-5 extra words that are ALSO hidden in the grid
//              (ideally taken from the passage) to make it a
//              real word-search. They are not the answer.
//  - wellDone: a short closing line shown on the completion screen.
//
//  Words are matched case-insensitively; hyphens/spaces are ignored.
// ============================================================

export const DAYS = [
  {
    id: 1,
    title: "Day 1 · The Word Became Flesh",
    reference: "John 1:1-14",
    passage:
      "In the beginning was the Word, and the Word was with God, and the Word was God. " +
      "All things were made by him. In him was life, and the life was the light of men. " +
      "And the light shines in the darkness, and the darkness did not overcome it. " +
      "And the Word became flesh and dwelt among us, full of grace and truth, and we beheld his glory.",
    question: "John 1:14 — the Word became flesh and ______ among us.",
    answer: "DWELT",
    decoys: ["GLORY", "GRACE", "TRUTH", "LIGHT"],
    wellDone:
      "The Word made his home among us. May you walk with him today and let his light shine through you."
  },
  {
    id: 2,
    title: "Day 2 · The Lord Is My Shepherd",
    reference: "Psalm 23",
    passage:
      "The LORD is my shepherd, I shall not want. He makes me lie down in green pastures. " +
      "He leads me beside still waters; he restores my soul. " +
      "He leads me in paths of righteousness for his name's sake. " +
      "Even though I walk through the valley of the shadow of death, I fear no evil, for you are with me. " +
      "Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the LORD forever.",
    question: "Psalm 23 — beside what does the LORD lead me?",
    answer: "WATERS",
    decoys: ["SHEPHERD", "VALLEY", "GOODNESS", "MERCY"],
    wellDone:
      "The Good Shepherd goes with you through every valley. Rest in his still waters today."
  }
];
