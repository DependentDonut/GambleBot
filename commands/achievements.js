const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const {
    ACHIEVEMENTS,
    getAchievementProfile,
    getSelectedTitle
} = require("../utils/achievements");


module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "achievements"
            )

            .setDescription(
                "View achievements and titles"
            )

            .addUserOption(
                option =>
                    option

                        .setName(
                            "user"
                        )

                        .setDescription(
                            "View another player's achievements"
                        )

                        .setRequired(
                            false
                        )
            ),


    execute:
        async function(
            interaction
        ) {

            const target =
                interaction.options
                    .getUser("user") ||
                interaction.user;


            const profile =
                getAchievementProfile(
                    interaction.guildId,
                    target.id
                );


            const selectedTitle =
                getSelectedTitle(
                    interaction.guildId,
                    target.id
                );


            const total =
                Object.keys(
                    ACHIEVEMENTS
                ).length;


            let achievementText =
                "";


            for (
                const [
                    id,
                    achievement
                ]
                of Object.entries(
                    ACHIEVEMENTS
                )
            ) {

                const unlocked =
                    profile.unlocked.includes(
                        id
                    );


                achievementText +=

                    `${unlocked ? "✅" : "🔒"} ` +

                    `${achievement.emoji} ` +

                    `**${achievement.name}**\n` +

                    `${achievement.description}\n\n`;
            }


            const embed =
                new EmbedBuilder()

                    .setTitle(
                        `🏆 ${target.username}'s Achievements`
                    )

                    .setDescription(
                        `Unlocked: **${profile.unlocked.length}/${total}**\n` +

                        `Equipped Title: **${selectedTitle ? selectedTitle.name : "None"}**\n\n` +

                        achievementText
                    );


            await interaction.reply({
                embeds: [
                    embed
                ]
            });
        }
};