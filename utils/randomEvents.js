const crypto = require("crypto");

const {
    getBalance,
    changeBalance
} = require("./economy");

const {
    processIncome
} = require("./income");


const EVENT_CHANCE = 4;


// --------------------
// RANDOM NUMBER
// --------------------

function randomAmount(min, max) {
    return crypto.randomInt(
        min,
        max + 1
    );
}


// --------------------
// POSITIVE EVENT
// --------------------

function giveMoney(
    guildId,
    userId,
    amount,
    message
) {
    const income =
        processIncome(
            guildId,
            userId,
            amount,
            "randomEvent"
        );


    let result =
        `${message}\n\n` +
        `You received **$${income.received.toLocaleString()}**.`;


    if (income.garnished > 0) {

        result +=
            `\n🦈 Collections intercepted **$${income.garnished.toLocaleString()}**.`;
    }


    result +=
        `\nBalance: **$${income.newBalance.toLocaleString()}**`;


    return result;
}


// --------------------
// NEGATIVE EVENT
// --------------------

function takeMoney(
    guildId,
    userId,
    amount,
    message
) {
    const balance =
        getBalance(
            guildId,
            userId
        );


    const actualLoss =
        Math.min(
            balance,
            amount
        );


    if (actualLoss <= 0) {

        return (
            `${message}\n\n` +
            `Fortunately, you're too broke to lose anything.`
        );
    }


    const newBalance =
        changeBalance(
            guildId,
            userId,
            -actualLoss
        );


    return (
        `${message}\n\n` +
        `You lost **$${actualLoss.toLocaleString()}**.\n` +
        `Balance: **$${newBalance.toLocaleString()}**`
    );
}


// --------------------
// RANDOM EVENTS
// --------------------

const events = [

    // POSITIVE EVENTS

    {
        weight: 20,

        run: function(guildId, userId) {

            const amount =
                randomAmount(
                    50,
                    100
                );


            return giveMoney(
                guildId,
                userId,
                amount,
                "💵 You found some cash on the ground."
            );
        }
    },


    {
        weight: 15,

        run: function(guildId, userId) {

            const amount =
                randomAmount(
                    50,
                    150
                );


            return giveMoney(
                guildId,
                userId,
                amount,
                "🎰 The casino decided you've suffered enough and gave you a comp."
            );
        }
    },


    {
        weight: 10,

        run: function(guildId, userId) {

            const amount =
                randomAmount(
                    100,
                    250
                );


            return giveMoney(
                guildId,
                userId,
                amount,
                "🧾 You received an unexpected tax refund."
            );
        }
    },


    {
        weight: 5,

        run: function(guildId, userId) {

            const amount =
                randomAmount(
                    250,
                    350
                );


            return giveMoney(
                guildId,
                userId,
                amount,
                "✉️ A mysterious envelope full of cash appeared at your door. Probably best not to ask questions."
            );
        }
    },


    // NEGATIVE EVENTS

    {
        weight: 20,

        run: function(guildId, userId) {

            const amount =
                randomAmount(
                    50,
                    100
                );


            return takeMoney(
                guildId,
                userId,
                amount,
                "🚗 You got a parking ticket."
            );
        }
    },


    {
        weight: 15,

        run: function(guildId, userId) {

            const amount =
                randomAmount(
                    100,
                    200
                );


            return takeMoney(
                guildId,
                userId,
                amount,
                "📱 You dropped your phone and had to pay for repairs."
            );
        }
    },


    {
        weight: 10,

        run: function(guildId, userId) {

            const amount =
                randomAmount(
                    150,
                    250
                );


            return takeMoney(
                guildId,
                userId,
                amount,
                "🚓 Apparently 93 in a 45 is frowned upon."
            );
        }
    },


    {
        weight: 5,

        run: function(guildId, userId) {

            const amount =
                randomAmount(
                    50,
                    150
                );


            return takeMoney(
                guildId,
                userId,
                amount,
                "👛 Someone stole your wallet while you weren't looking."
            );
        }
    }

];


// --------------------
// PICK RANDOM EVENT
// --------------------

function pickEvent() {

    const totalWeight =
        events.reduce(
            (total, event) =>
                total + event.weight,
            0
        );


    const roll =
        crypto.randomInt(
            totalWeight
        );


    let currentWeight = 0;


    for (const event of events) {

        currentWeight +=
            event.weight;


        if (roll < currentWeight) {
            return event;
        }
    }
}


// --------------------
// TRY RANDOM EVENT
// --------------------

async function maybeTriggerRandomEvent(
    interaction
) {

    /*
        4% chance:

        Roll 0 through 99.

        0,1,2,3 trigger an event.
    */

    const eventRoll =
        crypto.randomInt(100);


    if (eventRoll >= EVENT_CHANCE) {
        return null;
    }


    const event =
        pickEvent();


    const message =
        event.run(
            interaction.guildId,
            interaction.user.id
        );


    await interaction.followUp(
        `🎲 **RANDOM EVENT** 🎲\n\n${message}`
    );


    return message;
}


// --------------------
// EXPORTS
// --------------------

module.exports = {
    maybeTriggerRandomEvent
};