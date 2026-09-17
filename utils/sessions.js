const fs = require("fs");
const path = require("path");


const filePath = path.join(
    process.cwd(),
    "data",
    "sessions.json"
);


// --------------------
// LOAD SESSIONS
// --------------------

function loadSessions() {
    const data = fs.readFileSync(filePath, "utf8").trim();

    if (!data) {
        return {};
    }

    return JSON.parse(data);
}


// --------------------
// SAVE SESSIONS
// --------------------

function saveSessions(sessions) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(sessions, null, 4)
    );
}


// --------------------
// CREATE SESSION
// --------------------

function createSession() {
    return {
        startedAt: Date.now(),

        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pushes: 0,

        totalWagered: 0,
        totalPayout: 0,
        netProfit: 0,

        biggestWin: 0,

        games: {}
    };
}


// --------------------
// GET SESSION
// --------------------

function getSession(guildId, userId) {
    const sessions = loadSessions();


    if (!sessions[guildId]) {
        sessions[guildId] = {};
    }


    if (!sessions[guildId][userId]) {
        sessions[guildId][userId] =
            createSession();

        saveSessions(sessions);
    }


    return sessions[guildId][userId];
}


// --------------------
// RECORD GAMBLING RESULT
// --------------------

function recordGamble(
    guildId,
    userId,
    game,
    bet,
    payout
) {
    const sessions = loadSessions();


    if (!sessions[guildId]) {
        sessions[guildId] = {};
    }


    if (!sessions[guildId][userId]) {
        sessions[guildId][userId] =
            createSession();
    }


    const session =
        sessions[guildId][userId];


    const profit =
        payout - bet;


    session.gamesPlayed += 1;
    session.totalWagered += bet;
    session.totalPayout += payout;
    session.netProfit += profit;


    if (profit > 0) {
        session.wins += 1;

        if (profit > session.biggestWin) {
            session.biggestWin = profit;
        }
    }
    else if (profit < 0) {
        session.losses += 1;
    }
    else {
        session.pushes += 1;
    }


    // --------------------
    // GAME-SPECIFIC STATS
    // --------------------

    if (!session.games[game]) {
        session.games[game] = {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            pushes: 0,

            wagered: 0,
            payout: 0,
            profit: 0,

            biggestWin: 0
        };
    }


    const gameStats =
        session.games[game];


    gameStats.gamesPlayed += 1;
    gameStats.wagered += bet;
    gameStats.payout += payout;
    gameStats.profit += profit;


    if (profit > 0) {
        gameStats.wins += 1;

        if (profit > gameStats.biggestWin) {
            gameStats.biggestWin = profit;
        }
    }
    else if (profit < 0) {
        gameStats.losses += 1;
    }
    else {
        gameStats.pushes += 1;
    }


    saveSessions(sessions);


    return session;
}


// --------------------
// RESET SESSION
// --------------------

function resetSession(guildId, userId) {
    const sessions = loadSessions();


    if (!sessions[guildId]) {
        sessions[guildId] = {};
    }


    sessions[guildId][userId] =
        createSession();


    saveSessions(sessions);


    return sessions[guildId][userId];
}


// --------------------
// EXPORTS
// --------------------

module.exports = {
    getSession,
    recordGamble,
    resetSession
};