const fs = require('fs');
const papa = require('papaparse');
const readlineSync = require("readline-sync");
const file = fs.createReadStream('DodgyTransactions2015.csv');
const log4js = require("log4js");
const logger = log4js.getLogger('DodgyTransactions2015.csv');

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

const handleParseResults = (results) => {
    logger.debug("Parse complete")
    const records = results.data
    let people = []

    const checkPeople = (name) => {
        logger.debug(`Searching people array for ${name}`)
        for (let i = 0; i < people.length; i++) {
            if (people[i].name == name) {
                logger.debug(`${name} already in array`)
                return true
            }
        }
        logger.debug(`${name} not in array`)
        return false
    }
    const addPeople = (name) => {
        let person = new Person(name, 0.00)
        people.push(person)
    }
    const findPerson = (name) => {
        for (let i = 0; i < people.length; i++) {
            if (people[i].name == name) {
                return i
            }
        }
    }

    const checkDate = (date) => {
        let format = /^\d{2}\/\d{2}\/\d{4}/
        return date.match(format)
    }

    //Iterate through each transaction
    logger.debug("Iterating through transactions")
    for (let i = 1; i < records.length; i++) { // Starting at i = 1 to skip header
        const [date, nameFrom, nameTo, narrative, amountString] = records[i]
        const amount = parseFloat(amountString)
        logger.debug(`Transaction ${i}:`)

        //Check if people are already in array and add them if not
        if (!checkPeople(nameFrom)) {
            addPeople(nameFrom)
            logger.debug(`Adding ${nameFrom} to people array`)
        }
        if (!checkPeople(nameTo)) {
            addPeople(nameTo)
            logger.debug(`Adding ${nameTo} to people array`)
        }

        //Find people in array and amend balance and update transaction
        const personFrom = people[findPerson(nameFrom)]
        const personTo = people[findPerson(nameTo)]

        if (isNaN(amount)) {
            logger.error(`${amountString} is not a cash balance`)
            const reason = `The amount for transaction ${i} is not a cash balance`
            console.log(reason)

            personFrom.voidTransactions.push([date, nameFrom, nameTo, narrative, amount, amountString, reason])
            personTo.voidTransactions.push([date, nameFrom, nameTo, narrative, amount, amountString, reason])
        } else if (checkDate(date) == null) {
            logger.error(`${date} is not the correct format`)
            const reason = `The date on transaction ${i} is not the correct format`
            console.log(reason)

            personFrom.voidTransactions.push([date, nameFrom, nameTo, narrative, amount, amountString, reason])
            personTo.voidTransactions.push([date, nameFrom, nameTo, narrative, amount, amountString, reason])
        } else {
            logger.debug(`Deducting ${amount} from ${nameFrom}'s balance`)
            personFrom.balance -= amount
            logger.debug(`Adding ${amount} to ${nameTo}'s balance`)
            personTo.balance += amount

            personFrom.transactions.push([date, nameFrom, nameTo, narrative, amount])
            personTo.transactions.push([date, nameFrom, nameTo, narrative, amount])
        }

        logger.debug(`Transaction ${i} logged!`)
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
        response = readlineSync.question('Type "List All" to view accounts, "List [Account]" to view transactions or type "exit" to quit.')
        if (response.toLowerCase() == "list all") {
            getPeople()
        } else if (response.includes('[') && response.includes(']')) {
            let responseArr = response.split('[')
            let account = responseArr[1].substring(0, responseArr[1].length-1)
            getTransactions(account)
        } else if (response.toLowerCase() == "exit") {
            console.log("Exiting programme")
        } else {
            console.log("Sorry, I didn't get that. Please try again.")
        }
    }
}

logger.debug(`Parsing file${file.path}`)
papa.parse(file, { complete: handleParseResults });




