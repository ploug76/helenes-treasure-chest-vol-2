from PIL import Image,ImageDraw,ImageFont,ImageFilter
import random,math
G='/workspace/helene-vol2/gen/';O='/workspace/helene-vol2/game/'
SF='/usr/share/fonts/truetype/sand-box/custom/Source Serif Pro/SourceSerifPro-Black.ttf'
SANS='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def base(W,H):
    a=Image.open(G+'cover_art.jpg').convert('RGB');a=a.resize((W,round(a.size[1]*W/a.size[0])),Image.LANCZOS)
    y=(a.size[1]-H)//2;a=a.crop((0,y,W,y+H)).convert('RGBA')
    d=ImageDraw.Draw(a);s=W/1200
    def txt(xy,t,sz,fill,stroke,sw,font=SF,anchor='mm'):
        f=ImageFont.truetype(font,round(sz*s));d.text((xy[0]*s,xy[1]*s),t,font=f,fill=fill,stroke_width=round(sw*s),stroke_fill=stroke,anchor=anchor)
    # soft dark glow behind title
    g=Image.new('L',(W,H));gd=ImageDraw.Draw(g);gd.ellipse((640*s,90*s,1180*s,560*s),fill=150);g=g.filter(ImageFilter.GaussianBlur(40*s))
    a=Image.composite(Image.new('RGBA',(W,H),(30,6,45,255)),a,g);d=ImageDraw.Draw(a)
    txt((910,170),"Helene's",88,(255,232,150),(110,45,0),5)
    txt((910,270),"Treasure",96,(255,224,120),(110,45,0),5)
    txt((910,370),"Chest",104,(255,224,120),(110,45,0),5)
    # Volume 2 ribbon
    rw,rh=330*s,62*s;cx,cy=910*s,470*s
    d.rounded_rectangle((cx-rw/2,cy-rh/2,cx+rw/2,cy+rh/2),radius=rh/2,fill=(245,180,50),outline=(255,248,214),width=max(2,round(4*s)))
    f=ImageFont.truetype(SANS,round(36*s));d.text((cx,cy),"VOLUME 2",font=f,fill=(58,22,0),anchor='mm')
    f=ImageFont.truetype(SANS,round(23*s));d.text((910*s,545*s),"Six lands · Friendly chests · Sparkles",font=f,fill=(255,255,255),anchor='mm',stroke_width=round(3*s),stroke_fill=(40,8,50))
    return a
c=base(1200,630);c.convert('RGB').save(O+'cover.jpg',quality=84,optimize=True,progressive=True)
# animated arcade cover 720x378: twinkling sparkles (few frames, small palette)
b=base(720,378);random.seed(5);pts=[(random.randint(380,710),random.randint(10,370),random.random()*6.28) for _ in range(22)]+[(random.randint(40,260),random.randint(150,330),random.random()*6.28) for _ in range(10)]
frames=[]
for i in range(10):
    f=b.copy();d=ImageDraw.Draw(f)
    for (x,y,ph) in pts:
        a=(math.sin(ph+i*0.628)+1)/2;r=1+a*5
        if a<.25:continue
        col=(255,250,215,int(255*a));d.line((x-r*1.8,y,x+r*1.8,y),fill=col,width=2);d.line((x,y-r*1.8,x,y+r*1.8),fill=col,width=2);d.ellipse((x-r*.6,y-r*.6,x+r*.6,y+r*.6),fill=col)
    frames.append(f.convert('RGB').quantize(colors=160,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE))
frames[0].save(O+'cover.gif',save_all=True,append_images=frames[1:],duration=110,loop=0,optimize=True)
# icons
p=Image.open(G+'helene_portrait.jpg').convert('RGB');sq=p.crop((96,140,96+700,140+700))
for n in (192,512):
    im=sq.resize((n,n),Image.LANCZOS).quantize(colors=200,method=Image.Quantize.MEDIANCUT);im.save(O+f'icon-{n}.png',optimize=True)
import os
for f in ['cover.jpg','cover.gif','icon-192.png','icon-512.png']:print(f,os.path.getsize(O+f))
