require("dotenv").config({ quiet: true });

const { REST, Routes } = require("discord.js");
const ping = require("./commands/ping");
const hello = require("./commands/hello");
const balance = require("./commands/balance");
const slots = require("./commands/slots");
const work = require("./commands/work");
const loan = require("./commands/loan");
const repay = require("./commands/repay");
const pay = require("./commands/pay.js");
const credit = require("./commands/credit");
const jackpot = require("./commands/jackpot");
const networth = require("./commands/networth");
const session = require("./commands/session");
const sessionreset = require("./commands/sessionreset");
const rob = require("./commands/rob");
const lottery = require("./commands/lottery");
const achievements = require("./commands/achievements");
const title = require("./commands/title");
const announcements = require("./commands/announcements.js");
const ridethebus = require("./commands/ridethebus");
const horsebets = require("./commands/horsebets");
const blackjack = require("./commands/blackjack");
const crash = require("./commands/crash");
const coinflip = require("./commands/coinflip");
const commandsCommand = require("./commands/commands");
;

const commands = [
    ping.data.toJSON(),
    hello.data.toJSON(),
    balance.data.toJSON(),
    slots.data.toJSON(),
    work.data.toJSON(),
    loan.data.toJSON(),
    repay.data.toJSON(),
    pay.data.toJSON(),
    credit.data.toJSON(),
    jackpot.data.toJSON(),
    networth.data.toJSON(),
    session.data.toJSON(),
    sessionreset.data.toJSON(),
    rob.data.toJSON(),
    lottery.data.toJSON(),
    achievements.data.toJSON(),
    title.data.toJSON(),
    announcements.data.toJSON(),
    ridethebus.data.toJSON(),
    horsebets.data.toJSON(),
    blackjack.data.toJSON(),
    crash.data.toJSON(),
    coinflip.data.toJSON(),
    commandsCommand.data.toJSON()


];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
    try {
        console.log("Deploying commands...");

        const data = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(`Deployed ${data.length} command(s).`);
    } catch (error) {
        console.error(error);
    }
}

deployCommands();