const fs = require("fs");
const path = require("path");

const filePath = path.join(
    process.cwd(),
    "data",
    "balances.json"
);

const starting_balance = 1000;


function loadBalances() {
    const data = fs.readFileSync(filePath, "utf8").trim();

    if (!data) {
        return{};
    }

    return JSON.parse(data);
}

function saveBalances(balances) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(balances, null, 4)
    );
}

function getBalance(guildId, userId) {
    const balances = loadBalances();

    if (!balances[guildId]) {
        balances[guildId] = {};
    }

    if (balances[guildId][userId] === undefined) {
        balances[guildId][userId] = starting_balance;
        saveBalances(balances);
    }

    return balances[guildId][userId];
}

function changeBalance(guildId, userId, amount) {
    const balances = loadBalances();

    if (!balances[guildId]) {
        balances[guildId] = {};
    }

    if (balances[guildId][userId] === undefined) {
        balances[guildId][userId] = STARTING_BALANCE;
    }

    const newBalance = balances[guildId][userId] + amount;

    if (newBalance < 0) {
        return false;
    }

    balances[guildId][userId] = newBalance;

    saveBalances(balances);

    return newBalance;
}

module.exports = {
    getBalance,
    changeBalance
};