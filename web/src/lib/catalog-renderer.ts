import { AssetInfo, CopyItem, MarketingState, PosterKind } from '@/types';
import { TEMPLATES } from './template-catalog';
import { posterText } from './design-engine';

// A single renderer powers both gallery previews and downloadable posters.
export function drawCatalogPoster(canvas: HTMLCanvasElement, state: MarketingState, kind: PosterKind, copy: CopyItem, asset: AssetInfo | null, bgImg: CanvasImageSource | null = null) {
  const t = TEMPLATES.find(t => t.id === (state.templateId || (state.backgroundImage !== undefined ? "editorial" : undefined)));
  if (!t) return false;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height, m = w * .065, gap = w * .025;
  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, w, h);
  if (bgImg) {
    const im=bgImg as HTMLImageElement;
    const sw=im.naturalWidth || im.width, sh=im.naturalHeight || im.height;
    if(sw && sh){
      const blur=state.backgroundBlur ?? 0, bleed=blur*3;
      const scale=Math.max((w+bleed*2)/sw,(h+bleed*2)/sh);
      ctx.save();ctx.filter=`blur(${blur}px)`;
      ctx.drawImage(im,(w-sw*scale)*(state.backgroundX ?? 50)/100,(h-sh*scale)*(state.backgroundY ?? 50)/100,sw*scale,sh*scale);ctx.restore();
      ctx.fillStyle=`rgba(0,0,0,${(state.backgroundDim ?? 35)/100})`;ctx.fillRect(0,0,w,h);
    }
  }
  const ink=bgImg ? '#ffffff' : t.ink;
  const text = (s:string,x:number,y:number,ww:number,hh:number,size:number,color:string=ink,weight='700') => {
    ctx.save(); ctx.beginPath(); ctx.rect(x,y,ww,hh); ctx.clip();
    posterText(ctx,s,x,y,ww,hh,size,color,weight); ctx.restore();
  };
  const photo = (x:number,y:number,ww:number,hh:number,contain=false) => {
    if(!asset) return;
    ctx.save(); ctx.beginPath(); ctx.roundRect(x,y,ww,hh,Math.min(w * .024, ww / 2, hh / 2)); ctx.clip();

    if (asset) {
      const sw=asset.im.naturalWidth || asset.im.width, sh=asset.im.naturalHeight || asset.im.height;
      const fitContain = state.mainImageFit ? state.mainImageFit === "contain" : contain;
      const scale = (fitContain ? Math.min(ww/sw,hh/sh) : Math.max(ww/sw,hh/sh)) * (state.mainImageZoom ?? 100)/100;
      const dx=x+(ww-sw*scale)*(state.mainImageX ?? 50)/100;
      const dy=y+(hh-sh*scale)*(state.mainImageY ?? 50)/100;
      const left=Math.max(x,dx), top=Math.max(y,dy);
      const visibleW=Math.min(x+ww,dx+sw*scale)-left;
      const visibleH=Math.min(y+hh,dy+sh*scale)-top;
      ctx.beginPath();
      ctx.roundRect(left,top,visibleW,visibleH,Math.min(w*.024,visibleW/2,visibleH/2));
      ctx.clip();
      ctx.drawImage(asset.im,dx,dy,sw*scale,sh*scale);
    } else {
      text(state.outputLanguage==='en'?'Add a campaign photo':'Thêm ảnh của anh',x+gap,y+hh/2-25,ww-gap*2,60,26,t.ink);
    }
    ctx.restore();
  };
  text(state.brand,m,m,w-m*2,48,26);
  const title=copy.headline || state.name;
  let bodyX=m,bodyY=h*.48,bodyW=w-m*2,bodyH=h*.34;
  if(t.id==='editorial') {
    text(title,m,h*.13,w*.53,h*.24,76);
    text(copy.subline,m,h*.39,w*.49,h*.13,28,ink,'400');
    photo(w*.64,h*.13,w*.295,h*.66);
    bodyW=w*.51;bodyY=h*.55;bodyH=h*.27;
  } else if(t.id==='spotlight') {
    text(title,m,h*.12,w-m*2,h*.17,76);
    photo(m,h*.31,w*.52,h*.46,true);
    bodyX=w*.62;bodyW=w-bodyX-m;bodyY=h*.34;bodyH=h*.43;
    text(copy.subline,m,h*.79,w-m*2,h*.07,26,ink,'400');
  } else if(t.id==='billboard') {
    ctx.fillStyle=t.ink;ctx.fillRect(m,h*.13,w-m*2,h*.33);
    text(title,m+gap,h*.15,w-m*2-gap*2,h*.29,105,t.bg);
    text(copy.subline,m,h*.49,w-m*2,h*.10,30,ink,'400');
    bodyY=h*.62;bodyH=h*.23;
    if(asset){photo(w*.67,h*.49,w*.265,h*.36);bodyW=w*.56;}
  } else if(t.id==='magazine') {
    text(title,m,h*.12,w-m*2,h*.16,72);
    photo(m,h*.30,w-m*2,h*.32);
    text(copy.subline,m,h*.65,w-m*2,h*.08,26,ink,'400');
    bodyY=h*.75;bodyH=h*.12;
  } else if(t.id==='agenda') {
    text(title,m,h*.13,w-m*2,h*.22,84);
    text(copy.subline,m,h*.36,w-m*2,h*.09,28,ink,'400');
    bodyY=h*.49;bodyH=h*.37;
    if(asset){photo(w*.67,h*.49,w*.265,h*.37);bodyW=w*.56;}
  } else {
    photo(w*.48,h*.12,w*.455,h*.58);
    text(title,m,h*.15,w*.38,h*.34,68);
    text(copy.subline,m,h*.52,w*.36,h*.17,27,ink,'400');
    bodyY=h*.73;bodyH=h*.13;
  }
  const selected = state.facts?.filter(f=>f.selected).map(f=>f.text) || [];
  const all = copy.points?.length ? copy.points : selected.length ? selected : state.details.split('\n').filter(Boolean);
  const points = kind==='story' ? all.slice((state.storyPage||0)*(state.storyPerPage||3),((state.storyPage||0)+1)*(state.storyPerPage||3)) : all.slice(0,3);
  const rowH=bodyH/Math.max(points.length,1);
  points.forEach((p,i)=>{
    const y=bodyY+i*rowH;
    ctx.fillStyle=t.accent;ctx.fillRect(bodyX,y,bodyW,1);
    const badgeW=40, textX=bodyX+badgeW+gap;
    const centerY=y+rowH/2;
    text(String(i+1).padStart(2,'0'),bodyX,centerY-rowH*.36,badgeW,rowH*.72,24,t.accent);
    text(p,textX,centerY-rowH*.36,bodyW-badgeW-gap,rowH*.72,28,ink,'500');
  });
  ctx.fillStyle=t.accent;ctx.fillRect(m,h*.91,w-m*2,h*.05);
  text(copy.cta,m+gap,h*.918,w-m*2-gap*2,h*.034,26,t.id==='billboard'?t.bg:t.id==='portrait'?t.bg:'#ffffff');
  return true;
}
