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
const PDFKit       = require("pdfkit")
const SVGjs        = require("@svgdotjs/svg.js")
const SVGdom       = require("svgdom")
const concatStream = require("concat-stream")

/*  rendering abstract class  */
class VectorBase {
    constructor (options = {}) {
        this.options = Object.assign({}, {
            canvasWidth:       0,
            canvasHeight:      0,
            markerPositionX:   0,
            markerPositionY:   0,
            markerPixelSize:   0
        }, options)
    }
}

/*  SVG rendering class  */
class VectorSVG extends VectorBase {
    constructor (...args) {
        super(...args)
        const window = SVGdom.createSVGWindow()
        const document = window.document
        SVGjs.registerWindow(window, document)
        this.canvas = SVGjs.SVG(document.documentElement)
        this.canvas.size(this.options.canvasWidth, this.options.canvasHeight)
    }
    set (x, y, color) {
        if (color === "transparent")
            return
        this.canvas
            .rect(this.options.markerPixelSize, this.options.markerPixelSize)
            .fill(color)
            .move(this.options.markerPositionX + x * this.options.markerPixelSize,
                this.options.markerPositionY + y * this.options.markerPixelSize)
    }
    async render () {
        return this.canvas.svg()
    }
}

/*  PDF rendering class  */
class VectorPDF extends VectorBase {
    constructor (...args) {
        super(...args)
        this.doc = new PDFKit({ autoFirstPage: false })
        this.doc.addPage({
            size: [ this.options.canvasWidth, this.options.canvasHeight ],
            margin: 0
        })
    }
    set (x, y, color) {
        if (color === "transparent")
            return
        this.doc
            .rect(
                this.options.markerPositionX + x * this.options.markerPixelSize,
                this.options.markerPositionY + y * this.options.markerPixelSize,
                this.options.markerPixelSize, this.options.markerPixelSize)
            .fill(color)
    }
    async render () {
        return new Promise((resolve, reject) => {
            this.doc.pipe(concatStream((buffer) => {
                resolve(buffer)
            }))
            this.doc.end()
        })
    }
}

module.exports = {
    VectorSVG,
    VectorPDF
}

