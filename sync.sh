#!/bin/sh
# Copy the latest app from the project folder into ./public (run from repo root), then commit and push.
SRC=/mnt/project-files/easystudy/app
python3 /mnt/project-files/easystudy/tools/build-app.py || exit 1   # joins css/js into css/app.css, js/app-first.js, js/app-rest.js
rm -rf public && mkdir public
(cd "$SRC" && tar cf - --exclude=./docs --exclude='bundle.*' .) | tar xf - -C public
# list of sounds/pictures with a short fingerprint each: the app kept on the device downloads again only the ones that changed (app/sw.js)
python3 -c "
import os,hashlib,json
out={}
for d,_,fs in os.walk('public'):
  for f in fs:
    if f.rsplit('.',1)[-1].lower() in ('mp3','wav','ogg','m4a','png','jpg','jpeg','webp','gif','svg','woff','woff2','ttf'):
      p=os.path.join(d,f); out[os.path.relpath(p,'public').replace(os.sep,'/')]=hashlib.md5(open(p,'rb').read()).hexdigest()[:8]
json.dump(out,open('public/media.json','w'),separators=(',',':'),sort_keys=True)
"
# app version: hash of code/text files (media.json among them, so a changed sound/picture is a new version too); index.html carries it, version.json holds the newest
V=$(cd public && find . -type f \( -name '*.js' -o -name '*.css' -o -name '*.json' -o -name '*.html' \) ! -name version.json -print0 | sort -z | xargs -0 cat | sha1sum | cut -c1-12)
sed -i "s|<head>|<head><script>window.APP_V='$V'</script>|" public/index.html
echo "{\"v\":\"$V\"}" > public/version.json
git add -A && git commit -q -m "Sync app: library pictures (normalized, merged, new), picture key map" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01PPqajSzbLZVpvKKERLLdiZ" && git push
