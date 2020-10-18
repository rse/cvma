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

/*  internal requirements  */
const { convertNum, makeTimer } = require("./cvma-api-1-util.js")
const { markerDef }             = require("./cvma-api-2-defs.js")

/*  helper class for bitmap abstraction  */
class Bitmap {}

/*  helper class for bitmap abstraction (Node/Jimp flavor)  */
class BitmapJimp extends Bitmap {
    constructor (jimp) {
        super()
        this.jimp = jimp
    }
    get width  () { return this.jimp.bitmap.width  }
    get height () { return this.jimp.bitmap.height }
    getImageData (x, y, w, h) {
        const tmp = new Jimp(w, h, () => {})
        tmp.blit(this.jimp, 0, 0, x, y, w, h)
        return {
            width:  w,
            height: h,
            data:   new Uint8ClampedArray(tmp.bitmap.data)
        }
    }
    getPixelColor (x, y) {
        return Jimp.intToRGBA(this.jimp.getPixelColor(x, y))
    }
    scanArea (x, y, w, h, cb) {
        return this.jimp.scan(x, y, w, h, cb)
    }
}

/*  helper class for bitmap abstraction (DOM/Canvas flavor)  */
class BitmapCanvas extends Bitmap {
    constructor (canvas) {
        super()
        this.canvas = canvas
        this.ctx    = this.canvas.getContext("2d")
        this.img    = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }
    get width  () { return this.img.width  }
    get height () { return this.img.height }
    getImageData (x, y, w, h) {
        return this.ctx.getImageData(x, y, w, h)
    }
    getPixelColor (x, y) {
        return {
            r: this.img.data[((x + y * this.width) << 2)],
            g: this.img.data[((x + y * this.width) << 2) + 1],
            b: this.img.data[((x + y * this.width) << 2) + 2],
            a: this.img.data[((x + y * this.width) << 2) + 3]
        }
    }
    scanArea (x, y, w, h, cb) {
        const X = Math.round(x)
        const Y = Math.round(y)
        const W = Math.round(w)
        const H = Math.round(h)
        for (let y = Y; y < Y + H; y++) {
            for (let x = X; x < X + W; x++) {
                const idx = ((x + y * this.width) << 2)
                cb(x, y, idx)
            }
        }
    }
}

/*  the recognizer API class  */
class Recognizer {
    constructor (options = {}) {
        /*  provide parameter defaults  */
        this.options = Object.assign({}, {
            markerType:      "66O",
            inputFormat:     "jimp",
            scanWidth:       "0",
            scanHeight:      "0",
            scanPositionX:   "0",
            scanPositionY:   "0",
            detectDarkLight: false,
            provideArea:     false,
            provideGrid:     false,
            provideMatrix:   false,
            provideErrors:   false,
            provideTiming:   false
        }, options)

        /*  sanity check parameters  */
        if (markerDef[this.options.markerType] === undefined)
            throw new Error("invalid marker type")
        if (!this.options.inputFormat.match(/^(?:jimp|canvas)$/))
            throw new Error("invalid input format")

        /*  unit-convert parameters  */
        this.options.scanWidth       = convertNum(this.options.scanWidth,     "px")
        this.options.scanHeight      = convertNum(this.options.scanHeight,    "px")
        this.options.scanPositionX   = convertNum(this.options.scanPositionX, "px")
        this.options.scanPositionY   = convertNum(this.options.scanPositionY, "px")

        /*  central cache for RGB to luminosity calculation  */
        this.rgb2lumCache = new Map()
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

        /*  prepare access to input bitmap image  */
        let bitmap
        if (this.options.inputFormat === "jimp")
            bitmap = new BitmapJimp(input)
        else if (this.options.inputFormat === "canvas")
            bitmap = new BitmapCanvas(input)

        /*  optionally crop to scan area  */
        const X = this.options.scanPositionX < 0 ?
            bitmap.width + this.options.scanPositionX : this.options.scanPositionX
        const Y = this.options.scanPositionY < 0 ?
            bitmap.height + this.options.scanPositionY : this.options.scanPositionY
        const W = this.options.scanWidth  > 0 ? this.options.scanWidth  : bitmap.width
        const H = this.options.scanHeight > 0 ? this.options.scanHeight : bitmap.height

        /*  determine marker information  */
        const marker = markerDef[this.options.markerType]
        const markerSize = 2 * marker.b + marker.x

        /*  determine luminosity of a pixel (0 is black, 1 is white)
            (see http://www.w3.org/TR/WCAG20/#relativeluminancedef for formula)  */
        const xy2lumCache = new Map()
        const getPixelLuminosity = (x, y) => {
            const key1 = y * 100000 + x
            let lum = xy2lumCache.get(key1)
            if (lum === undefined) {
                const rgb = bitmap.getPixelColor(x, y)
                const key2 = rgb.r * (256 * 256) + rgb.g * 256 + rgb.b
                lum = this.rgb2lumCache.get(key2)
                if (lum === undefined) {
                    let chan = rgb.r / 255
                    lum = ((chan <= 0.03928) ? chan / 12.92 : Math.pow(((chan + 0.055) / 1.055), 2.4)) * 0.2126
                    chan = rgb.g / 255
                    lum += ((chan <= 0.03928) ? chan / 12.92 : Math.pow(((chan + 0.055) / 1.055), 2.4)) * 0.7152
                    chan = rgb.b / 255
                    lum += ((chan <= 0.03928) ? chan / 12.92 : Math.pow(((chan + 0.055) / 1.055), 2.4)) * 0.0722
                    this.rgb2lumCache.set(key2, lum)
                }
                xy2lumCache.set(key1, lum)
            }
            return lum
        }

        /*  determine darkest/lightest pixel in scan window
            (and implicitly cache the luminosity of all pixels for subsequent scans)  */
        timingStart()
        let darkest  = 0.00
        let lightest = 1.00
        if (this.options.detectDarkLight) {
            darkest  = 1.00
            lightest = 0.00
            bitmap.scanArea(X, Y, W, H, (x, y, idx) => {
                const lum = getPixelLuminosity(x, y)
                if (darkest > lum)
                    darkest = lum
                if (lightest < lum)
                    lightest = lum
            })
        }
        const threshold = (lightest - darkest) / 2
        timingEnd()

        /*  helper function for state transition  */
        const stateOTHER  = Symbol("other")
        const statePROLOG = Symbol("prolog")
        const stateBODY   = Symbol("body")
        const stateEPILOG = Symbol("epilog")
        const stateTransition = (state, lum) => {
            const isDark  = (lum <  threshold)
            const isLight = (lum >= threshold)
            if (state === stateOTHER) {
                if (isLight)
                    state = statePROLOG
            }
            else if (state === statePROLOG) {
                if (isDark)
                    state = stateBODY
            }
            else if (state === stateBODY) {
                if (isLight)
                    state = stateEPILOG
            }
            else if (state === stateEPILOG) {
                if (!isLight)
                    state = stateOTHER
            }
            return state
        }

        /*  iterate over all rows in the scan window and horizontally find potential marker areas  */
        timingStart()
        const areasH = []
        for (let y = Y; y < Y + H - markerSize; y++) {
            let state = stateOTHER
            let area = null
            bitmap.scanArea(X, y, W, 1, (x, y, idx) => {
                const lum = getPixelLuminosity(x, y)
                const stateNew = stateTransition(state, lum)
                if (stateNew !== state) {
                    state = stateNew
                    if (state === stateBODY)
                        area = { x, y, s: 0 }
                    else if (state === stateEPILOG) {
                        if (area.s >= markerSize) {
                            areasH.push(area)
                            area = null
                        }
                    }
                }
                else if (area !== null)
                    area.s++
            })
        }
        timingEnd()

        /*  iterate over all columns (which correlate to the areas found horizontally)
            in the scan window and vertically find potential marker areas  */
        timingStart()
        const areasV = []
        for (const x of areasH.map((a) => a.x).filter((v, i, a) => a.indexOf(v) === i)) {
            let state = stateOTHER
            let area = null
            bitmap.scanArea(x, Y, 1, H, (x, y, idx) => {
                const lum = getPixelLuminosity(x, y)
                const stateNew = stateTransition(state, lum)
                if (stateNew !== state) {
                    state = stateNew
                    if (state === stateBODY)
                        area = { x, y, s: 0 }
                    else if (state === stateEPILOG) {
                        if (area.s >= markerSize) {
                            areasV.push(area)
                            area = null
                        }
                    }
                }
                else if (area !== null)
                    area.s++
            })
        }
        timingEnd()

        /*  intersect horizontal and vertical areas  */
        const areas = []
        for (const areaH of areasH) {
            for (const areaV of areasV) {
                if (   areaH.x === areaV.x
                    && areaH.y === areaV.y
                    && Math.abs(areaH.s - areaV.s) < Math.max((((areaH.s + areaV.s) / 2) * 0.10), 1)) {
                    areas.push({ x: areaH.x, y: areaH.y, w: areaH.s, h: areaV.s })
                }
            }
        }

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
            const slices = {
                dx: slice(area.w, markerSize),
                dy: slice(area.h, markerSize)
            }

            /*  optionally create grid image  */
            const grid = {
                w: area.w + (markerSize - 1),
                h: area.h + (markerSize - 1),
                c: []
            }

            /*  iterate over all grid cells  */
            const matrix = []
            for (let j = 0; j < slices.dy.length - 1; j++) {
                for (let i = 0; i < slices.dx.length - 1; i++) {
                    /*  determine cell block  */
                    const x = area.x + slices.dx[i]
                    const y = area.y + slices.dy[j]
                    const w = slices.dx[i + 1] - slices.dx[i]
                    const h = slices.dy[j + 1] - slices.dy[j]

                    /*  optionally place cell block into grid image  */
                    if (this.options.provideGrid) {
                        grid.c.push({
                            i, j,
                            x: slices.dx[i], y: slices.dy[j], w, h,
                            d: bitmap.getImageData(x, y, w, h)
                        })
                    }

                    /*  calculate (weighted) average luminosity of cell block  */
                    const lums = []
                    bitmap.scanArea(x, y, w, h, (x, y, idx) => {
                        lums.push(getPixelLuminosity(x, y))
                    })
                    let lum = 0
                    let cnt = 0
                    for (let k = 0; k < lums.length; k++) {
                        if (k === Math.round(lums.length / 2)) {
                            lum += 5 * lums[k]
                            cnt += 5
                        }
                        else {
                            lum += 1 * lums[k]
                            cnt += 1
                        }
                    }
                    lum /= cnt
                    matrix.push(lum < threshold ? 1 : 0)
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

            /*  optionally export grid  */
            if (this.options.provideGrid)
                result.grid = grid

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
            timings.total = timings.step.reduce((a, b) => a + b, 0)
            result.timing = timings
        }

        return result
    }
}

module.exports = {
    Recognizer
}

