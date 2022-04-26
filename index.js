const fs = require('fs');
const papa = require('papaparse');
const readlineSync = require("readline-sync");
const log4js = require("log4js");
const moment = require("moment");
const xml2js = require('xml2js');

const userFile = readlineSync.question('Please enter your file name: ')
const logger = log4js.getLogger(`${userFile}`);

log4js.configure({
    appenders: {
        file: { type: 'fileSync', filename: 'logs/debug.log' }
    },
    categories: {
        default: { appenders: ['file'], level: 'debug'}
    }
});

logger.trace("Starting program...")

class Person {
    constructor(name, balance) {
        this.name = name
        this.balance = balance
        this.transactions = []
        this.voidTransactions = []
    }

    showBalance() {
        console.log(`${this.name} has a balance of £${this.balance.toFixed(2)}`)
    }

    showTransactions() {
        console.log("This person has the following valid transactions:")
        for (let i = 0; i < this.transactions.length; i++) {
            const [date, nameFrom, nameTo, narrative, amount] = this.transactions[i]
            console.log(`Transaction from ${nameFrom} to ${nameTo} on ${date} for £${amount} for ${narrative}`)
        }
    }

    showVoidTransactions() {
        console.log("NOTE - This person has the following invalid transactions:")
        for (let i = 0; i < this.voidTransactions.length; i++) {
            const [date, nameFrom, nameTo, narrative, amount, amountString, reason] = this.voidTransactions[i]
            console.log(`Transaction from ${nameFrom} to ${nameTo} on ${date} for ${amountString} for ${narrative} is invalid: ${reason}`)
        }
    }
}

const handleParseResults = (results, fileType) => {
    logger.debug("Parse complete")
    const records = fileType === "json" || fileType === "xml" ? results : results.data
    const people = []

    const checkPeople = (name) => {
        return people.some((person) => person.name === name)
    }
    const addPeople = (name) => {
        const person = new Person(name, 0.00)
        people.push(person)
    }
    const findPerson = (name) => {
        return people.findIndex((person) => person.name === name)
    }

    const checkDate = (date) => {
        const format = /^\d{2}\/\d{2}\/\d{4}/
        return date.match(format)
    }

    //Iterate through each transaction
    logger.debug("Iterating through transactions...")
    for (let i = fileType === "csv" ? 1 : 0; i < records.length; i++) { // Starting at i = 1 to skip header
        let [date, nameFrom, nameTo, narrative, amountString] = ["", "", "", "", ""]
        let amount = 0.00
        if (fileType === "json") {
            date = records[i].Date
            nameFrom = records[i].FromAccount
            nameTo = records[i].ToAccount
            narrative = records[i].Narrative
            amount = records[i].Amount
        } else {
            [date, nameFrom, nameTo, narrative, amountString] = records[i]
            amount = parseFloat(amountString)
        }

        //Check if people are already in array and add them if not
        if (!checkPeople(nameFrom)) {
            addPeople(nameFrom)
        }
        if (!checkPeople(nameTo)) {
            addPeople(nameTo)
        }

        //Find people in array and amend balance and update transaction
        const personFrom = people[findPerson(nameFrom)]
        const personTo = people[findPerson(nameTo)]

        if (isNaN(amount)) {
            logger.error(`${amountString} on transaction ${i} is not a cash balance`)
            const reason = `The amount for transaction ${i} is not a cash balance`
            console.log(reason)

            personFrom.voidTransactions.push([date, nameFrom, nameTo, narrative, amount, amountString, reason])
            personTo.voidTransactions.push([date, nameFrom, nameTo, narrative, amount, amountString, reason])
        } else if (checkDate(date) === null) {
            logger.error(`${date} on transaction ${i} is not the correct format`)
            const reason = `The date on transaction ${i} is not the correct format`
            console.log(reason)

            personFrom.voidTransactions.push([date, nameFrom, nameTo, narrative, amount, amountString, reason])
            personTo.voidTransactions.push([date, nameFrom, nameTo, narrative, amount, amountString, reason])
        } else {
            personFrom.balance -= amount
            personTo.balance += amount

            personFrom.transactions.push([date, nameFrom, nameTo, narrative, amount])
            personTo.transactions.push([date, nameFrom, nameTo, narrative, amount])
        }

        logger.debug(`Transaction ${i} validated!`)
    }

    //List the name of each person and their balance
    const getPeople = () => {
        people.forEach((person) => {
            person.showBalance()
        })
    }

    //List transactions associated with person
    const getTransactions = (name) => {
        const person = people[findPerson(name)]
        if (person.voidTransactions.length) { person.showVoidTransactions() }
        person.showTransactions()
    }

    let response = ""
    while (response.toLowerCase() != 'exit') {
        logger.debug("Requesting command from the user")
        response = readlineSync.question('Type "List All" to view accounts, "List [Account]" to view transactions or type "exit" to quit.')
        if (response.toLowerCase() === "list all") {
            logger.debug("Listing all accounts and balances")
            getPeople()
            logger.debug("Accounts successfully printed")
        } else if (response.includes('[') && response.includes(']')) {
            const responseArr = response.split('[')
            const account = responseArr[1].substring(0, responseArr[1].length-1)
            logger.debug(`Listing transactions for ${account}`)
            getTransactions(account)
            logger.debug("Transactions listed")
        } else if (response.toLowerCase() === "exit") {
            console.log("Exiting programme")
            logger.debug("Programme exited")
        } else {
            console.log("Sorry, I didn't get that. Please try again.")
            logger.debug("Invalid request by the user")
        }
    }
}

const formatDate = (date) => {
    const firstDate = moment("20120103", "YYYYMMDD") //First working day of 2012
    const days = parseInt(date) - 40909 // Number of days since first working day of the year
    const dateNow = firstDate.add(days, 'days').format("DD/MM/YYYY")
    return dateNow
}

const handleXML = (transactions) => {
    const parsedTransactions = []
    transactions.forEach((transaction) => {
        const date = formatDate(transaction.$.Date)
        const from = transaction.Parties[0].From[0]
        const to = transaction.Parties[0].To[0]
        const narrative = transaction.Description[0]
        const amount = transaction.Value[0]
        parsedTransactions.push([date, from, to, narrative, amount])
    })
    handleParseResults(parsedTransactions, "xml")
}

if (userFile.slice(-4) === "json") {
    const transactions = require(`./${userFile}`)
    const transactionsArr = []

    logger.debug(`Parsing file${userFile}`)
    for (let i = 0; i < transactions.length; i++) {
        const transaction = JSON.stringify(transactions[i])
        const transactionArr = JSON.parse(transaction, (key, value) => {
            if (key === "Date") {
                return moment(value, "YYYY-MM-DD").format("DD/MM/YYYY")
            } else {
                return value
            }
        })
        transactionsArr.push(transactionArr)
    }

    handleParseResults(transactionsArr, "json")
} else if (userFile.slice(-3) === "csv") {
    const file = fs.createReadStream(`${userFile}`);
    logger.debug(`Parsing file${file.path}`)
    papa.parse(file, { complete: handleParseResults });
} else if (userFile.slice(-3) === "xml") {
    const parser = new xml2js.Parser();

    fs.readFile(`${userFile}`, (err, data) => {
        parser.parseString(data, (err, result) => {
            const transactions = result.TransactionList.SupportTransaction;
            handleXML(transactions);
        });
    });
}







