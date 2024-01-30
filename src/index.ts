import express from "express";
import dotenv from 'dotenv';
import bodyParser from "body-parser";
import { Metrics, ParseFile, getCSV, getMetrics, loadToTable } from "./helpers";
import fileUpload, {UploadedFile} from "express-fileupload";
import cors from "cors"

const app = express()
dotenv.config()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());

// This has to be called once
app.get("/load", async (req, res) => {
    // Get the CSV files and load into variable
    let conditions_results:any  = await getCSV('conditions', ['name', 'diagnostic_metrics'])
    let diagnostic_groups_results:any = await getCSV('diagnostic_groups', ['name','diagnostics','diagnostic_metrics'])
    let diagnostic_metrics_results:any = await getCSV('diagnostic_metrics', ['name','oru_sonic_codes','diagnostic','diagnostic_groups','oru_sonic_units','units','min_age','max_age','gender','standard_lower','standard_higher','everlab_lower','everlab_higher'])
    let diagnostics:any = await getCSV('diagnostics', ['name','diagnostic_groups','diagnostic_metrics'])
    // load the data into the database
    loadToTable('conditions', conditions_results);
    loadToTable('diagnostic_groups', diagnostic_groups_results);
    loadToTable('diagnostic_metrics', diagnostic_metrics_results);
    loadToTable('diagnostics', diagnostics);
    
    return res.status(200).json("Ok")
})

app.get("/getTests", async (req, res) => {
    // Get the values of the patient from the ORU file (doesn't include metrics)
    let parsed = await ParseFile(__dirname + "/oru/oru.txt")
    // This will include the thest results and the metrices
    let enh_parse:ParseFile[] = []
    for (let index = 0; index < parsed.length; index++) {
        const item = parsed[index];
        // load the matirces from the loaded database
        let metrics: Metrics[] = await getMetrics(item.test.testDescription);
        // Modifiy the test data to include matrices
        item.test.high_met = Number(metrics[0].standard_higher);
        item.test.low_met = Number(metrics[0].standard_lower);
        item.test.risky = item.test.resultValue > item.test.high_met || item.test.resultValue < item.test.low_met
        // Push into new array
        enh_parse.push({
            person_name: item.person_name,
            test: item.test
        });
    }
    res.send(enh_parse)
})

app.post("/upload", (req, res) => {

    if (!req.files || Object.keys(req.files).length === 0)
        return res.status(400).send("No files were uploaded.");

    // The name of the input field (i.e. "inputF") is used to retrieve the uploaded file
    const inputF: UploadedFile | UploadedFile[] = req.files.oru as UploadedFile;
    
    const uploadPath = __dirname + "/oru/oru.txt";

    // Use the mv() method to place the file somewhere on your server
    inputF.mv(uploadPath, function (err: any) {
        if (err) return res.status(500).send(err);
        return res.status(200).json("Ok")
    })
})

app.listen(process.env.PORT, () => {
    console.log("Listing at port "+process.env.PORT)
})