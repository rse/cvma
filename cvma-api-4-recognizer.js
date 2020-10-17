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
const hammingCode  = require("hamming-code")
const Jimp         = require("jimp")
const Color        = require("color")

/*  internal requirements  */
const { convertNum, makeTimer } = require("./cvma-api-1-util.js")
const { markerDef }  = require("./cvma-api-2-defs.js")

/*  the recognizer API class  */
class Recognizer {
    constructor (options = {}) {
        /*  provide parameter defaults  */
        this.options = Object.assign({}, {
            markerType:      "66O",
            scanWidth:       "0",
            scanHeight:      "0",
            scanPositionX:   "0",
            scanPositionY:   "0",
            markerColorBG:   "#ffffff",
            markerColorFG:   "#000000",
            provideArea:     false,
            provideMatrix:   false,
            provideErrors:   false,
            provideImage:    false,
            provideTiming:   false
        }, options)

        /*  sanity check parameters  */
        if (markerDef[this.options.markerType] === undefined)
            throw new Error("invalid marker type")

        /*  unit-convert parameters  */
        this.options.scanWidth       = convertNum(this.options.scanWidth,     "px")
        this.options.scanHeight      = convertNum(this.options.scanHeight,    "px")
        this.options.scanPositionX   = convertNum(this.options.scanPositionX, "px")
        this.options.scanPositionY   = convertNum(this.options.scanPositionY, "px")
    }

    /*  API method for recognizing markers  */
    async recognize (input) {
        /*  support optional timing  */
        const timings = { total: 0, step: [] }
        let step = 0
        let timer
        const timingStart = () => {
            if (this.options.provideTiming)
                timer = makeTimer("ms")
        }
        const timingEnd = () => {
            if (this.options.provideTiming)
                timings.step[step++] = timer()
        }

        /*  read image  */
        timingStart()
        const img = await Jimp.read(input)
        timingEnd()

        /*  optionally crop to scan area  */
        const X = this.options.scanPositionX < 0 ?
            img.bitmap.width + this.options.scanPositionX : this.options.scanPositionX
        const Y = this.options.scanPositionY < 0 ?
            img.bitmap.height + this.options.scanPositionY : this.options.scanPositionY
        const W = this.options.scanWidth  > 0 ? this.options.scanWidth  : img.bitmap.width
        const H = this.options.scanHeight > 0 ? this.options.scanHeight : img.bitmap.height

        /*  determine marker information  */
        const marker = markerDef[this.options.markerType]
        const markerSize = 2 * marker.b + marker.x

        /*  determine luminosity of a pixel (0 is black, 1 is white)  */
        const lumCache = new Map()
        const getPixelLuminosity = (x, y) => {
            const key = `${x}:${y}`
            let lum = lumCache.get(key)
            if (lum === undefined) {
                const int = img.getPixelColor(x, y)
                const rgb = Jimp.intToRGBA(int)
                const col = Color.rgb(rgb.r, rgb.g, rgb.b)
                lum = col.luminosity()
                // lum = (rgb.r + rgb.g + rgb.b) / 3
                lumCache.set(key, lum)
            }
            return lum
        }

        /*  determine darkest/lightest pixel in scan window  */
        timingStart()
        let darkest  = 1.00
        let lightest = 0.00
        img.scan(X, Y, W, H, (x, y, idx) => {
            const lum = getPixelLuminosity(x, y)
            if (darkest > lum)
                darkest = lum
            if (lightest < lum)
                lightest = lum
        })
        timingEnd()

        /*  helper function for checking whether a number is near another  */
        const isNear = (x, y, epsilon) =>
            (Math.abs(x - y) <= epsilon)
        const isDarkColor = (col) =>
            isNear(col, darkest, 0.33)
        const isLightColor = (col) =>
            isNear(col, lightest, 0.33)

        /*  helper function for state transition  */
        const stateTransition = (state, lum) => {
            const isDark  = isDarkColor(lum)
            const isLight = isLightColor(lum)
            if (state === "other") {
                if (isLight)
                    state = "prolog"
            }
            else if (state === "prolog") {
                if (isDark)
                    state = "body"
                else if (!isDark & !isLight)
                    state = "other"
            }
            else if (state === "body") {
                if (isLight)
                    state = "epilog"
                else if (!isDark & !isLight)
                    state = "other"
            }
            else if (state === "epilog")
                state = "other"
            return state
        }

        /*  iterate over all rows in the scan window and horizontally find potential marker areas  */
        timingStart()
        const areasH = []
        for (let y = Y; y < Y + H; y++) {
            let state = "other"
            let area = null
            img.scan(X, y, W, 1, (x, y, idx) => {
                const lum = getPixelLuminosity(x, y)
                const stateNew = stateTransition(state, lum)
                if (stateNew !== state) {
                    state = stateNew
                    if (state === "body")
                        area = { x, y, s: 0 }
                    else if (state === "epilog") {
                        if (area.s >= markerSize) {
                            areasH.push(area)
                            area = null
                        }
                    }
                    else
                        area = null
                }
                if (area !== null)
                    area.s++
            })
        }
        timingEnd()

        /*  iterate over all columns (which correlate to the areas found horizontally)
            in the scan window and vertically find potential marker areas  */
        timingStart()
        const areasV = []
        for (const x of areasH.map((a) => a.x).filter((v, i, a) => a.indexOf(v) === i)) {
            let state = "other"
            let area = null
            img.scan(x, Y, 1, H, (x, y, idx) => {
                const lum = getPixelLuminosity(x, y)
                const stateNew = stateTransition(state, lum)
                if (stateNew !== state) {
                    state = stateNew
                    if (state === "body")
                        area = { x, y, s: 0 }
                    else if (state === "epilog") {
                        if (area.s >= markerSize) {
                            areasV.push(area)
                            area = null
                        }
                    }
                }
                if (area !== null)
                    area.s++
            })
        }
        timingEnd()

        /*  intersect horizontal and vertical areas  */
        timingStart()
        const areas = []
        for (const areaH of areasH) {
            for (const areaV of areasV) {
                if (   isNear(areaH.x, areaV.x, 0)
                    && isNear(areaH.y, areaV.y, 0)
                    && isNear(areaH.s, areaV.s, ((areaH.s + areaV.s) / 2) * 0.05)) {
                    areas.push({ x: areaH.x, y: areaH.y, w: areaH.s, h: areaV.s })
                }
            }
        }
        timingEnd()

        /*  iterate over all marker areas  */
        timingStart()
        const markers = []
        for (const area of areas) {
            /*  determine grid positions  */
            const slice = (lenTotal, numElement) => {
                const slices = []
                const lenElement = lenTotal / numElement
                slices.push(0)
                for (let i = 1; i < numElement; i++)
                    slices.push(Math.round(i * lenElement))
                slices.push(lenTotal)
                return slices
            }
            const grid = {
                dx: slice(area.w, markerSize),
                dy: slice(area.h, markerSize)
            }

            /*  optionally create grid image  */
            let gridImg = null
            if (this.options.provideImage)
                gridImg = new Jimp(area.w + (markerSize - 1), area.h + (markerSize - 1), "#ff0000", () => {})

            /*  iterate over all grid cells  */
            const matrix = []
            for (let j = 0; j < grid.dy.length - 1; j++) {
                for (let i = 0; i < grid.dx.length - 1; i++) {
                    /*  determine cell block  */
                    const x = area.x + grid.dx[i]
                    const y = area.y + grid.dy[j]
                    const w = grid.dx[i + 1] - grid.dx[i]
                    const h = grid.dy[j + 1] - grid.dy[j]

                    /*  optionally place cell block into grid image  */
                    if (this.options.provideImage)
                        gridImg.blit(img, grid.dx[i] + (i), grid.dy[j] + (j), x, y, w, h)

                    /*  calculate average luminosity of cell block  */
                    const lums = []
                    img.scan(x, y, w, h, (x, y, idx) => {
                        lums.push(getPixelLuminosity(x, y))
                    })
                    let lum = 0
                    let cnt = 0
                    for (let k = 0; k < lums.length; k++) {
                        if (k === Math.round(lums.length / 2)) {
                            lum += 4 * lums[k]
                            cnt += 4
                        }
                        else {
                            lum += 1 * lums[k]
                            cnt += 1
                        }
                    }
                    lum /= cnt
                    matrix.push(isDarkColor(lum) ? 1 : 0)
                }
            }

            /*  extract data digits  */
            const pixels = []
            for (let i = 0; i < matrix.length; i++) {
                if (i < markerSize * marker.b)
                    continue
                if (i >= markerSize * (marker.b + marker.y))
                    continue
                if (i % markerSize < marker.b)
                    continue
                if (i % markerSize >= (marker.b + marker.x))
                    continue
                pixels.push(matrix[i])
            }
            if (marker.o > 0) {
                pixels[0] = undefined
                pixels[marker.x * (marker.y - 1)] = undefined
                pixels[marker.x * marker.y - 1] = undefined
            }
            let digits = ""
            for (let i = 0; i < pixels.length; i++) {
                if (pixels[i] === undefined)
                    continue
                digits = digits + (pixels[i] === 1 ? "1" : "0")
            }

            /*  decode binary digit representation (with error correction)  */
            const digitsDecoded = hammingCode.pureDecode(digits)

            /*  convert binary digit representation into numeric data  */
            let data = 0
            for (let i = 0; i < digitsDecoded.length; i++)
                data = (data << 1) | (digitsDecoded[i] === "1" ? 1 : 0)

            /*  provide marker results  */
            const result = { data }

            /*  optionally export area  */
            if (this.options.provideArea)
                result.area = area

            /*  optionally export matrix  */
            if (this.options.provideMatrix)
                result.matrix = matrix

            /*  optionally export grid image  */
            if (this.options.provideImage)
                result.image = await gridImg.getBufferAsync(Jimp.MIME_BMP)

            /*  optionally export error information  */
            if (this.options.provideErrors) {
                const digitsFixed = hammingCode.encode(digitsDecoded)
                result.errors = (digitsFixed !== digits)
            }

            /*  provide results  */
            markers.push(result)
        }
        timingEnd()

        /*  assemble result  */
        const result = { markers }
        if (this.options.provideTiming) {
            console.log(timings)
            timings.total = timings.step.reduce((a, b) => a + b, 0)
            result.timing = timings
        }

        return result
    }
}

module.exports = {
    Recognizer
}

