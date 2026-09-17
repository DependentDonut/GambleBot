const { SlashCommandBuilder } = require("discord.js");
const crypto = require("crypto");

const {
    getBalance,
    changeBalance
} = require("../utils/economy");

const {
    processIncome
} = require("../utils/income");

const {
    addToJackpot,
    claimJackpot
} = require("../utils/jackpot");

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
// SLOT SETTINGS
// --------------------

const MAX_BET = 10000;

const symbols = [
    { symbol: "🍒", weight: 21 },
    { symbol: "🍋", weight: 20 },
    { symbol: "🍊", weight: 17 },
    { symbol: "🍇", weight: 16 },
    { symbol: "🔔", weight: 12 },
    { symbol: "💎", weight: 11 },
    { symbol: "7️⃣", weight: 3 }
];


// --------------------
// SPIN ONE REEL
// --------------------

function spinReel() {
    const roll = crypto.randomInt(100);

    let totalWeight = 0;

    for (const item of symbols) {
        totalWeight += item.weight;

        if (roll < totalWeight) {
            return item.symbol;
        }
    }
}


// --------------------
// COMMAND
// --------------------

module.exports = {
    data: new SlashCommandBuilder()
        .setName("slots")
        .setDescription("Play the slot machine")

        .addIntegerOption(option =>
            option
                .setName("bet")
                .setDescription(`Amount of money to bet, max $${MAX_BET}`)
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(MAX_BET)
        ),


    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        const bet =
            interaction.options.getInteger("bet");


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
                `You don't have enough money. ` +
                `Your balance is **$${balance.toLocaleString()}**.`
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
        // ADD TO JACKPOT
        // --------------------

        const jackpotInfo =
            addToJackpot(
                guildId,
                bet
            );


        // --------------------
        // SPIN
        // --------------------

        const reel1 = spinReel();
        const reel2 = spinReel();
        const reel3 = spinReel();


        // --------------------
        // 777 JACKPOT
        // --------------------

        if (
            reel1 === "7️⃣" &&
            reel2 === "7️⃣" &&
            reel3 === "7️⃣"
        ) {

            const jackpot =
                claimJackpot(guildId);


            // Record session stats
            recordGamble(
                guildId,
                userId,
                "slots",
                bet,
                jackpot
            );


            /*
                The jackpot is the total payout.

                Return the portion of the payout
                representing the player's original stake
                without garnishment.
            */

            const returnedStake =
                Math.min(
                    bet,
                    jackpot
                );


            changeBalance(
                guildId,
                userId,
                returnedStake
            );


            /*
                Anything beyond the returned stake
                counts as gambling profit and can
                be garnished by collections.
            */

            const profit =
                jackpot - returnedStake;


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


            const newBalance =
                getBalance(
                    guildId,
                    userId
                );


            let message =
                `🎰 **${reel1} | ${reel2} | ${reel3}** 🎰\n\n` +

                `💰💰💰 **JACKPOT!!!** 💰💰💰\n\n` +

                `Jackpot Won: **$${jackpot.toLocaleString()}**\n`;


            await sendAnnouncement(
                interaction.client,
                guildId,
                `🚨💰 **SLOT JACKPOT HIT!** 💰🚨\n\n` +
                `<@${userId}> just hit **7️⃣ | 7️⃣ | 7️⃣**!\n\n` +
                `Jackpot: **$${jackpot.toLocaleString()}**\n` +
                `The progressive jackpot has reset to **$5,000**.`
            );

            if (garnished > 0) {

                message +=
                    `🦈 Collections took **$${garnished.toLocaleString()}**.\n`;
            }


            message +=
                `Balance: **$${newBalance.toLocaleString()}**\n\n` +

                `The jackpot has reset to **$5,000**.`;


            await interaction.reply(message);

            await maybeTriggerRandomEvent(interaction);

            return;
        }


        // --------------------
        // NORMAL PAYOUTS
        // --------------------

        let multiplier = 0;


        if (
            reel1 === "💎" &&
            reel2 === "💎" &&
            reel3 === "💎"
        ) {

            multiplier = 10;
        }

        else if (
            reel1 === reel2 &&
            reel2 === reel3
        ) {

            multiplier = 5;
        }

        else if (
            reel1 === reel2 ||
            reel1 === reel3 ||
            reel2 === reel3
        ) {

            multiplier = 2;
        }


        // --------------------
        // LOSS
        // --------------------

        if (multiplier === 0) {

            recordGamble(
                guildId,
                userId,
                "slots",
                bet,
                0
            );


            const newBalance =
                getBalance(
                    guildId,
                    userId
                );


            await interaction.reply(
                `🎰 ${reel1} | ${reel2} | ${reel3} 🎰\n\n` +

                `You lost **$${bet.toLocaleString()}**.\n` +

                `Balance: **$${newBalance.toLocaleString()}**\n\n` +

                `💰 Jackpot: **$${jackpotInfo.jackpot.toLocaleString(
                    undefined,
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                )}**`
            );


            await maybeTriggerRandomEvent(interaction);

            return;
        }


        // --------------------
        // WIN
        // --------------------

        const payout =
            bet * multiplier;


        // Record gambling session
        recordGamble(
            guildId,
            userId,
            "slots",
            bet,
            payout
        );


        /*
            Example:

            Bet = $100
            2x payout = $200

            $100 = returned stake
            $100 = actual profit

            Collections only garnishes
            the $100 profit.
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


        const newBalance =
            getBalance(
                guildId,
                userId
            );


        let resultMessage =
            `🎰 ${reel1} | ${reel2} | ${reel3} 🎰\n\n` +

            `You won **${multiplier}x**!\n` +

            `Payout: **$${payout.toLocaleString()}**\n`;


        if (income.garnished > 0) {

            resultMessage +=
                `🦈 Collections took **$${income.garnished.toLocaleString()}** from your profit.\n`;
        }


        resultMessage +=
            `Balance: **$${newBalance.toLocaleString()}**\n\n` +

            `💰 Jackpot: **$${jackpotInfo.jackpot.toLocaleString(
                undefined,
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}**`;


        await interaction.reply(
            resultMessage
        );


        await maybeTriggerRandomEvent(interaction);
    }
};