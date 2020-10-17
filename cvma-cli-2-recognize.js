/*
**  CVMA -- Computer Vision Marker
**  Copyright (c) 2020 Dr. Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*  external requirements  */
const process   = require("process")
const fs        = require("fs")
const getStream = require("get-stream")
const jsYAML    = require("js-yaml")
const textframe = require("textframe")
const DataURI   = require("datauri/parser")

/*  internal requirements  */
const api = require("./cvma-api.js")

module.exports = (parseArgs) => {
    /*  command: "recognize"  */
    return async (optsGlobal, argv) => {
        /*  parse command line options  */
        const optsCmd = parseArgs(argv, {}, { min: 0, max: 0 }, (yargs) =>
            yargs
                .usage(
                    "Usage: cvma recognize " +
                    "[-i|--input-file=<string>] " +
                    "[-o|--output-file=<string>] " +
                    "[-f|--output-format=<string>] " +
                    "[-t|--timing] " +
                    "[-m|--marker-type=<string>] " +
                    "[-x|--scan-position-x=<string>] " +
                    "[-y|--scan-position-y=<string>] " +
                    "[-w|--scan-width=<string>] " +
                    "[-h|--scan-height=<string>] " +
                    "[-B|--marker-color-bg=<string>] " +
                    "[-F|--marker-color-fg=<string>] " +
                    "[-A|--provide-area] " +
                    "[-M|--provide-matrix] " +
                    "[-E|--provide-errors] " +
                    "[-I|--provide-image]"
                )
                .option("i", {
                    alias:    "input-file",
                    type:     "string",
                    describe: "input file",
                    nargs:    1,
                    default:  "-"
                })
                .option("o", {
                    alias:    "output-file",
                    type:     "string",
                    describe: "output file",
                    nargs:    1,
                    default:  "-"
                })
                .option("f", {
                    alias:    "output-format",
                    type:     "string",
                    describe: "output format ('json', 'yaml', 'html')",
                    nargs:    1,
                    default:  "yaml"
                })
                .option("t", {
                    alias:    "timing",
                    type:     "boolean",
                    describe: "time the operation",
                    default:  false
                })
                .option("m", {
                    alias:    "marker-type",
                    type:     "string",
                    describe: "marker type ('22N', '33O', '33N', '44O', '44N', '55O', '55N', '66O', '66N')",
                    nargs:    1,
                    default:  "44O"
                })
                .option("w", {
                    alias:    "scan-width",
                    type:     "string",
                    describe: "scan width (0 for same as marker size)",
                    nargs:    1,
                    default:  "0"
                })
                .option("h", {
                    alias:    "scan-height",
                    type:     "string",
                    describe: "scan height (0 for same as marker size)",
                    nargs:    1,
                    default:  "0"
                })
                .option("x", {
                    alias:    "scan-position-x",
                    type:     "string",
                    describe: "scan X-position on canvas",
                    nargs:    1,
                    default:  "0"
                })
                .option("y", {
                    alias:    "scan-position-y",
                    type:     "string",
                    describe: "scan Y-position on canvas",
                    nargs:    1,
                    default:  "0"
                })
                .option("B", {
                    alias:    "marker-color-bg",
                    type:     "string",
                    describe: "background color of marker on canvas",
                    nargs:    1,
                    default:  "#ffffff"
                })
                .option("F", {
                    alias:    "marker-color-fg",
                    type:     "string",
                    describe: "foreground color of marker on canvas",
                    nargs:    1,
                    default:  "#000000"
                })
                .option("A", {
                    alias:    "provide-area",
                    type:     "boolean",
                    describe: "provide marker area information in results",
                    default:  false
                })
                .option("M", {
                    alias:    "provide-matrix",
                    type:     "boolean",
                    describe: "provide marker matrix information in results",
                    default:  false
                })
                .option("E", {
                    alias:    "provide-errors",
                    type:     "boolean",
                    describe: "provide marker decoding errors information in results",
                    default:  false
                })
                .option("I", {
                    alias:    "provide-image",
                    type:     "boolean",
                    describe: "provide marker image information in results",
                    default:  false
                })
        )

        /*  fetch input  */
        let input
        if (optsCmd.inputFile === "-")
            input = await getStream(process.stdin, { encoding: null })
        else
            input = fs.readFileSync(optsCmd.inputFile, { encoding: null })

        /*  start timer  */
        let timerStart = process.hrtime.bigint()

        /*  pass-through control to API  */
        const recognizer = new api.Recognizer({
            markerType:      optsCmd.markerType,
            scanWidth:       optsCmd.scanWidth,
            scanHeight:      optsCmd.scanHeight,
            scanPositionX:   optsCmd.scanPositionX,
            scanPositionY:   optsCmd.scanPositionY,
            markerColorBG:   optsCmd.markerColorBg,
            markerColorFG:   optsCmd.markerColorFg,
            provideArea:     optsCmd.provideArea,
            provideMatrix:   optsCmd.provideMatrix,
            provideErrors:   optsCmd.provideErrors,
            provideImage:    optsCmd.provideImage
        })
        const markers = await recognizer.recognize(input)

        /*  optionally stop timer  */
        let timerEnd = process.hrtime.bigint()
        if (optsCmd.timing) {
            const timerDuration = (timerEnd - timerStart) / (1000n * 1000n)
            process.stderr.write(`Elapsed Time: ${timerDuration}ms\n`)
        }

        /*  provide output  */
        let output = ""
        if (optsCmd.outputFormat === "json")
            output = JSON.stringify(markers, null, "")
        else if (optsCmd.outputFormat === "yaml")
            output = jsYAML.safeDump(markers, { indent: 4, flowLevel: 2 })
        else if (optsCmd.outputFormat === "html") {
            let body = ""
            for (const marker of markers) {
                body += "<h2>Marker</h2>\n"
                if (optsCmd.provideArea)
                    body += `<div>Area: ${JSON.stringify(marker.area)}</div>\n`
                if (optsCmd.provideImage) {
                    const parser = new DataURI()
                    const img = parser.format(".bmp", marker.image)
                    body += `<div>Image: <img src="${img.content}" width="100"></div>\n`
                }
                if (optsCmd.provideMatrix)
                    body += `<div>Matrix: ${JSON.stringify(marker.matrix)}</div>\n`
                if (optsCmd.provideErrors)
                    body += `<div>Errors: ${marker.errors}</div>\n`
                body += `<div>Data: ${marker.data}</div>\n`
            }
            output = textframe(`
                <html>
                    <head>
                        <title>CVMA Recognizer Results</title>
                    </head>
                    <body>
                        <h1>CVMA Recognizer Results</h1>
                        ${body}
                    </body>
                </html>
            `)
        }
        else
            throw new Error("invalid output format")
        if (optsCmd.outputFile === "-")
            process.stdout.write(output)
        else
            fs.writeFileSync(optsCmd.outputFile, output, { encoding: "utf8" })
    }
}

