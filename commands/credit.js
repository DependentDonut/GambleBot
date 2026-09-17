const { SlashCommandBuilder } = require("discord.js");

const {
    getCreditProfile,
    getBankRate,
    getLoanSharkRate
} = require("../utils/credit");

const {
    getLoan
} = require("../utils/loans");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("credit")
        .setDescription("View your credit report and loan status"),


    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;


        // --------------------
        // GET CREDIT PROFILE
        // --------------------

        const profile =
            getCreditProfile(
                guildId,
                userId
            );


        const score = profile.score;


        // --------------------
        // GET CURRENT RATES
        // --------------------

        const bankRate =
            getBankRate(score);


        const sharkRate =
            getLoanSharkRate(score);


        // --------------------
        // CHECK ACTIVE LOAN
        // --------------------

        const loan =
            getLoan(
                guildId,
                userId
            );


        // --------------------
        // BANK STATUS
        // --------------------

        let bankStatus;

        if (bankRate === null) {
            bankStatus =
                "❌ DENIED";
        }
        else {
            bankStatus =
                `✅ APPROVED at ${(bankRate * 100).toFixed(1)}%`;
        }


        // --------------------
        // ACTIVE LOAN INFO
        // --------------------

        let loanInfo;


        if (!loan) {
            loanInfo =
                "No active loan.";
        }
        else {

            const lenderName =
                loan.lender === "bank"
                    ? "🏦 Bank"
                    : "🦈 Loan Shark";


            loanInfo =
                `Lender: **${lenderName}**\n` +
                `Original Loan: **$${loan.originalAmount.toLocaleString()}**\n` +
                `Current Debt: **$${loan.debt.toLocaleString()}**\n` +
                `Interest Rate: **${(loan.interestRate * 100).toFixed(1)}%**\n` +
                `Interest Interval: **Every ${loan.interestIntervalDays} day(s)**\n` +
                `Interest Events: **${loan.interestEventsApplied}/${loan.maxInterestEvents}**\n` +
                `Collections: **${loan.inCollections ? "YES" : "No"}**`;
        }


        // --------------------
        // SEND CREDIT REPORT
        // --------------------

        await interaction.reply(
            `💳 **CREDIT REPORT**\n\n` +

            `Credit Score: **${score}**\n` +
            `Loans Repaid: **${profile.loansRepaid}**\n` +
            `Bank Loans Repaid: **${profile.bankLoansRepaid}**\n` +
            `Shark Loans Repaid: **${profile.sharkLoansRepaid}**\n` +
            `Collections: **${profile.collections}**\n\n` +

            `🏦 Bank Status: **${bankStatus}**\n` +
            `🦈 Loan Shark Rate: **${(sharkRate * 100).toFixed(0)}% per day**\n\n` +

            `💰 **ACTIVE LOAN**\n` +
            `${loanInfo}`
        );
    }
};