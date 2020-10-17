
CVMA
====

**Computer Vision Marker &mdash; Rendering and Recognition**

<p/>
<img src="https://nodei.co/npm/cvma.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/rse/cvma.png" alt=""/>

Abstract
--------

Computer Vision Marker (CVMA) is a small Application Programming
Interface (API) and Command-Line Interface (CLI) to render and recognize
simple marker tags for Computer Vision (CV).

CVMA is a very opinionated and specialized solution, primarily intended
for a special scenario only:

1. CVMA is used to encode 1, 3, 5, 9, 11, 17, 20, 27 or
   30 bit of payload data (usually representating an increasing page
   number and/or a page duration) into optical 2x2, 3x3, 4x4, 5x5 or 6x6
   matrices of black/white pixels and render these matrices as marker
   tags in PDF or SVG format.
2. These marker tags are then overlayed to the
   pages of a content document in order to tag the pages and let their
   optical occurence being automatically tracked.
3. These document pages are then displayed on a tablet computer in a
   zoomed and shifted, but not perspectively distorted, fashion during a
   live-produced video session.
4. During this video session the video stream of the tablet is continuously
   captured and the marker tags being recognized and decoded again in order
   to control a table of content and progress bar on a Head-Up-Display
   (HUD) and Teleprompter of the live video session.

The effect of this scenario is that a presenter can scroll to
arbitrarily document pages on his tablet during the live video session
while a CVMA-based application closely tracks the content position on
the HUD and displays the amount of estimated presentation time on the
Teleprompter.

Installation
------------

```
$ npm install -g cvma
```

Usage
-----

The Unix manual pages for the
[API](https://github.com/rse/cvma/blob/master/cvma-api.md) and the
[CLI](https://github.com/rse/cvma/blob/master/cvma-cli.md) contain
detailed usage information.

Examples
--------

FIXME

License
-------

Copyright &copy; 2020 Dr. Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

