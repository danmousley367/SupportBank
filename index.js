const fs = require('fs');
const papa = require('papaparse');
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
        // console.log(records)
        let people = []
        let transactions = []
        let checkPeople = (foo) => {
            for (let i = 0; i < people.length; i++) {
                if (people[i].name == foo) {
                    return i
                }
            }
            return false
        }
        const addPeople = (baz) => {
            let person = new Person(baz, 0.00)
            people.push(person)
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
            }
            if (checkPeople(nameTo) == false) {
                addPeople(nameTo)
            }

            //Find people in array and amend balance
            people[checkPeople(nameFrom)].balance -= amount
            people[checkPeople(nameTo)].balance += amount
            //Create a transaction for each
            let transaction = new Transaction(date, nameTo, nameFrom, narrative, amount)
            transactions.push(transaction)
        }

        //List the name of each person and their balance
        people.forEach((person) => {
            // console.log(people)
            console.log(`${person.name}: ${person.balance}`)
        })

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

        getTransactions('Rob S')
    }
});



