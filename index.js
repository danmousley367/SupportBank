const fs = require('fs');
const papa = require('papaparse');
const readlineSync = require("readline-sync");
const file = fs.createReadStream('Transactions2014.csv');

class Person {
    constructor(name, balance) {
        this.name = name
        this.balance = balance
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

papa.parse(file, {
    complete: (results) => {
        let records = results.data
        let people = []
        let transactions = []
        let checkPeople = (name) => {
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
        let checkBalance = (name) => {
            for (let i = 0; i < people.length; i++) {
                if (people[i].name == name) {
                    return i
                }
            }
        }
        //Iterate through each transaction
        for (let i = 1; i < records.length; i++) {
            let date = records[i][0]
            let nameFrom = records[i][1]
            let nameTo = records[i][2]
            let narrative = records[i][3]
            let amount = parseFloat(records[i][4])

            //Check if people are already in array and add them if not
            if (checkPeople(nameFrom) == false) {
                addPeople(nameFrom)
                console.log(people)
            }
            if (checkPeople(nameTo) == false) {
                addPeople(nameTo)
                console.log(people)
            }

            //Find people in array and amend balance
            people[checkBalance(nameFrom)].balance -= amount
            people[checkBalance(nameTo)].balance += amount
            //Create a transaction for each
            let transaction = new Transaction(date, nameTo, nameFrom, narrative, amount)
            transactions.push(transaction)
        }

        //List the name of each person and their balance
        const getPeople = () => {
            people.forEach((person) => {
                console.log(`${person.name}: £${person.balance.toFixed(2)}`)
            })
        }

        //List transactions associated with person
        const getTransactions = (person) => {
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
});



