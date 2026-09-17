const {
    SlashCommandBuilder
} = require("discord.js");

const {
    getBalance,
    changeBalance
} = require("../utils/economy");

const {
    processIncome
} = require("../utils/income");

const {
    TICKET_PRICE,
    getLottery,
    buyTicket,
    drawLottery,
    isDrawDue,
    formatNumber
} = require("../utils/lottery");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("lottery")
        .setDescription("Play the server lottery")

        .addSubcommand(subcommand =>
            subcommand
                .setName("buy")
                .setDescription(
                    "Buy a lottery ticket"
                )

                .addStringOption(option =>
                    option
                        .setName("numbers")
                        .setDescription(
                            "Choose 6 unique numbers from 01-49"
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(
                    "View the current lottery"
                )
        ),


    execute: async function(interaction) {
        const guildId =
            interaction.guildId;

        const userId =
            interaction.user.id;


        // --------------------
        // CHECK FOR DRAW
        // --------------------

        if (isDrawDue(guildId)) {

            const result =
                drawLottery(guildId);


            const numberText =
                result.winningNumbers
                    .map(formatNumber)
                    .join(" - ");


            // --------------------
            // JACKPOT WON
            // --------------------

            if (result.jackpotWon) {

                let winnerText = "";


                for (
                    const ticket
                    of result.winners
                ) {

                    const income =
                        processIncome(
                            guildId,
                            ticket.userId,
                            result.prizePerTicket,
                            "lottery"
                        );


                    winnerText +=
                        `<@${ticket.userId}> won **$${result.prizePerTicket.toLocaleString()}**`;


                    if (income.garnished > 0) {

                        winnerText +=
                            ` and collections took **$${income.garnished.toLocaleString()}**`;
                    }


                    winnerText += ".\n";
                }

                await sendAnnouncement(
                    interaction.client,
                    guildId,
                    `🎟️💰 **LOTTERY JACKPOT WINNER!** 💰🎟️\n\n` +
                    `Winning Numbers:\n` +
                    `**${numberText}**\n\n` +
                    winnerText
                );


                await interaction.reply(
                    `🎟️ **LOTTERY DRAWING** 🎟️\n\n` +

                    `Winning Numbers:\n` +
                    `**${numberText}**\n\n` +

                    `🎉 **JACKPOT WINNER!**\n\n` +

                    winnerText +

                    `\nThe jackpot has reset to **$1,000**.`
                );


                return;
            }


            // --------------------
            // NO WINNER
            // --------------------

            const lottery =
                getLottery(guildId);


            await interaction.reply(
                `🎟️ **LOTTERY DRAWING** 🎟️\n\n` +

                `Winning Numbers:\n` +
                `**${numberText}**\n\n` +

                `Nobody matched all six numbers.\n\n` +

                `💰 The jackpot rolls over!\n` +
                `Current Jackpot: **$${lottery.pot.toLocaleString()}**`
            );


            return;
        }


        const subcommand =
            interaction.options.getSubcommand();


        // --------------------
        // BUY TICKET
        // --------------------

        if (subcommand === "buy") {

            const input =
                interaction.options.getString(
                    "numbers"
                );


            /*
                Allow:

                05 12 19 27 38 44

                or:

                05,12,19,27,38,44
            */

            const numbers =
                input
                    .split(/[\s,]+/)
                    .filter(
                        value =>
                            value.length > 0
                    )
                    .map(Number);


            if (
                numbers.length !== 6 ||
                numbers.some(
                    number =>
                        !Number.isInteger(number) ||
                        number < 1 ||
                        number > 49
                ) ||
                new Set(numbers).size !== 6
            ) {

                await interaction.reply(
                    `Choose exactly **6 unique numbers from 01 through 49**.\n\n` +

                    `Example:\n` +
                    `\`05 12 19 27 38 44\``
                );


                return;
            }


            const balance =
                getBalance(
                    guildId,
                    userId
                );


            if (balance < TICKET_PRICE) {

                await interaction.reply(
                    `A lottery ticket costs **$${TICKET_PRICE}**.\n` +

                    `Your balance is **$${balance.toLocaleString()}**.`
                );


                return;
            }


            changeBalance(
                guildId,
                userId,
                -TICKET_PRICE
            );


            const ticket =
                buyTicket(
                    guildId,
                    userId,
                    numbers
                );


            const newBalance =
                getBalance(
                    guildId,
                    userId
                );


            const numberText =
                ticket.numbers
                    .map(formatNumber)
                    .join(" - ");


            await interaction.reply(
                `🎟️ **LOTTERY TICKET PURCHASED**\n\n` +

                `Your Numbers:\n` +
                `**${numberText}**\n\n` +

                `Ticket Price: **$${TICKET_PRICE}**\n` +

                `Current Jackpot: **$${ticket.pot.toLocaleString()}**\n` +

                `Balance: **$${newBalance.toLocaleString()}**`
            );


            return;
        }


        // --------------------
        // STATUS
        // --------------------

        if (subcommand === "status") {

            const lottery =
                getLottery(guildId);


            const userTickets =
                lottery.tickets.filter(
                    ticket =>
                        ticket.userId === userId
                );


            const timeRemaining =
                Math.max(
                    0,
                    lottery.drawAt -
                    Date.now()
                );


            const hours =
                Math.floor(
                    timeRemaining /
                    1000 /
                    60 /
                    60
                );


            const minutes =
                Math.floor(
                    (
                        timeRemaining /
                        1000 /
                        60
                    ) % 60
                );


            let ticketText;


            if (userTickets.length === 0) {

                ticketText =
                    "You have no tickets for this drawing.";
            }
            else {

                ticketText =
                    userTickets
                        .map(
                            (ticket, index) => {

                                const numbers =
                                    ticket.numbers
                                        .map(formatNumber)
                                        .join(" - ");


                                return (
                                    `Ticket ${index + 1}: ${numbers}`
                                );
                            }
                        )
                        .join("\n");
            }


            await interaction.reply(
                `🎟️ **SERVER LOTTERY** 🎟️\n\n` +

                `Jackpot: **$${lottery.pot.toLocaleString()}**\n` +

                `Ticket Price: **$${TICKET_PRICE}**\n` +

                `Tickets Sold: **${lottery.tickets.length}**\n\n` +

                `**Your Tickets**\n` +
                `${ticketText}\n\n` +

                `Next Drawing: **${hours}h ${minutes}m**`
            );
        }
    }
};