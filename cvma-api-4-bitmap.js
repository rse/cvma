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
const Jimp         = require("jimp")

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

module.exports = {
    BitmapJimp,
    BitmapCanvas
}

