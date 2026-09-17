const { SlashCommandBuilder } = require("discord.js");
const crypto = require("crypto");

const {
    getBalance,
    changeBalance
} = require("../utils/economy");

const {
    processIncome
} = require("../utils/income");


const cooldowns = new Map();

const COOLDOWN_TIME =
    30 * 60 * 1000;

const SUCCESS_CHANCE = 40;

const MIN_TARGET_BALANCE = 250;
const VICTIM_PROTECTED_BALANCE = 100;

const MAX_STEAL = 500;
const FAILURE_FINE = 100;


module.exports = {
    data: new SlashCommandBuilder()
        .setName("rob")
        .setDescription("Attempt to rob another player")

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Who do you want to rob?")
                .setRequired(true)
        ),


    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const robberId = interaction.user.id;

        const victim =
            interaction.options.getUser("user");

        const victimId = victim.id;


        // --------------------
        // CANNOT ROB YOURSELF
        // --------------------

        if (robberId === victimId) {
            await interaction.reply(
                "You can't rob yourself."
            );

            return;
        }


        // --------------------
        // CANNOT ROB BOTS
        // --------------------

        if (victim.bot) {
            await interaction.reply(
                "You can't rob a bot."
            );

            return;
        }


        // --------------------
        // CHECK COOLDOWN
        // --------------------

        const cooldownKey =
            `${guildId}-${robberId}`;

        const lastRobbery =
            cooldowns.get(cooldownKey);


        if (lastRobbery) {
            const timePassed =
                Date.now() - lastRobbery;

            const timeRemaining =
                COOLDOWN_TIME - timePassed;


            if (timeRemaining > 0) {

                const minutesRemaining =
                    Math.ceil(
                        timeRemaining /
                        1000 /
                        60
                    );


                await interaction.reply(
                    `🚓 Lay low for **${minutesRemaining} more minute(s)** before robbing someone again.`
                );

                return;
            }
        }


        // --------------------
        // CHECK VICTIM BALANCE
        // --------------------

        const victimBalance =
            getBalance(
                guildId,
                victimId
            );


        if (
            victimBalance <
            MIN_TARGET_BALANCE
        ) {
            await interaction.reply(
                `${victim.username} only has **$${victimBalance.toLocaleString()}**.\n` +
                `They're too broke to rob.`
            );

            return;
        }


        const robberBalance =
            getBalance(
                guildId,
                robberId
            );


        // Cooldown begins once a valid robbery is attempted
        cooldowns.set(
            cooldownKey,
            Date.now()
        );


        // --------------------
        // SUCCESS ROLL
        // --------------------

        const roll =
            crypto.randomInt(100);

        const success =
            roll < SUCCESS_CHANCE;


        // --------------------
        // SUCCESS
        // --------------------

        if (success) {

            /*
                Random percentage from 10% through 25%.
            */

            const percentage =
                crypto.randomInt(
                    10,
                    26
                );


            let stolenAmount =
                Math.floor(
                    victimBalance *
                    (percentage / 100)
                );


            // Maximum robbery payout
            stolenAmount =
                Math.min(
                    stolenAmount,
                    MAX_STEAL
                );


            // Never rob victim below $100
            const maximumAvailable =
                victimBalance -
                VICTIM_PROTECTED_BALANCE;


            stolenAmount =
                Math.min(
                    stolenAmount,
                    maximumAvailable
                );


            // Remove money from victim
            changeBalance(
                guildId,
                victimId,
                -stolenAmount
            );


            // Give money to robber,
            // while allowing collections garnishment
            const income =
                processIncome(
                    guildId,
                    robberId,
                    stolenAmount,
                    "robbery"
                );


            const newVictimBalance =
                getBalance(
                    guildId,
                    victimId
                );


            let result =
                `🥷 **ROBBERY SUCCESSFUL**\n\n` +

                `<@${robberId}> robbed <@${victimId}>.\n\n` +

                `Stolen: **$${stolenAmount.toLocaleString()}**\n`;


            if (income.garnished > 0) {
                result +=
                    `🦈 Collections intercepted **$${income.garnished.toLocaleString()}**.\n` +
                    `You kept: **$${income.received.toLocaleString()}**\n`;
            }


            result +=
                `\nYour Balance: **$${income.newBalance.toLocaleString()}**\n` +
                `${victim.username}'s Balance: **$${newVictimBalance.toLocaleString()}**`;


            await interaction.reply(result);

            return;
        }


        // --------------------
        // FAILURE
        // --------------------

        const fine =
            Math.min(
                FAILURE_FINE,
                robberBalance
            );


        if (fine > 0) {

            changeBalance(
                guildId,
                robberId,
                -fine
            );


            /*
                Give the failure fine directly
                to the victim.
            */

            changeBalance(
                guildId,
                victimId,
                fine
            );
        }


        const newRobberBalance =
            getBalance(
                guildId,
                robberId
            );


        await interaction.reply(
            `🚔 **ROBBERY FAILED**\n\n` +

            `<@${robberId}> tried to rob <@${victimId}> and got caught.\n\n` +

            `You paid <@${victimId}> **$${fine.toLocaleString()}**.\n` +
            `Your Balance: **$${newRobberBalance.toLocaleString()}**`
        );
    }
};