#!/usr/bin/env node
/*!
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
const yargs     = require("yargs")
const chalk     = require("chalk")

/*  internal requirements  */
const my        = require("./package.json")
const render    = require("./cvma-cli-1-render.js")
const recognize = require("./cvma-cli-2-recognize.js")

/*  establish asynchronous context  */
;(async () => {
    /*  helper function for parsing command-line options  */
    /* eslint indent: off */
    const parseArgs = (argv, config, args, handler) => {
        let obj = yargs()
            .parserConfiguration(Object.assign({}, {
                "duplicate-arguments-array": true,
                "set-placeholder-key":       true,
                "flatten-duplicate-arrays":  true,
                "camel-case-expansion":      true,
                "strip-aliased":             false,
                "dot-notation":              false
            }, config))
            .version(false)
            .help(true)
            .showHelpOnFail(true)
            .strict(true)
        obj = handler(obj)
        const options = obj.parse(argv)
        delete options.$0
        if (typeof args.min === "number" && options._.length < args.min)
            throw new Error(`too less arguments (at least ${args.min} expected)`)
        if (typeof args.max === "number" && options._.length > args.max)
            throw new Error(`too many arguments (at most ${args.max} expected)`)
        return options
    }

    /*  parse global command-line options  */
    let argv = process.argv.slice(2)
    const optsGlobal = parseArgs(argv, { "halt-at-non-option": true }, { min: 1 }, (yargs) =>
        yargs.usage("Usage: cvma [-h|--help] <command> [<options>] [<arguments>]")
    )

    /*  define commands  */
    const commands = {
        /*  command: "version"  */
        async version (optsGlobal, argv) {
            /*  parse command line options  */
            parseArgs(argv, {}, { min: 0, max: 0 }, (yargs) =>
                yargs.usage("Usage: cvma version")
            )

            /*  output detailed program information  */
            process.stdout.write(
                chalk.blue.bold(`CVMA ${my.version} <${my.homepage}>\n`) +
                chalk.blue(`${my.description}\n`) +
                `Copyright (c) 2020 ${my.author.name} <${my.author.url}>\n` +
                `Licensed under ${my.license} <http://spdx.org/licenses/${my.license}.html>\n`
            )
            return 0
        },

        /*  standalone commands  */
        render:    render(parseArgs),
        recognize: recognize(parseArgs)
    }

    /*  dispatch command  */
    argv = optsGlobal._
    delete optsGlobal._
    const cmd = argv.shift()
    if (typeof commands[cmd] !== "function")
        throw new Error(`unknown command: "${cmd}"`)
    const rc = await commands[cmd](optsGlobal, argv)
    process.exit(rc)
})().catch((err) => {
    /*  handle fatal error  */
    process.stderr.write(`cvma: ERROR: ${err.stack}\n`)
    process.exit(1)
})

