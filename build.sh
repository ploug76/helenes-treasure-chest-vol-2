#!/bin/bash
# Build index.html from src.html: version-stamp the scripts, bump the service worker, inject the shared Peter's Arcade leaderboard.
set -e
D=/workspace/helene-vol2/game
V=${V:-$(cat $D/.ver 2>/dev/null || echo 1)}
sed "s/\.js?v=[0-9]*/.js?v=$V/g" $D/src.html > $D/index.html
sed -i "s/V=P+'v[0-9]*'/V=P+'v$V'/; s/\.js?v=[0-9]*/.js?v=$V/g" $D/sw.js
python3 - <<'PY'
import sys,os
sys.path.insert(0,'/workspace/leaderboard')
import inject
REPO='helenes-treasure-chest-vol-2';p='/workspace/helene-vol2/game/index.html'
inject.G[REPO]=dict(max=10**8,boards=[('journey','Journey'),('rush','Treasure Rush')],
 watch=[dict(when="state==='over'&&!!G&&G.mode==='rush'",score="G.score",board="'rush'"),
        dict(when="(state==='wdone'||state==='finale')&&!!G&&G.mode==='journey'",score="journeyTotal()",board="'journey'",silent=True)])
os.environ['PALB_CONFIG_FILE']='/workspace/leaderboard/config.firestore.js';os.environ['PALB_TITLE']="Helene's Treasure Chest 2"
inject.inject(REPO,p)
s=open(p,encoding='utf-8').read();assert 'vault' not in s.lower(),'vault leaked'
print('lb ok',len(s))
PY
echo built v$V
