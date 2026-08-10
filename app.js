// ============================================================
//  APP — orchestration. Auth screen -> day flow
//  (Read -> Question -> Grid -> Done), wired to content files.
// ============================================================

import { DEPARTMENTS, YEARS } from "./config.js";
import { DAYS } from "./days.js";
import { WordGrid } from "./grid.js";
import {
  initAuth,
  getSession,
  registerOrLogin,
  saveCompletion,
  isFirebaseConfigured
} from "./auth.js";

const $ = (id) => document.getElementById(id);

let currentDay = null;
let grid = null;

function params() {
  return new URLSearchParams(window.location.search);
}

function dayFromParams() {
  const n = parseInt(params().get("day"), 10);
  if (Number.isFinite(n)) return DAYS.find((d) => d.id === n) || DAYS[0];
  return DAYS[0];
}

function show(id) {
  $("auth-screen").classList.toggle("hidden", id !== "auth");
  $("day-screen").classList.toggle("hidden", id === "auth");
}

function showStep(id) {
  ["read", "question", "grid", "done"].forEach((s) => {
    $(`step-${s}`).classList.toggle("hidden", s !== id);
  });
}

function toast(message, type) {
  const el = $("toast");
  el.textContent = message;
  el.className = "toast show " + (type || "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function populates() {
  const dept = $("auth-dept");
  const year = $("auth-year");
  dept.innerHTML = '<option value="" disabled selected>Select your department…</option>' +
    DEPARTMENTS.map((d) => `<option value="${d}">${d}</option>`).join("");
  year.innerHTML = '<option value="" disabled selected>Select your year…</option>' +
    YEARS.map((y) => `<option value="${y}">${y}</option>`).join("");
}

// ---------------- AUTH ----------------

function validateAuth() {
  let ok = true;
  const name = $("auth-name").value.trim();
  const phone = $("auth-phone").value.trim();
  const dept = $("auth-dept").value;
  const year = $("auth-year").value;

  $("name-error").textContent = "";
  $("phone-error").textContent = "";
  $("dept-error").textContent = "";
  $("year-error").textContent = "";

  if (name.length < 2) {
    $("name-error").textContent = "Please enter your name.";
    ok = false;
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    $("phone-error").textContent = "Please enter a valid 10-digit phone number.";
    ok = false;
  }
  if (!dept) {
    $("dept-error").textContent = "Please select your department.";
    ok = false;
  }
  if (!year) {
    $("year-error").textContent = "Please select your year of study.";
    ok = false;
  }
  return ok;
}

async function onAuthSubmit(e) {
  e.preventDefault();
  if (!validateAuth()) return;
  const btn = $("auth-submit");
  btn.disabled = true;
  try {
    const { player, status } = await registerOrLogin({
      name: $("auth-name").value.trim(),
      phone: $("auth-phone").value.trim(),
      department: $("auth-dept").value,
      year: $("auth-year").value
    });
    if (status === "existing") {
      toast(`Welcome back, ${player.name.split(" ")[0]}!`);
    } else {
      toast(`Welcome, ${player.name.split(" ")[0]}! You're registered.`);
    }
    startDayFlow();
  } finally {
    btn.disabled = false;
  }
}

// ---------------- DAY FLOW ----------------

function renderUserChip() {
  const s = getSession();
  const chip = $("user-chip");
  if (!s || !s.name) {
    chip.classList.add("hidden");
    return;
  }
  chip.classList.remove("hidden");
  const first = s.name.split(" ")[0];
  const deptShort = (s.department || "").replace("Department of ", "").trim();
  chip.textContent = `${first} · ${s.year || ""} · ${deptShort}`;
  chip.title = s.name;
}

function startDayFlow() {
  show("day");
  renderUserChip();
  renderDay();
  showStep("read");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderDay() {
  const d = currentDay;
  $("day-tag").textContent = `Day ${d.id}`;
  $("day-title").textContent = d.title;
  $("day-reference").textContent = d.reference;
  $("passage-text").textContent = d.passage;
  $("question-text").textContent = d.question;
  $("done-day").textContent = `Day ${d.id} · ${d.reference}`;
}

function onReadDone() {
  showStep("question");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onQuestionDone() {
  showStep("grid");
  buildGrid();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildGrid() {
  const d = currentDay;
  if (grid) {
    grid.container.innerHTML = "";
    grid = null;
  }
  const bank = $("word-bank");
  bank.innerHTML = "";
  const fb = $("grid-feedback");
  fb.textContent = "";
  fb.className = "grid-feedback";

  grid = new WordGrid($("word-grid"), {
    answer: d.answer,
    decoys: d.decoys,
    onReady: (words) => renderBank(words),
    onFound: handleFound
  });
}

function renderBank(words) {
  const bank = $("word-bank");
  bank.innerHTML = "";
  const note = document.createElement("p");
  note.className = "bank-note";
  note.textContent = "Words hidden in this grid:";
  bank.appendChild(note);
  const chips = document.createElement("div");
  chips.className = "bank-chips";
  words.forEach((w) => {
    const chip = document.createElement("span");
    chip.className = "bank-chip";
    chip.dataset.word = w;
    chip.textContent = w;
    chips.appendChild(chip);
  });
  bank.appendChild(chips);
}

function handleFound(word, isAnswer) {
  const chip = document.querySelector(`.bank-chip[data-word="${word}"]`);
  if (chip) chip.classList.add("found");
  const fb = $("grid-feedback");

  if (isAnswer) {
    fb.textContent = `Yes! ${word} — that's the answer.`;
    fb.className = "grid-feedback success";
    $("word-grid").classList.add("won");
    saveCompletion(currentDay.id);
    setTimeout(() => {
      $("word-grid").classList.remove("won");
      showStep("done");
      $("done-text").textContent = currentDay.wellDone;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1200);
  } else {
    fb.textContent = `${word} — found, but not the answer. Keep seeking.`;
    fb.className = "grid-feedback shake";
    setTimeout(() => (fb.className = "grid-feedback"), 500);
  }
}

function onAgain() {
  buildGrid();
  showStep("read");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------- INIT ----------------

function boot() {
  initAuth();
  populates();
  currentDay = dayFromParams();

  $("auth-form").addEventListener("submit", onAuthSubmit);
  $("btn-read").addEventListener("click", onReadDone);
  $("btn-question").addEventListener("click", onQuestionDone);
  $("btn-again").addEventListener("click", onAgain);

  $("auth-name").addEventListener("input", () => ($("name-error").textContent = ""));
  $("auth-phone").addEventListener("input", () => ($("phone-error").textContent = ""));
  $("auth-dept").addEventListener("change", () => ($("dept-error").textContent = ""));
  $("auth-year").addEventListener("change", () => ($("year-error").textContent = ""));

  if (!isFirebaseConfigured()) {
    $("auth-footnote").textContent =
      "Offline mode — your details are saved on this phone until the team connects this app to Firebase.";
  }

  if (getSession() && getSession().name) {
    startDayFlow();
  } else {
    show("auth");
  }
}

boot();
