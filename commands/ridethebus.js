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


const MAX_BET = 10000;

const STAGE_TIME_SECONDS = 10;


// --------------------
// TIMER DISPLAY
// --------------------

function getTimerDisplay(seconds) {
    const filled =
        Math.max(
            0,
            Math.min(
                STAGE_TIME_SECONDS,
                seconds
            )
        );

    const empty =
        STAGE_TIME_SECONDS - filled;


    return (
        `⏱️ **${seconds} second${seconds === 1 ? "" : "s"}**\n` +
        `${"🟩".repeat(filled)}${"⬛".repeat(empty)}`
    );
}


function addTimerToMessage(
    message,
    seconds
) {
    return (
        `${message}\n\n` +
        getTimerDisplay(seconds)
    );
}


function stopStageTimer(game) {
    if (game.timer) {
        clearInterval(game.timer);
        game.timer = null;
    }
}

function startStageTimer(
    interaction,
    game,
    collector,
    gameKey,
    guildId,
    userId,
    bet,
    message,
    components
) {
    stopStageTimer(game);


    let secondsRemaining =
        STAGE_TIME_SECONDS;


    game.timer = setInterval(
        async () => {

            secondsRemaining--;


            // --------------------
            // TIME EXPIRED
            // --------------------

            if (secondsRemaining <= 0) {

                stopStageTimer(game);


                if (
                    !activeGames.has(gameKey)
                ) {
                    return;
                }


                activeGames.delete(
                    gameKey
                );


                recordGamble(
                    guildId,
                    userId,
                    "ride_the_bus",
                    bet,
                    0
                );


                collector.stop(
                    "stage-timeout"
                );


                await interaction.editReply({
                    content:
                        `🚌 **THE BUS LEFT WITHOUT YOU**\n\n` +
                        `You took too long to answer.\n\n` +
                        `You lost **$${bet.toLocaleString()}**.`,
                    components: []
                });


                await maybeTriggerRandomEvent(
                    interaction
                );


                return;
            }


            // --------------------
            // UPDATE COUNTDOWN
            // --------------------

            try {

                await interaction.editReply({
                    content:
                        addTimerToMessage(
                            message,
                            secondsRemaining
                        ),

                    components:
                        components
                });

            }

            catch (error) {
                console.error(
                    "Ride the Bus timer error:",
                    error
                );
            }

        },
        1000
    );
}

const HOUSE_RETURN = 0.95;

const activeGames = new Map();


// --------------------
// CREATE DECK
// --------------------

function createDeck() {
    const suits = [
        { name: "hearts", symbol: "♥️", color: "red" },
        { name: "diamonds", symbol: "♦️", color: "red" },
        { name: "clubs", symbol: "♣️", color: "black" },
        { name: "spades", symbol: "♠️", color: "black" }
    ];

    const ranks = [
        { name: "2", value: 2 },
        { name: "3", value: 3 },
        { name: "4", value: 4 },
        { name: "5", value: 5 },
        { name: "6", value: 6 },
        { name: "7", value: 7 },
        { name: "8", value: 8 },
        { name: "9", value: 9 },
        { name: "10", value: 10 },
        { name: "J", value: 11 },
        { name: "Q", value: 12 },
        { name: "K", value: 13 },
        { name: "A", value: 14 }
    ];

    const deck = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({
                suit: suit.name,
                suitSymbol: suit.symbol,
                color: suit.color,
                rank: rank.name,
                value: rank.value
            });
        }
    }

    return deck;
}


// --------------------
// DRAW RANDOM CARD
// --------------------

function drawCard(deck) {
    const index =
        crypto.randomInt(deck.length);

    return deck.splice(index, 1)[0];
}


// --------------------
// DISPLAY CARD
// --------------------

function displayCard(card) {
    return `${card.rank}${card.suitSymbol}`;
}


// --------------------
// COUNT POSSIBLE CARDS
// --------------------

function countCards(deck, condition) {
    return deck.filter(condition).length;
}


// --------------------
// CALCULATE CASHOUT
// --------------------

function calculatePayout(
    bet,
    cumulativeProbability
) {
    return Math.floor(
        bet *
        HOUSE_RETURN /
        cumulativeProbability
    );
}


// --------------------
// SETTLE WIN
// --------------------

async function settleWin(
    interaction,
    guildId,
    userId,
    bet,
    payout,
    completedBus
) {
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


    const profit =
        payout - returnedStake;


    let garnished = 0;


    if (profit > 0) {
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


    recordGamble(
        guildId,
        userId,
        "ride_the_bus",
        bet,
        payout
    );


    const newBalance =
        getBalance(
            guildId,
            userId
        );


    if (completedBus) {
        await sendAnnouncement(
            interaction.client,
            guildId,
            `🚌 **SOMEBODY RODE THE BUS!** 🚌\n\n` +
            `<@${userId}> survived all four rounds.\n\n` +
            `Bet: **$${bet.toLocaleString()}**\n` +
            `Payout: **$${payout.toLocaleString()}**`
        );
    }


    return {
        newBalance,
        garnished
    };
}


// --------------------
// COMMAND
// --------------------

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ridethebus")
        .setDescription(
            "Ride the Bus and risk your bet through four card challenges"
        )

        .addIntegerOption(option =>
            option
                .setName("bet")
                .setDescription(
                    `Amount to bet, max $${MAX_BET}`
                )
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(MAX_BET)
        ),


    execute: async function(interaction) {
        const guildId =
            interaction.guildId;

        const userId =
            interaction.user.id;

        const bet =
            interaction.options.getInteger(
                "bet"
            );


        const gameKey =
            `${guildId}-${userId}`;


        // --------------------
        // ALREADY PLAYING
        // --------------------

        if (activeGames.has(gameKey)) {
            await interaction.reply({
                content:
                    "You're already riding the bus.",
                ephemeral: true
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


        if (bet > balance) {
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


        const game = {
            deck: createDeck(),

            cards: [],

            round: 1,

            cumulativeProbability: 1,

            currentPayout: 0,

            timer: null
        };


        activeGames.set(
            gameKey,
            game
        );


        // --------------------
        // ROUND 1 BUTTONS
        // --------------------

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "bus_red"
                        )
                        .setLabel(
                            "🔴 Red"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "bus_black"
                        )
                        .setLabel(
                            "⚫ Black"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );


        const round1Message =
            `🚌 **RIDE THE BUS** 🚌\n\n` +
            `Bet: **$${bet.toLocaleString()}**\n\n` +
            `**Round 1 of 4**\n` +
            `Will the first card be **Red or Black?**`;
        
        await interaction.reply({
            content:
                addTimerToMessage(
                    round1Message,
                    STAGE_TIME_SECONDS
                ),

            components: [row]
        });

        const message =
            await interaction.fetchReply();


        // --------------------
        // BUTTON COLLECTOR
        // --------------------

        const collector =
            message.createMessageComponentCollector({
                filter: button =>
                    button.user.id === userId,

                time:
                    5 * 60 * 1000
            });


            startStageTimer(
                interaction,
                game,
                collector,
                gameKey,
                guildId,
                userId,
                bet,
                round1Message,
                [row]
            );


        collector.on(
            "collect",
            async button => {

                stopStageTimer(game);

                // --------------------
                // CASH OUT
                // --------------------

                if (
                    button.customId ===
                    "bus_cashout"
                ) {

                    const payout =
                        game.currentPayout;


                    const result =
                        await settleWin(
                            interaction,
                            guildId,
                            userId,
                            bet,
                            payout,
                            false
                        );


                    activeGames.delete(
                        gameKey
                    );


                    collector.stop(
                        "finished"
                    );


                    let text =
                        `💰 **CASHED OUT**\n\n` +
                        `Payout: **$${payout.toLocaleString()}**\n`;


                    if (
                        result.garnished > 0
                    ) {

                        text +=
                            `🦈 Collections took **$${result.garnished.toLocaleString()}**.\n`;
                    }


                    text +=
                        `Balance: **$${result.newBalance.toLocaleString()}**`;


                    await button.update({
                        content: text,
                        components: []
                    });


                    await maybeTriggerRandomEvent(
                        interaction
                    );

                    return;
                }


                // --------------------
                // ROUND 1
                // RED / BLACK
                // --------------------

                if (game.round === 1) {

                    const guess =
                        button.customId ===
                        "bus_red"
                            ? "red"
                            : "black";


                    const probability =
                        26 / 52;


                    const card =
                        drawCard(
                            game.deck
                        );


                    game.cards.push(card);


                    if (
                        card.color !== guess
                    ) {

                        recordGamble(
                            guildId,
                            userId,
                            "ride_the_bus",
                            bet,
                            0
                        );


                        activeGames.delete(
                            gameKey
                        );


                        collector.stop(
                            "finished"
                        );


                        await button.update({
                            content:
                                `🚌 **YOU FELL OFF THE BUS**\n\n` +
                                `Card: **${displayCard(card)}**\n\n` +
                                `You guessed **${guess}**.\n` +
                                `You lost **$${bet.toLocaleString()}**.`,
                            components: []
                        });


                        await maybeTriggerRandomEvent(
                            interaction
                        );

                        return;
                    }


                    game.cumulativeProbability *=
                        probability;


                    game.currentPayout =
                        calculatePayout(
                            bet,
                            game.cumulativeProbability
                        );


                    game.round = 2;


                    const higherCount =
                        countCards(
                            game.deck,
                            c =>
                                c.value >
                                card.value
                        );


                    const lowerCount =
                        countCards(
                            game.deck,
                            c =>
                                c.value <
                                card.value
                        );


                    const higherButton =
                        new ButtonBuilder()
                            .setCustomId(
                                "bus_higher"
                            )
                            .setLabel(
                                "⬆️ Higher"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            )
                            .setDisabled(
                                higherCount === 0
                            );


                    const lowerButton =
                        new ButtonBuilder()
                            .setCustomId(
                                "bus_lower"
                            )
                            .setLabel(
                                "⬇️ Lower"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            )
                            .setDisabled(
                                lowerCount === 0
                            );


                    const cashoutButton =
                        new ButtonBuilder()
                            .setCustomId(
                                "bus_cashout"
                            )
                            .setLabel(
                                `💰 Cash Out $${game.currentPayout}`
                            )
                            .setStyle(
                                ButtonStyle.Success
                            );


                    const nextRow =
                        new ActionRowBuilder()
                            .addComponents(
                                higherButton,
                                lowerButton,
                                cashoutButton
                            );


                    const round2Message =
                        `✅ **Correct!**\n\n` +
                        `Card 1: **${displayCard(card)}**\n\n` +
                        `Current Cash Out: **$${game.currentPayout.toLocaleString()}**\n\n` +
                        `**Round 2 of 4**\n` +
                        `Will the next card be **Higher or Lower?**\n\n` +
                        `*Equal rank counts as a loss.*`;


                    await button.update({
                        content:
                            addTimerToMessage(
                                round2Message,
                                STAGE_TIME_SECONDS
                            ),

                        components: [nextRow]
                    });


                    startStageTimer(
                        interaction,
                        game,
                        collector,
                        gameKey,
                        guildId,
                        userId,
                        bet,
                        round2Message,
                        [nextRow]
                    );


                    return;
                                


                    return;
                }


                // --------------------
                // ROUND 2
                // HIGHER / LOWER
                // --------------------

                if (game.round === 2) {

                    const firstCard =
                        game.cards[0];


                    const guessHigher =
                        button.customId ===
                        "bus_higher";


                    const winningCards =
                        countCards(
                            game.deck,
                            card =>
                                guessHigher
                                    ?
                                    card.value >
                                    firstCard.value
                                    :
                                    card.value <
                                    firstCard.value
                        );


                    const probability =
                        winningCards /
                        game.deck.length;


                    const card =
                        drawCard(
                            game.deck
                        );


                    game.cards.push(card);


                    const correct =
                        guessHigher
                            ?
                            card.value >
                            firstCard.value
                            :
                            card.value <
                            firstCard.value;


                    if (!correct) {

                        recordGamble(
                            guildId,
                            userId,
                            "ride_the_bus",
                            bet,
                            0
                        );


                        activeGames.delete(
                            gameKey
                        );


                        collector.stop(
                            "finished"
                        );


                        await button.update({
                            content:
                                `🚌 **YOU FELL OFF THE BUS**\n\n` +
                                `Card 1: **${displayCard(firstCard)}**\n` +
                                `Card 2: **${displayCard(card)}**\n\n` +
                                `You lost **$${bet.toLocaleString()}**.`,
                            components: []
                        });


                        await maybeTriggerRandomEvent(
                            interaction
                        );

                        return;
                    }


                    game.cumulativeProbability *=
                        probability;


                    game.currentPayout =
                        calculatePayout(
                            bet,
                            game.cumulativeProbability
                        );


                    game.round = 3;


                    const low =
                        Math.min(
                            firstCard.value,
                            card.value
                        );


                    const high =
                        Math.max(
                            firstCard.value,
                            card.value
                        );


                    const insideCount =
                        countCards(
                            game.deck,
                            c =>
                                c.value > low &&
                                c.value < high
                        );


                    const outsideCount =
                        countCards(
                            game.deck,
                            c =>
                                c.value < low ||
                                c.value > high
                        );


                    const row =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        "bus_inside"
                                    )
                                    .setLabel(
                                        "↔️ Inside"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    )
                                    .setDisabled(
                                        insideCount === 0
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "bus_outside"
                                    )
                                    .setLabel(
                                        "↔️ Outside"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    )
                                    .setDisabled(
                                        outsideCount === 0
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "bus_cashout"
                                    )
                                    .setLabel(
                                        `💰 Cash Out $${game.currentPayout}`
                                    )
                                    .setStyle(
                                        ButtonStyle.Success
                                    )
                            );


                    const round3Message =
                        `✅ **Correct!**\n\n` +
                        `Cards: **${displayCard(firstCard)} | ${displayCard(card)}**\n\n` +
                        `Current Cash Out: **$${game.currentPayout.toLocaleString()}**\n\n` +
                        `**Round 3 of 4**\n` +
                        `Will the next card fall **Inside or Outside** those ranks?\n\n` +
                        `*Matching either boundary counts as a loss.*`;


                    await button.update({
                        content:
                            addTimerToMessage(
                                round3Message,
                                STAGE_TIME_SECONDS
                            ),

                        components: [row]
                    });


                    startStageTimer(
                        interaction,
                        game,
                        collector,
                        gameKey,
                        guildId,
                        userId,
                        bet,
                        round3Message,
                        [row]
                    );


                    return;

                }

                // --------------------
                // ROUND 3
                // INSIDE / OUTSIDE
                // --------------------

                if (game.round === 3) {

                    const card1 =
                        game.cards[0];

                    const card2 =
                        game.cards[1];


                    const low =
                        Math.min(
                            card1.value,
                            card2.value
                        );


                    const high =
                        Math.max(
                            card1.value,
                            card2.value
                        );


                    const guessInside =
                        button.customId ===
                        "bus_inside";


                    const winningCards =
                        countCards(
                            game.deck,
                            card =>
                                guessInside
                                    ?
                                    (
                                        card.value > low &&
                                        card.value < high
                                    )
                                    :
                                    (
                                        card.value < low ||
                                        card.value > high
                                    )
                        );


                    const probability =
                        winningCards /
                        game.deck.length;


                    const card3 =
                        drawCard(
                            game.deck
                        );


                    game.cards.push(card3);


                    const inside =
                        card3.value > low &&
                        card3.value < high;


                    const outside =
                        card3.value < low ||
                        card3.value > high;


                    const correct =
                        guessInside
                            ? inside
                            : outside;


                    if (!correct) {

                        recordGamble(
                            guildId,
                            userId,
                            "ride_the_bus",
                            bet,
                            0
                        );


                        activeGames.delete(
                            gameKey
                        );


                        collector.stop(
                            "finished"
                        );


                        await button.update({
                            content:
                                `🚌 **YOU FELL OFF THE BUS**\n\n` +
                                `Cards: **${game.cards.map(displayCard).join(" | ")}**\n\n` +
                                `You lost **$${bet.toLocaleString()}**.`,
                            components: []
                        });


                        await maybeTriggerRandomEvent(
                            interaction
                        );

                        return;
                    }


                    game.cumulativeProbability *=
                        probability;


                    game.currentPayout =
                        calculatePayout(
                            bet,
                            game.cumulativeProbability
                        );


                    game.round = 4;


                    const row1 =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        "bus_hearts"
                                    )
                                    .setLabel(
                                        "♥️ Hearts"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "bus_diamonds"
                                    )
                                    .setLabel(
                                        "♦️ Diamonds"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "bus_clubs"
                                    )
                                    .setLabel(
                                        "♣️ Clubs"
                                    )
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "bus_spades"
                                    )
                                    .setLabel(
                                        "♠️ Spades"
                                    )
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    )
                            );


                    const row2 =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        "bus_cashout"
                                    )
                                    .setLabel(
                                        `💰 Cash Out $${game.currentPayout}`
                                    )
                                    .setStyle(
                                        ButtonStyle.Success
                                    )
                            );


                    const round4Message =
                        `✅ **Correct!**\n\n` +
                        `Cards: **${game.cards.map(displayCard).join(" | ")}**\n\n` +
                        `Current Cash Out: **$${game.currentPayout.toLocaleString()}**\n\n` +
                        `**FINAL ROUND**\n` +
                        `Guess the suit of the next card.`;


                    await button.update({
                        content:
                            addTimerToMessage(
                                round4Message,
                                STAGE_TIME_SECONDS
                            ),

                        components: [
                            row1,
                            row2
                        ]
                    });


                    startStageTimer(
                        interaction,
                        game,
                        collector,
                        gameKey,
                        guildId,
                        userId,
                        bet,
                        round4Message,
                        [
                            row1,
                            row2
                        ]
                    );


                    return;

                }


                // --------------------
                // ROUND 4
                // SUIT
                // --------------------

                if (game.round === 4) {

                    const guessedSuit =
                        button.customId.replace(
                            "bus_",
                            ""
                        );


                    const winningCards =
                        countCards(
                            game.deck,
                            card =>
                                card.suit ===
                                guessedSuit
                        );


                    const probability =
                        winningCards /
                        game.deck.length;


                    const finalCard =
                        drawCard(
                            game.deck
                        );


                    game.cards.push(
                        finalCard
                    );


                    if (
                        finalCard.suit !==
                        guessedSuit
                    ) {

                        recordGamble(
                            guildId,
                            userId,
                            "ride_the_bus",
                            bet,
                            0
                        );


                        activeGames.delete(
                            gameKey
                        );


                        collector.stop(
                            "finished"
                        );


                        await button.update({
                            content:
                                `🚌 **YOU FELL OFF AT THE LAST STOP**\n\n` +
                                `Cards: **${game.cards.map(displayCard).join(" | ")}**\n\n` +
                                `The final card was **${displayCard(finalCard)}**.\n\n` +
                                `You lost **$${bet.toLocaleString()}**.`,
                            components: []
                        });


                        await maybeTriggerRandomEvent(
                            interaction
                        );

                        return;
                    }


                    game.cumulativeProbability *=
                        probability;


                    const payout =
                        calculatePayout(
                            bet,
                            game.cumulativeProbability
                        );


                    const result =
                        await settleWin(
                            interaction,
                            guildId,
                            userId,
                            bet,
                            payout,
                            true
                        );


                    activeGames.delete(
                        gameKey
                    );


                    collector.stop(
                        "finished"
                    );


                    let text =
                        `🚌🎉 **YOU RODE THE BUS!** 🎉🚌\n\n` +

                        `Cards: **${game.cards.map(displayCard).join(" | ")}**\n\n` +

                        `Payout: **$${payout.toLocaleString()}**\n`;


                    if (
                        result.garnished > 0
                    ) {

                        text +=
                            `🦈 Collections took **$${result.garnished.toLocaleString()}**.\n`;
                    }


                    text +=
                        `Balance: **$${result.newBalance.toLocaleString()}**`;


                    await button.update({
                        content: text,
                        components: []
                    });


                    await maybeTriggerRandomEvent(
                        interaction
                    );
                }
            }
        );
    

        // --------------------
        // TIMEOUT
        // --------------------

        collector.on(
            "end",
            async (
                collected,
                reason
            ) => {

                stopStageTimer(game);

                if (
                    reason ===
                    "finished"
                ) {
                    return;
                }


                if (
                    activeGames.has(
                        gameKey
                    )
                ) {

                    activeGames.delete(
                        gameKey
                    );


                    recordGamble(
                        guildId,
                        userId,
                        "ride_the_bus",
                        bet,
                        0
                    );


                    await interaction.editReply({
                        content:
                            `🚌 **THE BUS LEFT WITHOUT YOU**\n\n` +
                            `You took too long to answer and lost your **$${bet.toLocaleString()}** bet.`,
                        components: []
                    });
                }
            }
        );
    }
};