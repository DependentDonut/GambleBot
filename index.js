require("dotenv").config({ quiet: true });

const {
    Client,
    GatewayIntentBits,
    Events
} = require("discord.js");

const config = require("./config");
const ping = require("./commands/ping");
const logger = require("./utils/logger");
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
const announcements = require("./commands/announcements");
const ridethebus = require("./commands/ridethebus");
const horsebets = require("./commands/horsebets");
const blackjack = require("./commands/blackjack");
const crash = require("./commands/crash");
const coinflip = require("./commands/coinflip");
const commandsCommand = require("./commands/commands");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});


const commands = {
    ping: ping,
    hello: hello,
    balance: balance,
    slots: slots,
    work: work,
    loan: loan,
    repay: repay,
    pay: pay,
    credit: credit,
    jackpot: jackpot,
    networth: networth,
    session: session,
    sessionreset: sessionreset,
    rob: rob,
    lottery: lottery,
    achievements: achievements,
    title: title,
    announcements: announcements,
    ridethebus: ridethebus,
    horsebets:horsebets,
    blackjack: blackjack,
    crash: crash,
    coinflip: coinflip,
    commands: commandsCommand


};


logger.info("Starting program");

console.log(`Bot name: ${config.botName}`);


client.once(Events.ClientReady, readyClient => {
    console.log(`Connected to Discord as ${readyClient.user.tag}`);
});


client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = commands[interaction.commandName];

    if (!command) {
        console.log(`Command not found: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
    }
});


client.on(Events.MessageCreate, async message => {

    console.log(
        `MESSAGE: ${message.author.username} | ID: ${message.author.id}`
    );


    if (message.author.bot) {
        return;
    }


    const targetId =
        process.env.TARGET_USER_ID?.trim();


    if (
        message.author.id !==
        targetId
    ) {
        return;
    }


    console.log("✅ BUDDY MATCHED");


    try {

        await message.channel.send("no");

        console.log("✅ SENT NO");

    }

    catch (error) {

        console.error(
            "❌ COULD NOT SEND MESSAGE:",
            error
        );
    }
});

client.login(process.env.DISCORD_TOKEN);