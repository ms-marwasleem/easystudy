#!/bin/sh
# Copy the latest app from the project folder into ./public (run from repo root), then commit and push.
SRC=/mnt/project-files/easystudy/app
rm -rf public && mkdir public
(cd "$SRC" && tar cf - --exclude=./docs --exclude='bundle.*' .) | tar xf - -C public
# app version: hash of code/text files (not sounds/pictures); index.html carries it, version.json holds the newest
V=$(cd public && find . -type f \( -name '*.js' -o -name '*.css' -o -name '*.json' -o -name '*.html' \) ! -name version.json -print0 | sort -z | xargs -0 cat | sha1sum | cut -c1-12)
sed -i "s|<head>|<head><script>window.APP_V='$V'</script>|" public/index.html
echo "{\"v\":\"$V\"}" > public/version.json
git add -A && git commit -m "Sync app" && git push
