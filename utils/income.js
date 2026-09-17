const {
    getLoan,
    garnishLoan
} = require("./loans");

const {
    changeBalance
} = require("./economy");

const {
    recordLoanRepayment
} = require("./credit");


function getGarnishmentRate(source) {

    if (source === "randomEvent") {
        return 0.25;
    }
    
    if (source ==="robbery") {
        return 0.50;
    }
    
    if (source === "pay") {
        return 0.25;
    }

    if (source === "work") {
        return 0.50;
    }

    if (source === "gambling") {
        return 0.50;
    }

    return 0;
}


function processIncome(
    guildId,
    userId,
    amount,
    source
) {
    const loan = getLoan(
        guildId,
        userId
    );

    let garnished = 0;
    let received = amount;


    if (loan && loan.inCollections) {

        const rate =
            getGarnishmentRate(source);

        const requestedGarnishment =
            Math.floor(amount * rate);


        if (requestedGarnishment > 0) {

            const result =
                garnishLoan(
                    guildId,
                    userId,
                    requestedGarnishment
                );


            if (result) {
                garnished = result.garnished;

                received =
                    amount - garnished;


                if (result.paidOff) {
                    recordLoanRepayment(
                        guildId,
                        userId,
                        result.lender,
                        true
                    );
                }
            }
        }
    }


    const newBalance =
        changeBalance(
            guildId,
            userId,
            received
        );


    return {
        grossAmount: amount,
        received: received,
        garnished: garnished,
        newBalance: newBalance
    };
}


module.exports = {
    processIncome
};