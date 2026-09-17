const { SlashCommandBuilder } = require("discord.js");

const {
    getBalance
} = require("../utils/economy");

const {
    getDebt
} = require("../utils/loans");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("networth")
        .setDescription("View your current net worth"),


    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;


        const balance =
            getBalance(
                guildId,
                userId
            );


        const debt =
            getDebt(
                guildId,
                userId
            );


        const netWorth =
            balance - debt;


        await interaction.reply(
            `💰 **NET WORTH**\n\n` +

            `Cash: **$${balance.toLocaleString()}**\n` +
            `Debt: **-$${debt.toLocaleString()}**\n\n` +

            `Net Worth: **$${netWorth.toLocaleString()}**`
        );
    }
};