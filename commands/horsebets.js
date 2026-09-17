const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
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

const RACE_TIMEOUT =
    2 * 60 * 1000;

const BET_TIMEOUT =
    30 * 1000;


// --------------------
// ACTIVE RACES
// --------------------

const activeRaces =
    new Map();


// --------------------
// HORSE NAMES
// --------------------

const HORSE_NAMES = [
    "Thunderbolt",
    "Midnight",
    "Lucky Strike",
    "Red Rocket",
    "Dust Devil",
    "Silver Bullet",
    "Wildfire",
    "Black Diamond",
    "Gold Rush",
    "Outlaw",
    "Whiskey Runner",
    "Storm Chaser",
    "Money Maker",
    "Dark Horse",
    "Last Call"
];


// --------------------
// SHUFFLE ARRAY
// --------------------

function shuffle(array) {

    const copy =
        [...array];


    for (
        let i = copy.length - 1;
        i > 0;
        i--
    ) {

        const j =
            crypto.randomInt(
                i + 1
            );


        [
            copy[i],
            copy[j]
        ] = [
            copy[j],
            copy[i]
        ];
    }


    return copy;
}


// --------------------
// CREATE NEW RACE
// --------------------

function createRace() {

    /*
        Every horse gets a random weight.

        Higher weight =
        higher chance to win.

        The weights change every race.
    */

    const names =
        shuffle(
            HORSE_NAMES
        ).slice(
            0,
            5
        );


    const horses =
        names.map(
            name => ({

                name: name,

                /*
                    Weight range:
                    12 through 35
                */

                weight:
                    crypto.randomInt(
                        12,
                        36
                    )
            })
        );


    const totalWeight =
        horses.reduce(
            (
                total,
                horse
            ) =>
                total +
                horse.weight,

            0
        );


    // --------------------
    // CALCULATE ODDS
    // --------------------

    for (
        const horse
        of horses
    ) {

        horse.chance =
            horse.weight /
            totalWeight;


        horse.multiplier =
            HOUSE_RETURN /
            horse.chance;
    }


    return {
        horses,
        totalWeight
    };
}


// --------------------
// PICK WINNER
// --------------------

function pickWinner(race) {

    /*
        This uses the SAME weights
        that created the displayed odds.

        So the percentages are real,
        not just cosmetic.
    */

    const roll =
        crypto.randomInt(
            race.totalWeight
        );


    let cumulative = 0;


    for (
        const horse
        of race.horses
    ) {

        cumulative +=
            horse.weight;


        if (
            roll <
            cumulative
        ) {

            return horse;
        }
    }


    return race.horses[
        race.horses.length - 1
    ];
}


// --------------------
// RACE CARD
// --------------------

function buildRaceCard(
    race,
    balance
) {

    let message =
        `🏇 **HORSE RACING** 🏇\n\n` +

        `Balance: **$${balance.toLocaleString()}**\n\n` +

        `Review the odds before placing your bet.\n\n`;


    race.horses.forEach(
        (
            horse,
            index
        ) => {

            const percentage =
                (
                    horse.chance *
                    100
                ).toFixed(1);


            message +=
                `**${index + 1}. 🐎 ${horse.name}**\n` +

                `Chance to Win: **${percentage}%**\n` +

                `Payout: **${horse.multiplier.toFixed(2)}x**\n\n`;
        }
    );


    message +=
        `Choose a horse below to place your bet.`;


    return message;
}


// --------------------
// COMMAND
// --------------------

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "horsebets"
            )

            .setDescription(
                "View the horse race odds and place a bet"
            ),


    execute:
        async function(
            interaction
        ) {

            const guildId =
                interaction.guildId;


            const userId =
                interaction.user.id;


            const raceKey =
                `${guildId}-${userId}`;


            // --------------------
            // ALREADY VIEWING RACE
            // --------------------

            if (
                activeRaces.has(
                    raceKey
                )
            ) {

                await interaction.reply({
                    content:
                        "You already have a horse betting page open.",

                    ephemeral: true
                });


                return;
            }


            // --------------------
            // GET BALANCE
            // --------------------

            const balance =
                getBalance(
                    guildId,
                    userId
                );


            // --------------------
            // CREATE RANDOM RACE
            // --------------------

            const race =
                createRace();


            activeRaces.set(
                raceKey,
                race
            );


            // --------------------
            // CREATE HORSE BUTTONS
            // --------------------

            const row1 =
                new ActionRowBuilder();


            const row2 =
                new ActionRowBuilder();


            race.horses.forEach(
                (
                    horse,
                    index
                ) => {

                    const button =
                        new ButtonBuilder()

                            .setCustomId(
                                `horse_${index}`
                            )

                            .setLabel(
                                `${index + 1}. ${horse.name}`
                            )

                            .setStyle(
                                ButtonStyle.Primary
                            );


                    if (
                        index < 3
                    ) {

                        row1.addComponents(
                            button
                        );
                    }

                    else {

                        row2.addComponents(
                            button
                        );
                    }
                }
            );


            // --------------------
            // SHOW RACE CARD
            // --------------------

            await interaction.reply({

                content:
                    buildRaceCard(
                        race,
                        balance
                    ),

                components: [
                    row1,
                    row2
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
                            RACE_TIMEOUT
                    });


            // --------------------
            // HORSE SELECTED
            // --------------------

            collector.on(
                "collect",

                async button => {

                    const horseIndex =
                        Number(
                            button.customId
                                .replace(
                                    "horse_",
                                    ""
                                )
                        );


                    const horse =
                        race.horses[
                            horseIndex
                        ];


                    // --------------------
                    // CREATE BET MODAL
                    // --------------------

                    const modal =
                        new ModalBuilder()

                            .setCustomId(
                                `horsebet_${horseIndex}`
                            )

                            .setTitle(
                                `Bet on ${horse.name}`
                            );


                    const betInput =
                        new TextInputBuilder()

                            .setCustomId(
                                "bet_amount"
                            )

                            .setLabel(
                                `Bet amount - max $${MAX_BET}`
                            )

                            .setStyle(
                                TextInputStyle.Short
                            )

                            .setPlaceholder(
                                "500"
                            )

                            .setRequired(
                                true
                            );


                    const inputRow =
                        new ActionRowBuilder()

                            .addComponents(
                                betInput
                            );


                    modal.addComponents(
                        inputRow
                    );


                    // --------------------
                    // SHOW MODAL
                    // --------------------

                    await button.showModal(
                        modal
                    );


                    /*
                        Lock the race card.

                        The player has now selected
                        their horse.
                    */

                    collector.stop(
                        "horse-selected"
                    );


                    // --------------------
                    // WAIT FOR BET
                    // --------------------

                    let modalInteraction;


                    try {

                        modalInteraction =
                            await button
                                .awaitModalSubmit({

                                    filter:
                                        submitted =>
                                            submitted.user.id ===
                                            userId &&

                                            submitted.customId ===
                                            `horsebet_${horseIndex}`,

                                    time:
                                        BET_TIMEOUT
                                });

                    }

                    catch {

                        activeRaces.delete(
                            raceKey
                        );


                        try {

                            await interaction.editReply({

                                content:
                                    `🏇 **BETTING CANCELLED**\n\n` +
                                    `You didn't enter a bet in time.`,

                                components: []
                            });

                        }

                        catch {
                            // Ignore edit errors
                        }


                        return;
                    }


                    // --------------------
                    // READ BET
                    // --------------------

                    const betText =
                        modalInteraction
                            .fields
                            .getTextInputValue(
                                "bet_amount"
                            )

                            .replace(
                                /[$,\s]/g,
                                ""
                            );


                    const bet =
                        Number(
                            betText
                        );


                    // --------------------
                    // VALIDATE BET
                    // --------------------

                    if (
                        !Number.isInteger(
                            bet
                        ) ||

                        bet < 1 ||

                        bet > MAX_BET
                    ) {

                        activeRaces.delete(
                            raceKey
                        );


                        await modalInteraction.reply({

                            content:
                                `Enter a whole-dollar bet between **$1** and **$${MAX_BET.toLocaleString()}**.`,

                            ephemeral: true
                        });


                        return;
                    }


                    // --------------------
                    // CHECK BALANCE AGAIN
                    // --------------------

                    const currentBalance =
                        getBalance(
                            guildId,
                            userId
                        );


                    if (
                        bet >
                        currentBalance
                    ) {

                        activeRaces.delete(
                            raceKey
                        );


                        await modalInteraction.reply({

                            content:
                                `You don't have enough money.\n` +

                                `Balance: **$${currentBalance.toLocaleString()}**`,

                            ephemeral: true
                        });


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


                    activeRaces.delete(
                        raceKey
                    );


                    // --------------------
                    // CONFIRM BET
                    // --------------------

                    await modalInteraction.reply(

                        `🏇 **BET PLACED** 🏇\n\n` +

                        `Horse: **${horse.name}**\n` +

                        `Win Chance: **${(
                            horse.chance *
                            100
                        ).toFixed(1)}%**\n` +

                        `Payout: **${horse.multiplier.toFixed(2)}x**\n` +

                        `Bet: **$${bet.toLocaleString()}**\n\n` +

                        `🏁 The horses are heading to the gate...`
                    );


                    // --------------------
                    // SHORT RACE DELAY
                    // --------------------

                    await new Promise(
                        resolve =>

                            setTimeout(
                                resolve,
                                3000
                            )
                    );


                    // --------------------
                    // PICK WINNER
                    // --------------------

                    const winner =
                        pickWinner(
                            race
                        );


                    // --------------------
                    // PLAYER WON
                    // --------------------

                    if (
                        winner.name ===
                        horse.name
                    ) {

                        const payout =
                            Math.floor(
                                bet *
                                horse.multiplier
                            );


                        /*
                            Return original stake first.

                            This prevents collections
                            from garnishing the money
                            that was originally wagered.
                        */

                        changeBalance(
                            guildId,
                            userId,
                            bet
                        );


                        const profit =
                            payout - bet;


                        const income =
                            processIncome(
                                guildId,
                                userId,
                                profit,
                                "gambling"
                            );


                        // --------------------
                        // SESSION STATS
                        // --------------------

                        recordGamble(
                            guildId,
                            userId,
                            "horse_racing",
                            bet,
                            payout
                        );


                        const newBalance =
                            getBalance(
                                guildId,
                                userId
                            );


                        let resultMessage =

                            `🏁 **RACE FINISHED!** 🏁\n\n` +

                            `🥇 Winner: **${winner.name}**\n\n` +

                            `🎉 **YOUR HORSE WON!** 🎉\n\n` +

                            `Bet: **$${bet.toLocaleString()}**\n` +

                            `Odds: **${(
                                horse.chance *
                                100
                            ).toFixed(1)}%**\n` +

                            `Multiplier: **${horse.multiplier.toFixed(2)}x**\n` +

                            `Payout: **$${payout.toLocaleString()}**\n`;


                        if (
                            income.garnished >
                            0
                        ) {

                            resultMessage +=

                                `🦈 Collections took **$${income.garnished.toLocaleString()}** from your profit.\n`;
                        }


                        resultMessage +=

                            `Balance: **$${newBalance.toLocaleString()}**`;


                        await modalInteraction.editReply(
                            resultMessage
                        );


                        // --------------------
                        // BIG WIN ANNOUNCEMENT
                        // --------------------

                        if (
                            payout >=
                            5000
                        ) {

                            await sendAnnouncement(

                                interaction.client,

                                guildId,

                                `🏇💰 **BIG HORSE RACING WIN!** 💰🏇\n\n` +

                                `<@${userId}> backed **${horse.name}** at **${horse.multiplier.toFixed(2)}x**.\n\n` +

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
                    // PLAYER LOST
                    // --------------------

                    recordGamble(
                        guildId,
                        userId,
                        "horse_racing",
                        bet,
                        0
                    );


                    const newBalance =
                        getBalance(
                            guildId,
                            userId
                        );


                    await modalInteraction.editReply(

                        `🏁 **RACE FINISHED!** 🏁\n\n` +

                        `🥇 Winner: **${winner.name}**\n\n` +

                        `Your horse **${horse.name}** didn't win.\n\n` +

                        `You lost **$${bet.toLocaleString()}**.\n` +

                        `Balance: **$${newBalance.toLocaleString()}**`
                    );


                    await maybeTriggerRandomEvent(
                        interaction
                    );
                }
            );


            // --------------------
            // RACE CARD TIMEOUT
            // --------------------

            collector.on(
                "end",

                async (
                    collected,
                    reason
                ) => {

                    /*
                        If they selected a horse,
                        the modal now controls
                        the rest of the game.
                    */

                    if (
                        reason ===
                        "horse-selected"
                    ) {

                        return;
                    }


                    activeRaces.delete(
                        raceKey
                    );


                    try {

                        await interaction.editReply({

                            content:
                                `🏇 **HORSE BETTING CLOSED**\n\n` +

                                `You didn't choose a horse in time.`,

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