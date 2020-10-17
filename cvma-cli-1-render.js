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

/*  internal requirements  */
const api = require("./cvma-api.js")

module.exports = (parseArgs) => {
    /*  command: "render"  */
    return async (optsGlobal, argv) => {
        /*  parse command line options  */
        const optsCmd = parseArgs(argv, {}, { min: 1, max: 1 }, (yargs) =>
            yargs
                .usage(
                    "Usage: cvma render " +
                    "[-o|--output-file=<string>] " +
                    "[-f|--output-format=<string>] " +
                    "[-m|--marker-type=<string>] " +
                    "[-w|--canvas-width=<number>] " +
                    "[-h|--canvas-height=<number>] " +
                    "[-x|--marker-position-x=<number>] " +
                    "[-y|--marker-position-y=<number>] " +
                    "[-s|--marker-pixel-size=<number>] " +
                    "[-B|--marker-color-bg=<string>] " +
                    "[-F|--marker-color-fg=<string>] " +
                    "<data>"
                )
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
                    describe: "output format ('svg', 'pdf')",
                    nargs:    1,
                    default:  "svg"
                })
                .option("m", {
                    alias:    "marker-type",
                    type:     "string",
                    describe: "marker type ('22N', '33O', '33N', '44O', '44N', '55O', '55N', '66O', '66N')",
                    nargs:    1,
                    default:  "44O"
                })
                .option("w", {
                    alias:    "canvas-width",
                    type:     "string",
                    describe: "canvas width (0 for same as marker size)",
                    nargs:    1,
                    default:  "0"
                })
                .option("h", {
                    alias:    "canvas-height",
                    type:     "string",
                    describe: "canvas height (0 for same as marker size)",
                    nargs:    1,
                    default:  "0"
                })
                .option("x", {
                    alias:    "marker-position-x",
                    type:     "string",
                    describe: "marker X-position on canvas",
                    nargs:    1,
                    default:  "0"
                })
                .option("y", {
                    alias:    "marker-position-y",
                    type:     "string",
                    describe: "marker Y-position on canvas",
                    nargs:    1,
                    default:  "0"
                })
                .option("H", {
                    alias:    "marker-handle",
                    type:     "string",
                    describe: "marker handle ('tl', 'tr', 'bl', 'br')",
                    nargs:    1,
                    default:  "tl"
                })
                .option("s", {
                    alias:    "marker-pixel-size",
                    type:     "string",
                    describe: "size of a marker pixel on canvas",
                    nargs:    1,
                    default:  "5pt"
                })
                .option("B", {
                    alias:    "marker-color-bg",
                    type:     "string",
                    describe: "background color of marker on canvas",
                    nargs:    1,
                    default:  "transparent"
                })
                .option("F", {
                    alias:    "marker-color-fg",
                    type:     "string",
                    describe: "foreground color of marker on canvas",
                    nargs:    1,
                    default:  "#000000"
                })
        )

        /*  pass-through control to API  */
        const renderer = new api.Renderer({
            outputFormat:    optsCmd.outputFormat,
            markerType:      optsCmd.markerType,
            canvasWidth:     optsCmd.canvasWidth,
            canvasHeight:    optsCmd.canvasHeight,
            markerPositionX: optsCmd.markerPositionX,
            markerPositionY: optsCmd.markerPositionY,
            markerHandle:    optsCmd.markerHandle,
            markerPixelSize: optsCmd.markerPixelSize,
            markerColorBG:   optsCmd.markerColorBg,
            markerColorFG:   optsCmd.markerColorFg
        })
        const data = parseInt(optsCmd._[0])
        const output = await renderer.render(data)

        /*  deliver output  */
        if (optsCmd.outputFile === "-")
            process.stdout.write(output)
        else
            fs.writeFileSync(optsCmd.outputFile, output, { encoding: null })
    }
}

