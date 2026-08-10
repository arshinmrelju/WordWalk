// ============================================================
//  AUTH — registration, auto-login, session & completion tracking.
//
//  One form, auto-detect:
//    - phone not found in Firestore  -> register a new player
//    - phone found                   -> "Welcome back!" and log in
//  When Firebase isn't configured, it falls back to localStorage
//  on the user's own phone.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { FIREBASE_CONFIG, isFirebaseConfigured as fbConfigured } from "./firebase-config.js";

const SESSION_KEY = "wordWalk_session";
let db = null;

export function initAuth() {
  if (fbConfigured()) {
    try {
      db = getFirestore(initializeApp(FIREBASE_CONFIG));
    } catch (e) {
      console.warn("Firebase init failed, using local mode:", e);
      db = null;
    }
  }
}

export function isFirebaseConfigured() {
  return !!db;
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch (e) {
    return null;
  }
}

function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn("localStorage error:", e);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

function toSession(record) {
  return {
    name: record.name || "Player",
    phone: record.phoneNumber || record.phone || "",
    department: record.department || "",
    year: record.year || "",
    completedDays: Array.isArray(record.completedDays) ? record.completedDays : []
  };
}

/**
 * Register or log in a player in one call.
 * Returns { player, status } where status is 'registered' | 'existing'.
 */
export async function registerOrLogin({ name, phone, department, year }) {
  const session = { name, phone, department, year, completedDays: [] };

  if (db) {
    try {
      const ref = doc(db, "players", phone);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const player = toSession(snap.data());
        player.department = player.department || department;
        player.year = player.year || year;
        saveSession(player);
        return { player, status: "existing" };
      }
      await setDoc(ref, {
        name: name,
        phoneNumber: phone,
        department: department,
        year: year,
        registeredAt: serverTimestamp(),
        completedDays: []
      });
      saveSession(session);
      return { player: session, status: "registered" };
    } catch (e) {
      console.warn("Firestore register/login error, using local mode:", e);
    }
  }

  // Local fallback
  const local = getSession();
  if (local && local.phone === phone) {
    saveSession({ ...local, name, department, year });
    return { player: { ...local, name, department, year }, status: "existing" };
  }
  saveSession(session);
  return { player: session, status: "registered" };
}

/** Record that this player solved the given day. */
export async function saveCompletion(dayId) {
  const session = getSession();
  if (!session) return;
  if (!session.completedDays.includes(dayId)) {
    session.completedDays.push(dayId);
    saveSession(session);
  }
  if (db && session.phone) {
    try {
      await updateDoc(doc(db, "players", session.phone), {
        completedDays: arrayUnion(dayId)
      });
    } catch (e) {
      console.warn("Completion save error:", e);
    }
  }
}
