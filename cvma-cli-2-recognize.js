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
const Jimp      = require("jimp")
const DataURI   = require("datauri/parser")

/*  internal requirements  */
const api       = require("./cvma-api.js")

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
                    "[-m|--marker-type=<string>] " +
                    "[-x|--scan-position-x=<string>] " +
                    "[-y|--scan-position-y=<string>] " +
                    "[-w|--scan-width=<string>] " +
                    "[-h|--scan-height=<string>] " +
                    "[-d|--detect-dark-light] " +
                    "[-A|--provide-area] " +
                    "[-G|--provide-grid] " +
                    "[-M|--provide-matrix] " +
                    "[-E|--provide-errors] " +
                    "[-T|--provide-timing]"
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
                .option("d", {
                    alias:    "detect-dark-light",
                    type:     "boolean",
                    describe: "detect darkest/lightest luminosity in scan area",
                    default:  false
                })
                .option("A", {
                    alias:    "provide-area",
                    type:     "boolean",
                    describe: "provide marker area information in results",
                    default:  false
                })
                .option("G", {
                    alias:    "provide-grid",
                    type:     "boolean",
                    describe: "provide grid image information in results",
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
                .option("T", {
                    alias:    "provide-timing",
                    type:     "boolean",
                    describe: "provide processing time information in results",
                    default:  false
                })
        )

        /*  fetch input  */
        let input
        if (optsCmd.inputFile === "-")
            input = await getStream(process.stdin, { encoding: null })
        else
            input = fs.readFileSync(optsCmd.inputFile, { encoding: null })
        input = await Jimp.read(input)

        /*  pass-through control to API  */
        const recognizer = new api.Recognizer({
            inputFormat:     "jimp",
            markerType:      optsCmd.markerType,
            scanWidth:       optsCmd.scanWidth,
            scanHeight:      optsCmd.scanHeight,
            scanPositionX:   optsCmd.scanPositionX,
            scanPositionY:   optsCmd.scanPositionY,
            detectDarkLight: optsCmd.detectDarkLight,
            provideArea:     optsCmd.provideArea,
            provideGrid:     optsCmd.provideGrid,
            provideMatrix:   optsCmd.provideMatrix,
            provideErrors:   optsCmd.provideErrors,
            provideTiming:   optsCmd.provideTiming
        })
        const result = await recognizer.recognize(input)

        /*  provide output  */
        let output = ""
        if (optsCmd.outputFormat === "json")
            output = JSON.stringify(result.markers, null, "")
        else if (optsCmd.outputFormat === "yaml")
            output = jsYAML.safeDump(result.markers, { indent: 4, flowLevel: 2 })
        else if (optsCmd.outputFormat === "html") {
            let body = ""
            if (optsCmd.provideTiming)
                body += `<div>Timing: ${JSON.stringify(result.timing)}</div>\n`
            for (const marker of result.markers) {
                body += "<h2>Marker</h2>\n"
                if (optsCmd.provideArea)
                    body += `<div>Area: ${JSON.stringify(marker.area)}</div>\n`
                if (optsCmd.provideGrid) {
                    const img = new Jimp(marker.grid.w, marker.grid.h, "#ff0000", () => {})
                    for (const cell of marker.grid.c) {
                        const block = await Jimp.read(cell.d)
                        img.blit(block, cell.x + cell.i, cell.y + cell.j, 0, 0, cell.d.width, cell.d.height)
                    }
                    const buffer = await img.getBufferAsync(Jimp.MIME_PNG)
                    const parser = new DataURI()
                    const uri = parser.format(".png", buffer)
                    body += `<div>Image: <img src="${uri.content}" width="100"></div>\n`
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

