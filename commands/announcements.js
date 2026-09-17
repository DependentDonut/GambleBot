const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const {
    setAnnouncementChannel,
    getAnnouncementChannel,
    disableAnnouncements
} = require("../utils/announcements");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("announcements")
        .setDescription(
            "Configure casino announcements"
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )


        // --------------------
        // SET
        // --------------------

        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setDescription(
                    "Choose the announcement channel"
                )

                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "Channel for casino announcements"
                        )
                        .addChannelTypes(
                            ChannelType.GuildText
                        )
                        .setRequired(true)
                )
        )


        // --------------------
        // STATUS
        // --------------------

        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(
                    "View the current announcement channel"
                )
        )


        // --------------------
        // DISABLE
        // --------------------

        .addSubcommand(subcommand =>
            subcommand
                .setName("disable")
                .setDescription(
                    "Disable casino announcements"
                )
        ),


    execute: async function(interaction) {
        const guildId =
            interaction.guildId;

        const subcommand =
            interaction.options.getSubcommand();


        // --------------------
        // SET CHANNEL
        // --------------------

        if (subcommand === "set") {

            const channel =
                interaction.options.getChannel(
                    "channel"
                );


            setAnnouncementChannel(
                guildId,
                channel.id
            );


            await interaction.reply(
                `📢 Casino announcements will now be sent to ${channel}.`
            );

            return;
        }


        // --------------------
        // STATUS
        // --------------------

        if (subcommand === "status") {

            const channelId =
                getAnnouncementChannel(
                    guildId
                );


            if (!channelId) {

                await interaction.reply(
                    "📢 Casino announcements are currently disabled."
                );

                return;
            }


            await interaction.reply(
                `📢 Casino announcements are being sent to <#${channelId}>.`
            );

            return;
        }


        // --------------------
        // DISABLE
        // --------------------

        if (subcommand === "disable") {

            disableAnnouncements(
                guildId
            );


            await interaction.reply(
                "🔇 Casino announcements have been disabled."
            );
        }
    }
};