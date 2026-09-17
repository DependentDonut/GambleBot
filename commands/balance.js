const { SlashCommandBuilder } = require("discord.js");
const { getBalance } = require("../utils/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Shows your current balance"),

        execute: async function(interaction) {
            const guildId = interaction.guildId;
            const userId = interaction.user.id;

            const balance = getBalance(guildId, userId);

            await interaction.reply(
                `Your balance is $${balance.toLocaleString()}`
            );
        }
};
