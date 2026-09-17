const { SlashCommandBuilder } = require("discord.js");

const {
    getSession
} = require("../utils/sessions");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("session")
        .setDescription("View your current gambling session"),


    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;


        const session =
            getSession(
                guildId,
                userId
            );


        const sessionLength =
            Date.now() - session.startedAt;


        const minutes =
            Math.floor(
                sessionLength / 1000 / 60
            );


        let profitText;


        if (session.netProfit >= 0) {
            profitText =
                `+$${session.netProfit.toLocaleString()}`;
        }
        else {
            profitText =
                `-$${Math.abs(session.netProfit).toLocaleString()}`;
        }


        await interaction.reply(
            `🎰 **GAMBLING SESSION**\n\n` +

            `Games Played: **${session.gamesPlayed}**\n` +
            `Wins: **${session.wins}**\n` +
            `Losses: **${session.losses}**\n` +
            `Pushes: **${session.pushes}**\n\n` +

            `Total Wagered: **$${session.totalWagered.toLocaleString()}**\n` +
            `Total Payout: **$${session.totalPayout.toLocaleString()}**\n` +
            `Net Profit/Loss: **${profitText}**\n` +
            `Biggest Win: **$${session.biggestWin.toLocaleString()}**\n\n` +

            `Session Length: **${minutes} minute(s)**`
        );
    }
};