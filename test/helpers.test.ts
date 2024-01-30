import { describe } from "node:test";
import { getCSV, getPatientName, getTestInformation } from "../src/helpers";

describe("getCSV tests", () => {
    test("Test 1", async () => {
        let result:any[]  = await getCSV('conditions', ['name', 'diagnostic_metrics'])
        expect(result.length).toBe(121)
    })
})

describe("getPatientName tests", () => {
    test("Test 1", () => {
        let hl7_test_str = "OBX|2|NM|14683-7^U Creatinine, random^LN||7.8|mmol/L^mmol/L|||||F|||202306090524"
        expect(getPatientName(hl7_test_str)).toBe(null);
    })
    test("Test 2", () => {
        let hl7_test_str = "PID|1||394255555^^^NATA&2133&N||SMITH^JOHN^^^DR||19700101|M|||EXAMPLE STREET^^TEST SUBURB^VIC^3149^AU||^^^^^^0455555555|^^^^^^|||||4295855555||||||||"
        expect(getPatientName(hl7_test_str)).toBe("JOHN SMITH");
    })
})

describe("getTestInformation tests", () => {
    test("Test 1", () => {
        let hl7_test_str = "OBX|2|NM|14683-7^U Creatinine, random^LN||7.8|mmol/L^mmol/L|||||F|||202306090524"
        expect(getTestInformation(hl7_test_str)).toHaveProperty('testCode');
    })
    test("Test 2", () => {
        let hl7_test_str = "PID|1||394255555^^^NATA&2133&N||SMITH^JOHN^^^DR||19700101|M|||EXAMPLE STREET^^TEST SUBURB^VIC^3149^AU||^^^^^^0455555555|^^^^^^|||||4295855555||||||||"
        expect(getTestInformation(hl7_test_str)).toBe(null);
    })
})