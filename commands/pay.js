const { SlashCommandBuilder } = require("discord.js");

const {
    getBalance,
    changeBalance
} = require("../utils/economy");

const {
    processIncome
} = require("../utils/income");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("pay")
        .setDescription("Send money to another player")

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Who do you want to pay?")
                .setRequired(true)
        )

        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount of money to send")
                .setRequired(true)
                .setMinValue(1)
        ),


    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const senderId = interaction.user.id;

        const recipient =
            interaction.options.getUser("user");

        const amount =
            interaction.options.getInteger("amount");


        // --------------------
        // DON'T PAY YOURSELF
        // --------------------

        if (recipient.id === senderId) {
            await interaction.reply(
                "You can't send money to yourself."
            );

            return;
        }


        // --------------------
        // DON'T PAY BOTS
        // --------------------

        if (recipient.bot) {
            await interaction.reply(
                "You can't send money to a bot."
            );

            return;
        }


        // --------------------
        // CHECK SENDER BALANCE
        // --------------------

        const senderBalance =
            getBalance(
                guildId,
                senderId
            );


        if (amount > senderBalance) {
            await interaction.reply(
                `You don't have enough money.\n` +
                `Your balance is **$${senderBalance.toLocaleString()}**.`
            );

            return;
        }


        // --------------------
        // REMOVE MONEY FROM SENDER
        // --------------------

        const newSenderBalance =
            changeBalance(
                guildId,
                senderId,
                -amount
            );


        // --------------------
        // GIVE MONEY TO RECIPIENT
        // --------------------

        const incomeResult =
            processIncome(
                guildId,
                recipient.id,
                amount,
                "pay"
            );


        // --------------------
        // COLLECTIONS GARNISHMENT
        // --------------------

        if (incomeResult.garnished > 0) {

            await interaction.reply(
                `💸 **MONEY SENT**\n\n` +

                `<@${senderId}> sent <@${recipient.id}> **$${amount.toLocaleString()}**.\n\n` +

                `🦈 Collections intercepted **$${incomeResult.garnished.toLocaleString()}**.\n` +
                `<@${recipient.id}> received **$${incomeResult.received.toLocaleString()}**.\n\n` +

                `Your balance: **$${newSenderBalance.toLocaleString()}**\n` +
                `${recipient.username}'s balance: **$${incomeResult.newBalance.toLocaleString()}**`
            );

            return;
        }


        // --------------------
        // NORMAL TRANSFER
        // --------------------

        await interaction.reply(
            `💸 **MONEY SENT**\n\n` +

            `<@${senderId}> sent <@${recipient.id}> **$${amount.toLocaleString()}**.\n\n` +

            `Your balance: **$${newSenderBalance.toLocaleString()}**\n` +
            `${recipient.username}'s balance: **$${incomeResult.newBalance.toLocaleString()}**`
        );
    }
};