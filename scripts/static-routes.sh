#!/bin/sh
# Gives the pages linked from outside the site, such as the App Store's
# support and privacy policy links, an index.html of their own in the build,
# so GitHub Pages answers them with a 200. Anything else still goes through
# 404.html, which shows the page but answers 404, which App Review can take
# for a broken link.
set -eu

for route in support privacy; do
    mkdir -p "build/$route"
    cp build/index.html "build/$route/index.html"
done
