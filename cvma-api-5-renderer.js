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
const hammingCode              = require("hamming-code")

/*  internal requirements  */
const { convertNum }           = require("./cvma-api-1-util.js")
const { markerDef }            = require("./cvma-api-2-defs.js")
const { VectorSVG, VectorPDF } = require("./cvma-api-3-vector.js")

/*  the renderer API class  */
class Renderer {
    constructor (options = {}) {
        /*  provide parameter defaults  */
        this.options = Object.assign({}, {
            outputFormat:    "svg",
            markerType:      "66O",
            canvasWidth:     "0",
            canvasHeight:    "0",
            markerPositionX: "0",
            markerPositionY: "0",
            markerHandle:    "tl",
            markerPixelSize: "0.1cm",
            markerColorBG:   "transparent",
            markerColorFG:   "#000000"
        }, options)

        /*  sanity check parameters  */
        if (markerDef[this.options.markerType] === undefined)
            throw new Error("invalid marker type")
        if (!this.options.outputFormat.match(/^(?:svg|pdf)/))
            throw new Error("invalid output format")

        /*  unit-convert parameters  */
        this.options.canvasWidth     = convertNum(this.options.canvasWidth,     "pt")
        this.options.canvasHeight    = convertNum(this.options.canvasHeight,    "pt")
        this.options.markerPositionX = convertNum(this.options.markerPositionX, "pt")
        this.options.markerPositionY = convertNum(this.options.markerPositionY, "pt")
        this.options.markerPixelSize = convertNum(this.options.markerPixelSize, "pt")
    }

    /*  API method for rendering marker  */
    async render (data) {
        /*  sanity check data  */
        if (typeof data !== "number")
            throw new Error("require numeric data")
        if (data !== parseInt(data, 10))
            throw new Error("require integer data")
        const marker = markerDef[this.options.markerType]
        if (data < 0 || data >= Math.pow(2, marker.d))
            throw new Error("data out of range")

        /*  determine renderer  */
        let Vector
        if (this.options.outputFormat === "svg")
            Vector = VectorSVG
        else if (this.options.outputFormat === "pdf")
            Vector = VectorPDF

        /*  calculate marker width/height in pixels  */
        const w = marker.x + 2 * (marker.b + marker.m)
        const h = marker.y + 2 * (marker.b + marker.m)

        /*  calculate canvas size  */
        const canvasWidth  = this.options.canvasWidth > 0 ?
            this.options.canvasWidth  : w * this.options.markerPixelSize
        const canvasHeight = this.options.canvasHeight > 0 ?
            this.options.canvasHeight : h * this.options.markerPixelSize

        /*  determine marker position on canvas  */
        let markerPositionX = this.options.markerPositionX < 0 ?
            canvasWidth + this.options.markerPositionX : this.options.markerPositionX
        let markerPositionY = this.options.markerPositionY < 0 ?
            canvasHeight + this.options.markerPositionY : this.options.markerPositionY

        /*  adjust for different position handle  */
        if (this.options.markerHandle === "tr")
            markerPositionX -= w * this.options.markerPixelSize
        else if (this.options.markerHandle === "br") {
            markerPositionX -= w * this.options.markerPixelSize
            markerPositionY -= h * this.options.markerPixelSize
        }
        else if (this.options.markerHandle === "bl")
            markerPositionY -= h * this.options.markerPixelSize

        /*  create rendering instance  */
        const vector = new Vector({
            canvasWidth, canvasHeight,
            markerPositionX, markerPositionY,
            markerPixelSize: this.options.markerPixelSize
        })

        /*  draw margin and border  */
        for (let k = 0; k < marker.m + marker.b; k++) {
            const color = (k < marker.b ? this.options.markerColorBG : this.options.markerColorFG)
            for (let i = k; i < w - k; i++) {
                vector.set(i, k, color)
                vector.set(i, h - k - 1, color)
            }
            for (let i = k + 1; i < h - k - 1; i++) {
                vector.set(k, i, color)
                vector.set(w - k - 1, i, color)
            }
        }

        /*  start no pixels at all  */
        const pixels = []
        for (let i = 0; i < marker.x * marker.y; i++)
            pixels[i] = undefined

        /*  optionally add orientation pixels  */
        if (marker.o > 0) {
            pixels[0] = true
            pixels[marker.x * (marker.y - 1)] = true
            pixels[marker.x * marker.y - 1] = false
        }

        /*  add data pixels (with hamming code)  */
        let digits = ""
        for (let i = 0; i < marker.d; i++) {
            digits = ((data & 0o1) === 1 ? "1" : "0") + digits
            data = data >> 1
        }
        digits = hammingCode.encode(digits)
        let p = 0
        while (digits.length > 0) {
            while (pixels[p] !== undefined)
                p++
            pixels[p++] = (digits[0] === "1")
            digits = digits.slice(1)
        }

        /*  render the pixels  */
        for (let i = 0; i < marker.x * marker.y; i++) {
            const ry = Math.trunc(i / marker.x)
            const rx = i % marker.x
            vector.set(
                marker.b + marker.m + rx,
                marker.b + marker.m + ry,
                pixels[i] === true ?
                    this.options.markerColorFG :
                    this.options.markerColorBG
            )
        }

        /*  render the image  */
        const output = await vector.render()
        return output
    }
}

module.exports = {
    Renderer
}

