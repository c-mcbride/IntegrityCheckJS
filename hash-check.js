const { writeFileSync } = require('fs');
const { readFileSync } = require('fs');
const mysql = require('mysql2');
const crypto = require('crypto');
const { createConnection } = require('mysql2');

//Create database connection
const connection = mysql.createConnection({
    host: 'localhost', //running locally via WSL;
    user: 'new_user', //Default of WSL
    password: '',
    database: 'nc_coffee'//This can be changed later
});

//Connect to the database
connection.connect(err => {
    if(err){
        console.error('Error connecting to the database', err.stack);
        return;
    }
    console.log('Connected to the database as id ' + connection.threadId);

    //Print the contents of the table
    connection.query('SELECT * FROM coffee_table', (error,results) => {
        if(error){
            console.error('Error executing query', error.stack);
            return;
        }

        //console.log('Results: ', results);
        connection.end();
    });
});


//Function to write JSON to a file
const JSONToFile = (obj, filename) => {
    writeFileSync(`${filename}.json`, JSON.stringify(obj, null, 2));
};

//We are going to return the rows into a JS array this is the inital run
function generateHashFromTableStart(){
    return new Promise((resolve, reject) => {
        connection.query('Select * FROM coffee_table', (error, results, fields) => {
            if(error){
                console.error('Error executing query', error.stack);
                return;
            }

            //Turn the table into an array
            const rowsAsArrays = results.map(row => Object.values(row));
            //console.log(rowsAsArrays);

            //Holds the hash array, this will be used to check for integriy
            const startingHashArray= [];

            //iterator
            let i = 0;

            //Generate hash for each row in the array
            rowsAsArrays.forEach(row => {
                //Iterate over each row in the 2d array and change that row into a string
                let string = row.join();
                //Take that string and generate a hash value for it
                let hashValue = crypto.createHash('sha1').update(string).digest('hex');
                //Add that hash into the hash array
                startingHashArray[i++] = hashValue;
            });


            //Write the starting hasharray as a json file
            JSONToFile(startingHashArray, 'startingHashArray');
            resolve(startingHashArray);
        });
    });
}

//Function to load back JSON file
const loadJSONFile = (filename) => {
    const data = readFileSync(`${filename}.json`, 'utf-8');
    return JSON.parse(data); //Turn the data back into an array
}

function integrityCheck(){
    return new Promise((resolve, reject) => {
        let changedRows = [];
        //Generate current hash
        connection.query('Select * FROM coffee_table', (error, results, fields) => {
            if(error){
                console.error('Error executing query', error.stack);
                return;
            }
            //Turn the table into an array
            const rowsAsArrays = results.map(row => Object.values(row))
            const currentHashArray = [];

            //iterator
            let i = 0;

            //Generate hash for each row in the array
            rowsAsArrays.forEach(row => {
                //Iterate over each row in the 2d array and change that row into a string
                let string = row.join();
                //Take that string and generate a hash value for it
                let hashValue = crypto.createHash('sha1').update(string).digest('hex');
                //Add that hash into the hash array
                currentHashArray[i++] = hashValue;
            });

            //Load JSON and turn back into an array
            const startingHashArray = loadJSONFile('startingHashArray');

            //Compare each line of the hash to the starting hash
            for(let iterator = 0; iterator < currentHashArray.length; iterator++){
                if(currentHashArray[iterator] !== startingHashArray[iterator]){
                    changedRows.push(iterator + 1); //Adding 1 to make up for index offset
                }
            }

            //If there have been rows that have changed return those
            if(changedRows.length !== 0){
                resolve('The database has been change on row(s): ' + (changedRows));
            }
            else{
                resolve('There have been no changes to the database....')
            }
        });
    });
}

/*
generateHashFromTableStart()
.then(startingHashArray => {
    console.log(startingHashArray);
});
*/

integrityCheck()
.then(testOutcome => {
    console.log(testOutcome);
});
