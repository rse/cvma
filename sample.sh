#!/bin/sh

#   create marker overlay PDF
node cvma-cli.js render \
    --marker-type=66O \
    --output-format=pdf \
    --canvas-width=29.7cm \
    --canvas-height=21.0cm \
    --marker-pixel-size=0.075cm \
    --marker-position-x=-0.2cm \
    --marker-position-y=-0.9cm \
    --marker-handle=br \
    --output-file=sample-marker.pdf \
    1234567

#   merge overlay PDF onto a sample content PDF
pdfbox OverlayPDF sample.pdf sample-marker.pdf -position foreground sample-content.pdf

#   render sample content PDF in a typical video resolution
rm -f sample-content.png
pdftocairo -png -scale-to-x 1200 -scale-to-y -1 -singlefile sample-content.pdf sample-content

#   recognize the marker again
rm -f sample.html
node cvma-cli.js recognize \
    --marker-type=66O \
    --scan-position-x=-200px \
    --scan-position-y=0 \
    --scan-width=200px \
    --scan-height=0 \
    --input-file=sample-content.png \
    --detect-dark-light=no \
    --provide-area \
    --provide-matrix \
    --provide-errors \
    --provide-grid \
    --provide-timing \
    --output-format="html" \
    --output-file="sample-result.html"
cat sample-result.html

