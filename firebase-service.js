/**
 * WORD WALK — Firebase Firestore Integration Service
 * Configured for project: __YOUR_PROJECT_ID__
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs,
    doc, 
    deleteDoc, 
    query, 
    orderBy, 
    where,
    limit, 
    onSnapshot,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase App & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Save Score Record to Firestore Leaderboard using individual player tag doc ID (rollNumber|department|year)
 * @param {Object} scoreData { id, name, department, year, rollNumber, score, difficulty, cumulativeScore }
 */
export async function saveScoreToFirestore(scoreData) {
    try {
        const { rollNumber, department, year, id } = scoreData;
        let docId = `${rollNumber}|${department}|${year}`;
        if (!rollNumber || !department || !year) {
            docId = id || rollNumber || 'anonymous';
        }

        // Clean up any legacy auto-generated ID leaderboard docs for this player
        if (rollNumber) {
            try {
                const legacyQuery = query(
                    collection(db, "leaderboard"),
                    where("rollNumber", "==", rollNumber)
                );
                const legacySnap = await getDocs(legacyQuery);
                legacySnap.forEach(async (dSnap) => {
                    if (dSnap.id !== docId) {
                        await deleteDoc(doc(db, "leaderboard", dSnap.id)).catch(() => {});
                    }
                });
            } catch (e) { /* noop */ }
        }

        const docRef = doc(db, "leaderboard", docId);
        await setDoc(docRef, {
            name: scoreData.name || "Player",
            rollNumber: scoreData.rollNumber || "",
            department: scoreData.department || "",
            year: scoreData.year || "",
            difficulty: scoreData.difficulty || "medium",
            score: scoreData.score || 0,
            cumulativeScore: scoreData.cumulativeScore || 0,
            timestamp: serverTimestamp(),
            date: new Date().toLocaleDateString()
        }, { merge: true });
        console.log("Score saved to Firestore leaderboard with ID:", docId);
        return docId;
    } catch (e) {
        console.warn("Firestore save score error:", e);
        return null;
    }
}

/**
 * Subscribe to Live Firestore Leaderboard Updates
 * @param {Function} callback Callback with list of leaderboard objects
 */
export function subscribeToLeaderboard(callback) {
    try {
        const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(100));
        return onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            callback(list);
        }, (error) => {
            console.warn("Firestore leaderboard snapshot error:", error);
        });
    } catch (e) {
        console.warn("Firestore subscription error:", e);
    }
}

export async function deleteScoreFromFirestore(target) {
    return await deletePlayerFromFirestore(target);
}

/**
 * Save or update cumulative player score to Firestore using individual player tag doc ID (rollNumber|department|year)
 * @param {Object} data { id, rollNumber, name, department, year, cumulativeScore }
 */
export async function saveCumulativeScoreToFirestore(data) {
    try {
        const { rollNumber, department, year, id } = data;
        let docId = `${rollNumber}|${department}|${year}`;
        if (!rollNumber || !department || !year) {
            docId = id || rollNumber || 'anonymous';
        }

        // Purge any legacy auto-generated ID docs in cumulativeScores for this roll number
        if (rollNumber) {
            try {
                const legacyQuery = query(
                    collection(db, "cumulativeScores"),
                    where("rollNumber", "==", rollNumber)
                );
                const legacySnap = await getDocs(legacyQuery);
                legacySnap.forEach(async (dSnap) => {
                    if (dSnap.id !== docId) {
                        await deleteDoc(doc(db, "cumulativeScores", dSnap.id)).catch(() => {});
                    }
                });
            } catch (e) { /* noop */ }
        }

        const docRef = doc(db, "cumulativeScores", docId);
        await setDoc(docRef, {
            name: data.name || "Player",
            rollNumber: data.rollNumber || "",
            department: data.department || "",
            year: data.year || "",
            cumulativeScore: data.cumulativeScore || 0,
            updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Cumulative score saved to Firestore for ID:", docId, "Score:", data.cumulativeScore);
    } catch (e) {
        console.warn("Firestore cumulative score save error:", e);
    }
}

/**
 * Read the player's true cumulative score from the cumulativeScores collection
 * (the authoritative running total across all devices), or 0 if not found.
 * @param {string} rollNumber
 * @param {string} department
 * @param {string} year
 */
export async function getCumulativeScoreFromFirestore(rollNumber, department, year) {
    if (!rollNumber || !department || !year) return 0;
    try {
        const docRef = doc(db, "cumulativeScores", `${rollNumber}|${department}|${year}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const d = snap.data();
            return Number(d.cumulativeScore) || 0;
        }
        return 0;
    } catch (e) {
        console.warn("Firestore getCumulativeScore error:", e);
        return 0;
    }
}

/**
 * Save Custom Word Bank to Firestore
 * @param {Array} words Array of string words
 */
export async function saveWordBankToFirestore(words) {
    try {
        await setDoc(doc(db, "system_config", "word_bank"), {
            words: words,
            updatedAt: serverTimestamp()
        });
        console.log("Word bank updated in Firestore.");
    } catch (e) {
        console.warn("Firestore word bank save error:", e);
    }
}

/**
 * Get Custom Word Bank from Firestore
 */
export async function getWordBankFromFirestore() {
    try {
        const docSnap = await getDoc(doc(db, "system_config", "word_bank"));
        if (docSnap.exists() && docSnap.data().words) {
            return docSnap.data().words;
        }
    } catch (e) {
        console.warn("Firestore word bank fetch error:", e);
    }
    return null;
}

/**
 * Register a new player in the Firestore 'players' collection.
 * Returns the document ID of the newly created record.
 * @param {{ name, department, year, rollNumber }} playerData
 */
export async function registerPlayer(playerData) {
    const { rollNumber, department, year } = playerData;
    let docId = `${rollNumber}|${department}|${year}`;
    if (!rollNumber || !department || !year) {
        docId = playerData.id || rollNumber || 'anonymous';
    }

    // Purge any legacy auto-generated ID player docs for this roll number
    if (rollNumber) {
        try {
            const legacyQuery = query(
                collection(db, "players"),
                where("rollNumber", "==", rollNumber)
            );
            const legacySnap = await getDocs(legacyQuery);
            legacySnap.forEach(async (dSnap) => {
                if (dSnap.id !== docId) {
                    await deleteDoc(doc(db, "players", dSnap.id)).catch(() => {});
                }
            });
        } catch (e) { /* noop */ }
    }

    const docRef = doc(db, "players", docId);
    try {
        await setDoc(docRef, {
            name:        playerData.name        || "Player",
            phoneNumber: playerData.phoneNumber || "",
            department:  department             || "",
            year:        year                   || "",
            rollNumber:  rollNumber             || "",
            active:      false,
            registeredAt: serverTimestamp()
        }, { merge: true });
        console.log("Player registered with ID:", docId);
        return docId;
    } catch (e) {
        console.warn("Firestore registerPlayer error:", e);
        return null;
    }
}

/**
 * Look up an already-registered player by roll number + department + year.
 * Returns the player data object, or null if not found.
 * @param {string} rollNumber
 * @param {string} department
 * @param {string} year
 */
export async function getPlayerByRollNumber(rollNumber, department, year) {
    try {
        const q = query(
            collection(db, "players"),
            where("rollNumber",  "==", rollNumber),
            where("department",  "==", department),
            where("year",        "==", year),
            limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const d = snap.docs[0];
            return { id: d.id, ...d.data() };
        }
        return null;
    } catch (e) {
        console.warn("Firestore getPlayerByRollNumber error:", e);
        return null;
    }
}

/**
 * Mark the player's document as active (game started) with level and score tracking
 * Reads the player's Firestore doc ID from localStorage.
 * @param {Object} levelData Optional { level, levelTitle, score, cumulativeScore }
 */
export async function registerActiveGame(levelData = {}) {
    const playerId = localStorage.getItem('wordWalk_playerFirestoreId');
    if (!playerId) return null;
    try {
        const payload = {
            active: true,
            gameStartedAt: serverTimestamp(),
            lastActiveAt: serverTimestamp()
        };
        if (levelData && typeof levelData.level === 'number') {
            payload.currentLevel = levelData.level;
            payload.levelTitle = levelData.levelTitle || 'Seeker';
            payload.score = levelData.score || 0;
            payload.cumulativeScore = levelData.cumulativeScore || 0;
        }
        await updateDoc(doc(db, "players", playerId), payload);
        console.log("Player marked active:", playerId, levelData);
        return playerId;
    } catch (e) {
        console.warn("Failed to mark player active:", e);
        return null;
    }
}

/**
 * Update the player's level progress in Firestore in real-time
 * @param {Object} levelData { level, levelTitle, score, cumulativeScore }
 */
export async function updatePlayerLevelInFirestore(levelData = {}) {
    const playerId = localStorage.getItem('wordWalk_playerFirestoreId');
    if (!playerId) return null;
    try {
        const { level = 1, levelTitle = 'Seeker', score = 0, cumulativeScore = 0 } = levelData;
        await updateDoc(doc(db, "players", playerId), {
            active: true,
            currentLevel: level,
            levelTitle: levelTitle,
            score: score,
            cumulativeScore: cumulativeScore,
            lastActiveAt: serverTimestamp()
        });
        console.log("Updated player level in Firestore:", playerId, "Lvl:", level, levelTitle);
        return playerId;
    } catch (e) {
        console.warn("Failed to update player level in Firestore:", e);
        return null;
    }
}

/**
 * Sync the player's active 2D grid matrix, target words, and found words to Firestore for live spectating
 * @param {Object} gridData { grid, words, placed, foundWords, gridSize, remainingSeconds, score, level, levelTitle }
 */
export async function syncLiveGridToFirestore(gridData = {}) {
    const playerId = localStorage.getItem('wordWalk_playerFirestoreId');
    if (!playerId || !gridData) return null;
    try {
        const { grid, words, placed, foundWords, gridSize, remainingSeconds, score, level, levelTitle } = gridData;
        // Firestore cannot store nested arrays (2D grids), so flatten each row into a string.
        const gridRows = Array.isArray(grid)
            ? grid.map(row => (Array.isArray(row) ? row.join('') : String(row ?? '')))
            : [];
        await updateDoc(doc(db, "players", playerId), {
            liveState: {
                grid: gridRows,
                words: words || [],
                placed: placed || {},
                foundWords: foundWords || [],
                gridSize: gridSize || 12,
                remainingSeconds: typeof remainingSeconds === 'number' ? remainingSeconds : null,
                score: score || 0,
                level: level || 1,
                levelTitle: levelTitle || 'Seeker',
                updatedAt: serverTimestamp()
            }
        });
        console.log("Live grid synced to Firestore for player:", playerId);
        return playerId;
    } catch (e) {
        console.warn("Failed to sync live grid to Firestore:", e);
        return null;
    }
}

/**
 * Subscribe to a specific live player's Firestore document (for real-time spectator mode)
 * @param {string} playerId 
 * @param {Function} callback 
 */
export function subscribeToPlayerLiveGrid(playerId, callback) {
    if (!playerId) return () => {};
    try {
        return onSnapshot(doc(db, "players", playerId), (docSnap) => {
            if (docSnap.exists()) {
                callback({ id: docSnap.id, ...docSnap.data() });
            }
        }, (error) => {
            console.warn("Spectator snapshot error for player:", playerId, error);
        });
    } catch (e) {
        console.warn("subscribeToPlayerLiveGrid error:", e);
        return () => {};
    }
}

/**
 * Mark the player's document as inactive (game finished or left)
 */
export async function unregisterActiveGame() {
    const playerId = localStorage.getItem('wordWalk_playerFirestoreId');
    if (!playerId) return;
    try {
        await updateDoc(doc(db, "players", playerId), {
            active: false,
            liveState: null
        });
        console.log("Player marked inactive:", playerId);
    } catch (e) {
        console.warn("Failed to mark player inactive:", e);
    }
}

/**
 * Subscribe to the count of players actively playing in game.html
 * (active === true AND have a valid liveState grid AND a recent heartbeat —
 * excludes index.html / idle sessions / players who closed their tab abruptly)
 * @param {Function} callback Called with the live count (number)
 */
const LIVE_STALE_MS = 60000;

function firestoreTimestampToMillis(ts) {
    if (!ts) return null;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') return Date.parse(ts);
    return null;
}

function isLiveDocFresh(data) {
    const liveState = data && data.liveState;
    if (!liveState) return false;
    const stamp = firestoreTimestampToMillis(liveState.updatedAt) || firestoreTimestampToMillis(data.lastActiveAt);
    return stamp !== null && (Date.now() - stamp) < LIVE_STALE_MS;
}

export function subscribeToActiveGameCount(callback) {
    try {
        const q = query(collection(db, "players"), where("active", "==", true));
        return onSnapshot(q, (snapshot) => {
            // Strictly count only players with an actual puzzle grid loaded (i.e. inside game.html)
            // who have reported in recently (heartbeat is every 15s).
            const liveInGame = snapshot.docs.filter(d => {
                const data = d.data();
                return data.liveState && Array.isArray(data.liveState.grid) && data.liveState.grid.length > 0 && isLiveDocFresh(data);
            });
            callback(liveInGame.length);
        }, (error) => {
            console.warn("Active players snapshot error:", error);
        });
    } catch (e) {
        console.warn("subscribeToActiveGameCount error:", e);
    }
}

/**
 * Automatically flip stale live-player docs to inactive.
 * Players who closed game.html abruptly never fired the unload cleanup, so their
 * doc stays active:true forever. This clears them server-side after LIVE_STALE_MS
 * without a heartbeat, keeping the players collection tidy.
 * @returns {Promise<number>} Number of docs cleaned up
 */
export async function cleanupStaleLivePlayers() {
    let cleaned = 0;
    try {
        const q = query(collection(db, "players"), where("active", "==", true), limit(500));
        const snap = await getDocs(q);
        const batch = [];
        snap.docs.forEach(d => {
            const data = d.data();
            if (data.liveState && Array.isArray(data.liveState.grid) && data.liveState.grid.length > 0 && !isLiveDocFresh(data)) {
                batch.push(updateDoc(doc(db, "players", d.id), { active: false, liveState: null }));
                cleaned++;
            }
        });
        await Promise.allSettled(batch);
        if (cleaned > 0) console.log("Cleaned stale live players:", cleaned);
    } catch (e) {
        console.warn("cleanupStaleLivePlayers error:", e);
    }
    return cleaned;
}

/**
 * Subscribe to Live Registered Players Updates
 * @param {Function} callback Callback with list of player objects
 */
export function subscribeToPlayers(callback) {
    try {
        const q = query(collection(db, "players"), limit(200));
        return onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                let regDate = data.registeredAt && data.registeredAt.toDate ? data.registeredAt.toDate().toLocaleDateString() : (new Date().toLocaleDateString());
                list.push({ id: docSnap.id, ...data, dateDisplay: regDate });
            });
            callback(list);
        }, (error) => {
            console.warn("Firestore players snapshot error:", error);
        });
    } catch (e) {
        console.warn("Firestore players subscription error:", e);
    }
}

/**
 * Delete a Player Registration and ALL associated records by docId and/or player info
 * @param {String|Object} target docId string or player object { id, rollNumber, department, year }
 */
export async function deletePlayerFromFirestore(target) {
    if (!target) return false;
    let docId = typeof target === 'string' ? target : (target.id || '');
    let rollNumber = typeof target === 'object' ? (target.rollNumber || '') : '';
    let department = typeof target === 'object' ? (target.department || '') : '';
    let year       = typeof target === 'object' ? (target.year || '') : '';

    if (docId && docId.includes('|')) {
        const parts = docId.split('|');
        if (!rollNumber) rollNumber = parts[0];
        if (!department) department = parts[1];
        if (!year)       year       = parts[2];
    }

    try {
        const collections = ["players", "leaderboard", "cumulativeScores"];
        
        // 1. Delete by direct docId
        if (docId) {
            for (const col of collections) {
                await deleteDoc(doc(db, col, docId)).catch(() => {});
            }
        }

        // 2. Delete by constructed composite ID if rollNumber/dept/year exist
        if (rollNumber && department && year) {
            const compId = `${rollNumber}|${department}|${year}`;
            for (const col of collections) {
                await deleteDoc(doc(db, col, compId)).catch(() => {});
            }
        }

        // 3. Query & delete any matching documents by rollNumber across all collections
        if (rollNumber) {
            for (const col of collections) {
                try {
                    const q = query(collection(db, col), where("rollNumber", "==", rollNumber));
                    const snap = await getDocs(q);
                    const deletes = [];
                    snap.forEach(d => deletes.push(deleteDoc(d.ref)));
                    await Promise.all(deletes);
                } catch (e) {}
            }
        }

        console.log("Player completely deleted across Firestore collections for:", docId || rollNumber);
        return true;
    } catch (e) {
        console.warn("Firestore delete player error:", e);
        return false;
    }
}

/**
 * Delete ALL Player, Leaderboard, and Cumulative Score records from Firestore
 */
export async function clearAllDataFromFirestore() {
    try {
        const collectionsToClear = ["players", "leaderboard", "cumulativeScores"];
        for (const colName of collectionsToClear) {
            const snap = await getDocs(collection(db, colName));
            const promises = snap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(promises);
        }
        console.log("All Firestore player & leaderboard data successfully cleared.");
        return true;
    } catch (e) {
        console.warn("Firestore clearAllData error:", e);
        return false;
    }
}


/**
 * Set Game Active state in Firestore
 * @param {boolean} isActive
 */
export async function setGameStateInFirestore(isActive) {
    try {
        await setDoc(doc(db, "system_config", "game_control"), {
            isGameActive: isActive,
            updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Game active state updated in Firestore:", isActive);
        return true;
    } catch (e) {
        console.warn("Firestore setGameState error:", e);
        return false;
    }
}

/**
 * Get current Game Active state from Firestore
 */
export async function getGameStateFromFirestore() {
    try {
        const docSnap = await getDoc(doc(db, "system_config", "game_control"));
        if (docSnap.exists() && typeof docSnap.data().isGameActive === 'boolean') {
            return docSnap.data().isGameActive;
        }
    } catch (e) {
        console.warn("Firestore getGameState error:", e);
    }
    return true; // Default active if document not present
}

/**
 * Subscribe to real-time Game Active state updates
 * @param {Function} callback Called with boolean (isActive)
 */
export function subscribeToGameState(callback) {
    try {
        return onSnapshot(doc(db, "system_config", "game_control"), (docSnap) => {
            if (docSnap.exists() && typeof docSnap.data().isGameActive === 'boolean') {
                callback(docSnap.data().isGameActive);
            } else {
                callback(true); // Default active
            }
        }, (error) => {
            console.warn("Game state snapshot error:", error);
            callback(true);
        });
    } catch (e) {
        console.warn("subscribeToGameState error:", e);
        callback(true);
    }
}

/**
 * Send a message from the Admin to a single live player.
 * Uses a dedicated `player_messages/{playerId}` doc so messages never collide
 * with the heavily-updated player doc (liveState / heartbeat).
 * Overwrite semantics: a new message replaces the current one for that player.
 * @param {string} playerId Firestore player doc id
 * @param {string} text Message body
 */
export async function sendMessageToPlayer(playerId, text) {
    if (!playerId || !text) return false;
    try {
        await setDoc(doc(db, "player_messages", playerId), {
            text: text,
            from: "Admin",
            sentAt: serverTimestamp(),
            read: false
        }, { merge: true });
        console.log("Message sent to player:", playerId);
        return true;
    } catch (e) {
        console.warn("Firestore sendMessageToPlayer error:", e);
        return false;
    }
}

/**
 * Broadcast a message from the Admin to a list of live players.
 * @param {string[]} playerIds Array of Firestore player doc ids
 * @param {string} text Message body
 */
export async function broadcastMessageToLivePlayers(playerIds, text) {
    if (!Array.isArray(playerIds) || playerIds.length === 0 || !text) return 0;
    let sent = 0;
    const results = playerIds.map((id) =>
        sendMessageToPlayer(id, text).then((ok) => { if (ok) sent++; })
    );
    await Promise.allSettled(results);
    console.log("Broadcast message sent to", sent, "players");
    return sent;
}

/**
 * Subscribe to the player's admin-message doc in real time.
 * @param {string} playerId Firestore player doc id
 * @param {Function} callback Called with the message object ({ text, sentAt, read }) or null when cleared
 */
export function subscribeToPlayerMessages(playerId, callback) {
    if (!playerId) return () => {};
    try {
        return onSnapshot(doc(db, "player_messages", playerId), (docSnap) => {
            if (docSnap.exists()) {
                callback({ id: docSnap.id, ...docSnap.data() });
            } else {
                callback(null);
            }
        }, (error) => {
            console.warn("Message snapshot error for player:", playerId, error);
        });
    } catch (e) {
        console.warn("subscribeToPlayerMessages error:", e);
        return () => {};
    }
}

/**
 * Acknowledge and clear the admin message for a player so a future
 * message is detected fresh (overwrite semantics).
 * @param {string} playerId Firestore player doc id
 */
export async function acknowledgePlayerMessage(playerId) {
    if (!playerId) return;
    try {
        await deleteDoc(doc(db, "player_messages", playerId));
        console.log("Player message acknowledged & cleared:", playerId);
    } catch (e) {
        console.warn("Firestore acknowledgePlayerMessage error:", e);
    }
}

// Make available globally for non-module scripts if needed
window.WordWalkFirebase = {
    app,
    db,
    saveScoreToFirestore,
    subscribeToLeaderboard,
    deleteScoreFromFirestore,
    saveWordBankToFirestore,
    getWordBankFromFirestore,
    registerPlayer,
    getPlayerByRollNumber,
    subscribeToPlayers,
    deletePlayerFromFirestore,
    registerActiveGame,
    updatePlayerLevelInFirestore,
    syncLiveGridToFirestore,
    subscribeToPlayerLiveGrid,
    unregisterActiveGame,
    subscribeToActiveGameCount,
    cleanupStaleLivePlayers,
    saveCumulativeScoreToFirestore,
    getCumulativeScoreFromFirestore,
    setGameStateInFirestore,
    getGameStateFromFirestore,
    subscribeToGameState,
    sendMessageToPlayer,
    broadcastMessageToLivePlayers,
    subscribeToPlayerMessages,
    acknowledgePlayerMessage,
    clearAllDataFromFirestore
};

