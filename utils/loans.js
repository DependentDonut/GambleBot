const fs = require("fs");
const path = require("path");

const { recordCollection } = require("./credit");

const filePath = path.join(
    process.cwd(),
    "data",
    "loans.json"
);


const MILLISECONDS_PER_DAY =
    24 * 60 * 60 * 1000;

const MAX_INTEREST_EVENTS = 7;


// --------------------
// LOAD LOANS
// --------------------

function loadLoans() {
    const data = fs.readFileSync(filePath, "utf8").trim();

    if (!data) {
        return {};
    }

    return JSON.parse(data);
}


// --------------------
// SAVE LOANS
// --------------------

function saveLoans(loans) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(loans, null, 4)
    );
}

//--------------------
// Collections
//--------------------

function enterCollections(loan, guildId, userId) {

    loan.inCollections = true;

    if (!loan.collectionsStartedAt) {
        loan.collectionsStartedAt = Date.now();
    }


    if (!loan.collectionsPenaltyApplied) {

        recordCollection(
            guildId,
            userId
        );

        loan.collectionsPenaltyApplied = true;
    }
}

// --------------------
// APPLY INTEREST
// --------------------

function applyInterest(loans, guildId, userId) {
    const loan = loans[guildId]?.[userId];

    if (!loan) {
        return null;
    }


    // Handle a loan that has already reached
    // all 7 interest events
    if (
        loan.interestEventsApplied >=
        loan.maxInterestEvents
    ) {

        enterCollections(
            loan,
            guildId,
            userId
        );

        return loan;
    }


    const interestInterval =
        loan.interestIntervalDays *
        MILLISECONDS_PER_DAY;


    const timePassed =
        Date.now() - loan.lastInterestAt;


    const periodsPassed =
        Math.floor(
            timePassed / interestInterval
        );


    if (periodsPassed <= 0) {
        return loan;
    }


    const eventsRemaining =
        loan.maxInterestEvents -
        loan.interestEventsApplied;


    const eventsToApply =
        Math.min(
            periodsPassed,
            eventsRemaining
        );


    loan.debt = Math.ceil(
        loan.debt *
        Math.pow(
            1 + loan.interestRate,
            eventsToApply
        )
    );


    loan.interestEventsApplied +=
        eventsToApply;


    loan.lastInterestAt +=
        eventsToApply *
        interestInterval;


    // After interest event #7,
    // the loan enters collections
    if (
        loan.interestEventsApplied >=
        loan.maxInterestEvents
    ) {

        enterCollections(
            loan,
            guildId,
            userId
        );
    }


    return loan;
}


// --------------------
// CREATE LOAN
// --------------------

function createLoan(
    guildId,
    userId,
    lender,
    amount,
    interestRate,
    interestIntervalDays
) {
    const loans = loadLoans();


    if (!loans[guildId]) {
        loans[guildId] = {};
    }


    // Do not allow another loan if one already exists
    if (loans[guildId][userId]) {
        return false;
    }


    const loan = {
    lender: lender,

    originalAmount: amount,
    debt: amount,

    interestRate: interestRate,
    interestIntervalDays: interestIntervalDays,

    interestEventsApplied: 0,
    maxInterestEvents: MAX_INTEREST_EVENTS,

    createdAt: Date.now(),
    lastInterestAt: Date.now(),

    inCollections: false,
    collectionsStartedAt: null,
    collectionsPenaltyApplied: false
};

    loans[guildId][userId] = loan;


    saveLoans(loans);


    return loan;
}


// --------------------
// GET LOAN
// --------------------

function getLoan(guildId, userId) {
    const loans = loadLoans();


    if (!loans[guildId]) {
        return null;
    }


    if (!loans[guildId][userId]) {
        return null;
    }


    const loan =
        applyInterest(
            loans,
            guildId,
            userId
        );


    saveLoans(loans);


    return loan;
}


// --------------------
// GET CURRENT DEBT
// --------------------

function getDebt(guildId, userId) {
    const loan =
        getLoan(
            guildId,
            userId
        );


    if (!loan) {
        return 0;
    }


    return loan.debt;
}


// --------------------
// REPAY LOAN
// --------------------

function repayLoan(
    guildId,
    userId,
    amount
) {
    const loans = loadLoans();


    if (!loans[guildId]) {
        return false;
    }


    if (!loans[guildId][userId]) {
        return false;
    }


    // Apply any interest that is currently due
    // before accepting the payment
    const loan =
        applyInterest(
            loans,
            guildId,
            userId
        );


    const payment =
        Math.min(
            amount,
            loan.debt
        );


    loan.debt -= payment;


    // Loan completely paid off
    if (loan.debt <= 0) {

        delete loans[guildId][userId];

        saveLoans(loans);

        return {
            payment: payment,
            remainingDebt: 0,
            paidOff: true,
            lender: loan.lender,
            wasInCollections: loan.inCollections
        };
    }


    saveLoans(loans);


    return {
        payment: payment,
        remainingDebt: loan.debt,
        paidOff: false,
        lender: loan.lender,
        wasInCollections: loan.inCollections
    };
}


// --------------------
// CHECK FOR ACTIVE LOAN
// --------------------

function hasActiveLoan(guildId, userId) {
    const loan =
        getLoan(
            guildId,
            userId
        );

    return loan !== null;
}


// --------------------
// EXPORT FUNCTIONS
// --------------------

module.exports = {
    createLoan,
    getLoan,
    getDebt,
    repayLoan,
    hasActiveLoan
};