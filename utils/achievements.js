const fs = require("fs");
const path = require("path");


const filePath =
    path.join(
        process.cwd(),
        "data",
        "achievements.json"
    );


// --------------------
// MAIN CASINO GAMES
// --------------------

const CORE_GAMES = [
    "slots",
    "blackjack",
    "ride_the_bus",
    "horse_racing",
    "crash",
    "coinflip"
];


// --------------------
// ACHIEVEMENTS
// --------------------

const ACHIEVEMENTS = {

    first_bet: {
        name: "First Bet",
        description: "Place your first wager.",
        emoji: "🎰",

        title: {
            id: "gambler",
            name: "Gambler"
        }
    },


    high_roller: {
        name: "High Roller",
        description: "Place a bet of $5,000 or more.",
        emoji: "💵",

        title: {
            id: "high_roller",
            name: "High Roller"
        }
    },


    casino_tour: {
        name: "Casino Tour",
        description:
            "Win at Slots, Blackjack, Ride the Bus, Horse Racing, Crash, and Coin Flip.",
        emoji: "🎲",

        title: {
            id: "casino_regular",
            name: "Casino Regular"
        }
    },


    slot_jackpot: {
        name: "JACKPOT!",
        description: "Hit 7️⃣ 7️⃣ 7️⃣ on the slot machine.",
        emoji: "💰",

        title: {
            id: "jackpot_junkie",
            name: "Jackpot Junkie"
        }
    },


    blackjack_natural: {
        name: "Natural 21",
        description: "Get dealt a natural Blackjack.",
        emoji: "🃏",

        title: {
            id: "card_shark",
            name: "Card Shark"
        }
    },


    blackjack_double: {
        name: "Double or Nothing",
        description: "Win a Blackjack hand after doubling down.",
        emoji: "💸",

        title: {
            id: "double_or_nothing",
            name: "Double or Nothing"
        }
    },


    bus_complete: {
        name: "End of the Line",
        description: "Successfully complete all four stages of Ride the Bus.",
        emoji: "🚌",

        title: {
            id: "bus_driver",
            name: "Bus Driver"
        }
    },


    horse_longshot: {
        name: "Against the Odds",
        description:
            "Win a horse race with a horse that had a 12% or lower chance to win.",
        emoji: "🏇",

        title: {
            id: "dark_horse",
            name: "Dark Horse"
        }
    },


    crash_10x: {
        name: "To the Moon",
        description: "Successfully cash out Crash at 10.00x or higher.",
        emoji: "🚀",

        title: {
            id: "adrenaline_junkie",
            name: "Adrenaline Junkie"
        }
    },


    coinflip_streak: {
        name: "Call It",
        description: "Win five Coin Flips in a row.",
        emoji: "🪙",

        title: {
            id: "coin_toss_king",
            name: "Coin Toss King"
        }
    },


    lottery_winner: {
        name: "Lucky Six",
        description: "Match all six lottery numbers.",
        emoji: "🎟️",

        title: {
            id: "lucky_six",
            name: "Lucky Six"
        }
    },


    robbery_success: {
        name: "Stick 'Em Up",
        description: "Successfully rob another player.",
        emoji: "🥷",

        title: {
            id: "stick_up_kid",
            name: "Stick-Up Kid"
        }
    },


    debt_free: {
        name: "Debt Free",
        description: "Completely repay a loan.",
        emoji: "✅",

        title: {
            id: "debt_free",
            name: "Debt Free"
        }
    },


    collections: {
        name: "They Found You",
        description: "Have a loan enter collections.",
        emoji: "🦈",

        title: {
            id: "collections_regular",
            name: "Collections Regular"
        }
    },


    perfect_credit: {
        name: "850 Club",
        description: "Reach a credit score of 850.",
        emoji: "💳",

        title: {
            id: "850_club",
            name: "850 Club"
        }
    }
};


// --------------------
// FILE SETUP
// --------------------

function ensureFile() {

    if (
        !fs.existsSync(
            path.dirname(filePath)
        )
    ) {

        fs.mkdirSync(
            path.dirname(filePath),
            {
                recursive: true
            }
        );
    }


    if (
        !fs.existsSync(filePath)
    ) {

        fs.writeFileSync(
            filePath,
            "{}"
        );
    }
}


// --------------------
// LOAD
// --------------------

function loadAchievements() {

    ensureFile();


    const data =
        fs.readFileSync(
            filePath,
            "utf8"
        ).trim();


    if (!data) {
        return {};
    }


    return JSON.parse(data);
}


// --------------------
// SAVE
// --------------------

function saveAchievements(data) {

    fs.writeFileSync(
        filePath,
        JSON.stringify(
            data,
            null,
            4
        )
    );
}


// --------------------
// PLAYER PROFILE
// --------------------

function ensureProfile(
    data,
    guildId,
    userId
) {

    if (!data[guildId]) {
        data[guildId] = {};
    }


    if (!data[guildId][userId]) {

        data[guildId][userId] = {

            unlocked: [],

            selectedTitle: null,

            stats: {
                gameWins: [],
                coinflipStreak: 0,
                bestCrash: 0
            }
        };
    }


    const profile =
        data[guildId][userId];


    // Compatibility with older save files

    if (!Array.isArray(profile.unlocked)) {
        profile.unlocked = [];
    }


    if (
        profile.selectedTitle ===
        undefined
    ) {

        profile.selectedTitle =
            null;
    }


    if (!profile.stats) {

        profile.stats = {
            gameWins: [],
            coinflipStreak: 0,
            bestCrash: 0
        };
    }


    if (
        !Array.isArray(
            profile.stats.gameWins
        )
    ) {

        profile.stats.gameWins = [];
    }


    if (
        profile.stats.coinflipStreak ===
        undefined
    ) {

        profile.stats.coinflipStreak = 0;
    }


    if (
        profile.stats.bestCrash ===
        undefined
    ) {

        profile.stats.bestCrash = 0;
    }


    return profile;
}


// --------------------
// RECORD EVENT
// --------------------

function recordAchievementEvent(
    guildId,
    userId,
    event,
    details = {}
) {

    const data =
        loadAchievements();


    const profile =
        ensureProfile(
            data,
            guildId,
            userId
        );


    const newlyUnlocked = [];


    function unlock(
        achievementId
    ) {

        if (
            !ACHIEVEMENTS[
                achievementId
            ]
        ) {

            return;
        }


        if (
            profile.unlocked.includes(
                achievementId
            )
        ) {

            return;
        }


        profile.unlocked.push(
            achievementId
        );


        newlyUnlocked.push(
            achievementId
        );
    }


    // --------------------
    // GAMBLING
    // --------------------

    if (
        event === "gamble"
    ) {

        unlock(
            "first_bet"
        );


        if (
            details.bet >=
            5000
        ) {

            unlock(
                "high_roller"
            );
        }
    }


    // --------------------
    // GAME WIN
    // --------------------

    else if (
        event === "win"
    ) {

        const game =
            details.game;


        if (
            game &&
            !profile.stats.gameWins.includes(
                game
            )
        ) {

            profile.stats.gameWins.push(
                game
            );
        }


        const wonEveryGame =
            CORE_GAMES.every(
                gameName =>
                    profile.stats.gameWins.includes(
                        gameName
                    )
            );


        if (wonEveryGame) {

            unlock(
                "casino_tour"
            );
        }
    }


    // --------------------
    // SLOT JACKPOT
    // --------------------

    else if (
        event ===
        "slot_jackpot"
    ) {

        unlock(
            "slot_jackpot"
        );
    }


    // --------------------
    // BLACKJACK
    // --------------------

    else if (
        event ===
        "blackjack_natural"
    ) {

        unlock(
            "blackjack_natural"
        );
    }


    else if (
        event ===
        "blackjack_double_win"
    ) {

        unlock(
            "blackjack_double"
        );
    }


    // --------------------
    // RIDE THE BUS
    // --------------------

    else if (
        event ===
        "bus_complete"
    ) {

        unlock(
            "bus_complete"
        );
    }


    // --------------------
    // HORSE RACING
    // --------------------

    else if (
        event ===
        "horse_win"
    ) {

        if (
            details.chance <=
            0.12
        ) {

            unlock(
                "horse_longshot"
            );
        }
    }


    // --------------------
    // CRASH
    // --------------------

    else if (
        event ===
        "crash_cashout"
    ) {

        const multiplier =
            details.multiplier ||
            0;


        if (
            multiplier >
            profile.stats.bestCrash
        ) {

            profile.stats.bestCrash =
                multiplier;
        }


        if (
            multiplier >=
            10
        ) {

            unlock(
                "crash_10x"
            );
        }
    }


    // --------------------
    // COIN FLIP
    // --------------------

    else if (
        event ===
        "coinflip"
    ) {

        if (
            details.won
        ) {

            profile.stats.coinflipStreak++;


            if (
                profile.stats.coinflipStreak >=
                5
            ) {

                unlock(
                    "coinflip_streak"
                );
            }
        }

        else {

            profile.stats.coinflipStreak =
                0;
        }
    }


    // --------------------
    // LOTTERY
    // --------------------

    else if (
        event ===
        "lottery_win"
    ) {

        unlock(
            "lottery_winner"
        );
    }


    // --------------------
    // ROBBERY
    // --------------------

    else if (
        event ===
        "robbery_success"
    ) {

        unlock(
            "robbery_success"
        );
    }


    // --------------------
    // LOANS
    // --------------------

    else if (
        event ===
        "loan_paid"
    ) {

        unlock(
            "debt_free"
        );
    }


    else if (
        event ===
        "collections"
    ) {

        unlock(
            "collections"
        );
    }


    // --------------------
    // CREDIT
    // --------------------

    else if (
        event ===
        "credit_score"
    ) {

        if (
            details.score >=
            850
        ) {

            unlock(
                "perfect_credit"
            );
        }
    }


    saveAchievements(
        data
    );


    return newlyUnlocked.map(
        id => ({
            id,
            ...ACHIEVEMENTS[id]
        })
    );
}


// --------------------
// NOTIFY PLAYER
// --------------------

async function notifyAchievements(
    interaction,
    unlocked,
    userId = null
) {

    if (
        !unlocked ||
        unlocked.length === 0
    ) {

        return;
    }


    let message = "";


    if (userId) {

        message +=
            `<@${userId}> `;
    }


    message +=
        `🏆 **ACHIEVEMENT UNLOCKED!**\n\n`;


    for (
        const achievement
        of unlocked
    ) {

        message +=
            `${achievement.emoji} **${achievement.name}**\n` +
            `${achievement.description}\n`;


        if (
            achievement.title
        ) {

            message +=
                `🔓 Title unlocked: **${achievement.title.name}**\n`;
        }


        message += "\n";
    }


    try {

        await interaction.followUp({
            content:
                message.trim()
        });

    }

    catch (error) {

        console.error(
            "Achievement notification error:",
            error
        );
    }
}


// --------------------
// GET PROFILE
// --------------------

function getAchievementProfile(
    guildId,
    userId
) {

    const data =
        loadAchievements();


    const profile =
        ensureProfile(
            data,
            guildId,
            userId
        );


    saveAchievements(
        data
    );


    return profile;
}


// --------------------
// UNLOCKED TITLES
// --------------------

function getUnlockedTitles(
    guildId,
    userId
) {

    const profile =
        getAchievementProfile(
            guildId,
            userId
        );


    const titles = [];


    for (
        const achievementId
        of profile.unlocked
    ) {

        const achievement =
            ACHIEVEMENTS[
                achievementId
            ];


        if (
            achievement &&
            achievement.title
        ) {

            titles.push(
                achievement.title
            );
        }
    }


    return titles;
}


// --------------------
// SET TITLE
// --------------------

function setTitle(
    guildId,
    userId,
    titleId
) {

    const data =
        loadAchievements();


    const profile =
        ensureProfile(
            data,
            guildId,
            userId
        );


    let selectedTitle =
        null;


    for (
        const achievementId
        of profile.unlocked
    ) {

        const achievement =
            ACHIEVEMENTS[
                achievementId
            ];


        if (
            achievement?.title?.id ===
            titleId
        ) {

            selectedTitle =
                achievement.title;

            break;
        }
    }


    if (!selectedTitle) {

        return false;
    }


    profile.selectedTitle =
        titleId;


    saveAchievements(
        data
    );


    return selectedTitle;
}


// --------------------
// CLEAR TITLE
// --------------------

function clearTitle(
    guildId,
    userId
) {

    const data =
        loadAchievements();


    const profile =
        ensureProfile(
            data,
            guildId,
            userId
        );


    profile.selectedTitle =
        null;


    saveAchievements(
        data
    );
}


// --------------------
// SELECTED TITLE
// --------------------

function getSelectedTitle(
    guildId,
    userId
) {

    const profile =
        getAchievementProfile(
            guildId,
            userId
        );


    if (
        !profile.selectedTitle
    ) {

        return null;
    }


    const titles =
        getUnlockedTitles(
            guildId,
            userId
        );


    return (
        titles.find(
            title =>
                title.id ===
                profile.selectedTitle
        ) ||
        null
    );
}


// --------------------
// EXPORTS
// --------------------

module.exports = {
    ACHIEVEMENTS,
    CORE_GAMES,
    recordAchievementEvent,
    notifyAchievements,
    getAchievementProfile,
    getUnlockedTitles,
    setTitle,
    clearTitle,
    getSelectedTitle
};