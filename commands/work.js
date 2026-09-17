const { SlashCommandBuilder } = require("discord.js");
const { getBalance, changeBalance } = require("../utils/economy");
const crypto = require("crypto");

const cooldowns = new Map();

const COOLDOWN_TIME = 60 * 60 * 1000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription("Earn some money when you're broke"),

    execute: async function(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        const balance = getBalance(guildId, userId);

        if (balance > 100) {
            await interaction.reply(
                `You're not broke enough to work. You currently have $${balance.toLocaleString()}.`
            );
            return;
        }

        const cooldownKey = `${guildId}-${userId}`;

        const lastWorked = cooldowns.get(cooldownKey);

        if (lastWorked) {
            const timePassed = Date.now() - lastWorked;
            const timeRemaining = COOLDOWN_TIME - timePassed;

            if (timeRemaining > 0) {
                const minutesRemaining = Math.ceil(
                    timeRemaining / 1000 / 60
                );

                await interaction.reply(
                    `You already worked recently. Try again in ${minutesRemaining} minute(s).`
                );
                return;
            }
        }

        const earnings = crypto.randomInt(50, 151);

        const newBalance = changeBalance(
            guildId,
            userId,
            earnings
        );

        cooldowns.set(cooldownKey, Date.now());

        await interaction.reply(
            `💼 You worked a shift and earned **$${earnings}**.\n` +
            `Balance: **$${newBalance.toLocaleString()}**`
        );

        await maybeTriggerRandomEvent(interaction);
    }
};