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

/*  pre-defined markers  */
const markerDef = {
    "22N": { m: 2, b: 2, x: 2, y: 2, o: 0, h: 2, s: 1, d:  1 /* [0..2[    */ },
    "33O": { m: 2, b: 2, x: 3, y: 3, o: 3, h: 3, s: 0, d:  3 /* [0..8[    */ },
    "33N": { m: 2, b: 2, x: 3, y: 3, o: 0, h: 4, s: 0, d:  5 /* [0..32[   */ },
    "44O": { m: 2, b: 2, x: 4, y: 4, o: 3, h: 4, s: 0, d:  9 /* [0..512[  */ },
    "44N": { m: 2, b: 2, x: 4, y: 4, o: 0, h: 4, s: 1, d: 11 /* [0..2048[ */ },
    "55O": { m: 2, b: 2, x: 5, y: 5, o: 3, h: 5, s: 0, d: 17 /*           */ },
    "55N": { m: 2, b: 2, x: 5, y: 5, o: 0, h: 5, s: 0, d: 20 /*           */ },
    "66O": { m: 2, b: 2, x: 6, y: 6, o: 3, h: 6, s: 0, d: 27 /*           */ },
    "66N": { m: 2, b: 2, x: 6, y: 6, o: 0, h: 6, s: 0, d: 30 /*           */ }
}

module.exports = {
    markerDef
}

