const {
    SlashCommandBuilder
} = require("discord.js");

const {
    getUnlockedTitles,
    getSelectedTitle,
    setTitle,
    clearTitle
} = require("../utils/achievements");


module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "title"
            )

            .setDescription(
                "Manage your achievement title"
            )


            .addSubcommand(
                subcommand =>
                    subcommand

                        .setName(
                            "list"
                        )

                        .setDescription(
                            "View your unlocked titles"
                        )
            )


            .addSubcommand(
                subcommand =>
                    subcommand

                        .setName(
                            "set"
                        )

                        .setDescription(
                            "Equip an unlocked title"
                        )

                        .addStringOption(
                            option =>
                                option

                                    .setName(
                                        "title"
                                    )

                                    .setDescription(
                                        "Choose a title"
                                    )

                                    .setRequired(
                                        true
                                    )

                                    .addChoices(
                                        {
                                            name: "Gambler",
                                            value: "gambler"
                                        },
                                        {
                                            name: "High Roller",
                                            value: "high_roller"
                                        },
                                        {
                                            name: "Casino Regular",
                                            value: "casino_regular"
                                        },
                                        {
                                            name: "Jackpot Junkie",
                                            value: "jackpot_junkie"
                                        },
                                        {
                                            name: "Card Shark",
                                            value: "card_shark"
                                        },
                                        {
                                            name: "Double or Nothing",
                                            value: "double_or_nothing"
                                        },
                                        {
                                            name: "Bus Driver",
                                            value: "bus_driver"
                                        },
                                        {
                                            name: "Dark Horse",
                                            value: "dark_horse"
                                        },
                                        {
                                            name: "Adrenaline Junkie",
                                            value: "adrenaline_junkie"
                                        },
                                        {
                                            name: "Coin Toss King",
                                            value: "coin_toss_king"
                                        },
                                        {
                                            name: "Lucky Six",
                                            value: "lucky_six"
                                        },
                                        {
                                            name: "Stick-Up Kid",
                                            value: "stick_up_kid"
                                        },
                                        {
                                            name: "Debt Free",
                                            value: "debt_free"
                                        },
                                        {
                                            name: "Collections Regular",
                                            value: "collections_regular"
                                        },
                                        {
                                            name: "850 Club",
                                            value: "850_club"
                                        }
                                    )
                        )
            )


            .addSubcommand(
                subcommand =>
                    subcommand

                        .setName(
                            "clear"
                        )

                        .setDescription(
                            "Remove your equipped title"
                        )
            ),


    execute:
        async function(
            interaction
        ) {

            const guildId =
                interaction.guildId;


            const userId =
                interaction.user.id;


            const subcommand =
                interaction.options
                    .getSubcommand();


            // --------------------
            // LIST
            // --------------------

            if (
                subcommand ===
                "list"
            ) {

                const titles =
                    getUnlockedTitles(
                        guildId,
                        userId
                    );


                const selected =
                    getSelectedTitle(
                        guildId,
                        userId
                    );


                if (
                    titles.length === 0
                ) {

                    await interaction.reply(
                        "You haven't unlocked any titles yet."
                    );


                    return;
                }


                let text =
                    `🏷️ **YOUR TITLES**\n\n`;


                for (
                    const title
                    of titles
                ) {

                    const equipped =
                        selected &&
                        selected.id ===
                        title.id;


                    text +=
                        `${equipped ? "⭐" : "•"} **${title.name}**\n`;
                }


                text +=
                    `\n⭐ = equipped`;


                await interaction.reply(
                    text
                );


                return;
            }


            // --------------------
            // SET
            // --------------------

            if (
                subcommand ===
                "set"
            ) {

                const titleId =
                    interaction.options
                        .getString(
                            "title"
                        );


                const title =
                    setTitle(
                        guildId,
                        userId,
                        titleId
                    );


                if (!title) {

                    await interaction.reply(
                        "🔒 You haven't unlocked that title yet."
                    );


                    return;
                }


                await interaction.reply(
                    `🏷️ Equipped title: **${title.name}**`
                );


                return;
            }


            // --------------------
            // CLEAR
            // --------------------

            clearTitle(
                guildId,
                userId
            );


            await interaction.reply(
                "Your equipped title has been removed."
            );
        }
};