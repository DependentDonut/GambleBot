const fs = require("fs");
const path = require("path");


const filePath = path.join(
    process.cwd(),
    "data",
    "jackpots.json"
);


// Jackpot resets to $5,000 after somebody wins
const JACKPOT_SEED_DOLLARS = 5000;


// --------------------
// LOAD JACKPOTS
// --------------------

function loadJackpots() {
    const data = fs.readFileSync(filePath, "utf8").trim();

    if (!data) {
        return {};
    }

    return JSON.parse(data);
}


// --------------------
// SAVE JACKPOTS
// --------------------

function saveJackpots(jackpots) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(jackpots, null, 4)
    );
}


// --------------------
// CREATE JACKPOT IF NEEDED
// --------------------

function ensureJackpot(jackpots, guildId) {

    if (!jackpots[guildId]) {
        jackpots[guildId] = {
            jackpotCents:
                JACKPOT_SEED_DOLLARS * 100
        };
    }

    return jackpots[guildId];
}


// --------------------
// GET CURRENT JACKPOT
// --------------------

function getJackpot(guildId) {
    const jackpots = loadJackpots();

    const jackpot =
        ensureJackpot(
            jackpots,
            guildId
        );

    saveJackpots(jackpots);

    return jackpot.jackpotCents / 100;
}


// --------------------
// ADD 1% OF BET
// --------------------

function addToJackpot(guildId, bet) {
    const jackpots = loadJackpots();

    const jackpot =
        ensureJackpot(
            jackpots,
            guildId
        );


    // Since bets are whole dollars:
    //
    // $100 bet = 100 cents added = $1
    // $500 bet = 500 cents added = $5
    //
    // This is exactly 1% of the bet.
    const contributionCents = bet;


    jackpot.jackpotCents +=
        contributionCents;


    saveJackpots(jackpots);


    return {
        contribution:
            contributionCents / 100,

        jackpot:
            jackpot.jackpotCents / 100
    };
}


// --------------------
// WIN JACKPOT
// --------------------

function claimJackpot(guildId) {
    const jackpots = loadJackpots();

    const jackpot =
        ensureJackpot(
            jackpots,
            guildId
        );


    // Balances currently use whole dollars,
    // so round the jackpot down to a whole dollar.
    const payout =
        Math.floor(
            jackpot.jackpotCents / 100
        );


    // Reset jackpot
    jackpot.jackpotCents =
        JACKPOT_SEED_DOLLARS * 100;


    saveJackpots(jackpots);


    return payout;
}


// --------------------
// EXPORTS
// --------------------

module.exports = {
    getJackpot,
    addToJackpot,
    claimJackpot
};