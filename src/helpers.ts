import fs from "fs";
import readline from "readline";
import csvParser from 'csv-parser';
import mysql, { RowDataPacket } from 'mysql2/promise';

export interface TestInformation {
    testCode: string;
    testDescription: string;
    resultValue: number;
    resultUnitsAndRange: string;
    high_met: number;
    low_met: number;
    risky: boolean
}

export interface ParseFile {
    person_name: string,
    test: TestInformation
}

export interface Metrics extends RowDataPacket{
    oru_sonic_codes: string,
    standard_lower: string,
    standard_higher: string
}

// Get the CSV files using csv-parser library
export const getCSV = (name: string, columns: string[]): Promise<any[]> => {
    const conditions_results:any = [];
    return new Promise((resolve, rej) => {
        fs.createReadStream(`csv/${name}.csv`)
        .pipe(csvParser([...columns]))
        .on('data', (data) => conditions_results.push(data))
        .on('end', () => { 
            resolve(conditions_results)
        })
    })
}

export const loadToTable = async (table:string, data: any[]) => {
    const connection = await mysql.createConnection({ 
        host: 'localhost', 
        user: process.env.DB_USR, 
        database: process.env.DB_NM, 
        password: process.env.DB_PSS
    });
    // Create table query formation
    let create_string = `CREATE TABLE IF NOT EXISTS ${table} (id INT NOT NULL AUTO_INCREMENT, `
    Object.entries(data[0]).forEach(([k, v]) => {
        create_string += `${k} VARCHAR(1000) DEFAULT NULL, `
    })
    create_string += `PRIMARY KEY (id))`
    // Create tables
    connection.query(create_string).catch((err) => console.log(err))

    // Clear previous data
    connection.query(`DELETE FROM ${table} WHERE 1`).catch(e => console.log(e));
    // Create Query string
    data.forEach((item) => {
        let q_string = `INSERT INTO ${table} (`;
        Object.entries(item).forEach(([k, v]) => {
            q_string += k+','
        })
        q_string += ') VALUES ('
        Object.entries(item).forEach(([k, v]) => {
            q_string += `'${v}',`
        })
        q_string += ');'
        // remove the trailing commas
        q_string = q_string.replace(/,\s*\)/g, ')');
        // Execute query
        connection.query(q_string).catch(e => console.log(e));
    })
}
// Function to extract data from a PID-1 line
export function getPatientName(hl7Segment: string): string | null {
    const segments: string[] = hl7Segment.split('|');
    const patientNameField: string | undefined = segments[5];

    if (patientNameField && segments[0] === 'PID') {
        const patientNameComponents: string[] = patientNameField.split('^');
        const lastName: string = patientNameComponents[0];
        const firstName: string = patientNameComponents[1];

        return `${firstName} ${lastName}`;
    }

    return null;
}
// Function to extract data from a OBX-5 line
export function getTestInformation(hl7Segment: string): TestInformation | null {
    const segments: string[] = hl7Segment.split('|');
    const testInfoField: string | undefined = segments[3];

    if (testInfoField && segments[0] === 'OBX') {
        const testInfoComponents: string[] = testInfoField.split('^');
        const testCode: string = testInfoComponents[0];
        const testDescription: string = testInfoComponents[1];

        const resultValue: number = Number(segments[5]);
        const resultUnitsAndRange: string = segments[6];

        return {
            testCode,
            testDescription,
            resultValue,
            resultUnitsAndRange,
            high_met: -1,
            low_met: -1,
            risky: false
        };
    }

    return null;
}
// Reads through the oru file and generated an object
export const ParseFile = async (hl7_txt: string):Promise<ParseFile[]> => {
    return new Promise((resolve, rej) => {
        const fileStream = fs.createReadStream(hl7_txt);
        const parsed:ParseFile[] = [];
        // Create an interface to read the file line by line
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });
        
        let patient_name: string | null;
        let testResult: TestInformation | null = null;
        // Event listener for each line
        rl.on('line', async (line) => {
            // When encountering a patient ID
            if (line.includes("PID|1|")) {
                patient_name = getPatientName(line);
            }
            // When encountering a test
            else if (line.includes("OBX|") && line.includes("|NM|")) {
                testResult = getTestInformation(line)
            } 
            else 
                null
            // Add to final array is the result has a patient_name and test, plus it has a unique observation ID
            if (patient_name !== null && testResult !== null && parsed.filter((p) => p.test.testCode === testResult?.testCode).length == 0)
                parsed.push({person_name: patient_name, test: testResult})
        });
        rl.on('close', () => {
            resolve(parsed)
        })
    })
}
// Fetch the matrices from the DB
export const getMetrics = async (code: string | undefined) => {
    const connection = await mysql.createConnection({ 
        host: 'localhost', 
        user: process.env.DB_USR, 
        database: process.env.DB_NM, 
        password: process.env.DB_PSS
    });
    const [result, err] = await connection.query<Metrics[]>("SELECT oru_sonic_codes, standard_lower, standard_higher FROM diagnostic_metrics WHERE oru_sonic_codes LIKE '%"+code+"%';");
    return result;
}