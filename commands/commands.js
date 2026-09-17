const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");


module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("commands")

            .setDescription(
                "View all available bot commands"
            ),


    execute:
        async function(interaction) {

            const embed =
                new EmbedBuilder()

                    .setTitle(
                        "🎰 GambleBot Commands"
                    )

                    .setDescription(
                        "Here are the commands currently available."
                    )


                    // --------------------
                    // CASINO GAMES
                    // --------------------

                    .addFields({

                        name:
                            "🎲 Casino Games",

                        value:
                            "**`/slots bet:`** Play the slot machine\n" +

                            "**`/blackjack bet:`** Play blackjack against the dealer\n" +

                            "**`/ridethebus bet:`** Survive all four Ride the Bus stages\n" +

                            "**`/horsebets`** View horse odds and place a race bet\n" +

                            "**`/crash bet:`** Cash out before the multiplier crashes\n" +

                            "**`/coinflip bet: choice:`** Bet on heads or tails\n" +

                            "**`/lottery buy`** Buy a lottery ticket\n" +

                            "**`/lottery status`** View the current lottery"
                    })


                    // --------------------
                    // MONEY
                    // --------------------

                    .addFields({

                        name:
                            "💰 Money & Economy",

                        value:
                            "**`/balance`** Check your cash balance\n" +

                            "**`/work`** Earn money when you're broke\n" +

                            "**`/pay user: amount:`** Send money to another player\n" +

                            "**`/networth`** View your balance minus debt\n" +

                            "**`/jackpot`** View the current progressive slot jackpot"
                    })


                    // --------------------
                    // LOANS
                    // --------------------

                    .addFields({

                        name:
                            "🏦 Loans & Credit",

                        value:
                            "**`/loan lender: amount:`** Borrow from the bank or loan shark\n" +

                            "**`/repay amount:`** Make a loan payment\n" +

                            "**`/credit`** View your credit score and loan information"
                    })


                    // --------------------
                    // CRIME
                    // --------------------

                    .addFields({

                        name:
                            "🥷 Crime",

                        value:
                            "**`/rob user:`** Attempt to rob another player"
                    })


                    // --------------------
                    // STATS
                    // --------------------

                    .addFields({

                        name:
                            "📊 Gambling Stats",

                        value:
                            "**`/session`** View your current gambling session stats\n" +

                            "**`/sessionreset`** Reset your gambling session stats"
                    })


                    // --------------------
                    // SERVER
                    // --------------------

                    .addFields({

                        name:
                            "⚙️ Server",

                        value:
                            "**`/announcements set`** Set the casino announcement channel\n" +

                            "**`/announcements status`** View the announcement channel\n" +

                            "**`/announcements disable`** Disable announcements\n\n" +

                            "*Announcement settings require Manage Server permission.*"
                    })


                    .setFooter({
                        text:
                            "All money in GambleBot is fake in-game currency."
                    });


            await interaction.reply({
                embeds: [
                    embed
                ]
            });
        }
};