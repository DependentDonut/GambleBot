const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const crypto = require("crypto");

const {
    getBalance,
    changeBalance
} = require("../utils/economy");

const {
    processIncome
} = require("../utils/income");

const {
    recordGamble
} = require("../utils/sessions");

const {
    maybeTriggerRandomEvent
} = require("../utils/randomEvents");

const {
    sendAnnouncement
} = require("../utils/announcements");


// --------------------
// SETTINGS
// --------------------

const MAX_BET = 10000;

const HOUSE_RETURN = 0.95;

const MAX_MULTIPLIER = 100;

const GROWTH_RATE = 0.08;


// --------------------
// ACTIVE GAMES
// --------------------

const activeGames =
    new Map();


// --------------------
// GENERATE CRASH POINT
// --------------------

function generateCrashPoint() {

    /*
        Generates a crash curve with
        approximately a 5% house edge.

        Some games crash almost instantly.

        Rare games can reach very
        high multipliers.
    */

    const random =
        crypto.randomInt(
            1000000000
        ) /
        1000000000;


    let crashPoint =
        HOUSE_RETURN /
        (1 - random);


    crashPoint =
        Math.floor(
            crashPoint * 100
        ) / 100;


    if (
        crashPoint < 1
    ) {

        crashPoint = 1;
    }


    if (
        crashPoint >
        MAX_MULTIPLIER
    ) {

        crashPoint =
            MAX_MULTIPLIER;
    }


    return crashPoint;
}


// --------------------
// CURRENT MULTIPLIER
// --------------------

function getCurrentMultiplier(
    startTime
) {

    const elapsedSeconds =
        (
            Date.now() -
            startTime
        ) /
        1000;


    let multiplier =
        Math.exp(
            GROWTH_RATE *
            elapsedSeconds
        );


    multiplier =
        Math.floor(
            multiplier * 100
        ) /
        100;


    if (
        multiplier >
        MAX_MULTIPLIER
    ) {

        multiplier =
            MAX_MULTIPLIER;
    }


    return multiplier;
}


// --------------------
// CASH OUT BUTTON
// --------------------

function createCashoutButton(
    bet,
    multiplier
) {

    const currentPayout =
        Math.floor(
            bet *
            multiplier
        );


    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()

                .setCustomId(
                    "crash_cashout"
                )

                .setLabel(
                    `💰 Cash Out $${currentPayout.toLocaleString()}`
                )

                .setStyle(
                    ButtonStyle.Success
                )
        );
}


// --------------------
// DISPLAY GAME
// --------------------

function buildGameMessage(
    bet,
    multiplier
) {

    const currentPayout =
        Math.floor(
            bet *
            multiplier
        );


    return (
        `🚀 **CRASH** 🚀\n\n` +

        `Bet: **$${bet.toLocaleString()}**\n\n` +

        `📈 Current Multiplier:\n` +
        `# **${multiplier.toFixed(2)}x**\n\n` +

        `Current Cash Out: **$${currentPayout.toLocaleString()}**\n\n` +

        `⚠️ Cash out before it crashes!`
    );
}


// --------------------
// COMMAND
// --------------------

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "crash"
            )

            .setDescription(
                "Ride the multiplier and cash out before it crashes"
            )

            .addIntegerOption(
                option =>
                    option

                        .setName(
                            "bet"
                        )

                        .setDescription(
                            `Amount to bet, max $${MAX_BET}`
                        )

                        .setRequired(
                            true
                        )

                        .setMinValue(
                            1
                        )

                        .setMaxValue(
                            MAX_BET
                        )
            ),


    execute:
        async function(
            interaction
        ) {

            const guildId =
                interaction.guildId;


            const userId =
                interaction.user.id;


            const bet =
                interaction.options
                    .getInteger(
                        "bet"
                    );


            const gameKey =
                `${guildId}-${userId}`;


            // --------------------
            // ACTIVE GAME CHECK
            // --------------------

            if (
                activeGames.has(
                    gameKey
                )
            ) {

                await interaction.reply({

                    content:
                        "You're already playing Crash.",

                    ephemeral:
                        true
                });


                return;
            }


            // --------------------
            // CHECK BALANCE
            // --------------------

            const balance =
                getBalance(
                    guildId,
                    userId
                );


            if (
                bet >
                balance
            ) {

                await interaction.reply(
                    `You don't have enough money.\n` +

                    `Balance: **$${balance.toLocaleString()}**`
                );


                return;
            }


            // --------------------
            // TAKE BET
            // --------------------

            changeBalance(
                guildId,
                userId,
                -bet
            );


            // --------------------
            // GENERATE CRASH
            // --------------------

            const crashPoint =
                generateCrashPoint();


            // --------------------
            // INSTANT CRASH
            // --------------------

            if (
                crashPoint <= 1
            ) {

                recordGamble(
                    guildId,
                    userId,
                    "crash",
                    bet,
                    0
                );


                const newBalance =
                    getBalance(
                        guildId,
                        userId
                    );


                await interaction.reply(

                    `🚀 **CRASH** 🚀\n\n` +

                    `Bet: **$${bet.toLocaleString()}**\n\n` +

                    `💥 **CRASHED AT 1.00x!** 💥\n\n` +

                    `You lost **$${bet.toLocaleString()}**.\n` +

                    `Balance: **$${newBalance.toLocaleString()}**`
                );


                await maybeTriggerRandomEvent(
                    interaction
                );


                return;
            }


            // --------------------
            // START GAME
            // --------------------

            const startTime =
                Date.now();


            /*
                Calculate exactly when
                the multiplier reaches
                the hidden crash point.
            */

            const crashDelay =
                (
                    Math.log(
                        crashPoint
                    ) /
                    GROWTH_RATE
                ) *
                1000;


            const crashAt =
                startTime +
                crashDelay;


            const game = {

                bet,

                crashPoint,

                startTime,

                crashAt,

                finished:
                    false,

                displayInterval:
                    null,

                crashTimeout:
                    null
            };


            activeGames.set(
                gameKey,
                game
            );


            // --------------------
            // INITIAL DISPLAY
            // --------------------

            let currentMultiplier =
                1;


            let buttonRow =
                createCashoutButton(
                    bet,
                    currentMultiplier
                );


            await interaction.reply({

                content:
                    buildGameMessage(
                        bet,
                        currentMultiplier
                    ),

                components: [
                    buttonRow
                ]
            });


            const message =
                await interaction.fetchReply();


            // --------------------
            // BUTTON COLLECTOR
            // --------------------

            const collector =
                message
                    .createMessageComponentCollector({

                        filter:
                            button =>
                                button.user.id ===
                                userId,

                        time:
                            90 * 1000
                    });


            // --------------------
            // CLEANUP
            // --------------------

            function cleanup() {

                if (
                    game.displayInterval
                ) {

                    clearInterval(
                        game.displayInterval
                    );


                    game.displayInterval =
                        null;
                }


                if (
                    game.crashTimeout
                ) {

                    clearTimeout(
                        game.crashTimeout
                    );


                    game.crashTimeout =
                        null;
                }


                activeGames.delete(
                    gameKey
                );
            }


            // --------------------
            // CRASH GAME
            // --------------------

            async function crashGame() {

                if (
                    game.finished
                ) {

                    return;
                }


                game.finished =
                    true;


                cleanup();


                collector.stop(
                    "crashed"
                );


                recordGamble(
                    guildId,
                    userId,
                    "crash",
                    bet,
                    0
                );


                const newBalance =
                    getBalance(
                        guildId,
                        userId
                    );


                try {

                    await interaction.editReply({

                        content:

                            `🚀 **CRASH** 🚀\n\n` +

                            `Bet: **$${bet.toLocaleString()}**\n\n` +

                            `💥 **CRASHED AT ${crashPoint.toFixed(2)}x!** 💥\n\n` +

                            `You lost **$${bet.toLocaleString()}**.\n` +

                            `Balance: **$${newBalance.toLocaleString()}**`,

                        components: []
                    });

                }

                catch (
                    error
                ) {

                    console.error(
                        "Crash edit error:",
                        error
                    );
                }


                await maybeTriggerRandomEvent(
                    interaction
                );
            }


            // --------------------
            // LIVE DISPLAY
            // --------------------

            game.displayInterval =
                setInterval(

                    async () => {

                        if (
                            game.finished
                        ) {

                            return;
                        }


                        const multiplier =
                            getCurrentMultiplier(
                                startTime
                            );


                        /*
                            Do not display beyond
                            the hidden crash point.
                        */

                        if (
                            Date.now() >=
                            crashAt
                        ) {

                            return;
                        }


                        const row =
                            createCashoutButton(
                                bet,
                                multiplier
                            );


                        try {

                            await interaction.editReply({

                                content:
                                    buildGameMessage(
                                        bet,
                                        multiplier
                                    ),

                                components: [
                                    row
                                ]
                            });

                        }

                        catch (
                            error
                        ) {

                            console.error(
                                "Crash display error:",
                                error
                            );
                        }

                    },

                    1000
                );


            // --------------------
            // SCHEDULE CRASH
            // --------------------

            game.crashTimeout =
                setTimeout(

                    async () => {

                        await crashGame();

                    },

                    crashDelay
                );


            // --------------------
            // CASH OUT
            // --------------------

            collector.on(
                "collect",

                async button => {

                    if (
                        button.customId !==
                        "crash_cashout"
                    ) {

                        return;
                    }


                    if (
                        game.finished
                    ) {

                        return;
                    }


                    /*
                        Calculate the multiplier
                        at the exact moment the
                        button was clicked.
                    */

                    const cashoutMultiplier =
                        getCurrentMultiplier(
                            startTime
                        );


                    // --------------------
                    // TOO LATE
                    // --------------------

                    if (
                        Date.now() >=
                        crashAt ||

                        cashoutMultiplier >=
                        crashPoint
                    ) {

                        await button.deferUpdate();


                        await crashGame();


                        return;
                    }


                    // --------------------
                    // SUCCESSFUL CASHOUT
                    // --------------------

                    game.finished =
                        true;


                    cleanup();


                    collector.stop(
                        "cashed-out"
                    );


                    const payout =
                        Math.floor(
                            bet *
                            cashoutMultiplier
                        );


                    /*
                        Return original stake first.
                    */

                    const returnedStake =
                        Math.min(
                            bet,
                            payout
                        );


                    changeBalance(
                        guildId,
                        userId,
                        returnedStake
                    );


                    // --------------------
                    // PROFIT
                    // --------------------

                    const profit =
                        payout -
                        returnedStake;


                    let garnished = 0;


                    if (
                        profit > 0
                    ) {

                        const income =
                            processIncome(
                                guildId,
                                userId,
                                profit,
                                "gambling"
                            );


                        garnished =
                            income.garnished;
                    }


                    // --------------------
                    // SESSION STATS
                    // --------------------

                    recordGamble(
                        guildId,
                        userId,
                        "crash",
                        bet,
                        payout
                    );


                    const newBalance =
                        getBalance(
                            guildId,
                            userId
                        );


                    let resultMessage =

                        `🚀 **CRASH** 🚀\n\n` +

                        `💰 **CASHED OUT!** 💰\n\n` +

                        `Multiplier: **${cashoutMultiplier.toFixed(2)}x**\n` +

                        `Bet: **$${bet.toLocaleString()}**\n` +

                        `Payout: **$${payout.toLocaleString()}**\n`;


                    if (
                        garnished > 0
                    ) {

                        resultMessage +=

                            `🦈 Collections took **$${garnished.toLocaleString()}** from your profit.\n`;
                    }


                    resultMessage +=

                        `Balance: **$${newBalance.toLocaleString()}**`;


                    await button.update({

                        content:
                            resultMessage,

                        components: []
                    });


                    // --------------------
                    // BIG WIN ANNOUNCEMENT
                    // --------------------

                    if (
                        cashoutMultiplier >=
                        10 ||

                        payout >=
                        5000
                    ) {

                        await sendAnnouncement(

                            interaction.client,

                            guildId,

                            `🚀💰 **HUGE CRASH CASHOUT!** 💰🚀\n\n` +

                            `<@${userId}> escaped at **${cashoutMultiplier.toFixed(2)}x**!\n\n` +

                            `Bet: **$${bet.toLocaleString()}**\n` +

                            `Payout: **$${payout.toLocaleString()}**`
                        );
                    }


                    await maybeTriggerRandomEvent(
                        interaction
                    );
                }
            );


            // --------------------
            // SAFETY TIMEOUT
            // --------------------

            collector.on(
                "end",

                async (
                    collected,
                    reason
                ) => {

                    if (
                        reason ===
                        "cashed-out" ||

                        reason ===
                        "crashed"
                    ) {

                        return;
                    }


                    if (
                        !game.finished
                    ) {

                        await crashGame();
                    }
                }
            );
        }
};