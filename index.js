const fs = require('fs');
const papa = require('papaparse');
const readlineSync = require("readline-sync");
const file = fs.createReadStream('DodgyTransactions2015.csv');
const log4js = require("log4js");
log4js.configure({
    appenders: {
        file: { type: 'fileSync', filename: 'logs/debug.log' }
    },
    categories: {
        default: { appenders: ['file'], level: 'debug'}
    }
});

class Person {
    constructor(name, balance) {
        this.name = name
        this.balance = balance
        this.transactions = []
    }

    showBalance() {
        console.log(`${this.name} has a balance of £${this.balance.toFixed(2)}`)
    }

    showTransactions() {
        console.log(this.transactions)
    }
}

class Transaction {
    constructor(date, from, to, narrative, amount) {
        this.date = date
        this.from = from
        this.to = to
        this.narrative = narrative
        this.amount = amount
    }
}

const handleParseResults = (results) => {
    const records = results.data
    let people = []
    let transactions = []
    const checkPeople = (name) => {
        for (let i = 0; i < people.length; i++) {
            if (people[i].name == name) {
                return true
            }
        }
        return false
    }
    const addPeople = (name) => {
        let person = new Person(name, 0.00)
        people.push(person)
        // console.log(person)
    }
    const findPerson = (name) => {
        for (let i = 0; i < people.length; i++) {
            if (people[i].name == name) {
                return i
            }
        }
    }
    //Iterate through each transaction
    for (let i = 1; i < records.length; i++) {
        const [date, nameFrom, nameTo, narrative, amountString] = records[i]
        const amount = parseFloat(amountString)

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
        personFrom.balance -= amount
        personFrom.transactions.push([date, nameFrom, nameTo, narrative, amount]) //This doesn't work
        personTo.balance += amount
        personTo.transactions.push([date, nameFrom, nameTo, narrative, amount]) // This doesn't work

        //Create a transaction for each
        let transaction = new Transaction(date, nameTo, nameFrom, narrative, amount)
        transactions.push(transaction)
    }

    //List the name of each person and their balance
    const getPeople = () => {
        people.forEach((person) => {
            person.showBalance()
        })
    }

    //List transactions associated with person
    const getTransactions = (person) => {
        // person.showTransactions()
        // console.log(person.transactions)
        for (let i = 0; i < transactions.length; i++) {
            if (transactions[i].to === person) {
                console.log(`Transaction from ${transactions[i].from} on ${transactions[i].date} for £${transactions[i].amount} for ${transactions[i].narrative}`)
            }
            else if (transactions[i].from == person) {
                console.log(`Transaction to ${transactions[i].to} on ${transactions[i].date} for £${transactions[i].amount} for ${transactions[i].narrative}`)
            }
        }
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
        } else {
            console.log("Sorry, I didn't get that. Please try again.")
        }
    }
}

papa.parse(file, { complete: handleParseResults });




