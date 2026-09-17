const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hello")
        .setDescription("Says hello to someone")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("The name of the person")
                .setRequired(true)
        ),

    execute: async function(interaction) {
        const name = interaction.options.getString("name");

        await interaction.reply(`Hello, ${name}!`);
    }
};