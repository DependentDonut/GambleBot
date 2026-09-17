const { SlashCommandBuilder } = require("discord.js");

const {
    getBalance,
    changeBalance
} = require("../utils/economy");

const {
    createLoan,
    getLoan
} = require("../utils/loans");

const {
    getCreditProfile,
    getBankRate,
    getLoanSharkRate
} = require("../utils/credit");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("loan")
        .setDescription("Borrow money when you're broke")

        .addStringOption(option =>
            option
                .setName("lender")
                .setDescription("Who do you want to borrow from?")
                .setRequired(true)
                .addChoices(
                    {
                        name: "🏦 Bank",
                        value: "bank"
                    },
                    {
                        name: "🦈 Loan Shark",
                        value: "shark"
                    }
                )
        )

        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount you want to borrow")
                .setRequired(true)
                .setMinValue(100)
                .setMaxValue(1000)
        ),


    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        const lender =
            interaction.options.getString("lender");

        const amount =
            interaction.options.getInteger("amount");


        // --------------------
        // CHECK BALANCE
        // --------------------

        const balance =
            getBalance(
                guildId,
                userId
            );


        if (balance > 100) {
            await interaction.reply(
                `You still have **$${balance.toLocaleString()}**. ` +
                `Come back when you're actually broke.`
            );

            return;
        }


        // --------------------
        // CHECK FOR EXISTING LOAN
        // --------------------

        const existingLoan =
            getLoan(
                guildId,
                userId
            );


        if (existingLoan) {
            await interaction.reply(
                `You already have an active loan.\n\n` +
                `Lender: **${existingLoan.lender === "bank" ? "🏦 Bank" : "🦈 Loan Shark"}**\n` +
                `Debt: **$${existingLoan.debt.toLocaleString()}**\n` +
                `Interest events: **${existingLoan.interestEventsApplied}/${existingLoan.maxInterestEvents}**`
            );

            return;
        }


        // --------------------
        // GET CREDIT PROFILE
        // --------------------

        const credit =
            getCreditProfile(
                guildId,
                userId
            );


        const score = credit.score;


        // --------------------
        // BANK LOAN
        // --------------------

        if (lender === "bank") {

            const interestRate =
                getBankRate(score);


            if (interestRate === null) {
                await interaction.reply(
                    `🏦 **BANK LOAN DENIED**\n\n` +
                    `Credit Score: **${score}**\n\n` +
                    `The bank requires a credit score of at least **650**.\n` +
                    `You may need to visit the loan shark.`
                );

                return;
            }


            const loan =
                createLoan(
                    guildId,
                    userId,
                    "bank",
                    amount,
                    interestRate,
                    3
                );


            if (!loan) {
                await interaction.reply(
                    "Something went wrong while creating the loan."
                );

                return;
            }


            changeBalance(
                guildId,
                userId,
                amount
            );


            const newBalance =
                getBalance(
                    guildId,
                    userId
                );


            await interaction.reply(
                `🏦 **BANK LOAN APPROVED**\n\n` +

                `Credit Score: **${score}**\n` +
                `Amount Borrowed: **$${amount.toLocaleString()}**\n` +
                `Interest Rate: **${(interestRate * 100).toFixed(1)}%**\n` +
                `Interest Applied: **Every 3 days**\n` +
                `Maximum Interest Events: **7**\n\n` +

                `Current Debt: **$${loan.debt.toLocaleString()}**\n` +
                `Balance: **$${newBalance.toLocaleString()}**`
            );

            return;
        }


        // --------------------
        // LOAN SHARK
        // --------------------

        if (lender === "shark") {

            const interestRate =
                getLoanSharkRate(score);


            const loan =
                createLoan(
                    guildId,
                    userId,
                    "shark",
                    amount,
                    interestRate,
                    1
                );


            if (!loan) {
                await interaction.reply(
                    "Something went wrong while creating the loan."
                );

                return;
            }


            changeBalance(
                guildId,
                userId,
                amount
            );


            const newBalance =
                getBalance(
                    guildId,
                    userId
                );


            await interaction.reply(
                `🦈 **LOAN SHARK APPROVED**\n\n` +

                `Credit Score: **${score}**\n` +
                `Amount Borrowed: **$${amount.toLocaleString()}**\n` +
                `Interest Rate: **${(interestRate * 100).toFixed(0)}% DAILY**\n` +
                `Maximum Interest Events: **7**\n\n` +

                `Current Debt: **$${loan.debt.toLocaleString()}**\n` +
                `Balance: **$${newBalance.toLocaleString()}**\n\n` +

                `You have been warned.`
            );
        }
    }
};