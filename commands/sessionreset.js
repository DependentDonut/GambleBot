const { SlashCommandBuilder } = require("discord.js");

const {
    resetSession
} = require("../utils/sessions");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("sessionreset")
        .setDescription("Reset your gambling session stats"),

    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        resetSession(
            guildId,
            userId
        );

        await interaction.reply(
            "🔄 Your gambling session has been reset."
        );
    }
};