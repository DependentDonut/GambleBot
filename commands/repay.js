const { SlashCommandBuilder } = require("discord.js");

const {
    getBalance,
    changeBalance
} = require("../utils/economy");

const {
    getLoan,
    repayLoan
} = require("../utils/loans");

const {
    recordLoanRepayment
} = require("../utils/credit");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("repay")
        .setDescription("Make a payment toward your loan")

        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount you want to repay")
                .setRequired(true)
                .setMinValue(1)
        ),


    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        const amount =
            interaction.options.getInteger("amount");


        // --------------------
        // CHECK FOR ACTIVE LOAN
        // --------------------

        const loan =
            getLoan(
                guildId,
                userId
            );


        if (!loan) {
            await interaction.reply(
                "You don't currently have an active loan."
            );

            return;
        }


        // --------------------
        // CHECK PLAYER BALANCE
        // --------------------

        const balance =
            getBalance(
                guildId,
                userId
            );


        if (balance <= 0) {
            await interaction.reply(
                "You don't have any money available to make a payment."
            );

            return;
        }


        if (amount > balance) {
            await interaction.reply(
                `You only have **$${balance.toLocaleString()}** available.`
            );

            return;
        }


        // Never charge more than the remaining debt
        const actualPayment =
            Math.min(
                amount,
                loan.debt
            );


        // --------------------
        // REMOVE MONEY
        // --------------------

        changeBalance(
            guildId,
            userId,
            -actualPayment
        );


        // --------------------
        // PAY LOAN
        // --------------------

        const result =
            repayLoan(
                guildId,
                userId,
                actualPayment
            );


        const newBalance =
            getBalance(
                guildId,
                userId
            );


        // --------------------
        // LOAN FULLY PAID
        // --------------------

        if (result.paidOff) {

            const newCreditScore =
                recordLoanRepayment(
                    guildId,
                    userId,
                    result.lender,
                    result.wasInCollections
                );


            await interaction.reply(
                `✅ **LOAN PAID OFF**\n\n` +

                `Payment: **$${result.payment.toLocaleString()}**\n` +
                `Remaining Debt: **$0**\n` +
                `Balance: **$${newBalance.toLocaleString()}**\n\n` +

                `New Credit Score: **${newCreditScore}**`
            );

            return;
        }


        // --------------------
        // PARTIAL PAYMENT
        // --------------------

        await interaction.reply(
            `💵 **PAYMENT ACCEPTED**\n\n` +

            `Payment: **$${result.payment.toLocaleString()}**\n` +
            `Remaining Debt: **$${result.remainingDebt.toLocaleString()}**\n` +
            `Balance: **$${newBalance.toLocaleString()}**\n\n` +

            `Interest Events: **${loan.interestEventsApplied}/${loan.maxInterestEvents}**`
        );
    }
};