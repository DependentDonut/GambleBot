const { SlashCommandBuilder } = require("discord.js");

const {
    getJackpot
} = require("../utils/jackpot");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("jackpot")
        .setDescription("View the current slot machine jackpot"),


    execute: async function(interaction) {
        const guildId = interaction.guildId;

        const jackpot =
            getJackpot(guildId);


        await interaction.reply(
            `🎰 **PROGRESSIVE JACKPOT** 🎰\n\n` +

            `Current Jackpot: **$${jackpot.toLocaleString(
                undefined,
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}**\n\n` +

            `Hit **7️⃣ | 7️⃣ | 7️⃣** on slots to win it all.`
        );
    }
};