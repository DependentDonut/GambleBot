const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


const filePath = path.join(
    process.cwd(),
    "data",
    "lottery.json"
);


const TICKET_PRICE = 100;
const STARTING_POT = 1000;

const MIN_NUMBER = 1;
const MAX_NUMBER = 49;

const DRAW_INTERVAL =
    24 * 60 * 60 * 1000;


// --------------------
// LOAD LOTTERY
// --------------------

function loadLottery() {
    const data =
        fs.readFileSync(
            filePath,
            "utf8"
        ).trim();

    if (!data) {
        return {};
    }

    return JSON.parse(data);
}


// --------------------
// SAVE LOTTERY
// --------------------

function saveLottery(lotteryData) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(
            lotteryData,
            null,
            4
        )
    );
}


// --------------------
// CREATE LOTTERY
// --------------------

function ensureLottery(
    lotteryData,
    guildId
) {
    if (!lotteryData[guildId]) {

        lotteryData[guildId] = {
            pot: STARTING_POT,

            tickets: [],

            drawAt:
                Date.now() +
                DRAW_INTERVAL,

            lastNumbers: [],
            lastWinners: []
        };
    }


    return lotteryData[guildId];
}


// --------------------
// GET LOTTERY
// --------------------

function getLottery(guildId) {
    const lotteryData =
        loadLottery();

    const lottery =
        ensureLottery(
            lotteryData,
            guildId
        );

    saveLottery(lotteryData);

    return lottery;
}


// --------------------
// VALIDATE NUMBERS
// --------------------

function validateNumbers(numbers) {

    if (numbers.length !== 6) {
        return false;
    }


    const uniqueNumbers =
        new Set(numbers);


    if (uniqueNumbers.size !== 6) {
        return false;
    }


    for (const number of numbers) {

        if (
            number < MIN_NUMBER ||
            number > MAX_NUMBER
        ) {
            return false;
        }
    }


    return true;
}


// --------------------
// BUY TICKET
// --------------------

function buyTicket(
    guildId,
    userId,
    numbers
) {
    const lotteryData =
        loadLottery();

    const lottery =
        ensureLottery(
            lotteryData,
            guildId
        );


    if (!validateNumbers(numbers)) {
        return false;
    }


    const sortedNumbers =
        [...numbers].sort(
            (a, b) => a - b
        );


    lottery.tickets.push({
        userId: userId,
        numbers: sortedNumbers
    });


    // 80% of ticket price goes into jackpot
    lottery.pot +=
        Math.floor(
            TICKET_PRICE * 0.80
        );


    saveLottery(lotteryData);


    return {
        numbers: sortedNumbers,
        pot: lottery.pot
    };
}


// --------------------
// GENERATE DRAWING
// --------------------

function generateWinningNumbers() {
    const numbers = [];


    while (numbers.length < 6) {

        const number =
            crypto.randomInt(
                MIN_NUMBER,
                MAX_NUMBER + 1
            );


        if (!numbers.includes(number)) {
            numbers.push(number);
        }
    }


    numbers.sort(
        (a, b) => a - b
    );


    return numbers;
}


// --------------------
// COUNT MATCHES
// --------------------

function countMatches(
    ticketNumbers,
    winningNumbers
) {
    let matches = 0;


    for (const number of ticketNumbers) {

        if (
            winningNumbers.includes(number)
        ) {
            matches++;
        }
    }


    return matches;
}


// --------------------
// DRAW LOTTERY
// --------------------

function drawLottery(guildId) {
    const lotteryData =
        loadLottery();

    const lottery =
        ensureLottery(
            lotteryData,
            guildId
        );


    const winningNumbers =
        generateWinningNumbers();


    const winningTickets = [];


    for (const ticket of lottery.tickets) {

        const matches =
            countMatches(
                ticket.numbers,
                winningNumbers
            );


        if (matches === 6) {
            winningTickets.push(ticket);
        }
    }


    const currentPot =
        lottery.pot;


    lottery.lastNumbers =
        winningNumbers;


    lottery.lastWinners =
        winningTickets.map(
            ticket => ticket.userId
        );


    // --------------------
    // JACKPOT WINNER
    // --------------------

    if (winningTickets.length > 0) {

        const prizePerTicket =
            Math.floor(
                currentPot /
                winningTickets.length
            );


        lottery.pot =
            STARTING_POT;


        lottery.tickets = [];


        lottery.drawAt =
            Date.now() +
            DRAW_INTERVAL;


        saveLottery(lotteryData);


        return {
            winningNumbers:
                winningNumbers,

            winners:
                winningTickets,

            prizePerTicket:
                prizePerTicket,

            jackpotWon: true
        };
    }


    // --------------------
    // NO JACKPOT WINNER
    // --------------------

    /*
        Pot rolls over.

        Tickets are cleared because each
        drawing requires new tickets.
    */

    lottery.tickets = [];


    lottery.drawAt =
        Date.now() +
        DRAW_INTERVAL;


    saveLottery(lotteryData);


    return {
        winningNumbers:
            winningNumbers,

        winners: [],

        prizePerTicket: 0,

        jackpotWon: false
    };
}


// --------------------
// DRAW DUE?
// --------------------

function isDrawDue(guildId) {
    const lottery =
        getLottery(guildId);


    return (
        Date.now() >=
        lottery.drawAt
    );
}


// --------------------
// FORMAT NUMBER
// --------------------

function formatNumber(number) {
    return number
        .toString()
        .padStart(2, "0");
}


// --------------------
// EXPORTS
// --------------------

module.exports = {
    TICKET_PRICE,
    MIN_NUMBER,
    MAX_NUMBER,

    getLottery,
    buyTicket,
    drawLottery,
    isDrawDue,
    formatNumber
};