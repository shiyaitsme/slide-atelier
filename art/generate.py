import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os, sys

OUT = (sys.argv[1] if len(sys.argv) > 1 else "art").rstrip("/") + "/"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)



def noise(w,h,scale,seed):
    r=np.random.default_rng(seed)
    small=r.random((max(2,h//scale),max(2,w//scale))).astype(np.float32)
    im=Image.fromarray((small*255).astype(np.uint8)).resize((w,h),Image.BICUBIC)
    return np.asarray(im,np.float32)/255-0.5


def foam(w,h,n,seed,invert=False,width=2.2,name="foam"):
    r=np.random.default_rng(seed)
    ys,xs=np.mgrid[0:h,0:w].astype(np.float32)
    wx=xs+noise(w,h,160,seed+1)*150+noise(w,h,60,seed+2)*40
    wy=ys+noise(w,h,160,seed+3)*150+noise(w,h,60,seed+4)*40
    pts=r.random((n,2))*[w,h]
    d1=np.full((h,w),1e9,np.float32); d2=d1.copy()
    for px,py in pts:
        d=np.sqrt((wx-px)**2+(wy-py)**2)
        m=d<d1
        d2=np.where(m,d1,np.minimum(d2,d)); d1=np.where(m,d,d1)
    wv=width*(1+2.2*(noise(w,h,120,seed+5)+0.5)**2*2)   # varying membrane thickness
    gap=d2-d1
    e=np.exp(-(gap/wv)**2)
    # thick webbing where cells meet: soft falloff
    web=np.exp(-(gap/(wv*7))**2)*0.35
    base=Image.fromarray(np.clip(e*255,0,255).astype(np.uint8))
    g1=np.asarray(base.filter(ImageFilter.GaussianBlur(5)),np.float32)
    g2=np.asarray(base.filter(ImageFilter.GaussianBlur(16)),np.float32)
    a=np.asarray(base,np.float32)+g1*0.8+g2*0.7+web*160
    a=np.clip(a,0,255)
    if invert: a=255-a
    Image.fromarray(a.astype(np.uint8)).convert("RGB").save(OUT+name+".png")


def ribs(w,h,name="ribs"):
    S=2
    im=Image.new("L",(w*S,h*S),240)
    d=ImageDraw.Draw(im)
    n=17
    def spine(t):
        return (w*S*(0.16+0.42*t+0.08*np.sin(t*3)), h*S*(0.06+0.88*t))
    # spine as tapering blob chain
    for i in range(n):
        t=i/(n-1); sx,sy=spine(t); size=1-0.6*t
        # rib: curved tapering band
        L=w*S*0.62*size; hgt=h*S*0.2*size
        up=[];lo=[]
        for k in range(50):
            u=k/49
            x=sx+L*u; y=sy-np.sin(u*np.pi*0.95)*hgt+u*u*h*S*0.12
            th=(26*size+4)*(1-u)**0.8*S/2+1.5
            up.append((x,y-th)); lo.append((x,y+th))
        d.polygon(up+lo[::-1],fill=10)
        r=(30*size+8)*S/1.6
        d.ellipse([sx-r,sy-r*0.9,sx+r,sy+r*0.9],fill=6)
        d.polygon([(sx-r*0.7,sy-r*0.5),(sx-r*0.05,sy-r*2.3),(sx+r*0.6,sy-r*0.5)],fill=6)
        # fine membrane filaments toward next rib
        if i<n-1:
            nx,ny=spine((i+1)/(n-1)); s2=1-0.6*(i+1)/(n-1)
            for k in range(1,5):
                u=0.18*k
                x1=sx+L*u; y1=sy-np.sin(u*np.pi*0.95)*hgt+u*u*h*S*0.12
                x2=nx+w*S*0.62*s2*u; y2=ny-np.sin(u*np.pi*0.95)*h*S*0.2*s2+u*u*h*S*0.12
                d.line([(x1,y1),(x2,y2)],fill=60,width=2)
    im=im.resize((w,h),Image.LANCZOS)
    sh=np.asarray(im.filter(ImageFilter.GaussianBlur(10)),np.float32)
    a=np.asarray(im,np.float32)
    a=np.clip(a-(240-sh)*0.35,0,255)
    Image.fromarray(a.astype(np.uint8)).convert("RGB").save(OUT+name+".png")


def chrome(w,h,name="chrome"):
    ys,xs=np.mgrid[0:h,0:w].astype(np.float32)
    f=np.zeros((h,w),np.float32); r=np.random.default_rng(4)
    for c in range(4):
        x,y=w*(0.2+0.6*r.random()),h*(0.2+0.6*r.random()); ang=r.random()*6.28
        for k in range(16):
            sg=r.uniform(38,80)*(1-k/30)
            f+=np.exp(-((xs-x)**2+(ys-y)**2)/(2*sg**2))
            ang+=r.normal(0,0.45); step=sg*1.1
            x+=np.cos(ang)*step; y+=np.sin(ang)*step
    for _ in range(10):
        x,y,sg=r.random()*w,r.random()*h,r.uniform(10,22)
        f-=0.9*np.exp(-((xs-x)**2+(ys-y)**2)/(2*sg**2))
    F=Image.fromarray(np.clip(f*120,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
    fs=np.asarray(F,np.float32)/120
    mask=np.clip((f-0.42)*30,0,1)
    hgt=np.sqrt(np.clip(f-0.40,0,None))*60
    gy,gx=np.gradient(hgt)
    nx,ny=-gx*1.1,-gy*1.1; nz=np.ones_like(nx)
    ln=np.sqrt(nx**2+ny**2+nz**2); nx,ny,nz=nx/ln,ny/ln,nz/ln
    spec=np.clip(-0.45*nx-0.55*ny+0.7*nz,0,1)**24
    env=0.5+0.5*np.sin(ny*7+nx*3+0.8)
    shade=np.clip(0.10+0.62*env**1.5+0.9*spec,0,1)
    sh=Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(22))
    sh=np.roll(np.asarray(sh,np.float32)/255,(26,16),(0,1)); sh[:26,:]=0; sh[:,:16]=0
    res=242*(1-mask)+shade*255*mask-sh*60*(1-mask)
    Image.fromarray(np.clip(res,0,255).astype(np.uint8)).convert("RGB").save(OUT+name+".png")


foam(1600,900,30,11,name="foam_dark")
foam(900,1100,18,5,name="foam_tall")
foam(900,900,14,21,invert=True,width=3.0,name="foam_light")
ribs(1100,1100)
chrome(1100,1100)
chrome(1600,900,name="chrome_wide")
print("ok")
