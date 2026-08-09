/**
 * WORD WALK — Admin Control Panel Logic (admin.js)
 * Manages player registrations, leaderboard scores, CSV exports, stats calculations,
 * and custom word bank management.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // Default initial word bank if none saved
    const DEFAULT_WORD_BANK = [
        // ── Faith & Virtues ──
        'FAITH', 'HOPE', 'LOVE', 'GRACE', 'MERCY', 'PEACE', 'JOY', 'PRAISE',
        'WORSHIP', 'PRAYER', 'BLESSING', 'SALVATION', 'REDEMPTION', 'FORGIVENESS',
        'COVENANT', 'GOSPEL', 'SCRIPTURE', 'PARABLE', 'MIRACLE', 'HEAVEN',
        'SERMON', 'TRINITY', 'SHEPHERD', 'DISCIPLE', 'APOSTLE', 'TESTIMONY',
        'BAPTISM', 'WISDOM', 'HUMILITY', 'GENTLENESS', 'PATIENCE', 'GOODNESS',
        'KINDNESS', 'ETERNITY', 'HOLINESS', 'SANCTUARY', 'VIRTUE', 'REVIVAL',
        'FAITHFUL', 'DEVOTION', 'COMMUNION', 'CHARITY',
        // ── People of the Bible ──
        'JESUS', 'MARY', 'MOSES', 'DAVID', 'PAUL', 'PETER', 'NOAH', 'JONAH',
        'ABRAHAM', 'JOSEPH', 'ELIJAH', 'ISAIAH', 'DANIEL', 'SOLOMON', 'RUTH',
        'ESTHER', 'JOHN', 'LUKE', 'MARK', 'STEPHEN', 'TIMOTHY',
        // ── Places & Events ──
        'NAZARETH', 'BETHLEHEM', 'GALILEE', 'JORDAN', 'JERUSALEM', 'CALVARY',
        'GOLGOTHA', 'PENTECOST', 'GABRIEL', 'MICHAEL', 'EDEN', 'CANA',
        // ── General & Theme ──
        'JOURNEY', 'WALK', 'PATH', 'RIVER', 'MOUNTAIN', 'LAMP', 'CROSS', 'CROWN',
        'VINE', 'BRANCH', 'HARVEST', 'VINEYARD', 'SEED', 'ROCK', 'SHIELD', 'SWORD',
        'ARMOR', 'THRONE', 'PSALM', 'PROVERB', 'STONE', 'DOOR', 'GATE', 'LIGHT',
        'TRUTH', 'STAR', 'FIELD', 'SHEEP', 'LAMB', 'KINGDOM'
    ];

    // LocalStorage Keys
    const STORAGE_KEY_LEADERBOARD = 'wordWalk_leaderboard';
    const STORAGE_KEY_CUSTOM_WORDS = 'wordWalk_customWords';

    // DOM Elements - Dashboard Stats
    const statTotalPlayers = document.getElementById('stat-total-players');
    const statTopScore     = document.getElementById('stat-top-score');
    const statTopDept      = document.getElementById('stat-top-dept');
    const statAvgScore     = document.getElementById('stat-avg-score');

    // DOM Elements - Tabs
    const tabBtnPlayers     = document.getElementById('tab-btn-players');
    const tabBtnLive        = document.getElementById('tab-btn-live');
    const tabBtnLeaderboard = document.getElementById('tab-btn-leaderboard');
    const viewPlayersTable  = document.getElementById('view-players-table');
    const viewLiveTable     = document.getElementById('view-live-table');
    const viewLeaderboardTable = document.getElementById('view-leaderboard-table');
    const badgePlayersCount = document.getElementById('badge-players-count');
    const badgeLiveCount    = document.getElementById('badge-live-count');
    const badgeLeaderboardCount = document.getElementById('badge-leaderboard-count');
    const statCardLive      = document.getElementById('stat-card-live');

    // DOM Elements - Filters & Tables
    const searchInput = document.getElementById('admin-search-input');
    const deptFilter  = document.getElementById('admin-dept-filter');
    const yearFilter  = document.getElementById('admin-year-filter');
    const playersTableBody = document.getElementById('admin-players-table-body');
    const liveTableBody    = document.getElementById('admin-live-table-body');
    const leaderboardTableBody = document.getElementById('admin-leaderboard-table-body');

    // DOM Elements - Action Buttons
    const exportBtn    = document.getElementById('export-csv-btn');
    const clearBtn     = document.getElementById('clear-data-btn');
    const addWordForm  = document.getElementById('add-word-form');
    const newWordInput = document.getElementById('new-word-input');
    const wordsTagContainer = document.getElementById('words-tag-container');

    // Data State
    let playersList     = []; // Registered players from Firestore 'players'
    let leaderboardList = []; // Game scores from Firestore 'leaderboard'
    let customWordsList = [];
    let currentTab      = 'players'; // 'players' | 'live' | 'leaderboard'
    let firebaseReady   = false;    // true once Firestore has responded at least once

    // ----------------------------------------------------------------------
    // 1. Tab Switching
    // ----------------------------------------------------------------------
    function switchTab(tab) {
        currentTab = tab;
        if (tabBtnPlayers)     tabBtnPlayers.classList.toggle('active', tab === 'players');
        if (tabBtnLive)        tabBtnLive.classList.toggle('active', tab === 'live');
        if (tabBtnLeaderboard) tabBtnLeaderboard.classList.toggle('active', tab === 'leaderboard');

        if (viewPlayersTable)     viewPlayersTable.classList.toggle('hidden', tab !== 'players');
        if (viewLiveTable)        viewLiveTable.classList.toggle('hidden', tab !== 'live');
        if (viewLeaderboardTable) viewLeaderboardTable.classList.toggle('hidden', tab !== 'leaderboard');

        renderCurrentTab();
    }

    if (tabBtnPlayers)     tabBtnPlayers.addEventListener('click', () => switchTab('players'));
    if (tabBtnLive)        tabBtnLive.addEventListener('click', () => switchTab('live'));
    if (tabBtnLeaderboard) tabBtnLeaderboard.addEventListener('click', () => switchTab('leaderboard'));
    if (statCardLive)      statCardLive.addEventListener('click', () => switchTab('live'));

    // ----------------------------------------------------------------------
    // 2. Load Local Data Backup
    // ----------------------------------------------------------------------
    let leaderboardCache = []; // localStorage fallback cached separately

    function loadData() {
        leaderboardList = [];
        try {
            leaderboardCache = JSON.parse(localStorage.getItem(STORAGE_KEY_LEADERBOARD) || '[]');
        } catch (e) {
            leaderboardCache = [];
        }
        try {
            customWordsList = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_WORDS) || JSON.stringify(DEFAULT_WORD_BANK));
        } catch (e) {
            customWordsList = [...DEFAULT_WORD_BANK];
        }
    }

    // A player is "live" only if they reported in recently.
    // Heartbeat syncs every 15s, so a stale player who closed their tab abruptly
    // (no reliable unload write) drops off after LIVE_STALE_MS without a Firestore write.
    const LIVE_STALE_MS = 60000;

    function tsToMillis(ts) {
        if (!ts) return null;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (ts instanceof Date) return ts.getTime();
        if (typeof ts === 'number') return ts;
        if (typeof ts === 'string') return Date.parse(ts);
        return null;
    }

    function isFreshLiveState(item) {
        const liveState = item && item.liveState;
        if (!liveState) return false;
        const stamp = tsToMillis(liveState.updatedAt) || tsToMillis(item.lastActiveAt);
        return stamp !== null && (Date.now() - stamp) < LIVE_STALE_MS;
    }

    function isPlayerLiveInGame(item) {
        return item && item.active === true && item.liveState && Array.isArray(item.liveState.grid) && item.liveState.grid.length > 0 && isFreshLiveState(item);
    }

    function getStatusBadgeHtml(isActive) {
        if (isActive) {
            return `<span class="status-pill-live"><span class="live-pulse-dot"></span>LIVE</span>`;
        }
        return `<span class="status-pill-offline">Offline</span>`;
    }

    function medalSvg(kind, num) {
        const colors = { gold: ['#f7c948', '#b8860b'], silver: ['#cfd8dc', '#90a4ae'], bronze: ['#e0a458', '#b4652a'] };
        const [face, edge] = colors[kind] || colors.gold;
        return `<svg class="rank-medal" width="20" height="20" viewBox="0 0 24 24" aria-label="${num}st place">
            <circle cx="12" cy="14" r="7" fill="${edge}"/>
            <circle cx="12" cy="14" r="5.6" fill="${face}"/>
            <path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.11" stroke="${edge}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <text x="12" y="15.1" font-size="7" font-weight="bold" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">${num}</text>
        </svg>`;
    }

    function getLevelBadgeHtml(lvlNum, lvlTitle) {
        const lvl = lvlNum || 1;
        const title = lvlTitle || (lvl === 1 ? 'Seeker' : lvl === 2 ? 'Follower' : lvl === 3 ? 'Disciple' : lvl === 4 ? 'Steward' : `Witness Lvl ${lvl}`);
        const isMaster = lvl >= 4;
        return `<span class="level-chip ${isMaster ? 'level-chip-master' : ''}">Lvl ${lvl} (${escapeHtml(title)})</span>`;
    }

    // ----------------------------------------------------------------------
    // 3. Compute Dashboard Statistics
    // ----------------------------------------------------------------------
    function updateStats() {
        // Total Registered Participants Count (deduplicated)
        const dedupedReg = deduplicatePlayers(playersList);
        const totalReg = dedupedReg.length;
        if (statTotalPlayers) statTotalPlayers.textContent = totalReg;
        if (badgePlayersCount) badgePlayersCount.textContent = totalReg;

        // Live Players Count (Strictly active inside game.html with generated grid)
        const liveCount = dedupedReg.filter(p => isPlayerLiveInGame(p)).length;
        if (badgeLiveCount) badgeLiveCount.textContent = liveCount;
        const statLiveGames = document.getElementById('stat-live-games');
        if (statLiveGames) statLiveGames.textContent = liveCount;

        // Leaderboard Count — deduplicated unique players (same key as renderLeaderboardTable)
        const uniquePlayers = {};
        leaderboardList.forEach(r => {
            const key = `${r.rollNumber || ''}|${r.department || ''}|${r.year || ''}`;
            const currTotal = Math.max(r.cumulativeScore || 0, r.score || 0);
            const existTotal = uniquePlayers[key] ? Math.max(uniquePlayers[key].cumulativeScore || 0, uniquePlayers[key].score || 0) : -1;
            if (!uniquePlayers[key] || currTotal > existTotal) {
                uniquePlayers[key] = r;
            }
        });
        const uniquePlayerCount = Object.keys(uniquePlayers).length;
        if (badgeLeaderboardCount) badgeLeaderboardCount.textContent = uniquePlayerCount;

        // Use deduplicated best scores for all stat calculations
        const dedupedScores = Object.values(uniquePlayers);
        if (dedupedScores.length === 0) {
            if (statTopScore) statTopScore.textContent = '0';
            if (statTopDept) statTopDept.textContent = 'None';
            if (statAvgScore) statAvgScore.textContent = '0';
            return;
        }

        // Top Score — use cumulativeScore (true total), fallback to score
        const topScore = Math.max(...dedupedScores.map(r => Math.max(r.cumulativeScore || 0, r.score || 0)));
        if (statTopScore) statTopScore.textContent = topScore;

        // Average Score (based on each player's cumulative total)
        const sumScore = dedupedScores.reduce((acc, r) => acc + Math.max(r.cumulativeScore || 0, r.score || 0), 0);
        const avgScore = Math.round(sumScore / dedupedScores.length);
        if (statAvgScore) statAvgScore.textContent = avgScore;

        // Top Department (highest cumulative best-score per department)
        const deptScores = {};
        dedupedScores.forEach(r => {
            if (!r.department) return;
            const shortDept = r.department.replace('Department of ', '');
            deptScores[shortDept] = (deptScores[shortDept] || 0) + Math.max(r.cumulativeScore || 0, r.score || 0);
        });

        let topDeptName = 'None';
        let maxDeptScore = -1;
        for (const [dept, score] of Object.entries(deptScores)) {
            if (score > maxDeptScore) {
                maxDeptScore = score;
                topDeptName = dept;
            }
        }
        if (statTopDept) statTopDept.textContent = topDeptName;
    }

    // ----------------------------------------------------------------------
    // 4. Render Registered Players Table
    // ----------------------------------------------------------------------
    function renderPlayersTable() {
        if (!playersTableBody) return;
        playersTableBody.innerHTML = '';

        const searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedDept = deptFilter ? deptFilter.value : 'ALL';
        const selectedYear = yearFilter ? yearFilter.value : 'ALL';

        const deduped = deduplicatePlayers(playersList);

        const filtered = deduped.filter(item => {
            const nameMatch = !searchVal || 
                (item.name || '').toLowerCase().includes(searchVal) ||
                (item.rollNumber || '').toLowerCase().includes(searchVal);

            const deptMatch = selectedDept === 'ALL' || item.department === selectedDept;
            const yearMatch = selectedYear === 'ALL' || item.year === selectedYear;

            return nameMatch && deptMatch && yearMatch;
        });

        if (filtered.length === 0) {
            playersTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        No registered players match the current criteria.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item, idx) => {
            const tr = document.createElement('tr');
            const deptDisplay  = item.department ? item.department.replace('Department of ', '') : '—';
            const rollDisplay  = item.rollNumber || '—';
            const yearDisplay  = item.year || '—';
            const dateDisplay  = item.dateDisplay || '—';
            const phoneDisplay = item.phoneNumber || '—';
            const statusHtml   = getStatusBadgeHtml(isPlayerLiveInGame(item));
            const levelHtml    = getLevelBadgeHtml(item.currentLevel, item.levelTitle);
            const totalScore   = Math.max(Number(item.cumulativeScore) || 0, Number(item.score) || 0);

            tr.innerHTML = `
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                <td>${statusHtml}</td>
                <td>${levelHtml}</td>
                <td style="font-weight: 700; color: var(--accent-gold-light);">${totalScore}</td>
                <td><a href="tel:${escapeHtml(phoneDisplay)}" style="color: var(--accent-gold-light); font-weight: 600; text-decoration: none;">${escapeHtml(phoneDisplay)}</a></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
                <td>${escapeHtml(dateDisplay)}</td>
                <td style="text-align: right;">
                    <button class="delete-row-btn" data-id="${item.id}" data-roll="${escapeHtml(item.rollNumber || '')}" data-dept="${escapeHtml(item.department || '')}" data-year="${escapeHtml(item.year || '')}" data-name="${escapeHtml(item.name || 'Player')}" title="Delete registration">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            `;
            playersTableBody.appendChild(tr);
        });

        // Event Handlers for delete player
        playersTableBody.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const roll = btn.getAttribute('data-roll') || '';
                const dept = btn.getAttribute('data-dept') || '';
                const year = btn.getAttribute('data-year') || '';
                const name = btn.getAttribute('data-name');
                if (!confirm(`Are you sure you want to delete registration & score data for "${name}"?`)) return;
                btn.disabled = true;
                btn.innerHTML = '<span style="opacity:0.5">Deleting...</span>';
                const target = { id, rollNumber: roll, department: dept, year };
                const deleted = window.WordWalkFirebase && window.WordWalkFirebase.deletePlayerFromFirestore
                    ? await window.WordWalkFirebase.deletePlayerFromFirestore(target).catch(() => false)
                    : false;
                if (deleted !== false) {
                    playersList = playersList.filter(p => p.id !== id && p.rollNumber !== roll);
                    leaderboardList = leaderboardList.filter(r => r.id !== id && r.rollNumber !== roll);
                    saveLeaderboard();
                }
                updateStats();
                renderPlayersTable();
            });
        });
    }

    // ----------------------------------------------------------------------
    // 4.5. Render Live Players Table View
    // ----------------------------------------------------------------------
    function renderLivePlayersTable() {
        if (!liveTableBody) return;
        liveTableBody.innerHTML = '';

        const searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedDept = deptFilter ? deptFilter.value : 'ALL';
        const selectedYear = yearFilter ? yearFilter.value : 'ALL';

        const deduped = deduplicatePlayers(playersList);
        const livePlayers = deduped.filter(item => isPlayerLiveInGame(item));

        const filtered = livePlayers.filter(item => {
            const nameMatch = !searchVal || 
                (item.name || '').toLowerCase().includes(searchVal) ||
                (item.rollNumber || '').toLowerCase().includes(searchVal);

            const deptMatch = selectedDept === 'ALL' || item.department === selectedDept;
            const yearMatch = selectedYear === 'ALL' || item.year === selectedYear;

            return nameMatch && deptMatch && yearMatch;
        });

        if (filtered.length === 0) {
            liveTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                        <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">No Active Live Players</div>
                        <div>Players currently playing in <code>game.html</code> will appear here automatically in real time.</div>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item) => {
            const tr = document.createElement('tr');
            const deptDisplay  = item.department ? item.department.replace('Department of ', '') : '—';
            const rollDisplay  = item.rollNumber || '—';
            const yearDisplay  = item.year || '—';
            const phoneDisplay = item.phoneNumber || '—';
            const statusHtml   = getStatusBadgeHtml(true);
            const levelHtml    = getLevelBadgeHtml(item.currentLevel, item.levelTitle);
            const roundScore   = item.score || 0;
            const totalScore   = item.cumulativeScore || item.score || 0;

            tr.innerHTML = `
                <td>${statusHtml}</td>
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
                <td>${levelHtml}</td>
                <td><strong class="gold-text">${roundScore}</strong></td>
                <td><span class="cum-score">${totalScore}</span></td>
                <td><a href="tel:${escapeHtml(phoneDisplay)}" style="color: var(--accent-gold-light); font-weight: 600; text-decoration: none;">${escapeHtml(phoneDisplay)}</a></td>
                <td class="action-cell">
                    <div class="action-btns">
                        <button class="glass-btn btn-sm btn-secondary btn-icon btn-msg-player" data-id="${item.id}" data-name="${escapeHtml((item.name || 'Anonymous').replace(/"/g, '&quot;'))}" title="Send a live message to this player" aria-label="Message player">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </button>
                        <button class="glass-btn btn-sm btn-secondary btn-icon btn-spectate-grid" data-id="${item.id}" title="Inspect Live Grid" aria-label="Inspect live grid">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                </td>
            `;
            liveTableBody.appendChild(tr);
        });

        // Event Handlers for spectating live player grid
        liveTableBody.querySelectorAll('.btn-spectate-grid').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const player = deduped.find(p => p.id === id);
                if (player) openSpectatorModal(player);
            });
        });

        // Event Handlers for messaging a single live player
        liveTableBody.querySelectorAll('.btn-msg-player').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const player = deduped.find(p => p.id === id);
                if (player) openMessageCompose(player);
            });
        });
    }

    // ----------------------------------------------------------------------
    // 4.6. Live Grid Spectator Mode Modal Logic
    // ----------------------------------------------------------------------
    let spectatorUnsubscribe = null;
    let activeSpectatePlayerId = null;
    let spectatorTimerInterval = null;
    let spectatorTimerTarget = null;

    const modalLiveGrid      = document.getElementById('modal-live-grid');
    const closeSpectateBtn   = document.getElementById('close-spectate-modal');
    const spectateNameEl     = document.getElementById('spectate-player-name');
    const spectateSubEl      = document.getElementById('spectate-player-sub');
    const spectateLevelEl    = document.getElementById('spectate-level-val');
    const spectateScoreEl    = document.getElementById('spectate-score-val');
    const spectateTotalEl    = document.getElementById('spectate-total-val');
    const spectateFoundEl    = document.getElementById('spectate-found-val');
    const spectateTimerEl    = document.getElementById('spectate-timer-val');
    const spectateGridMatrix = document.getElementById('spectate-grid-matrix');
    const spectateWordsList  = document.getElementById('spectate-words-list');

    function openSpectatorModal(player) {
        if (!player || !player.id) return;
        activeSpectatePlayerId = player.id;

        if (spectateNameEl) spectateNameEl.textContent = player.name || 'Anonymous Player';
        if (spectateSubEl)  spectateSubEl.textContent  = `Roll: ${player.rollNumber || '—'} • Dept: ${(player.department || '—').replace('Department of ', '')} • Year: ${player.year || '—'}`;
        
        if (modalLiveGrid) modalLiveGrid.classList.remove('hidden');

        // Close any previous listener
        if (spectatorUnsubscribe) {
            spectatorUnsubscribe();
            spectatorUnsubscribe = null;
        }

        // Subscribe real-time
        if (window.WordWalkFirebase && window.WordWalkFirebase.subscribeToPlayerLiveGrid) {
            spectatorUnsubscribe = window.WordWalkFirebase.subscribeToPlayerLiveGrid(player.id, (liveDoc) => {
                renderSpectatorGrid(liveDoc);
            });
        } else {
            renderSpectatorGrid(player);
        }
    }

    function closeSpectatorModal() {
        if (modalLiveGrid) modalLiveGrid.classList.add('hidden');
        if (spectatorUnsubscribe) {
            spectatorUnsubscribe();
            spectatorUnsubscribe = null;
        }
        stopSpectatorTimer();
        activeSpectatePlayerId = null;
    }

    // Recompute the absolute end time from the player's last synced remaining seconds + timestamp
    function startSpectatorTimer(remainingSeconds, updatedAt) {
        stopSpectatorTimer();
        if (typeof remainingSeconds !== 'number') {
            if (spectateTimerEl) spectateTimerEl.textContent = '--:--';
            return;
        }

        let stampMs = null;
        if (updatedAt && typeof updatedAt.toMillis === 'function') {
            stampMs = updatedAt.toMillis();
        } else if (updatedAt instanceof Date) {
            stampMs = updatedAt.getTime();
        } else if (typeof updatedAt === 'number') {
            stampMs = updatedAt;
        } else if (typeof updatedAt === 'string') {
            stampMs = Date.parse(updatedAt);
        }

        spectatorTimerTarget = stampMs ? stampMs + remainingSeconds * 1000 : null;
        updateSpectatorTimerTick();

        if (spectatorTimerTarget) {
            spectatorTimerInterval = setInterval(updateSpectatorTimerTick, 1000);
        }
    }

    function stopSpectatorTimer() {
        if (spectatorTimerInterval) {
            clearInterval(spectatorTimerInterval);
            spectatorTimerInterval = null;
        }
        spectatorTimerTarget = null;
    }

    function updateSpectatorTimerTick() {
        if (!spectateTimerEl) return;
        let remaining = 0;
        if (spectatorTimerTarget) {
            remaining = Math.max(0, Math.ceil((spectatorTimerTarget - Date.now()) / 1000));
        }
        const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
        const ss = String(remaining % 60).padStart(2, '0');
        spectateTimerEl.textContent = `${mm}:${ss}`;
        spectateTimerEl.classList.toggle('spectate-timer-danger', remaining <= 30);
    }

    if (closeSpectateBtn) closeSpectateBtn.addEventListener('click', closeSpectatorModal);
    if (modalLiveGrid) {
        modalLiveGrid.addEventListener('click', (e) => {
            if (e.target === modalLiveGrid) closeSpectatorModal();
        });
    }

    function renderSpectatorGrid(playerData) {
        if (!playerData) return;
        const liveState = playerData.liveState || {};
        const grid = liveState.grid || [];
        const words = liveState.words || [];
        const placed = liveState.placed || {};
        const foundWords = new Set(liveState.foundWords || []);
        const gridSize = liveState.gridSize || (grid.length || 12);
        const levelNum = liveState.level || playerData.currentLevel || 1;
        const levelTitle = liveState.levelTitle || playerData.levelTitle || 'Seeker';
        const roundScore = typeof liveState.score === 'number' ? liveState.score : (playerData.score || 0);
        const totalScore = typeof liveState.cumulativeScore === 'number' ? liveState.cumulativeScore : (playerData.cumulativeScore || roundScore);

        if (spectateLevelEl) spectateLevelEl.textContent = `Lvl ${levelNum} (${levelTitle})`;
        if (spectateScoreEl) spectateScoreEl.textContent = roundScore;
        if (spectateTotalEl) spectateTotalEl.textContent = totalScore;
        if (spectateFoundEl) spectateFoundEl.textContent = `${foundWords.size} / ${words.length}`;

        // Sync the live countdown from the player's latest synced remaining time.
        // remainingSeconds is stamped at updatedAt, so derive the absolute end time
        // and tick it down locally every second for a smooth spectator clock.
        startSpectatorTimer(liveState.remainingSeconds, liveState.updatedAt);

        // Build set of cell coordinates (r, c) that belong to found words
        const foundCells = new Set();
        foundWords.forEach(word => {
            const cells = placed[word] || [];
            cells.forEach(({ r, c }) => {
                foundCells.add(`${r},${c}`);
            });
        });

        // Render Grid Matrix
        if (spectateGridMatrix) {
            spectateGridMatrix.style.gridTemplateColumns = `repeat(${gridSize}, 32px)`;
            spectateGridMatrix.innerHTML = '';

            if (!grid || grid.length === 0) {
                spectateGridMatrix.innerHTML = '<div style="color: var(--text-secondary); padding: 1.5rem; text-align: center;">Waiting for player to initialize puzzle grid...</div>';
            } else {
                for (let r = 0; r < gridSize; r++) {
                    for (let c = 0; c < gridSize; c++) {
                        const cellEl = document.createElement('div');
                        cellEl.className = 'spectate-cell';
                        const letter = (grid[r] && grid[r][c]) ? grid[r][c] : ' ';
                        cellEl.textContent = letter;
                        if (foundCells.has(`${r},${c}`)) {
                            cellEl.classList.add('spectate-cell-found');
                        }
                        spectateGridMatrix.appendChild(cellEl);
                    }
                }
            }
        }

        // Render Words Sidebar Checklist
        if (spectateWordsList) {
            spectateWordsList.innerHTML = '';
            if (words.length === 0) {
                spectateWordsList.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.8rem;">No target words found</div>';
            } else {
                words.forEach(word => {
                    const isFound = foundWords.has(word);
                    const itemEl = document.createElement('div');
                    itemEl.className = `spectate-word-item ${isFound ? 'spectate-word-found' : ''}`;
                    itemEl.innerHTML = `
                        <span>${escapeHtml(word)}</span>
                        <span>${isFound ? '✓' : '—'}</span>
                    `;
                    spectateWordsList.appendChild(itemEl);
                });
            }
        }
    }

    // ----------------------------------------------------------------------
    // 4.7. Admin Message Compose Modal (single player or broadcast to live)
    // ----------------------------------------------------------------------
    let msgComposeTarget = null; // { type: 'single', id, name } | { type: 'broadcast', ids: [] }

    const msgComposeModal = document.getElementById('modal-msg-compose');
    const msgComposeTitleEl = document.getElementById('msg-compose-title');
    const msgComposeSubEl = document.getElementById('msg-compose-sub');
    const msgComposeTextEl = document.getElementById('msg-compose-text');
    const msgComposeSendBtn = document.getElementById('msg-compose-send');
    const msgComposeCancelBtn = document.getElementById('msg-compose-cancel');
    const closeMsgComposeBtn = document.getElementById('close-msg-compose');

    function openMessageCompose(player) {
        msgComposeTarget = { type: 'single', id: player.id, name: player.name || 'Anonymous Player' };
        if (msgComposeTitleEl) msgComposeTitleEl.textContent = 'Message to Player';
        if (msgComposeSubEl) {
            msgComposeSubEl.textContent = `${msgComposeTarget.name} • Roll: ${player.rollNumber || '—'}`;
        }
        if (msgComposeTextEl) msgComposeTextEl.value = '';
        if (msgComposeModal) msgComposeModal.classList.remove('hidden');
        if (msgComposeTextEl) setTimeout(() => msgComposeTextEl.focus(), 60);
    }

    function openBroadcastCompose(livePlayers) {
        const ids = livePlayers.map(p => p.id).filter(Boolean);
        if (ids.length === 0) {
            alert('No live players currently online to broadcast to.');
            return;
        }
        msgComposeTarget = { type: 'broadcast', ids };
        if (msgComposeTitleEl) msgComposeTitleEl.textContent = 'Broadcast to Live Players';
        if (msgComposeSubEl) msgComposeSubEl.textContent = `This message will go to ${ids.length} live player${ids.length === 1 ? '' : 's'} in real time.`;
        if (msgComposeTextEl) msgComposeTextEl.value = '';
        if (msgComposeModal) msgComposeModal.classList.remove('hidden');
        if (msgComposeTextEl) setTimeout(() => msgComposeTextEl.focus(), 60);
    }

    function closeMessageCompose() {
        if (msgComposeModal) msgComposeModal.classList.add('hidden');
        msgComposeTarget = null;
        if (msgComposeTextEl) msgComposeTextEl.value = '';
    }

    async function sendComposedMessage() {
        const text = (msgComposeTextEl ? msgComposeTextEl.value : '').trim();
        if (!text) {
            alert('Please type a message before sending.');
            return;
        }
        if (!msgComposeTarget) return;
        if (msgComposeSendBtn) {
            msgComposeSendBtn.disabled = true;
        }

        const fb = window.WordWalkFirebase;
        let ok = false;
        if (msgComposeTarget.type === 'single') {
            if (fb && fb.sendMessageToPlayer) {
                ok = await fb.sendMessageToPlayer(msgComposeTarget.id, text);
            }
        } else {
            if (fb && fb.broadcastMessageToLivePlayers) {
                const sent = await fb.broadcastMessageToLivePlayers(msgComposeTarget.ids, text);
                ok = sent > 0;
            }
        }

        if (ok) {
            const wasBroadcast = msgComposeTarget.type === 'broadcast';
            closeMessageCompose();
            alert(wasBroadcast ? 'Message broadcast to all live players.' : 'Message sent to the player.');
        } else {
            if (msgComposeSendBtn) msgComposeSendBtn.disabled = false;
            alert('Failed to send message. Please check the player is still live and try again.');
        }
    }

    if (msgComposeSendBtn) msgComposeSendBtn.addEventListener('click', sendComposedMessage);
    if (msgComposeCancelBtn) msgComposeCancelBtn.addEventListener('click', closeMessageCompose);
    if (closeMsgComposeBtn) closeMsgComposeBtn.addEventListener('click', closeMessageCompose);
    if (msgComposeModal) {
        msgComposeModal.addEventListener('click', (e) => {
            if (e.target === msgComposeModal) closeMessageCompose();
        });
    }
    const broadcastBtn = document.getElementById('btn-broadcast-message');
    if (broadcastBtn) {
        broadcastBtn.addEventListener('click', () => {
            const livePlayers = deduplicatePlayers(playersList).filter(p => isPlayerLiveInGame(p));
            openBroadcastCompose(livePlayers);
        });
    }

    // ----------------------------------------------------------------------
    // 5. Render Leaderboard Data Table
    // ----------------------------------------------------------------------
    function renderLeaderboardTable() {
        if (!leaderboardTableBody) return;
        leaderboardTableBody.innerHTML = '';

        const searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedDept = deptFilter ? deptFilter.value : 'ALL';
        const selectedYear = yearFilter ? yearFilter.value : 'ALL';

        // ── Deduplicate: keep only each player's best (highest) score ──────
        // Key = rollNumber + department + year to uniquely identify a player
        const bestByPlayer = {};
        leaderboardList.forEach(record => {
            const key = `${record.rollNumber || ''}|${record.department || ''}|${record.year || ''}`;
            const existing = bestByPlayer[key];
            const currCum = record.cumulativeScore || record.score || 0;
            const existCum = existing ? (existing.cumulativeScore || existing.score || 0) : -1;
            if (!existing || currCum > existCum) {
                bestByPlayer[key] = record;
            }
        });
        // Convert map back to array, sorted by cumulativeScore / total score descending
        const deduped = Object.values(bestByPlayer).sort((a, b) => {
            const totalA = Math.max(a.cumulativeScore || 0, a.score || 0);
            const totalB = Math.max(b.cumulativeScore || 0, b.score || 0);
            if (totalB !== totalA) return totalB - totalA;
            return (b.score || 0) - (a.score || 0);
        });

        const filtered = deduped.filter(record => {
            const nameMatch = !searchVal || 
                (record.name || '').toLowerCase().includes(searchVal) ||
                (record.rollNumber || '').toLowerCase().includes(searchVal);

            const deptMatch = selectedDept === 'ALL' || record.department === selectedDept;
            const yearMatch = selectedYear === 'ALL' || record.year === selectedYear;

            return nameMatch && deptMatch && yearMatch;
        });

        if (!firebaseReady) {
            leaderboardTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        Loading leaderboard from server...
                    </td>
                </tr>
            `;
            return;
        }

        if (filtered.length === 0) {
            leaderboardTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        No leaderboard entries match the current filter criteria.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item, idx) => {
            const tr = document.createElement('tr');
            
            let rankBadge = `${idx + 1}`;
            if (idx === 0) rankBadge = medalSvg('gold', '1');
            else if (idx === 1) rankBadge = medalSvg('silver', '2');
            else if (idx === 2) rankBadge = medalSvg('bronze', '3');

            const rollDisplay = item.rollNumber || '—';
            const deptDisplay = item.department ? item.department.replace('Department of ', '') : '—';
            const yearDisplay = item.year || '—';
            const dateDisplay = item.date || new Date().toLocaleDateString();
            const cumScore = item.cumulativeScore || item.score || 0;

            // Cross-reference player registered level if available
            const playerDoc = playersList.find(p => p.rollNumber && p.rollNumber === item.rollNumber) || {};
            const lvlNum = item.currentLevel || playerDoc.currentLevel || 1;
            const lvlTitle = item.levelTitle || playerDoc.levelTitle || 'Seeker';
            const levelHtml = getLevelBadgeHtml(lvlNum, lvlTitle);

            tr.innerHTML = `
                <td><strong>${rankBadge}</strong></td>
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
                <td>${levelHtml}</td>
                <td><strong class="gold-text">${item.score || 0}</strong></td>
                <td><span class="cum-score">${cumScore}</span></td>
                <td>${escapeHtml(dateDisplay)}</td>
                <td style="text-align: right;">
                    <button class="delete-row-btn" data-id="${item.id}" data-roll="${escapeHtml(item.rollNumber || '')}" data-dept="${escapeHtml(item.department || '')}" data-year="${escapeHtml(item.year || '')}" data-name="${escapeHtml(item.name || 'Player')}" title="Delete score entry">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            `;
            leaderboardTableBody.appendChild(tr);
        });

        // Event Handlers for delete score
        leaderboardTableBody.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const roll = btn.getAttribute('data-roll') || '';
                const dept = btn.getAttribute('data-dept') || '';
                const year = btn.getAttribute('data-year') || '';
                const name = btn.getAttribute('data-name');
                if (!confirm(`Are you sure you want to delete score entry & registration for "${name}"?`)) return;
                btn.disabled = true;
                btn.innerHTML = '<span style="opacity:0.5">Deleting...</span>';
                const target = { id, rollNumber: roll, department: dept, year };
                const deleted = window.WordWalkFirebase && window.WordWalkFirebase.deleteScoreFromFirestore
                    ? await window.WordWalkFirebase.deleteScoreFromFirestore(target).catch(() => false)
                    : false;
                if (deleted !== false) {
                    leaderboardList = leaderboardList.filter(r => r.id !== id && r.rollNumber !== roll);
                    playersList = playersList.filter(p => p.id !== id && p.rollNumber !== roll);
                    saveLeaderboard();
                }
                updateStats();
                renderLeaderboardTable();
            });
        });
    }

    function saveLeaderboard() {
        try {
            localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(leaderboardList));
        } catch (e) {}
    }

    function renderCurrentTab() {
        if (currentTab === 'players') {
            renderPlayersTable();
        } else if (currentTab === 'live') {
            renderLivePlayersTable();
        } else {
            renderLeaderboardTable();
        }
    }

    // ----------------------------------------------------------------------
    // 6. Word Bank Manager
    // ----------------------------------------------------------------------
    function renderWordTags() {
        if (!wordsTagContainer) return;
        wordsTagContainer.innerHTML = '';

        customWordsList.forEach((word, index) => {
            const tag = document.createElement('div');
            tag.className = 'word-tag';
            tag.innerHTML = `
                <span>${escapeHtml(word)}</span>
                <button type="button" class="word-tag-remove" data-index="${index}" title="Remove word">&times;</button>
            `;
            wordsTagContainer.appendChild(tag);
        });

        wordsTagContainer.querySelectorAll('.word-tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                removeWord(idx);
            });
        });
    }

    function addWord(word) {
        const cleanWord = word.trim().toUpperCase();
        if (!cleanWord) return;

        if (cleanWord.length < 3 || cleanWord.length > 12) {
            alert('Word must be between 3 and 12 letters.');
            return;
        }

        if (customWordsList.includes(cleanWord)) {
            alert('This word is already in the word bank!');
            return;
        }

        customWordsList.push(cleanWord);
        saveWordBank();
        renderWordTags();
        if (newWordInput) newWordInput.value = '';
    }

    function removeWord(index) {
        if (customWordsList.length <= 8) {
            alert('Minimum 8 words required for the word search puzzle grid!');
            return;
        }
        customWordsList.splice(index, 1);
        saveWordBank();
        renderWordTags();
    }

    function saveWordBank() {
        try {
            localStorage.setItem(STORAGE_KEY_CUSTOM_WORDS, JSON.stringify(customWordsList));
        } catch (e) {}

        if (window.WordWalkFirebase && window.WordWalkFirebase.saveWordBankToFirestore) {
            window.WordWalkFirebase.saveWordBankToFirestore(customWordsList);
        }
    }

    if (addWordForm) {
        addWordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (newWordInput) addWord(newWordInput.value);
        });
    }

    // ----------------------------------------------------------------------
    // 7. CSV Export Functionality
    // ----------------------------------------------------------------------
    function exportToCSV() {
        let csvContent = 'data:text/csv;charset=utf-8,';

        if (currentTab === 'players') {
            if (playersList.length === 0) {
                alert('No registered players to export.');
                return;
            }
            csvContent += 'Roll Number,Player Name,Status,Current Level,Level Title,Phone Number,Department,Year of Study,Registered Date\n';
            playersList.forEach(p => {
                const roll   = `"${(p.rollNumber   || '').replace(/"/g, '""')}"`;
                const name   = `"${(p.name         || '').replace(/"/g, '""')}"`;
                const status = `"${p.active === true ? 'LIVE' : 'Offline'}"`;
                const lvl    = `"${p.currentLevel   || 1}"`;
                const title  = `"${(p.levelTitle   || 'Seeker').replace(/"/g, '""')}"`;
                const phone  = `"${(p.phoneNumber  || '').replace(/"/g, '""')}"`;
                const dept   = `"${(p.department   || '').replace(/"/g, '""')}"`;
                const year   = `"${(p.year         || '').replace(/"/g, '""')}"`;
                const date   = `"${(p.dateDisplay  || '').replace(/"/g, '""')}"`;
                csvContent += `${roll},${name},${status},${lvl},${title},${phone},${dept},${year},${date}\n`;
            });
        } else if (currentTab === 'live') {
            const livePlayers = deduplicatePlayers(playersList).filter(p => p.active === true);
            if (livePlayers.length === 0) {
                alert('No live players currently online to export.');
                return;
            }
            csvContent += 'Roll Number,Player Name,Status,Current Level,Level Title,Round Score,Total Score,Department,Year of Study,Phone Number\n';
            livePlayers.forEach(p => {
                const roll   = `"${(p.rollNumber   || '').replace(/"/g, '""')}"`;
                const name   = `"${(p.name         || '').replace(/"/g, '""')}"`;
                const status = `"LIVE NOW"`;
                const lvl    = `"${p.currentLevel   || 1}"`;
                const title  = `"${(p.levelTitle   || 'Seeker').replace(/"/g, '""')}"`;
                const rScore = p.score || 0;
                const tScore = p.cumulativeScore || p.score || 0;
                const dept   = `"${(p.department   || '').replace(/"/g, '""')}"`;
                const year   = `"${(p.year         || '').replace(/"/g, '""')}"`;
                const phone  = `"${(p.phoneNumber  || '').replace(/"/g, '""')}"`;
                csvContent += `${roll},${name},${status},${lvl},${title},${rScore},${tScore},${dept},${year},${phone}\n`;
            });
        } else {
            if (leaderboardList.length === 0) {
                alert('No leaderboard records to export.');
                return;
            }
            csvContent += 'Rank,Roll Number,Player Name,Department,Year of Study,Level Reached,Score,Total Score,Date\n';
            leaderboardList.forEach((r, idx) => {
                const playerDoc = playersList.find(p => p.rollNumber && p.rollNumber === r.rollNumber) || {};
                const roll  = `"${(r.rollNumber || '').replace(/"/g, '""')}"`;
                const name  = `"${(r.name || '').replace(/"/g, '""')}"`;
                const dept  = `"${(r.department || '').replace(/"/g, '""')}"`;
                const year  = `"${(r.year || '').replace(/"/g, '""')}"`;
                const lvl   = `"${r.currentLevel || playerDoc.currentLevel || 1} (${r.levelTitle || playerDoc.levelTitle || 'Seeker'})"`;
                const score = r.score || 0;
                const total = r.cumulativeScore || r.score || 0;
                const date  = `"${(r.date || '').replace(/"/g, '""')}"`;
                csvContent += `${idx + 1},${roll},${name},${dept},${year},${lvl},${score},${total},${date}\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `WordWalk_${currentTab.toUpperCase()}_PLAYERS_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);

    // ----------------------------------------------------------------------
    // 8. Reset All Data Button (Erases Firestore & LocalStorage)
    // ----------------------------------------------------------------------
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (!confirm('⚠️ DANGER: Are you sure you want to PERMANENTLY ERASE ALL player registrations and leaderboard data from Firebase?')) return;
            if (!confirm('Final Confirmation: This action CANNOT be undone. Proceed with full reset?')) return;
            
            clearBtn.disabled = true;
            clearBtn.innerHTML = '<span>Erasing Firebase...</span>';

            if (window.WordWalkFirebase && window.WordWalkFirebase.clearAllDataFromFirestore) {
                await window.WordWalkFirebase.clearAllDataFromFirestore().catch(() => {});
            }
            playersList = [];
            leaderboardList = [];
            leaderboardCache = [];
            localStorage.removeItem(STORAGE_KEY_LEADERBOARD);

            clearBtn.disabled = false;
            clearBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Reset Data</span>
            `;

            updateStats();
            renderCurrentTab();
            alert('✅ All player and leaderboard data has been completely erased from Firebase!');
        });
    }

    // ----------------------------------------------------------------------
    // 9. Filter Event Listeners
    // ----------------------------------------------------------------------
    if (searchInput) searchInput.addEventListener('input', renderCurrentTab);
    if (deptFilter)  deptFilter.addEventListener('change', renderCurrentTab);
    if (yearFilter)  yearFilter.addEventListener('change', renderCurrentTab);

    // Deduplicate players list by rollNumber + department + year
    function deduplicatePlayers(players) {
        const seen = {};
        return players.filter(p => {
            const key = `${p.rollNumber || ''}|${p.department || ''}|${p.year || ''}`;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }

    // Escape HTML Helper
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ----------------------------------------------------------------------
    // 10. Boot Admin Controller & Firebase Live Sync
    // ----------------------------------------------------------------------
    function waitForFirebase(cb, retries = 40, delay = 250) {
        if (window.WordWalkFirebase) { cb(); return; }
        if (retries <= 0) { console.warn('[Admin] Firebase service not found after waiting.'); return; }
        setTimeout(() => waitForFirebase(cb, retries - 1, delay), delay);
    }

    function initFirebaseSync() {
        waitForFirebase(() => {
        if (!window.WordWalkFirebase) return;

        // 1. Subscribe to Live Registered Players
        if (window.WordWalkFirebase.subscribeToPlayers) {
            window.WordWalkFirebase.subscribeToPlayers((list) => {
                if (Array.isArray(list)) {
                    playersList = deduplicatePlayers(list);
                    updateStats();
                    if (currentTab === 'players') renderPlayersTable();
                    if (currentTab === 'live') renderLivePlayersTable();
                }
            });
        }

        // 2. Subscribe to Live Leaderboard Scores (real-time from Firestore)
        if (window.WordWalkFirebase.subscribeToLeaderboard) {
            window.WordWalkFirebase.subscribeToLeaderboard((list) => {
                if (Array.isArray(list)) {
                    leaderboardList = list;
                    saveLeaderboard();
                    firebaseReady = true;
                    updateStats();
                    renderLeaderboardTable();
                }
            });
        }

        // Fallback: if Firebase doesn't respond within 6s, show cached localStorage data
        setTimeout(() => {
            if (!firebaseReady && leaderboardCache.length > 0) {
                leaderboardList = leaderboardCache;
                firebaseReady = true;
                updateStats();
                renderLeaderboardTable();
            }
        }, 6000);

        // 3. Fetch Word Bank
        if (window.WordWalkFirebase.getWordBankFromFirestore) {
            window.WordWalkFirebase.getWordBankFromFirestore().then((remoteWords) => {
                if (Array.isArray(remoteWords) && remoteWords.length >= 8) {
                    customWordsList = remoteWords;
                    try {
                        localStorage.setItem(STORAGE_KEY_CUSTOM_WORDS, JSON.stringify(customWordsList));
                    } catch (e) {}
                    renderWordTags();
                }
            });
        }

        // 4. Subscribe to Game Control State (Start/End game status)
        if (window.WordWalkFirebase.subscribeToGameState) {
            window.WordWalkFirebase.subscribeToGameState((isActive) => {
                updateGameStatusUI(isActive);
            });
        }

        // 5. Live Games Counter
        if (window.WordWalkFirebase.subscribeToActiveGameCount) {
            window.WordWalkFirebase.subscribeToActiveGameCount((count) => {
                const liveEl = document.getElementById('stat-live-games');
                if (liveEl) liveEl.textContent = count;
            });
        }

        // 6. Re-evaluate staleness periodically so players who closed their tab
        // abruptly (no reliable unload write) drop off the live views on their own.
        // Firestore snapshots only fire when a doc CHANGES; a dead player's doc
        // never changes, so a local timer re-checks the heartbeat timestamps and,
        // if available, cleans them up server-side too.
        setInterval(() => {
            updateStats();
            if (currentTab === 'live') renderLivePlayersTable();
            if (currentTab === 'players') renderPlayersTable();
            if (window.WordWalkFirebase && window.WordWalkFirebase.cleanupStaleLivePlayers) {
                window.WordWalkFirebase.cleanupStaleLivePlayers().catch(() => {});
            }
        }, 15000);
        }); // end waitForFirebase
    }

    // ----------------------------------------------------------------------
    // Game Control Buttons & State Sync
    // ----------------------------------------------------------------------
    const startGameBtn   = document.getElementById('start-game-btn');
    const endGameBtn     = document.getElementById('end-game-btn');
    const gameStatusText = document.getElementById('game-status-text');
    const gameStatusDot  = document.getElementById('game-status-dot');

    function updateGameStatusUI(isActive) {
        if (gameStatusText) {
            gameStatusText.textContent = isActive ? 'GAME STARTED (ONLINE)' : 'GAME ENDED (CLOSED)';
            gameStatusText.style.color = isActive ? '#10b981' : '#ef4444';
        }
        if (gameStatusDot) {
            gameStatusDot.style.backgroundColor = isActive ? '#10b981' : '#ef4444';
            gameStatusDot.style.boxShadow = isActive ? '0 0 12px #10b981' : '0 0 12px #ef4444';
        }
        if (startGameBtn) {
            startGameBtn.style.opacity = isActive ? '0.5' : '1';
            startGameBtn.style.pointerEvents = isActive ? 'none' : 'auto';
        }
        if (endGameBtn) {
            endGameBtn.style.opacity = isActive ? '1' : '0.5';
            endGameBtn.style.pointerEvents = isActive ? 'auto' : 'none';
        }
    }

    if (startGameBtn) {
        startGameBtn.addEventListener('click', async () => {
            if (window.WordWalkFirebase && window.WordWalkFirebase.setGameStateInFirestore) {
                await window.WordWalkFirebase.setGameStateInFirestore(true);
                updateGameStatusUI(true);
                alert('🟢 Game has been Started! Players can now join and play.');
            }
        });
    }

    if (endGameBtn) {
        endGameBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to End the Game? This will close access to game.html for all players.')) {
                if (window.WordWalkFirebase && window.WordWalkFirebase.setGameStateInFirestore) {
                    await window.WordWalkFirebase.setGameStateInFirestore(false);
                    updateGameStatusUI(false);
                    alert('🔴 Game has been Ended! Access to game.html is now closed.');
                }
            }
        });
    }

    loadData();
    updateStats();
    renderPlayersTable();
    renderWordTags();
    initFirebaseSync();
});

