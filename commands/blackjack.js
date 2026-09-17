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

const GAME_TIMEOUT =
    60 * 1000;


// --------------------
// ACTIVE GAMES
// --------------------

const activeGames =
    new Map();


// --------------------
// CREATE SHOE
// --------------------

function createDeck() {

    /*
        We use 6 decks.

        This gives us a more casino-like
        blackjack shoe.
    */

    const suits = [
        "♥️",
        "♦️",
        "♣️",
        "♠️"
    ];


    const ranks = [
        {
            name: "A",
            value: 11
        },
        {
            name: "2",
            value: 2
        },
        {
            name: "3",
            value: 3
        },
        {
            name: "4",
            value: 4
        },
        {
            name: "5",
            value: 5
        },
        {
            name: "6",
            value: 6
        },
        {
            name: "7",
            value: 7
        },
        {
            name: "8",
            value: 8
        },
        {
            name: "9",
            value: 9
        },
        {
            name: "10",
            value: 10
        },
        {
            name: "J",
            value: 10
        },
        {
            name: "Q",
            value: 10
        },
        {
            name: "K",
            value: 10
        }
    ];


    const deck = [];


    // Six decks
    for (
        let deckNumber = 0;
        deckNumber < 6;
        deckNumber++
    ) {

        for (const suit of suits) {

            for (const rank of ranks) {

                deck.push({

                    rank:
                        rank.name,

                    suit:
                        suit,

                    value:
                        rank.value
                });
            }
        }
    }


    // --------------------
    // SHUFFLE
    // --------------------

    for (
        let i = deck.length - 1;
        i > 0;
        i--
    ) {

        const j =
            crypto.randomInt(
                i + 1
            );


        [
            deck[i],
            deck[j]
        ] = [
            deck[j],
            deck[i]
        ];
    }


    return deck;
}


// --------------------
// DRAW CARD
// --------------------

function drawCard(deck) {

    return deck.pop();
}


// --------------------
// HAND VALUE
// --------------------

function getHandValue(hand) {

    let total = 0;

    let aces = 0;


    for (const card of hand) {

        total +=
            card.value;


        if (
            card.rank === "A"
        ) {

            aces++;
        }
    }


    /*
        Turn Ace from 11 to 1
        whenever necessary.
    */

    while (
        total > 21 &&
        aces > 0
    ) {

        total -= 10;

        aces--;
    }


    return total;
}


// --------------------
// BLACKJACK CHECK
// --------------------

function isBlackjack(hand) {

    return (
        hand.length === 2 &&
        getHandValue(hand) === 21
    );
}


// --------------------
// DISPLAY HAND
// --------------------

function displayHand(hand) {

    return hand
        .map(
            card =>
                `${card.rank}${card.suit}`
        )
        .join(" | ");
}


// --------------------
// DISPLAY GAME
// --------------------

function buildGameMessage(
    playerHand,
    dealerHand,
    wager,
    hideDealer = true
) {

    const playerValue =
        getHandValue(
            playerHand
        );


    let dealerDisplay;


    if (hideDealer) {

        dealerDisplay =
            `${dealerHand[0].rank}${dealerHand[0].suit} | ❓`;
    }

    else {

        dealerDisplay =
            displayHand(
                dealerHand
            );
    }


    let message =
        `🃏 **BLACKJACK** 🃏\n\n` +

        `Dealer:\n` +
        `**${dealerDisplay}**\n`;


    if (!hideDealer) {

        message +=
            `Dealer Total: **${getHandValue(dealerHand)}**\n`;
    }


    message +=
        `\nYour Hand:\n` +
        `**${displayHand(playerHand)}**\n` +

        `Your Total: **${playerValue}**\n\n` +

        `Wager: **$${wager.toLocaleString()}**`;


    return message;
}


// --------------------
// BUTTONS
// --------------------

function createButtons(
    canDouble
) {

    const hitButton =
        new ButtonBuilder()
            .setCustomId(
                "blackjack_hit"
            )
            .setLabel(
                "🃏 Hit"
            )
            .setStyle(
                ButtonStyle.Primary
            );


    const standButton =
        new ButtonBuilder()
            .setCustomId(
                "blackjack_stand"
            )
            .setLabel(
                "✋ Stand"
            )
            .setStyle(
                ButtonStyle.Secondary
            );


    const doubleButton =
        new ButtonBuilder()
            .setCustomId(
                "blackjack_double"
            )
            .setLabel(
                "💰 Double Down"
            )
            .setStyle(
                ButtonStyle.Success
            )
            .setDisabled(
                !canDouble
            );


    return new ActionRowBuilder()
        .addComponents(
            hitButton,
            standButton,
            doubleButton
        );
}


// --------------------
// PAY PLAYER
// --------------------

function payPlayer(
    guildId,
    userId,
    wager,
    payout
) {

    /*
        The wager has already been
        removed from the player's balance.

        Return their stake directly first.

        Collections only touches PROFIT.
    */

    const returnedStake =
        Math.min(
            wager,
            payout
        );


    if (
        returnedStake > 0
    ) {

        changeBalance(
            guildId,
            userId,
            returnedStake
        );
    }


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


    return {
        garnished,

        balance:
            getBalance(
                guildId,
                userId
            )
    };
}


// --------------------
// DEALER TURN
// --------------------

function playDealer(
    dealerHand,
    deck
) {

    /*
        Dealer hits below 17.

        Dealer stands on ALL 17s,
        including soft 17.
    */

    while (
        getHandValue(
            dealerHand
        ) < 17
    ) {

        dealerHand.push(
            drawCard(
                deck
            )
        );
    }
}


// --------------------
// COMMAND
// --------------------

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "blackjack"
            )

            .setDescription(
                "Play blackjack against the dealer"
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
                        "You're already playing blackjack.",

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
            // CREATE GAME
            // --------------------

            const deck =
                createDeck();


            const playerHand = [
                drawCard(deck),
                drawCard(deck)
            ];


            const dealerHand = [
                drawCard(deck),
                drawCard(deck)
            ];


            const game = {

                deck,

                playerHand,

                dealerHand,

                originalBet:
                    bet,

                wager:
                    bet,

                firstMove:
                    true
            };


            activeGames.set(
                gameKey,
                game
            );


            // --------------------
            // INITIAL BLACKJACKS
            // --------------------

            const playerBlackjack =
                isBlackjack(
                    playerHand
                );


            const dealerBlackjack =
                isBlackjack(
                    dealerHand
                );


            // --------------------
            // BOTH BLACKJACK
            // PUSH
            // --------------------

            if (
                playerBlackjack &&
                dealerBlackjack
            ) {

                const payout =
                    bet;


                changeBalance(
                    guildId,
                    userId,
                    bet
                );


                recordGamble(
                    guildId,
                    userId,
                    "blackjack",
                    bet,
                    payout
                );


                activeGames.delete(
                    gameKey
                );


                const newBalance =
                    getBalance(
                        guildId,
                        userId
                    );


                await interaction.reply(

                    buildGameMessage(
                        playerHand,
                        dealerHand,
                        bet,
                        false
                    ) +

                    `\n\n🤝 **PUSH!**\n` +

                    `You both have Blackjack.\n\n` +

                    `Your **$${bet.toLocaleString()}** bet was returned.\n` +

                    `Balance: **$${newBalance.toLocaleString()}**`
                );


                await maybeTriggerRandomEvent(
                    interaction
                );


                return;
            }


            // --------------------
            // PLAYER BLACKJACK
            // --------------------

            if (
                playerBlackjack
            ) {

                /*
                    Blackjack pays 3:2.

                    $100 bet:

                    $100 returned stake
                    $150 profit

                    $250 total payout
                */

                const payout =
                    Math.floor(
                        bet *
                        2.5
                    );


                const result =
                    payPlayer(
                        guildId,
                        userId,
                        bet,
                        payout
                    );


                recordGamble(
                    guildId,
                    userId,
                    "blackjack",
                    bet,
                    payout
                );


                activeGames.delete(
                    gameKey
                );


                let message =

                    buildGameMessage(
                        playerHand,
                        dealerHand,
                        bet,
                        false
                    ) +

                    `\n\n🎉 **BLACKJACK!** 🎉\n\n` +

                    `Payout: **$${payout.toLocaleString()}**\n`;


                if (
                    result.garnished > 0
                ) {

                    message +=

                        `🦈 Collections took **$${result.garnished.toLocaleString()}** from your profit.\n`;
                }


                message +=

                    `Balance: **$${result.balance.toLocaleString()}**`;


                await interaction.reply(
                    message
                );


                if (
                    payout >= 5000
                ) {

                    await sendAnnouncement(

                        interaction.client,

                        guildId,

                        `🃏💰 **BLACKJACK!** 💰🃏\n\n` +

                        `<@${userId}> was dealt a natural Blackjack!\n\n` +

                        `Bet: **$${bet.toLocaleString()}**\n` +

                        `Payout: **$${payout.toLocaleString()}**`
                    );
                }


                await maybeTriggerRandomEvent(
                    interaction
                );


                return;
            }


            // --------------------
            // DEALER BLACKJACK
            // --------------------

            if (
                dealerBlackjack
            ) {

                recordGamble(
                    guildId,
                    userId,
                    "blackjack",
                    bet,
                    0
                );


                activeGames.delete(
                    gameKey
                );


                const newBalance =
                    getBalance(
                        guildId,
                        userId
                    );


                await interaction.reply(

                    buildGameMessage(
                        playerHand,
                        dealerHand,
                        bet,
                        false
                    ) +

                    `\n\n💀 **Dealer Blackjack.**\n\n` +

                    `You lost **$${bet.toLocaleString()}**.\n` +

                    `Balance: **$${newBalance.toLocaleString()}**`
                );


                await maybeTriggerRandomEvent(
                    interaction
                );


                return;
            }


            // --------------------
            // SHOW GAME
            // --------------------

            const canDouble =
                getBalance(
                    guildId,
                    userId
                ) >= bet;


            const buttonRow =
                createButtons(
                    canDouble
                );


            await interaction.reply({

                content:

                    buildGameMessage(
                        playerHand,
                        dealerHand,
                        game.wager,
                        true
                    ) +

                    `\n\nWhat would you like to do?`,

                components: [
                    buttonRow
                ]
            });


            const message =
                await interaction.fetchReply();


            // --------------------
            // COLLECT BUTTONS
            // --------------------

            const collector =
                message
                    .createMessageComponentCollector({

                        filter:
                            button =>
                                button.user.id ===
                                userId,

                        time:
                            GAME_TIMEOUT
                    });


            // --------------------
            // FINISH HAND
            // --------------------

            async function finishHand(
                button
            ) {

                playDealer(
                    game.dealerHand,
                    game.deck
                );


                const playerTotal =
                    getHandValue(
                        game.playerHand
                    );


                const dealerTotal =
                    getHandValue(
                        game.dealerHand
                    );


                let payout = 0;

                let resultText = "";


                // --------------------
                // DEALER BUST
                // --------------------

                if (
                    dealerTotal > 21
                ) {

                    payout =
                        game.wager *
                        2;


                    resultText =
                        `🎉 **DEALER BUSTS! YOU WIN!**`;
                }


                // --------------------
                // PLAYER WINS
                // --------------------

                else if (
                    playerTotal >
                    dealerTotal
                ) {

                    payout =
                        game.wager *
                        2;


                    resultText =
                        `🎉 **YOU WIN!**`;
                }


                // --------------------
                // PUSH
                // --------------------

                else if (
                    playerTotal ===
                    dealerTotal
                ) {

                    payout =
                        game.wager;


                    resultText =
                        `🤝 **PUSH!**`;
                }


                // --------------------
                // DEALER WINS
                // --------------------

                else {

                    payout = 0;


                    resultText =
                        `💀 **DEALER WINS.**`;
                }


                let garnished = 0;


                if (
                    payout > 0
                ) {

                    const payment =
                        payPlayer(
                            guildId,
                            userId,
                            game.wager,
                            payout
                        );


                    garnished =
                        payment.garnished;
                }


                recordGamble(
                    guildId,
                    userId,
                    "blackjack",
                    game.wager,
                    payout
                );


                const newBalance =
                    getBalance(
                        guildId,
                        userId
                    );


                activeGames.delete(
                    gameKey
                );


                collector.stop(
                    "finished"
                );


                let resultMessage =

                    buildGameMessage(
                        game.playerHand,
                        game.dealerHand,
                        game.wager,
                        false
                    ) +

                    `\n\n${resultText}\n\n`;


                if (
                    payout > 0
                ) {

                    resultMessage +=

                        `Payout: **$${payout.toLocaleString()}**\n`;
                }

                else {

                    resultMessage +=

                        `You lost **$${game.wager.toLocaleString()}**.\n`;
                }


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


                if (
                    payout >= 5000
                ) {

                    await sendAnnouncement(

                        interaction.client,

                        guildId,

                        `🃏💰 **BIG BLACKJACK WIN!** 💰🃏\n\n` +

                        `<@${userId}> just won **$${payout.toLocaleString()}** at the Blackjack table!\n\n` +

                        `Wager: **$${game.wager.toLocaleString()}**`
                    );
                }


                await maybeTriggerRandomEvent(
                    interaction
                );
            }


            // --------------------
            // BUTTON CLICK
            // --------------------

            collector.on(
                "collect",

                async button => {


                    // --------------------
                    // HIT
                    // --------------------

                    if (
                        button.customId ===
                        "blackjack_hit"
                    ) {

                        game.firstMove =
                            false;


                        game.playerHand.push(
                            drawCard(
                                game.deck
                            )
                        );


                        const playerTotal =
                            getHandValue(
                                game.playerHand
                            );


                        // --------------------
                        // PLAYER BUST
                        // --------------------

                        if (
                            playerTotal > 21
                        ) {

                            recordGamble(
                                guildId,
                                userId,
                                "blackjack",
                                game.wager,
                                0
                            );


                            activeGames.delete(
                                gameKey
                            );


                            collector.stop(
                                "finished"
                            );


                            const newBalance =
                                getBalance(
                                    guildId,
                                    userId
                                );


                            await button.update({

                                content:

                                    buildGameMessage(
                                        game.playerHand,
                                        game.dealerHand,
                                        game.wager,
                                        false
                                    ) +

                                    `\n\n💥 **BUST!**\n\n` +

                                    `You lost **$${game.wager.toLocaleString()}**.\n` +

                                    `Balance: **$${newBalance.toLocaleString()}**`,

                                components: []
                            });


                            await maybeTriggerRandomEvent(
                                interaction
                            );


                            return;
                        }


                        // --------------------
                        // PLAYER HAS 21
                        // AUTOMATIC STAND
                        // --------------------

                        if (
                            playerTotal === 21
                        ) {

                            await finishHand(
                                button
                            );


                            return;
                        }


                        // --------------------
                        // CONTINUE HAND
                        // --------------------

                        const row =
                            createButtons(
                                false
                            );


                        await button.update({

                            content:

                                buildGameMessage(
                                    game.playerHand,
                                    game.dealerHand,
                                    game.wager,
                                    true
                                ) +

                                `\n\nWhat would you like to do?`,

                            components: [
                                row
                            ]
                        });


                        return;
                    }


                    // --------------------
                    // STAND
                    // --------------------

                    if (
                        button.customId ===
                        "blackjack_stand"
                    ) {

                        await finishHand(
                            button
                        );


                        return;
                    }


                    // --------------------
                    // DOUBLE DOWN
                    // --------------------

                    if (
                        button.customId ===
                        "blackjack_double"
                    ) {

                        /*
                            Double is only allowed
                            before taking another card.
                        */

                        if (
                            !game.firstMove
                        ) {

                            return;
                        }


                        const currentBalance =
                            getBalance(
                                guildId,
                                userId
                            );


                        if (
                            currentBalance <
                            game.originalBet
                        ) {

                            await button.reply({

                                content:
                                    "You don't have enough money to double down.",

                                ephemeral:
                                    true
                            });


                            return;
                        }


                        // --------------------
                        // TAKE SECOND BET
                        // --------------------

                        changeBalance(
                            guildId,
                            userId,
                            -game.originalBet
                        );


                        game.wager +=
                            game.originalBet;


                        game.firstMove =
                            false;


                        // --------------------
                        // ONE FINAL CARD
                        // --------------------

                        game.playerHand.push(
                            drawCard(
                                game.deck
                            )
                        );


                        const playerTotal =
                            getHandValue(
                                game.playerHand
                            );


                        // --------------------
                        // DOUBLE DOWN BUST
                        // --------------------

                        if (
                            playerTotal > 21
                        ) {

                            recordGamble(
                                guildId,
                                userId,
                                "blackjack",
                                game.wager,
                                0
                            );


                            activeGames.delete(
                                gameKey
                            );


                            collector.stop(
                                "finished"
                            );


                            const newBalance =
                                getBalance(
                                    guildId,
                                    userId
                                );


                            await button.update({

                                content:

                                    buildGameMessage(
                                        game.playerHand,
                                        game.dealerHand,
                                        game.wager,
                                        false
                                    ) +

                                    `\n\n💥 **DOUBLE DOWN BUST!**\n\n` +

                                    `You lost **$${game.wager.toLocaleString()}**.\n` +

                                    `Balance: **$${newBalance.toLocaleString()}**`,

                                components: []
                            });


                            await maybeTriggerRandomEvent(
                                interaction
                            );


                            return;
                        }


                        // --------------------
                        // DOUBLE AUTOMATICALLY STANDS
                        // --------------------

                        await finishHand(
                            button
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

                    if (
                        reason ===
                        "finished"
                    ) {

                        return;
                    }


                    if (
                        !activeGames.has(
                            gameKey
                        )
                    ) {

                        return;
                    }


                    activeGames.delete(
                        gameKey
                    );


                    recordGamble(
                        guildId,
                        userId,
                        "blackjack",
                        game.wager,
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

                                buildGameMessage(
                                    game.playerHand,
                                    game.dealerHand,
                                    game.wager,
                                    false
                                ) +

                                `\n\n⏱️ **TABLE CLOSED**\n\n` +

                                `You took too long to make a decision and lost **$${game.wager.toLocaleString()}**.\n` +

                                `Balance: **$${newBalance.toLocaleString()}**`,

                            components: []
                        });

                    }

                    catch {
                        // Ignore edit errors
                    }
                }
            );
        }
};