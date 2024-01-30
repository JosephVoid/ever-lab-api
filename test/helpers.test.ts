import { describe } from "node:test";
import { getCSV } from "../src/helpers";

describe("getCSV tests", () => {
    test("Test 1", async () => {
        let result:any[]  = await getCSV('conditions', ['name', 'diagnostic_metrics'])
        expect(result.length).toBe(121)
    })
})

describe("getPatientName tests", () => {
    test("Test 1", () => {
        
    })
})

describe("getTestInformation tests", () => {
    test("Test 1", () => {
        
    })
})