#!/bin/sh
# Copy the latest app from the project folder into ./public (run from repo root), then commit and push.
SRC=/mnt/project-files/easystudy/app
rm -rf public && mkdir public
(cd "$SRC" && tar cf - --exclude=./docs --exclude='bundle.*' .) | tar xf - -C public
git add -A && git commit -m "Sync app" && git push
