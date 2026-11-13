/* Dream High — engine.
   DOM does layout & type. One WebGL2 pass paints every image frame; the frame rectangles are read from the DOM,
   so CSS is the single source of truth for layout. Eight scene shaders, pixel-dissolve transitions. */
(function () {
  const Q = new URLSearchParams(location.search);
  const STATIC = Q.has('t');
  const TFIX = STATIC ? parseFloat(Q.get('t')) || 0 : null;
  const NP = 8;
  const stage = document.getElementById('stage');
  const cv = document.getElementById('gl');
  if (STATIC) document.body.classList.add('static');

  /* ---------- fit stage ---------- */
  let scale = 1;
  function fit() {
    scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
    const rs = STATIC ? 1 : Math.min(1, Math.max(.5, scale * (devicePixelRatio || 1)));
    cv.width = Math.round(1920 * rs); cv.height = Math.round(1080 * rs);
    measure();
  }

  /* ---------- frames from DOM ---------- */
  const slides = [...document.querySelectorAll('.s')];
  const frames = slides.map(() => []);
  function measure() {
    const sr = stage.getBoundingClientRect();
    slides.forEach((s, i) => {
      frames[i] = [...s.querySelectorAll('.frame')].slice(0, 8).map(el => {
        const r = el.getBoundingClientRect();
        return { r: [(r.left - sr.left) / scale, (r.top - sr.top) / scale, r.width / scale, r.height / scale], img: +el.dataset.img };
      });
    });
  }

  /* ---------- GL ---------- */
  const gl = cv.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
  if (!gl) { document.body.innerHTML = '<p style="color:#fff;padding:40px">WebGL2 required</p>'; return; }

  const VS = `#version 300 es
  in vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }`;

  const FS = `#version 300 es
  precision highp float; precision highp int;
  uniform vec2 uRes; uniform float uT, uTe, uProg; uniform vec2 uM; uniform int uPg, uPv, uN, uNp;
  uniform vec4 uF[8]; uniform float uFi[8]; uniform vec4 uFp[8]; uniform float uFpi[8];
  uniform sampler2D uT1,uT2,uT3,uT4,uT5,uT6;
  out vec4 oC;

  /* ---------- utils ---------- */
  float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+17.; a*=.5; } return s; }
  float lum(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
  float bayer(vec2 c){ vec2 m=mod(c,4.); int x=int(m.x), y=int(m.y);
    float M[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (M[x+4*y]+.5)/16.-.5; }
  vec3 T(int i, vec2 uv){ uv=clamp(uv,vec2(.002),vec2(.998));
    if(i==1) return textureLod(uT1,uv,0.).rgb; if(i==2) return textureLod(uT2,uv,0.).rgb; if(i==3) return textureLod(uT3,uv,0.).rgb;
    if(i==4) return textureLod(uT4,uv,0.).rgb; if(i==5) return textureLod(uT5,uv,0.).rgb; return textureLod(uT6,uv,0.).rgb; }
  vec2 TS(int i){ if(i==1) return vec2(textureSize(uT1,0)); if(i==2) return vec2(textureSize(uT2,0)); if(i==3) return vec2(textureSize(uT3,0));
    if(i==4) return vec2(textureSize(uT4,0)); if(i==5) return vec2(textureSize(uT5,0)); return vec2(textureSize(uT6,0)); }
  vec2 covq(float fa, vec2 q, vec2 isz, vec2 foc){ float ra=fa/(isz.x/isz.y); vec2 u=q;
    if(ra>1.) u.y=(q.y-.5)/ra+.5+(foc.y-.5)*(1.-1./ra); else u.x=(q.x-.5)*ra+.5+(foc.x-.5)*(1.-ra); return u; }
  vec2 cov(vec4 r, vec2 p, vec2 isz, vec2 foc){ return covq(r.z/r.w,(p-r.xy)/r.zw,isz,foc); }
  bool inR(vec4 r, vec2 p){ return p.x>=r.x && p.y>=r.y && p.x<r.x+r.z && p.y<r.y+r.w; }
  float halft(vec2 p,float cs,float ang){ float c=cos(ang),s=sin(ang); vec2 g=vec2(c*p.x-s*p.y,s*p.x+c*p.y)/cs; return length(fract(g)-.5); }

  /* ---------- ornament system: everything lives on a 14px cell grid ---------- */
  float voluteX(vec2 q, vec2 c, float R, float s, float ph, float P, float w){
    vec2 d=q-c; d.x*=s; float r=length(d); if(r>R||r<1.2) return 0.;
    float a=atan(d.y,d.x)+ph;
    float u=(r-a*P/6.2831853)/P; float f=fract(u); float dist=min(f,1.-f)*P; return step(dist,w); }
  float volute(vec2 q, vec2 c, float R, float s, float ph){ return voluteX(q,c,R,s,ph,4.4,1.15); }
  float rose(vec2 q, vec2 c, float R){ vec2 d=q-c; float r=length(d); float a=atan(d.y,d.x);
    float k=R*(.64+.36*cos(5.*a+1.)); return step(r,k)*step(R*.3,r); }
  float chain(vec2 q, float t){            // 01's five alternating scrolls joined by an S-curve (airy: pitch 6.6, line 0.8)
    const float CP=6.6, CW=.8; float m=0.;
    m=max(m,voluteX(q,vec2(-8.,6.),9.,1.,t,CP,CW));   m=max(m,voluteX(q,vec2(8.,22.),9.,-1.,-t,CP,CW));
    m=max(m,voluteX(q,vec2(-8.,38.),9.,1.,t,CP,CW));  m=max(m,voluteX(q,vec2(8.,54.),9.,-1.,-t,CP,CW));
    m=max(m,voluteX(q,vec2(-8.,70.),9.,1.,t,CP,CW));
    m=max(m,rose(q,vec2(9.,-4.),5.));          m=max(m,rose(q,vec2(-9.,82.),5.));
    float sx=-8.*cos(3.14159*(q.y-6.)/16.);
    m=max(m,step(abs(q.x-sx),.8)*step(6.,q.y)*step(q.y,70.));
    return m; }
  float filigree(vec2 cp, float t){        // corner piece, cp = cells from the corner
    float m=0.;
    m=max(m,volute(cp,vec2(0.),11.,1.,t));
    m=max(m,volute(cp,vec2(16.,0.),6.5,-1.,-t));
    m=max(m,volute(cp,vec2(0.,16.),6.5,-1.,-t));
    m=max(m,rose(cp,vec2(9.,9.),3.2));
    return m; }
  float lace(vec2 p, float side){          // dotted contour lace in the side margin
    float x=side<.5?p.x:1920.-p.x; if(x>92.) return 0.;
    vec2 c=floor(p/14.)+.5; float s=fbm(c*.085+vec2(3.,7.)); float band=abs(fract(s*7.)-.5);
    float on=step(band,.06)*step(.3,hash(c)); float d=length(fract(p/14.)-.5);
    return on*step(d,.2)*smoothstep(92.,34.,x); }
  float stars(vec2 p,float cs,float prob){
    vec2 g=floor(p/cs); float h=hash(g); if(h>prob) return 0.;
    vec2 o=vec2(hash(g+3.1),hash(g+7.7))*cs*.7+cs*.15; vec2 a=abs(floor((p-(g*cs+o))/4.+.5));
    float cr=(a.x+a.y<=1.)?1.:0.; if(a.x+a.y>1.&&a.x+a.y<=3.&&(a.x==0.||a.y==0.)) cr=.6;
    return cr*(.5+.5*sin(uT*2.+h*60.)); }
  float dust(vec2 p){
    vec2 pp=p+vec2(0.,uT*14.); vec2 g=floor(pp/22.); float h=hash(g); if(h>.14) return 0.;
    vec2 c=(g+vec2(hash(g+1.),hash(g+2.)))*22.; c.x+=sin(uT*.7+h*30.)*6.;
    return smoothstep(2.4,.6,length(pp-c))*(.4+.6*sin(uT*1.4+h*80.)*.5+.3); }

  vec3 ground(vec2 p){                       // 01: periwinkle to paper, cloud-warped
    vec2 q=p/vec2(1920.,1080.);
    float cl=fbm(vec2(q.x*3.,q.y*5.)+vec2(uT*.02,0.)+fbm(q*4.+uT*.03)*1.2);
    vec3 top=mix(vec3(.537,.651,.847),vec3(.718,.788,.91),cl*.9);
    float k=smoothstep(.1,.72,q.y+(cl-.5)*.2);
    vec3 c=mix(top,vec3(.969),k);
    float h=smoothstep(.34,.30,halft(p,6.,.785))*(1.-k)*.06; return c-h; }

  /* ---------- P1 cover ---------- */
  vec3 pg1(vec2 p, vec4 F[8], float FI[8], int n){
    vec3 col=ground(p); vec4 r=F[0];
    if(p.x>=r.x-4.){
      vec2 q=(p-r.xy)/r.zw; vec2 foc=vec2(.5,.3); vec2 isz=TS(1);
      vec3 ph=T(1,cov(r,p,isz,foc));
      vec2 cq=floor((p-r.xy)/14.)+.5;
      vec2 pq=cq*14./r.zw; pq.y-=.55*step(.5,pq.y); vec3 pp=T(1,covq(r.z/r.w,pq,isz,foc));
      float m=chain(cq-vec2(r.z/28.,1.),uT*.45);
      float jt=hash(cq*1.7); float mm=m*(jt>.2?1.:.3);
      float fy=smoothstep(.42,.60,q.y), fx=smoothstep(0.,.2,q.x);
      vec3 phf=mix(ph,vec3(.969),fy);
      vec3 up=mix(phf,mix(vec3(1.),pp,step(.92,jt)*.5),mm*(1.-fy)*.8);
      vec3 lo=mix(vec3(.969),pp,mm);
      vec3 res=mix(up,lo,smoothstep(.46,.64,q.y));
      res+=vec3(.9,.8,.4)*stars(p,110.,.22)*(1.-smoothstep(.35,.55,q.y));
      col=mix(col,res,fx);
    }
    return col; }

  /* ---------- P2 bubbles / refraction ---------- */
  vec3 pg2(vec2 p, vec4 F[8], float FI[8], int n){
    vec2 q0=p/vec2(1920.,1080.);
    float cl=fbm(q0*vec2(2.,4.)+vec2(uT*.015,0.));
    vec3 col=mix(vec3(.718,.722,.804),vec3(.898,.761,.769),smoothstep(.1,1.,q0.y+(cl-.5)*.3));
    col-=smoothstep(.34,.3,halft(p,7.,.785))*.035;
    vec4 r=F[0];
    if(inR(r,p)){
      vec3 bg=col;
      vec2 q=(p-r.xy)/r.zw; float asp=r.z/r.w; vec2 isz=TS(3);
      vec2 foc=vec2(.5,.5);
      vec3 base=T(3,covq(asp,q,isz,foc)); col=base;
      vec2 mm=(uM*vec2(1920.,1080.)-r.xy)/r.zw;
      for(int i=0;i<18;i++){
        float fi=float(i); float h1=hash(vec2(fi,1.3)),h2=hash(vec2(fi,2.7)),h3=hash(vec2(fi,4.1)),h4=hash(vec2(fi,9.9));
        float rad=.022+.075*h3*h3;
        vec2 c=vec2(.08+.84*h1+.03*sin(uT*.5+fi), fract(h2-uT*(.012+.02*h4))*1.3-.15);
        vec2 dm=(c-mm)*vec2(asp,1.); float dl=length(dm); c+=normalize(dm+1e-4)/vec2(asp,1.)*.08*smoothstep(.3,0.,dl);
        vec2 d=(q-c)*vec2(asp,1.); float rr=length(d)/rad;
        if(rr<1.){
          float z=sqrt(1.-rr*rr); float k=mix(1.12,-.6,z); vec2 dir=normalize(d+1e-5);
          vec3 s; s.r=T(3,covq(asp,c+(q-c)*k+dir*.004*(1.-z),isz,foc)).r;
          s.g=T(3,covq(asp,c+(q-c)*k,isz,foc)).g; s.b=T(3,covq(asp,c+(q-c)*k-dir*.004*(1.-z),isz,foc)).b;
          float fres=pow(1.-z,2.5); s=s*.86+.11*vec3(.9,.93,1.);
          s+=fres*vec3(.85,.88,.96)*.5;
          vec2 sp=d/rad-vec2(-.38,-.42); s+=smoothstep(.2,.0,length(sp))*1.1;
          vec2 sp2=d/rad-vec2(.46,.5); s+=smoothstep(.38,.0,length(sp2))*.16*vec3(1.,.9,.95);
          col=mix(col,s,smoothstep(1.,.96,rr));
        }
      }
      col=mix(col,vec3(lum(col)),.12)*vec3(1.02,1.0,1.03);
      col=col*.84+vec3(.17,.14,.2)*.55;                        // lift blacks toward the mauve ground
      float fx=smoothstep(0.,.24,q.x)*smoothstep(1.,.76,q.x)*smoothstep(1.,.84,q.y);
      col=mix(bg,col,fx);
    }
    return col; }

  /* ---------- P3 dusk / parallax from luminance ---------- */
  float warmAt(vec2 uv){ vec3 c=T(2,uv); return clamp((c.r-c.b-.05)*6.,0.,1.)*smoothstep(.4,.7,lum(c)); }
  vec3 pg3(vec2 p, vec4 F[8], float FI[8], int n){
    vec4 r=F[0]; vec2 isz=TS(2); vec2 m=uM-.5;
    vec2 uv=(cov(r,p,isz,vec2(.5,.35))-.5)/1.08+.5;
    float l0=lum(T(2,uv)); float depth=1.-smoothstep(.3,.7,l0);
    vec2 uv2=uv+m*vec2(.022,.012)*(depth*1.6-.4);
    vec3 c=T(2,uv2);
    float w=warmAt(uv2);
    vec2 cell=floor(p/10.); float pulse=.78+.22*sin(uT*1.7+hash(cell)*40.);
    float g=0.; vec2 px=1./isz;
    for(int i=0;i<12;i++){ float a=float(i)*.5236; g+=warmAt(uv2+vec2(cos(a),sin(a))*px*10.)+warmAt(uv2+vec2(cos(a),sin(a))*px*22.)*.6; }
    g/=19.2;
    vec2 q=p/vec2(1920.,1080.);
    float sh=smoothstep(.22,.95,q.y); float side=smoothstep(.7,0.,q.x)*.25;
    c=c*.62; c=mix(c,vec3(.075,.07,.11),.22+.62*sh+side);
    c=mix(c,c*vec3(.9,.86,1.08),.5);
    c+=w*vec3(.95,.74,.34)*.55*pulse+g*vec3(1.,.78,.4)*.55;
    c+=bayer(floor(p/3.))*.03;
    c+=vec3(.95,.85,.55)*stars(p,160.,.18)*(1.-smoothstep(.1,.45,q.y))*.7;
    return c; }

  /* ---------- P4 relight ---------- */
  float hgt(vec2 uv){ return lum(T(5,uv)); }
  vec3 pg4(vec2 p, vec4 F[8], float FI[8], int n){
    vec2 q0=p/vec2(1920.,1080.);
    vec3 col=vec3(.91,.894,.859)*(.96+.06*fbm(q0*3.))+(hash(p)-.5)*.0;
    vec4 r=F[0];
    if(p.x>=r.x-6.){
      vec2 isz=TS(5); vec2 uv=cov(r,p,isz,vec2(.5,.42)); vec2 px=2.5/isz;
      float hL=hgt(uv-vec2(px.x,0.)),hR=hgt(uv+vec2(px.x,0.)),hU=hgt(uv-vec2(0.,px.y)),hD=hgt(uv+vec2(0.,px.y));
      vec3 n=normalize(vec3((hL-hR)*7.,(hU-hD)*7.,1.));
      vec2 lp=uM*vec2(1920.,1080.);
      vec3 L=normalize(vec3((lp-p)/520.,.55)); float diff=clamp(dot(n,L),0.,1.);
      vec3 V=vec3(0.,0.,1.); vec3 Hh=normalize(L+V); float spec=pow(clamp(dot(n,Hh),0.,1.),38.);
      vec3 b=T(5,uv); b=b*1.1+.04; b=mix(b,vec3(lum(b)),.2)*vec3(1.02,1.0,.96);
      vec3 c=b*(.62+.62*diff)+spec*vec3(1.,.93,.82)*.42;
      float glow=smoothstep(520.,0.,length(lp-p))*.1; c+=glow*vec3(1.,.9,.75);
      float stip=step(.5+bayer(floor(p/3.)),.2-diff*.2+.0)*.08; c-=stip;
      float fx=smoothstep(0.,.1,(p.x-r.x)/r.z);
      col=mix(col,c,fx);
    }
    return col; }

  /* ---------- P5 flow field ---------- */
  vec3 pg5(vec2 p, vec4 F[8], float FI[8], int n){
    vec3 ink=vec3(.086,.09,.082); vec3 col=ink; vec4 r=F[0];
    col+=vec3(.2,.1,.28)*smoothstep(900.,0.,length(p-vec2(1250.,420.)))*.22;
    col+=vec3(.55,.12,.2)*smoothstep(500.,0.,length(p-vec2(560.,500.)))*.16;
    if(inR(r,p)){
      vec2 q=(p-r.xy)/r.zw; vec2 isz=TS(4); vec2 uv=cov(r,p,isz,vec2(.5,.5));
      vec2 fq=q*vec2(3.5,4.);
      vec2 curl=vec2(fbm(fq+vec2(uT*.11,0.)+10.)-.5,fbm(fq+vec2(0.,uT*.09))-.5);
      float hair=smoothstep(.4,.9,q.x)*(.4+.6*smoothstep(.9,.2,q.y))+smoothstep(.3,0.,q.x)*.3;
      vec2 off=curl*.075*hair;
      vec2 ca=vec2(.0035,0.)*(.5+hair);
      vec3 c; c.r=T(4,uv+off+ca).r; c.g=T(4,uv+off).g; c.b=T(4,uv+off-ca).b;
      vec3 bl=vec3(0.); vec2 px=1./isz;
      for(int i=0;i<12;i++){ float a=float(i)*.5236; bl+=T(4,uv+off+vec2(cos(a),sin(a))*px*14.)+T(4,uv+off+vec2(cos(a),sin(a))*px*32.)*.6; }
      bl/=19.2; c+=max(bl-.45,0.)*vec3(.9,.8,1.)*.9;
      c=mix(c*vec3(1.0,.96,1.04),vec3(.5,.4,.7)*lum(c),.18*(1.-lum(c)));
      c=c+vec3(.18,.05,.1)*smoothstep(.5,0.,lum(c))*.4;
      float fm=smoothstep(0.,.16,q.x)*smoothstep(1.,.84,q.x)*smoothstep(0.,.1,q.y)*smoothstep(1.,.88,q.y);
      col=mix(col,c,fm);
    }
    col+=vec3(.95,.88,1.)*dust(p)*.55;
    return col; }

  /* ---------- P6 datamosh ---------- */
  vec3 pg6(vec2 p, vec4 F[8], float FI[8], int n){
    vec2 q0=p/vec2(1920.,1080.);
    vec3 col=vec3(.89,.925,.97); col-=smoothstep(.34,.3,halft(p,8.,.785))*.045*(1.-q0.y);
    vec4 r=F[0];
    col=mix(col,vec3(.91,.863,.29),step(0.,1.)*float(inR(vec4(r.x+18.,r.y+18.,r.z,r.w),p)));
    col=mix(col,vec3(.17,.27,.84),float(inR(vec4(r.x-30.,r.y+r.w-96.,60.,126.),p)));
    if(inR(r,p)){
      vec2 q=(p-r.xy)/r.zw; float asp=r.z/r.w; vec2 isz=TS(6);
      float tt=floor(uT*7.);
      float row=floor(q.y*30.); float rr=hash(vec2(row,tt));
      float dx=step(.9,rr)*(hash(vec2(row,tt+7.))-.5)*.14;
      vec2 blk=floor(p/vec2(96.,54.)); float bh=hash(blk+tt);
      vec2 sw=vec2(0.); if(bh>.965) sw=(vec2(hash(blk+1.),hash(blk+2.))-.5)*.35;
      vec2 u=q+vec2(dx,0.)+sw; float sp=.006+.01*step(.9,rr);
      vec3 c; c.r=T(6,covq(asp,u+vec2(sp,0.),isz,vec2(.5)))  .r;
      c.g=T(6,covq(asp,u,isz,vec2(.5))).g; c.b=T(6,covq(asp,u-vec2(sp,0.),isz,vec2(.5))).b;
      float band=fract(uT*.18); float by=abs(q.y-band); if(by<.012) c=1.-c; c+=smoothstep(.1,0.,by)*.05;
      vec2 sb=floor(p/vec2(64.,22.)); float h=hash(sb+tt*1.3);
      if(h>.985) c=(hash(sb)>.5)?vec3(.91,.863,.29):vec3(.17,.27,.84);
      else if(h>.97) c=mix(c,vec3(.91,.863,.29),.55);
      c*=.97+.05*sin(p.y*2.);
      col=c;
    }
    return col; }

  /* ---------- P7 thumbnails: pixel-reveal ---------- */
  vec3 pg7(vec2 p, vec4 F[8], float FI[8], int n){
    vec3 col=ground(p); col+=lace(p+vec2(0.,0.),1.)*0.;
    for(int i=0;i<8;i++){ if(i>=n) break; vec4 r=F[i];
      if(inR(r,p)){
        int ti=int(FI[i]+.5); float fi=float(i);
        float cs=mix(46.,3.,smoothstep(0.,1.4,uTe-.35-fi*.12)); cs=max(cs,3.+2.*sin(uT*.9+fi));
        vec2 pc=(floor((p-r.xy)/cs)+.5)*cs+r.xy;
        vec3 c=T(ti,cov(r,pc,TS(ti),vec2(.5,.4)));
        c=mix(c,vec3(lum(c)),.1);
        float e=min(min(p.x-r.x,r.x+r.z-p.x),min(p.y-r.y,r.y+r.w-p.y)); c=mix(c,vec3(.09,.1,.09),smoothstep(2.,1.,e)*0.);
        col=c;
      } }
    return col; }

  /* ---------- P8 pixel sunrise ---------- */
  vec3 pg8(vec2 p, vec4 F[8], float FI[8], int n){
    float cell=14.; vec2 cp=floor(p/cell); vec2 c=(cp+.5)*cell; vec2 q=c/vec2(1920.,1080.);
    float cl=fbm(vec2(q.x*2.5,q.y*3.)+vec2(uT*.012,0.)+fbm(q*3.+uT*.02)*1.4);
    float y=q.y+(cl-.5)*.22;
    vec3 s0=vec3(.537,.651,.847), s1=vec3(.718,.788,.91), s2=vec3(.898,.761,.769), s3=vec3(.94,.835,.54), s4=vec3(.969);
    vec3 s=mix(s0,s1,smoothstep(0.,.38,y)); s=mix(s,s2,smoothstep(.38,.68,y)); s=mix(s,s3,smoothstep(.68,.84,y)); s=mix(s,s4,smoothstep(.84,1.,y));
    s=floor(s*8.+bayer(cp)+.5)/8.;
    vec2 bc=vec2(1640.+(uM.x-.5)*50.,330.+12.*sin(uT*.8));
    vec2 b=(c-bc)/cell; float e=length(b/vec2(6.4,7.8));
    if(e<1.){ float sh=dot(b,vec2(.55,.7))/9.; vec3 bal=vec3(.788,.639,.69);
      bal=sh>.38?vec3(.62,.46,.54):(sh>.05?vec3(.72,.56,.63):bal); if(sh<-.62) bal=vec3(.88,.74,.8);
      if(b.x>-3.5&&b.x<-1.5&&b.y>-4.5&&b.y<-2.5) bal=vec3(1.); s=bal; }
    if(b.y>7.6&&b.y<9.&&abs(b.x)<1.) s=vec3(.62,.46,.54);
    float sx=1.6*sin(b.y*.3+uT); if(b.y>9.&&b.y<34.&&abs(b.x-sx)<.55&&mod(b.y,2.)<1.) s=vec3(.97);
    for(int i=0;i<16;i++){ float fi=float(i); float h1=hash(vec2(fi,5.5)),h2=hash(vec2(fi,6.6)),h3=hash(vec2(fi,8.8));
      vec2 bb=vec2(h1*1920.+20.*sin(uT*.6+fi),mod(h2*1300.-uT*(18.+30.*h3),1300.)-120.);
      float R=1.8+4.*h3; vec2 d=(c-bb)/cell; float rr=length(d);
      if(abs(rr-R)<.62) s=mix(s,vec3(1.),.85);
      if(rr<R&&rr>R-1.6&&d.x<-R*.35&&d.y<-R*.35) s=vec3(1.); }
    s+=vec3(.95,.8,.35)*stars(p,130.,.2)*(1.-smoothstep(.1,.5,q.y))*.8;
    return s; }

  /* ---------- scene switch + corner furniture ---------- */
  vec3 scene(int pg, vec2 p, vec4 F[8], float FI[8], int n){
    vec3 c;
    if(pg==0) c=pg1(p,F,FI,n); else if(pg==1) c=pg2(p,F,FI,n); else if(pg==2) c=pg3(p,F,FI,n); else if(pg==3) c=pg4(p,F,FI,n);
    else if(pg==4) c=pg5(p,F,FI,n); else if(pg==5) c=pg6(p,F,FI,n); else if(pg==6) c=pg7(p,F,FI,n); else c=pg8(p,F,FI,n);
    // one corner per page, picked where the layout is empty; inset 84px so the header/footer furniture stays clear
    // 0 TL, 1 TR, 2 BR, 3 BL
    int k=(pg==4||pg==6)?2:(pg==7)?0:1;
    float oy=(pg==5)?150.:84.;
    vec2 cp=vec2(0.);
    if(k==0) cp=vec2(p.x,p.y-oy)/14.; else if(k==1) cp=vec2(1920.-p.x,p.y-oy)/14.; else if(k==2) cp=vec2(1920.-p.x,1080.-p.y-oy)/14.; else cp=vec2(p.x,1080.-p.y-oy)/14.;
    float m=(cp.y<0.||pg==0||(pg==5&&cp.x>11.)||(pg==6&&cp.x>20.))?0.:filigree(floor(cp)+.5,uT*.3);   // cover: the lace chain on the photo is its ornament
    vec3 oc; float oa;
    if(pg==0){ oc=vec3(1.); oa=.92; } else if(pg==1){ oc=vec3(1.); oa=.85; } else if(pg==2){ oc=vec3(.95,.9,1.); oa=.55; }
    else if(pg==3){ oc=vec3(.96,.95,.92); oa=.36; } else if(pg==4){ oc=vec3(.58,.5,.8); oa=.8; } else if(pg==5){ oc=vec3(.17,.27,.84); oa=.9; }
    else if(pg==6){ oc=vec3(.537,.651,.847); oa=.95; } else { oc=vec3(.537,.651,.847); oa=.9; }
    c=mix(c,oc,m*oa);
    float side=(pg-(pg/2)*2==0)?0.:1.;
    c=mix(c,oc,lace(p,side)*oa*.7);
    return c; }

  void main(){
    vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uRes*vec2(1920.,1080.);
    vec3 col;
    if(uProg>=1.) col=scene(uPg,p,uF,uFi,uN);
    else{
      vec2 cell=floor(p/32.); float sw=(p.x/1920.)*.6+(p.y/1080.)*.4; float thr=sw*.62+hash(cell)*.38;
      float pr=uProg*1.3; float on=step(thr,pr);
      col=on>.5?scene(uPg,p,uF,uFi,uN):scene(uPv,p,uFp,uFpi,uNp);
      float edge=1.-smoothstep(0.,.07,abs(pr-thr)); col=mix(col,vec3(1.,.95,.8),edge*.9);
    }
    float g=hash(p+fract(uT)*91.7)-.5; col+=g*.045;
    vec2 vq=p/vec2(1920.,1080.)-.5; col*=1.-.16*dot(vq,vq)*2.;
    oC=vec4(clamp(col,0.,1.),1.);
  }`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.log('SHADER ERROR\n' + gl.getShaderInfoLog(s)); }
    return s;
  }
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) console.log('LINK ERROR ' + gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const u = { res: U('uRes'), t: U('uT'), te: U('uTe'), prog: U('uProg'), m: U('uM'), pg: U('uPg'), pv: U('uPv'), n: U('uN'), np: U('uNp'),
    f: U('uF[0]'), fi: U('uFi[0]'), fp: U('uFp[0]'), fpi: U('uFpi[0]') };

  function loadTex(i, src) {
    return new Promise(res => {
      const im = new Image(); im.onload = () => {
        const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(U('uT' + (i + 1)), i); res();
      }; im.src = src;
    });
  }

  /* ---------- state ---------- */
  let cur = 0, prev = 0, prog = 1, t0 = performance.now(), tEnter = 0, tTrans = 0;
  const mouse = { x: .62, y: .4, tx: .62, ty: .4, last: -99 };
  const fa = new Float32Array(32), fia = new Float32Array(8), fpa = new Float32Array(32), fpia = new Float32Array(8);
  function pack(list, a, ia) { a.fill(0); ia.fill(1); list.forEach((f, i) => { a.set(f.r, i * 4); ia[i] = f.img; }); }

  const chrome = document.getElementById('chrome'), cch = document.getElementById('c-ch'), cfo = document.getElementById('c-fo'), cpr = document.getElementById('c-pr');
  for (let i = 0; i < NP; i++) cpr.appendChild(document.createElement('i'));
  function chromeSet() {
    const s = slides[cur];
    chrome.dataset.theme = s.dataset.theme; chrome.dataset.pg = cur + 1; cch.textContent = s.dataset.ch;
    cfo.textContent = String(cur + 1).padStart(2, '0') + ' — ' + String(NP).padStart(2, '0');
    [...cpr.children].forEach((c, i) => { c.className = i === cur ? 'on' : (i < cur ? 'done' : ''); });
    document.title = 'Dream big. Dream high. — ' + (cur + 1) + '/' + NP;
  }

  function go(n, instant) {
    n = Math.max(0, Math.min(NP - 1, n)); if (n === cur && !instant) return;
    if (!instant) { prev = cur; pack(frames[prev], fpa, fpia); prog = 0; tTrans = now(); }
    else { prev = n; prog = 1; }
    slides[cur].classList.remove('on'); cur = n;
    pack(frames[cur], fa, fia); tEnter = now();
    slides[cur].classList.add('on'); chromeSet(); history.replaceState(null, '', '#' + (cur + 1));
  }
  const now = () => STATIC ? TFIX : (performance.now() - t0) / 1000;

  addEventListener('keydown', e => {
    if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(e.key)) { go(cur + 1); e.preventDefault(); }
    else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { go(cur - 1); e.preventDefault(); }
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(NP - 1);
  });
  addEventListener('click', e => { if (e.clientX < innerWidth * .18) go(cur - 1); else go(cur + 1); });
  let wl = 0; addEventListener('wheel', e => { const n = performance.now(); if (n - wl < 900 || Math.abs(e.deltaY) < 20) return; wl = n; go(cur + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  let tx0 = null; addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', e => { if (tx0 == null) return; const dx = e.changedTouches[0].clientX - tx0; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); tx0 = null; });
  addEventListener('pointermove', e => {
    const sr = stage.getBoundingClientRect(); mouse.tx = (e.clientX - sr.left) / sr.width; mouse.ty = (e.clientY - sr.top) / sr.height; mouse.last = now();
  });
  addEventListener('resize', fit);

  function draw() {
    const t = now();
    if (prog < 1) prog = STATIC ? 1 : Math.min(1, (t - tTrans) / 1.15);
    let mx, my;
    if (STATIC || t - mouse.last > 2.5) { mx = .55 + .25 * Math.sin(t * .5); my = .4 + .2 * Math.cos(t * .37); mouse.tx = mx; mouse.ty = my; }
    mouse.x += (mouse.tx - mouse.x) * (STATIC ? 1 : .08); mouse.y += (mouse.ty - mouse.y) * (STATIC ? 1 : .08);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(u.res, cv.width, cv.height); gl.uniform1f(u.t, t); gl.uniform1f(u.te, STATIC ? 99 : t - tEnter); gl.uniform1f(u.prog, prog);   // static export: entrance animations (p7 pixel reveal) are already resolved
    gl.uniform2f(u.m, mouse.x, mouse.y); gl.uniform1i(u.pg, cur); gl.uniform1i(u.pv, prev);
    gl.uniform1i(u.n, frames[cur].length); gl.uniform1i(u.np, frames[prev].length);
    gl.uniform4fv(u.f, fa); gl.uniform1fv(u.fi, fia); gl.uniform4fv(u.fp, fpa); gl.uniform1fv(u.fpi, fpia);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!document.body.dataset.ready && draw.n++ > 1) document.body.dataset.ready = '1';
    if (!STATIC) requestAnimationFrame(draw);
  }
  draw.n = 0;

  /* ---------- boot ---------- */
  fit();
  Promise.all([document.fonts.ready, ...[1, 2, 3, 4, 5, 6].map(i => loadTex(i - 1, window.__img['r' + i].url))]).then(() => {
    const hp = parseInt(Q.get('p') || location.hash.slice(1) || '1', 10) || 1;
    measure(); go(hp - 1, true);
    if (STATIC) { draw(); draw(); draw(); } else requestAnimationFrame(draw);
  });
})();
