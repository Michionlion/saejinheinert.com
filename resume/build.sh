#!/bin/bash

# DETERMINE PATH TO SCRIPT DIRECTORY
pushd . > /dev/null
SCRIPT_PATH="${BASH_SOURCE[0]}"
if ([ -h "${SCRIPT_PATH}" ]); then
    while([ -h "${SCRIPT_PATH}" ]); do cd `dirname "$SCRIPT_PATH"`;
    SCRIPT_PATH=`readlink "${SCRIPT_PATH}"`; done
fi
cd `dirname ${SCRIPT_PATH}` > /dev/null
SCRIPT_PATH=`pwd`;
popd > /dev/null

# VARS
SOURCE=$(readlink -f "$SCRIPT_PATH/resume.pdf")
TARGET=$(readlink -f "$SCRIPT_PATH/../static/resume.pdf")

# deploy latex generated pdf to static site
command cp "$SOURCE" "$TARGET"

echo -e "\e[1;32mDEPLOYED!\e[0m"
echo -e "\e[33m$SOURCE\e[0m"
echo -e "  \e[1;31m➥\e[0m  \e[32m$TARGET\e[0m"
echo
# optionally add, commit, and push
read -r -p 'Commit and Push? (y/n) ' ans;
if [ "$ans" == "y" ] || [ -z "${ans// }" ]; then
    git add "$TARGET"
    git status
    read -r -p 'Message: ' ans
    if [[ -z "${ans// }" ]]; then
        git commit -m "updated resume"
    else
        git commit -m "$ans"
    fi
fi
