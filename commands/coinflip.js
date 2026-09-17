const {
    SlashCommandBuilder
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

const PAYOUT_MULTIPLIER = 1.90;


// --------------------
// FLIP COIN
// --------------------

function flipCoin() {

    const result =
        crypto.randomInt(2);


    if (result === 0) {
        return "heads";
    }


    return "tails";
}


// --------------------
// COMMAND
// --------------------

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "coinflip"
            )

            .setDescription(
                "Bet on heads or tails"
            )


            // --------------------
            // BET
            // --------------------

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
            )


            // --------------------
            // CHOICE
            // --------------------

            .addStringOption(
                option =>
                    option

                        .setName(
                            "choice"
                        )

                        .setDescription(
                            "Heads or tails"
                        )

                        .setRequired(
                            true
                        )

                        .addChoices(
                            {
                                name: "🪙 Heads",
                                value: "heads"
                            },
                            {
                                name: "🪙 Tails",
                                value: "tails"
                            }
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


            const choice =
                interaction.options
                    .getString(
                        "choice"
                    );


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
            // FLIP
            // --------------------

            const result =
                flipCoin();


            // --------------------
            // WIN
            // --------------------

            if (
                result ===
                choice
            ) {

                const payout =
                    Math.floor(
                        bet *
                        PAYOUT_MULTIPLIER
                    );


                /*
                    Return the original stake
                    without garnishment.
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
                    "coinflip",
                    bet,
                    payout
                );


                const newBalance =
                    getBalance(
                        guildId,
                        userId
                    );


                let message =

                    `🪙 **COIN FLIP** 🪙\n\n` +

                    `You chose: **${choice.toUpperCase()}**\n\n` +

                    `The coin landed on...\n\n` +

                    `🎉 **${result.toUpperCase()}!** 🎉\n\n` +

                    `You won!\n` +

                    `Bet: **$${bet.toLocaleString()}**\n` +

                    `Payout: **$${payout.toLocaleString()}**\n`;


                if (
                    garnished > 0
                ) {

                    message +=

                        `🦈 Collections took **$${garnished.toLocaleString()}** from your profit.\n`;
                }


                message +=

                    `Balance: **$${newBalance.toLocaleString()}**`;


                await interaction.reply(
                    message
                );


                // --------------------
                // BIG BET ANNOUNCEMENT
                // --------------------

                if (
                    bet >= 5000
                ) {

                    await sendAnnouncement(

                        interaction.client,

                        guildId,

                        `🪙💰 **BIG COIN FLIP WIN!** 💰🪙\n\n` +

                        `<@${userId}> risked **$${bet.toLocaleString()}** on **${choice.toUpperCase()}** and won!\n\n` +

                        `Payout: **$${payout.toLocaleString()}**`
                    );
                }


                await maybeTriggerRandomEvent(
                    interaction
                );


                return;
            }


            // --------------------
            // LOSS
            // --------------------

            recordGamble(
                guildId,
                userId,
                "coinflip",
                bet,
                0
            );


            const newBalance =
                getBalance(
                    guildId,
                    userId
                );


            await interaction.reply(

                `🪙 **COIN FLIP** 🪙\n\n` +

                `You chose: **${choice.toUpperCase()}**\n\n` +

                `The coin landed on...\n\n` +

                `💀 **${result.toUpperCase()}!**\n\n` +

                `You lost **$${bet.toLocaleString()}**.\n` +

                `Balance: **$${newBalance.toLocaleString()}**`
            );


            await maybeTriggerRandomEvent(
                interaction
            );
        }
};