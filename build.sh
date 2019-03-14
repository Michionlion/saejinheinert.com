#!/bin/sh

SASS_INPUT="static/css/theme.scss"
SASS_OUTPUT="static/css/theme.css"
JS_INPUT="static/js/menu.js"
JS_OUTPUT="static/js/theme.js"

SASS_EXEC="npx sass"

buildJS() {
    echo "\033[32mBuilding js...\033[0m"
    cp "$JS_INPUT" "$JS_OUTPUT"
    echo "\033[1;32mBuilt js!\033[0m"
}

buildCSS() {
    printf "\033[32mBuilding css...\033[0m\n"
    $SASS_EXEC "$SASS_INPUT" "$SASS_OUTPUT"
    # TODO: in the future could minify here
    printf "\033[1;32mBuilt css!\033[0m\n"
}

clean() {
    printf "\033[34mCleaning css...\033[0m\n"
    command rm -rf "$SASS_OUTPUT"

    printf "\033[34mCleaning js...\033[0m\n"
    command rm -rf "$JS_OUTPUT"

    printf "\033[1;32mCleaned!\033[0m\n"
}

TARGET=$1

if [ "$TARGET" = "js" ]; then
    # build js
    buildJS
elif [ "$TARGET" = "css" ]; then
    # build css
    buildCSS
elif [ "$TARGET" = "serve" ]; then
    buildJS
    buildCSS
    hugo server
elif [ "$TARGET" = "clean" ]; then
    # clean built files
    clean
else
    # do both
    buildJS
    buildCSS
fi
