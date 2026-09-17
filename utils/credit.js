const fs = require("fs");
const path = require("path");


const filePath = path.join(
    process.cwd(),
    "data",
    "credit.json"
);


const STARTING_CREDIT_SCORE = 650;
const MIN_CREDIT_SCORE = 300;
const MAX_CREDIT_SCORE = 850;


// --------------------
// LOAD CREDIT DATA
// --------------------

function loadCredit() {
    const data = fs.readFileSync(filePath, "utf8").trim();

    if (!data) {
        return {};
    }

    return JSON.parse(data);
}


// --------------------
// SAVE CREDIT DATA
// --------------------

function saveCredit(creditData) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(creditData, null, 4)
    );
}


// --------------------
// CREATE PROFILE IF NEEDED
// --------------------

function ensureProfile(creditData, guildId, userId) {

    if (!creditData[guildId]) {
        creditData[guildId] = {};
    }


    if (!creditData[guildId][userId]) {
        creditData[guildId][userId] = {
            score: STARTING_CREDIT_SCORE,

            loansRepaid: 0,
            bankLoansRepaid: 0,
            sharkLoansRepaid: 0,

            collections: 0
        };
    }


    return creditData[guildId][userId];
}


// --------------------
// GET CREDIT PROFILE
// --------------------

function getCreditProfile(guildId, userId) {
    const creditData = loadCredit();

    const profile =
        ensureProfile(
            creditData,
            guildId,
            userId
        );

    saveCredit(creditData);

    return profile;
}


// --------------------
// CHANGE CREDIT SCORE
// --------------------

function changeCreditScore(
    guildId,
    userId,
    amount
) {
    const creditData = loadCredit();

    const profile =
        ensureProfile(
            creditData,
            guildId,
            userId
        );


    profile.score += amount;


    // Keep credit score between 300 and 850
    profile.score = Math.max(
        MIN_CREDIT_SCORE,
        Math.min(
            MAX_CREDIT_SCORE,
            profile.score
        )
    );


    saveCredit(creditData);

    return profile.score;
}


// --------------------
// RECORD COLLECTION
// --------------------

function recordCollection(guildId, userId) {
    const creditData = loadCredit();

    const profile =
        ensureProfile(
            creditData,
            guildId,
            userId
        );


    profile.collections += 1;

    profile.score -= 100;


    profile.score = Math.max(
        MIN_CREDIT_SCORE,
        profile.score
    );


    saveCredit(creditData);

    return profile.score;
}


// --------------------
// RECORD PAID-OFF LOAN
// --------------------

function recordLoanRepayment(
    guildId,
    userId,
    lender,
    wasInCollections
) {
    const creditData = loadCredit();

    const profile =
        ensureProfile(
            creditData,
            guildId,
            userId
        );


    profile.loansRepaid += 1;


    if (lender === "bank") {
        profile.bankLoansRepaid += 1;
    }


    if (lender === "shark") {
        profile.sharkLoansRepaid += 1;
    }


    // Paying before collections helps credit more
    if (wasInCollections) {
        profile.score += 5;
    }
    else if (lender === "bank") {
        profile.score += 20;
    }
    else if (lender === "shark") {
        profile.score += 15;
    }


    profile.score = Math.min(
        MAX_CREDIT_SCORE,
        profile.score
    );


    saveCredit(creditData);

    return profile.score;
}


// --------------------
// BANK INTEREST RATE
// --------------------

function getBankRate(score) {

    if (score >= 780) {
        return 0.03;
    }


    if (score >= 720) {
        return 0.035;
    }


    if (score >= 650) {
        return 0.04;
    }


    // null means bank loan denied
    return null;
}


// --------------------
// LOAN SHARK INTEREST RATE
// --------------------

function getLoanSharkRate(score) {

    if (score < 400) {
        return 0.65;
    }


    if (score < 500) {
        return 0.50;
    }


    if (score < 600) {
        return 0.40;
    }


    return 0.30;
}


// --------------------
// EXPORT FUNCTIONS
// --------------------

module.exports = {
    getCreditProfile,
    changeCreditScore,
    recordCollection,
    recordLoanRepayment,
    getBankRate,
    getLoanSharkRate
};