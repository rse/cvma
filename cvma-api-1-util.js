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

/*  convert units (cm in px pt)  */
const convertUnit = (num, from, to) => {
    if (from === to)
        return num

    /*  convert from cm/in/px to pt  */
    if      (from === "cm") num = (num / 2.54) * 72
    else if (from === "in") num = num * 72
    else if (from === "px") num = num * 0.75

    /*  convert from pt to cm/in/px  */
    if      (to === "cm") num = (num / 72) * 2.54
    else if (to === "in") num = num / 72
    else if (to === "px") num = num * 1.333333

    return num
}

/*  convert number to particular unit (cm in px pt)  */
const convertNum = (num, to) => {
    let from = "pt"
    if (typeof num === "string") {
        const m = num.match(/^([-+]?[\d.]+)(cm|in|px|pt)?$/)
        if (m !== null && m[2]) {
            num  = parseFloat(m[1])
            from = m[2]
        }
    }
    return convertUnit(num, from, to)
}

/*  provide high-resolution timer  */
const makeTimer = (resolution = "ns") => {
    const start = process.hrtime.bigint()
    return () => {
        const end = process.hrtime.bigint()
        let duration = end - start
        if (resolution === "us")
            duration /= 1000n
        else if (resolution === "ms")
            duration /= (1000n * 1000n)
        return BigInt.asUintN(64, duration)
    }
}

module.exports = {
    convertUnit,
    convertNum,
    makeTimer
}

