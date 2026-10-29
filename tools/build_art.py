import sys;sys.path.insert(0,'/workspace/taco-game/art/_tools')
from keylib import load,key,items,fit
from PIL import Image,ImageDraw,ImageFilter,ImageFont,ImageEnhance
import os
G='/workspace/helene-vol2/gen/';O='/workspace/helene-vol2/game/'
import numpy as np
from scipy import ndimage as ndi
def floodkey(img,hard=110):
    a=np.asarray(img).astype(np.float32);kc=np.median(np.concatenate([a[:4].reshape(-1,3),a[-4:].reshape(-1,3)]),axis=0)
    d=np.sqrt(((a-kc)**2).sum(-1));bg=d<hard;lab,n=ndi.label(bg)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bgc=np.isin(lab,list(edge));bgc=ndi.binary_dilation(bgc,iterations=1)
    solid=~bgc;dark=a.sum(-1)<200;solid=ndi.binary_fill_holes(solid|ndi.binary_closing(dark,iterations=2));bgc=~solid
    al=np.where(bgc,0,255).astype(np.float32);al=ndi.gaussian_filter(al,0.7)
    out=a.copy();band=ndi.binary_dilation(bgc,iterations=3)&~bgc
    lim=np.maximum(out[...,0],out[...,2]);g=out[...,1];m=band&(g>lim+10);g[m]=lim[m]+10
    return Image.fromarray(np.dstack([out.clip(0,255),al]).astype(np.uint8),'RGBA')
def sq(im,S):
    # center a keyed sprite in an SxS cell (pad 6%)
    w,h=im.size;s=(S*0.9)/max(w,h);im=im.resize((max(1,round(w*s)),max(1,round(h*s))),Image.LANCZOS)
    c=Image.new('RGBA',(S,S));c.paste(im,((S-im.size[0])//2,(S-im.size[1])//2),im);return c
# gems atlas: 8 x 112px
gk=floodkey(load(G+'gems.jpg'));g=items(gk,8,grid_rows=2)
S=112;atl=Image.new('RGBA',(S*8,S))
for i,(im,_) in enumerate(g):atl.paste(sq(im,S),(i*S,0))
atl.save(O+'art/gems.webp','WEBP',quality=88,method=6)
# chests: 6 x 220px
ck=key(load(G+'chests.jpg'));c=items(ck,6,grid_rows=2)
for i,(im,_) in enumerate(c):sq(im,220).save(O+f'art/chest{i}.webp','WEBP',quality=80,method=6)
# backgrounds 450x800, q55
for n in ['rose','sea','orchard','snow','lagoon','palace']:
    load(G+f'bg_{n}.jpg').resize((450,800),Image.LANCZOS).save(O+f'art/bg_{n}.webp','WEBP',quality=55,method=6)
load(G+'map.jpg').resize((540,960),Image.LANCZOS).save(O+'art/map.webp','WEBP',quality=60,method=6)
p=load(G+'helene_portrait.jpg');p.resize((360,480),Image.LANCZOS).save(O+'art/helene.webp','WEBP',quality=70,method=6)
# round face badge (crop face)
f=p.crop((300,200,720,620)).resize((160,160),Image.LANCZOS).convert('RGBA');m=Image.new('L',(160,160));ImageDraw.Draw(m).ellipse((0,0,159,159),fill=255);f.putalpha(m);f.save(O+'art/face.webp','WEBP',quality=75,method=6)
for f_ in sorted(os.listdir(O+'art')):print(f_,os.path.getsize(O+'art/'+f_))
