import { useState, useRef, useCallback, useEffect } from "react";

// ── Complex math ──
const cAdd = (a, b) => [a[0]+b[0], a[1]+b[1]];
const cSub = (a, b) => [a[0]-b[0], a[1]-b[1]];
const cMul = (a, b) => [a[0]*b[0]-a[1]*b[1], a[0]*b[1]+a[1]*b[0]];
const cDiv = (a, b) => { const d=b[0]*b[0]+b[1]*b[1]; return d===0?[Infinity,Infinity]:[(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d]; };
const cAbs = z => Math.sqrt(z[0]*z[0]+z[1]*z[1]);
const cArg = z => Math.atan2(z[1],z[0]);
const cExp = z => { const r=Math.exp(z[0]); return [r*Math.cos(z[1]),r*Math.sin(z[1])]; };
const cLog = z => { const r=cAbs(z); return r===0?[-Infinity,0]:[Math.log(r),cArg(z)]; };
const cPow = (z,w) => (z[0]===0&&z[1]===0)?[0,0]:cExp(cMul(w,cLog(z)));
const cSin = z => [Math.sin(z[0])*Math.cosh(z[1]), Math.cos(z[0])*Math.sinh(z[1])];
const cCos = z => [Math.cos(z[0])*Math.cosh(z[1]), -Math.sin(z[0])*Math.sinh(z[1])];
const cTan = z => cDiv(cSin(z),cCos(z));
const cSinh = z => [Math.sinh(z[0])*Math.cos(z[1]), Math.cosh(z[0])*Math.sin(z[1])];
const cCosh = z => [Math.cosh(z[0])*Math.cos(z[1]), Math.sinh(z[0])*Math.sin(z[1])];
const cTanh = z => cDiv(cSinh(z),cCosh(z));
const cSqrt = z => { const r=cAbs(z),th=cArg(z),sr=Math.sqrt(r); return [sr*Math.cos(th/2),sr*Math.sin(th/2)]; };
const cConj = z => [z[0],-z[1]];

// ── Parser ──
function parseExpr(expr) {
  expr = expr.trim();
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if ("+-*/^(),".includes(ch)) { tokens.push({type:"op",val:ch}); i++; }
    else if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9.eE]/.test(expr[i])) num += expr[i++];
      tokens.push({type:"num",val:parseFloat(num)});
    } else if (/[a-zA-Z_]/.test(ch)) {
      let name = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) name += expr[i++];
      tokens.push({type:"id",val:name.toLowerCase()});
    } else i++;
  }
  let pos = 0;
  const peek = () => tokens[pos]||null;
  const eat = v => { const t=tokens[pos]; if(v&&(!t||t.val!==v)) throw new Error(`Expected '${v}'`); pos++; return t; };

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek()&&(peek().val==="+"||peek().val==="-")) {
      const op=eat().val, right=parseMulDiv(), l=left, r=right;
      left = op==="+" ? z=>cAdd(l(z),r(z)) : z=>cSub(l(z),r(z));
    }
    return left;
  }
  function parseMulDiv() {
    let left = parseImplicit();
    while (peek()&&(peek().val==="*"||peek().val==="/")) {
      const op=eat().val, right=parseImplicit(), l=left, r=right;
      left = op==="*" ? z=>cMul(l(z),r(z)) : z=>cDiv(l(z),r(z));
    }
    return left;
  }
  function parseImplicit() {
    let left = parseUnary();
    while (peek()&&(peek().type==="num"||peek().type==="id"||peek().val==="(")) {
      if ("+-),".includes(peek()?.val)) break;
      const right=parseUnary(), l=left, r=right;
      left = z=>cMul(l(z),r(z));
    }
    return left;
  }
  function parseUnary() {
    if (peek()?.val==="-") { eat(); const inner=parsePower(); return z=>{const r=inner(z);return[-r[0],-r[1]];}; }
    if (peek()?.val==="+") eat();
    return parsePower();
  }
  function parsePower() {
    let base = parseAtom();
    while (peek()?.val==="^") { eat(); const exp=parseUnary(), b=base, e=exp; base=z=>cPow(b(z),e(z)); }
    return base;
  }
  function parseAtom() {
    const t = peek();
    if (!t) throw new Error("Unexpected end");
    if (t.val==="(") { eat("("); const inner=parseAddSub(); eat(")"); return inner; }
    if (t.type==="num") { const v=eat().val; return ()=>[v,0]; }
    if (t.type==="id") {
      const name=eat().val;
      const fns={sin:cSin,cos:cCos,tan:cTan,exp:cExp,log:cLog,ln:cLog,sqrt:cSqrt,sinh:cSinh,cosh:cCosh,tanh:cTanh,conj:cConj,abs:z=>[cAbs(z),0],re:z=>[z[0],0],im:z=>[z[1],0],real:z=>[z[0],0],imag:z=>[z[1],0]};
      if (fns[name]) { eat("("); const arg=parseAddSub(); eat(")"); const fn=fns[name]; return z=>fn(arg(z)); }
      if (name==="pow") { eat("("); const a=parseAddSub(); eat(","); const b=parseAddSub(); eat(")"); return z=>cPow(a(z),b(z)); }
      if (name==="z") return z=>z;
      if (name==="i") return ()=>[0,1];
      if (name==="e") return ()=>[Math.E,0];
      if (name==="pi") return ()=>[Math.PI,0];
      if (name==="phi") return ()=>[1.618033988749895,0];
      throw new Error(`Unknown: ${name}`);
    }
    throw new Error(`Unexpected: ${t.val}`);
  }
  const fn = parseAddSub();
  if (pos < tokens.length) throw new Error(`Unexpected '${tokens[pos].val}'`);
  return fn;
}

// ── Formatting ──
function fN(v, d=2) { return (Math.round(v*10**d)/10**d).toFixed(d); }
function cStr(a, b) {
  a=parseFloat(fN(a,3)); b=parseFloat(fN(b,3));
  if (Math.abs(b)<0.0005) return fN(a);
  if (Math.abs(a)<0.0005) { return Math.abs(b-1)<0.0005?"i":Math.abs(b+1)<0.0005?"−i":(b>0?`${fN(b)}i`:`−${fN(Math.abs(b))}i`); }
  const s=b>0?" + ":" − ", ab=Math.abs(b);
  return `${fN(a)}${s}${Math.abs(ab-1)<0.0005?"":fN(ab)}i`;
}
function polarStr(r, thRad) {
  const deg = fN(thRad*180/Math.PI, 1);
  return `${fN(r)} cis(${deg}°)`;
}

const PRESETS = [
  {l:"z·i",e:"z*i"},{l:"z²",e:"z^2"},{l:"z³",e:"z^3"},{l:"1/z",e:"1/z"},
  {l:"zⁱ",e:"z^i"},{l:"eᶻ",e:"exp(z)"},{l:"sin(z)",e:"sin(z)"},{l:"log(z)",e:"log(z)"},
  {l:"√z",e:"sqrt(z)"},{l:"z·z̄",e:"z*conj(z)"},{l:"(z²+1)/(z²−1)",e:"(z^2+1)/(z^2-1)"},
  {l:"z+1/z",e:"z+1/z"},
];

const COL = { in:"#378ADD", out:"#1D9E75", arc:"#EF9F27", outC:"#D85A30" };

export default function ComplexExplorer() {
  const [coordMode, setCoordMode] = useState("cartesian");
  const [exprStr, setExprStr] = useState("z^i");
  const [error, setError] = useState(null);
  const [parsedFn, setParsedFn] = useState(null);
  const [re, setRe] = useState(2);
  const [im, setIm] = useState(1);
  const [radius, setRadius] = useState(2);
  const [angleDeg, setAngleDeg] = useState(45);
  const [scaleIdx, setScaleIdx] = useState(6); // index into SCALES (default=6 → gridMax=5)
  const [scaleInput, setScaleInput] = useState("");
  const [showMesh, setShowMesh] = useState(false);
  const [meshTip, setMeshTip] = useState(false);
  const [meshLabels, setMeshLabels] = useState(true);
  const [meshThick, setMeshThick] = useState(1);
  const [hoveredLine, setHoveredLine] = useState(null); // {val, isRow}
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);

  const SCALES = [0.001, 0.01, 0.1, 1, 2, 3, 5, 10, 20, 100, 1000, 10000];
  const gridMax = SCALES[scaleIdx];

  useEffect(() => {
    try {
      const fn = parseExpr(exprStr);
      fn([1,0]); fn([0,1]);
      setParsedFn(()=>fn);
      setError(null);
    } catch(e) { setError(e.message); setParsedFn(null); }
  }, [exprStr]);

  const z = coordMode==="cartesian"
    ? [re,im]
    : [radius*Math.cos(angleDeg*Math.PI/180), radius*Math.sin(angleDeg*Math.PI/180)];
  const zRe=z[0], zIm=z[1], inMod=cAbs(z), inArg=cArg(z);

  let outRe=NaN, outIm=NaN, outOk=false;
  if (parsedFn) { try { const w=parsedFn(z); outRe=w[0]; outIm=w[1]; outOk=isFinite(outRe)&&isFinite(outIm); } catch{} }
  const outMod = outOk?cAbs([outRe,outIm]):NaN;
  const outArg = outOk?cArg([outRe,outIm]):NaN;

  const W=680, H=520, cx=W/2, cy=H/2;
  const pxScale = Math.min((W-80)/(2*gridMax),(H-80)/(2*gridMax));
  const toS = (r,i) => [cx+r*pxScale, cy-i*pxScale];
  const fromS = (sx,sy) => [(sx-cx)/pxScale, -(sy-cy)/pxScale];
  const gridStep = gridMax<=3?1:gridMax<=8?2:gridMax<=20?5:10;
  const meshStep = gridMax<=3?0.5:gridMax<=6?1:2;

  const updateFromScreen = useCallback((sx,sy) => {
    const [mr,mi] = [(sx-cx)/pxScale, -(sy-cy)/pxScale];
    const snap = gridMax/100;
    if (coordMode==="cartesian") {
      setRe(Math.round(mr/snap)*snap);
      setIm(Math.round(mi/snap)*snap);
    } else {
      const snapR = gridMax/100;
      setRadius(Math.round(Math.sqrt(mr*mr+mi*mi)/snapR)*snapR);
      setAngleDeg(Math.round(Math.atan2(mi,mr)*180/Math.PI));
    }
  }, [coordMode, pxScale, gridMax]);

  const getPos = useCallback(e => {
    const svg=svgRef.current; if(!svg) return null;
    const r=svg.getBoundingClientRect();
    return [(e.clientX-r.left)/r.width*W, (e.clientY-r.top)/r.height*H];
  },[]);

  const onDown = useCallback(e => { const p=getPos(e); if(p){setIsDragging(true);setHoveredLine(null);updateFromScreen(p[0],p[1]);} },[getPos,updateFromScreen]);
  const onMove = useCallback(e => {
    const p=getPos(e); if(!p) return;
    if(isDragging){ updateFromScreen(p[0],p[1]); return; }
    const [mx,my]=p;
    const edgeTol=26;
    // vertical lines (Re=const) exit through top/bottom edges
    // horizontal lines (Im=const) exit through left/right edges
    const atTopBot = my<edgeTol || my>H-edgeTol;
    const atLeftRight = mx<edgeTol || mx>W-edgeTol;
    if (atTopBot || atLeftRight) {
      let best=null, bestDist=Infinity;
      for(let j=-gridMax;j<=gridMax+meshStep*0.01;j+=meshStep){
        const val=Math.round(j/meshStep)*meshStep;
        if(atTopBot){
          // vertical line Re=val — screen x = cx + val*pxScale; hover near top/bottom, match by x
          const gx=cx+val*pxScale;
          const d=Math.abs(gx-mx);
          if(d<bestDist){bestDist=d;best={val,isRow:false};}
        }
        if(atLeftRight){
          // horizontal line Im=val — screen y = cy - val*pxScale; hover near left/right, match by y
          const gy=cy-val*pxScale;
          const d=Math.abs(gy-my);
          if(d<bestDist){bestDist=d;best={val,isRow:true};}
        }
      }
      if(best && bestDist<edgeTol) setHoveredLine(best);
      else setHoveredLine(null);
    } else {
      setHoveredLine(null);
    }
  },[isDragging,getPos,updateFromScreen,gridMax,meshStep,pxScale,cx,cy,W,H]);
  const onUp = useCallback(()=>setIsDragging(false),[]);
  const onLeave = useCallback(()=>{ setIsDragging(false); setHoveredLine(null); },[]);

  // Mesh lines — built whenever mesh is shown OR there's a hovered line to highlight
  const meshData = []; // {pts, val, isRow}
  if (parsedFn && (showMesh || hoveredLine)) {
    const res = 60;
    for (let pass=0;pass<2;pass++) {
      const isRow = pass===0; // isRow=true → constant Im, varying Re
      for (let j=-gridMax;j<=gridMax+meshStep*0.01;j+=meshStep) {
        const val = Math.round(j/meshStep)*meshStep; // clean float
        const pts=[];
        for (let k=0;k<=res;k++) {
          const t=-gridMax+(2*gridMax*k)/res;
          try {
            const w=parsedFn(isRow?[t,val]:[val,t]);
            pts.push(isFinite(w[0])&&isFinite(w[1])?w:null);
          } catch{ pts.push(null); }
        }
        meshData.push({pts, val, isRow});
      }
    }
  }

  // OOB detection
  const pad = 30;
  const maxR = Math.min(W,H)/2 - pad;
  const isOOB = (re,im) => {
    const [sx,sy]=toS(re,im);
    return sx<pad||sx>W-pad||sy<pad||sy>H-pad;
  };

  const renderOOB = (re,im,color,label) => {
    const [sx,sy]=toS(re,im);
    const dx=sx-cx, dy=sy-cy;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<1) return null;
    const f=maxR/dist;
    const ex=cx+dx*f, ey=cy+dy*f;
    const nx=dx/dist, ny=dy/dist;
    const stubLen=28;
    const sx1=ex-nx*stubLen, sy1=ey-ny*stubLen;
    const px=-ny, py=nx;
    const lx=ex+px*12+nx*6, ly=ey+py*12+ny*6;
    const mod=cAbs([re,im]), arg=cArg([re,im]);
    const valStr = coordMode==="polar" ? polarStr(mod,arg) : cStr(re,im);
    return <g key={`oob-${label}`}>
      <line x1={sx1} y1={sy1} x2={ex} y2={ey} stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4"
        markerEnd={color===COL.in?"url(#arr-in)":"url(#arr-out)"} opacity="0.7"/>
      <rect x={lx-48} y={ly-11} width={96} height={20} rx={4} fill="var(--color-background-primary)" opacity="0.82"/>
      <text x={lx} y={ly+1} textAnchor="middle" dominantBaseline="central"
        style={{fontSize:11,fontWeight:600,fill:color,fontFamily:"var(--font-mono)"}}>
        {label} = {valStr}
      </text>
    </g>;
  };

  const inOOB = isOOB(zRe,zIm);
  const outOOB = outOk && isOOB(outRe,outIm);

  const renderVec = (re,im,color,label,markerId) => {
    const [vx,vy]=toS(re,im);
    return <g>
      <line x1={cx} y1={cy} x2={vx} y2={vy} stroke={color} strokeWidth="2.5" strokeLinecap="round" markerEnd={`url(#${markerId})`}/>
      <circle cx={vx} cy={vy} r={label==="z"?6:5} fill={color} style={label==="z"?{cursor:"grab"}:{}}/>
      <line x1={vx} y1={vy} x2={vx} y2={cy} stroke={color} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3"/>
      <line x1={vx} y1={vy} x2={cx} y2={vy} stroke={color} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3"/>
      {/* label with pill background */}
      <rect
        x={vx+(re>=0?10:-10)+(re>=0?0:-46)} y={vy+(im>=0?-22:8)}
        width={46} height={18} rx={4}
        fill={color} opacity={0.15}
      />
      <text x={vx+(re>=0?33:-33)} y={vy+(im>=0?-13:17)} textAnchor="middle"
        style={{fontSize:13,fontWeight:600,fill:color,fontFamily:"var(--font-sans)"}}>{label}</text>
    </g>;
  };

  const switchMode = m => {
    if (m===coordMode) return;
    if (m==="polar") { setRadius(parseFloat(fN(inMod,2))); setAngleDeg(Math.round(inArg*180/Math.PI)); }
    else { setRe(parseFloat(fN(zRe,2))); setIm(parseFloat(fN(zIm,2))); }
    setCoordMode(m);
  };

  return (
    <div style={{fontFamily:"var(--font-sans)",maxWidth:720}}>
      {/* Function input */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:14,fontWeight:600,whiteSpace:"nowrap",color:"var(--color-text-primary)"}}>f(z) =</span>
          <input type="text" value={exprStr} onChange={e=>setExprStr(e.target.value)} spellCheck={false}
            style={{flex:1,fontSize:15,fontFamily:"var(--font-mono)",padding:"7px 11px",borderRadius:"var(--border-radius-md)",
              border:`1.5px solid ${error?"var(--color-border-danger)":"var(--color-border-secondary)"}`,
              background:"var(--color-background-primary)",color:"var(--color-text-primary)",outline:"none",
              boxShadow: error ? "0 0 0 3px rgba(220,50,50,0.10)" : "none",
              transition:"border-color 0.15s, box-shadow 0.15s"}}/>
        </div>
        {error && <div style={{fontSize:12,color:"var(--color-text-danger)",marginBottom:4,paddingLeft:2}}>{error}</div>}
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {PRESETS.map(p=>{
            const active = exprStr===p.e;
            return (
              <button key={p.e} onClick={()=>setExprStr(p.e)}
                style={{fontSize:12,padding:"4px 11px",cursor:"pointer",
                  background: active ? COL.in : "var(--color-background-secondary)",
                  color: active ? "#fff" : "var(--color-text-secondary)",
                  border: `1.5px solid ${active ? COL.in : "var(--color-border-secondary)"}`,
                  borderRadius:"var(--border-radius-md)",fontWeight: active ? 600 : 400,
                  transition:"background 0.12s, color 0.12s, border-color 0.12s",
                  boxShadow: active ? `0 0 0 3px ${COL.in}28` : "none"}}>{p.l}</button>
            );
          })}
        </div>
      </div>

      {/* Controls row */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14,alignItems:"flex-start"}}>
        {/* Coord toggle */}
        <div style={{display:"flex",gap:3,borderRadius:"var(--border-radius-md)",padding:3,
          background:"var(--color-background-secondary)",border:"1.5px solid var(--color-border-secondary)"}}>
          {[{m:"cartesian",top:"x + yi",bot:"cartesian"},{m:"polar",top:"r cis(θ)",bot:"polar"}].map(({m,top,bot})=>{
            const active = coordMode===m;
            return (
              <button key={m} onClick={()=>switchMode(m)}
                style={{fontSize:12,padding:"6px 14px",border:"none",cursor:"pointer",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:1,lineHeight:1.3,
                  borderRadius:"calc(var(--border-radius-md) - 2px)",
                  background: active ? "var(--color-background-primary)" : "transparent",
                  color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                  fontWeight: active ? 600 : 400,
                  transition:"background 0.15s, color 0.15s, box-shadow 0.15s"}}>
                <span style={{fontFamily:"var(--font-mono)",fontWeight: active ? 600 : 400}}>{top}</span>
                <span style={{fontSize:10,opacity: active ? 0.6 : 0.45}}>{bot}</span>
              </button>
            );
          })}
        </div>

        {/* Sliders */}
        <div style={{flex:1,minWidth:200}}>
          {coordMode==="cartesian" ? (<>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:12,color:"var(--color-text-secondary)",width:16,fontFamily:"var(--font-mono)",fontWeight:600}}>x</span>
              <div style={{flex:1,position:"relative",display:"flex",alignItems:"center"}}>
                <input type="range" min={-gridMax} max={gridMax} step={gridMax/100} value={re}
                  onChange={e=>setRe(parseFloat(e.target.value))} style={{width:"100%",accentColor:COL.in}}/>
                <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",pointerEvents:"none",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:0,top:"100%",marginTop:1}}>
                  <div style={{width:1,height:4,background:"var(--color-text-tertiary)",opacity:0.7}}/>
                  <span style={{fontSize:9,color:"var(--color-text-tertiary)",fontFamily:"var(--font-mono)",lineHeight:1}}>0</span>
                </div>
              </div>
              <span style={{fontSize:13,fontWeight:600,minWidth:50,textAlign:"right",fontFamily:"var(--font-mono)",color:COL.in}}>{fN(re)}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:12,color:"var(--color-text-secondary)",width:16,fontFamily:"var(--font-mono)",fontWeight:600}}>y</span>
              <div style={{flex:1,position:"relative",display:"flex",alignItems:"center"}}>
                <input type="range" min={-gridMax} max={gridMax} step={gridMax/100} value={im}
                  onChange={e=>setIm(parseFloat(e.target.value))} style={{width:"100%",accentColor:COL.in}}/>
                <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",pointerEvents:"none",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:0,top:"100%",marginTop:1}}>
                  <div style={{width:1,height:4,background:"var(--color-text-tertiary)",opacity:0.7}}/>
                  <span style={{fontSize:9,color:"var(--color-text-tertiary)",fontFamily:"var(--font-mono)",lineHeight:1}}>0</span>
                </div>
              </div>
              <span style={{fontSize:13,fontWeight:600,minWidth:50,textAlign:"right",fontFamily:"var(--font-mono)",color:COL.in}}>{fN(im)}</span>
            </div>
          </>) : (<>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:12,color:"var(--color-text-secondary)",width:16,fontFamily:"var(--font-mono)",fontWeight:600}}>r</span>
              <input type="range" min={0} max={gridMax} step={gridMax/100} value={radius}
                onChange={e=>setRadius(parseFloat(e.target.value))} style={{flex:1,accentColor:COL.in}}/>
              <span style={{fontSize:13,fontWeight:600,minWidth:50,textAlign:"right",fontFamily:"var(--font-mono)",color:COL.in}}>{fN(radius)}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:12,color:"var(--color-text-secondary)",width:16,fontFamily:"var(--font-mono)",fontWeight:600}}>θ</span>
              <div style={{flex:1,position:"relative",display:"flex",alignItems:"center"}}>
                <input type="range" min={-180} max={180} step={1} value={angleDeg}
                  onChange={e=>setAngleDeg(parseInt(e.target.value))} style={{width:"100%",accentColor:COL.in}}/>
                <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",pointerEvents:"none",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:0,top:"100%",marginTop:1}}>
                  <div style={{width:1,height:4,background:"var(--color-text-tertiary)",opacity:0.7}}/>
                  <span style={{fontSize:9,color:"var(--color-text-tertiary)",fontFamily:"var(--font-mono)",lineHeight:1}}>0°</span>
                </div>
              </div>
              <span style={{fontSize:13,fontWeight:600,minWidth:50,textAlign:"right",fontFamily:"var(--font-mono)",color:COL.in}}>{angleDeg}°</span>
            </div>
          </>)}
        </div>

        {/* Scale + mesh */}
        <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:120}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap"}}>Scale ±</span>
            <button onClick={()=>setScaleIdx(i=>Math.max(0,i-1))} disabled={scaleIdx===0}
              style={{width:24,height:28,border:"1.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-sm)",
                background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer",
                fontSize:14,lineHeight:1,opacity:scaleIdx===0?0.35:1,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
            <input
              value={scaleInput !== "" ? scaleInput : String(gridMax)}
              onChange={e => setScaleInput(e.target.value)}
              onBlur={() => {
                const v = parseFloat(scaleInput);
                if (scaleInput !== "" && v > 0) {
                  const closest = SCALES.reduce((bi,s,i) => Math.abs(s-v) < Math.abs(SCALES[bi]-v) ? i : bi, 0);
                  setScaleIdx(closest);
                }
                setScaleInput("");
              }}
              onKeyDown={e => {
                if (e.key === "Enter") e.target.blur();
                if (e.key === "Escape") { setScaleInput(""); e.target.blur(); }
              }}
              style={{width:52,fontSize:13,fontWeight:600,fontFamily:"var(--font-mono)",textAlign:"center",
                padding:"4px 4px",borderRadius:"var(--border-radius-sm)",
                border:"1.5px solid var(--color-border-secondary)",
                background:"var(--color-background-primary)",color:"var(--color-text-primary)",outline:"none"}}
            />
            <button onClick={()=>setScaleIdx(i=>Math.min(SCALES.length-1,i+1))} disabled={scaleIdx===SCALES.length-1}
              style={{width:24,height:28,border:"1.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-sm)",
                background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer",
                fontSize:14,lineHeight:1,opacity:scaleIdx===SCALES.length-1?0.35:1,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          </div>
          <div style={{position:"relative"}}>
            <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",
              padding:"5px 9px",borderRadius:"var(--border-radius-md)",
              border:`1.5px solid ${showMesh ? COL.out : "var(--color-border-secondary)"}`,
              background: showMesh ? `${COL.out}18` : "var(--color-background-secondary)",
              transition:"border-color 0.15s, background 0.15s"}}>
              <input type="checkbox" checked={showMesh} onChange={e=>setShowMesh(e.target.checked)}
                style={{accentColor:COL.out,width:13,height:13}}/>
              <span style={{fontSize:12,color: showMesh ? COL.out : "var(--color-text-secondary)",fontWeight: showMesh ? 600 : 400,
                transition:"color 0.15s"}}>Grid map</span>
              <span onClick={e=>{e.preventDefault();setMeshTip(!meshTip);}}
                onMouseEnter={()=>setMeshTip(true)} onMouseLeave={()=>setMeshTip(false)}
                style={{width:16,height:16,borderRadius:"50%",border:`1.5px solid ${showMesh ? COL.out : "var(--color-border-secondary)"}`,
                  display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,
                  color: showMesh ? COL.out : "var(--color-text-secondary)",cursor:"help",flexShrink:0,
                  transition:"border-color 0.15s, color 0.15s"}}>?</span>
            </label>
            {/* Mesh sub-controls */}
            {showMesh && <div style={{display:"flex",flexDirection:"column",gap:5,paddingLeft:2}}>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,
                color:"var(--color-text-secondary)"}}>
                <input type="checkbox" checked={meshLabels} onChange={e=>setMeshLabels(e.target.checked)}
                  style={{accentColor:COL.out,width:12,height:12}}/>
                Labels
              </label>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Thickness</span>
                <input type="range" min={0.5} max={4} step={0.5} value={meshThick}
                  onChange={e=>setMeshThick(parseFloat(e.target.value))}
                  style={{width:64,accentColor:COL.out}}/>
              </div>
            </div>}
            {meshTip && (
              <div style={{position:"absolute",bottom:"calc(100% + 6px)",left:0,right:-60,width:260,padding:"9px 12px",
                background:"var(--color-background-primary)",border:"1.5px solid var(--color-border-secondary)",
                borderRadius:"var(--border-radius-md)",fontSize:12,lineHeight:1.5,color:"var(--color-text-primary)",
                zIndex:10,boxShadow:"0 4px 16px rgba(0,0,0,0.10)"}}>
                Shows how f(z) warps the entire coordinate grid. Each faint line is a row or column of the complex plane after being pushed through f — so you see the global shape of the transformation, not just one point.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* z and f(z) cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",padding:"11px 14px",
          borderLeft:`3px solid ${COL.in}`}}>
          <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>Input z</div>
          <div style={{fontSize:15,fontWeight:600,fontFamily:"var(--font-mono)",color:COL.in,marginBottom:2}}>{cStr(zRe,zIm)}</div>
          <div style={{fontSize:12,fontFamily:"var(--font-mono)",color:"var(--color-text-secondary)"}}>{polarStr(inMod,inArg)}</div>
        </div>
        <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",padding:"11px 14px",
          borderLeft:`3px solid ${COL.out}`}}>
          <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>Output f(z)</div>
          {outOk ? (<>
            <div style={{fontSize:15,fontWeight:600,fontFamily:"var(--font-mono)",color:COL.out,marginBottom:2}}>{cStr(outRe,outIm)}</div>
            <div style={{fontSize:12,fontFamily:"var(--font-mono)",color:"var(--color-text-secondary)"}}>{polarStr(outMod,outArg)}</div>
          </>) : (
            <div style={{fontSize:15,fontWeight:500,fontFamily:"var(--font-mono)",color:"var(--color-text-danger)"}}>undefined</div>
          )}
        </div>
      </div>

      {/* SVG plane */}
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{cursor:isDragging?"grabbing":"crosshair",touchAction:"none",display:"block",
          borderRadius:"var(--border-radius-lg)",border:"1.5px solid var(--color-border-secondary)"}}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onLeave}>
        <defs>
          <marker id="arr-in" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke={COL.in} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker>
          <marker id="arr-out" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke={COL.out} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker>
        </defs>

        {/* Grid lines — minor */}
        {Array.from({length:Math.floor(2*gridMax/gridStep)+1},(_,idx)=>{
          const v=-gridMax+idx*gridStep;
          if(Math.abs(v)<0.001) return null;
          const [gx]=toS(v,0),[,gy]=toS(0,v);
          return <g key={idx}>
            <line x1={gx} y1={0} x2={gx} y2={H} stroke="#8888aa" strokeWidth="1" opacity="0.5"/>
            <line x1={0} y1={gy} x2={W} y2={gy} stroke="#8888aa" strokeWidth="1" opacity="0.5"/>
            {/* tick labels with pill background */}
            <rect x={gx-13} y={cy+5} width={26} height={16} rx={3} fill="var(--color-background-primary)" opacity="0.75"/>
            <text x={gx} y={cy+16} textAnchor="middle" style={{fontSize:11,fill:"var(--color-text-secondary)",fontFamily:"var(--font-sans)",fontWeight:500}}>{v}</text>
            <rect x={cx-34} y={gy-9} width={28} height={16} rx={3} fill="var(--color-background-primary)" opacity="0.75"/>
            <text x={cx-20} y={gy+4} textAnchor="middle" style={{fontSize:11,fill:"var(--color-text-secondary)",fontFamily:"var(--font-sans)",fontWeight:500}}>{v}i</text>
          </g>;
        })}

        {/* Axes */}
        <line x1={0} y1={cy} x2={W} y2={cy} stroke="#8888aa" strokeWidth="1.5" opacity="0.9"/>
        <line x1={cx} y1={0} x2={cx} y2={H} stroke="#8888aa" strokeWidth="1.5" opacity="0.9"/>

        {/* Axis labels */}
        <rect x={W-38} y={cy-22} width={30} height={16} rx={3} fill="var(--color-background-primary)" opacity="0.8"/>
        <text x={W-23} y={cy-12} textAnchor="middle" style={{fontSize:12,fill:"var(--color-text-secondary)",fontFamily:"var(--font-sans)",fontWeight:600}}>Re</text>
        <rect x={cx+6} y={4} width={24} height={16} rx={3} fill="var(--color-background-primary)" opacity="0.8"/>
        <text x={cx+18} y={15} textAnchor="middle" style={{fontSize:12,fill:"var(--color-text-secondary)",fontFamily:"var(--font-sans)",fontWeight:600}}>Im</text>

        {/* Highlight hovered z-gridline on the input plane */}
        {hoveredLine && (() => {
          const {val, isRow} = hoveredLine;
          const col = isRow ? COL.in : COL.arc;
          if(isRow){
            // horizontal line Im=val
            const [,gy]=toS(0,val);
            return <line x1={0} y1={gy} x2={W} y2={gy} stroke={col} strokeWidth="2" opacity="0.55" strokeDasharray="6 3"/>;
          } else {
            // vertical line Re=val
            const [gx]=toS(val,0);
            return <line x1={gx} y1={0} x2={gx} y2={H} stroke={col} strokeWidth="2" opacity="0.55" strokeDasharray="6 3"/>;
          }
        })()}

        {/* Transformation mesh */}
        {meshData.map(({pts,val,isRow},li)=>{
          const isHovered = hoveredLine && Math.abs(hoveredLine.val-val)<meshStep*0.5 && hoveredLine.isRow===isRow;
          const faint = !isHovered && hoveredLine!=null;
          let d="",on=false;
          // collect all on-screen points to find a good ticker anchor near the edge
          const screenPts=[];
          pts.forEach(p=>{
            if(!p){on=false;return;}
            const [sx,sy]=toS(p[0],p[1]);
            if(sx<-200||sx>W+200||sy<-200||sy>H+200){on=false;return;}
            screenPts.push([sx,sy]);
            d+=(on?`L`:`M`)+`${sx} ${sy}`; on=true;
          });
          if(!d) return null;
          const col = isHovered ? (isRow ? COL.in : COL.arc) : COL.out;
          const sw = isHovered ? Math.max(meshThick, 2) : meshThick*0.6+0.3;
          const op = isHovered ? 1 : faint ? 0.04 : 0.18;
          // ticker anchor: first screen point (entry edge of the curve)
          const anchor = screenPts[0];
          const tickerLabel = isRow ? `Im=${fN(val,2)}` : `Re=${fN(val,2)}`;
          return <g key={li}>
            <path d={d} fill="none" stroke={col} strokeWidth={sw} opacity={op}/>
            {meshLabels && anchor && !faint && (
              <g opacity={isHovered ? 1 : 0.5}>
                <circle cx={anchor[0]} cy={anchor[1]} r={isHovered ? 4.5 : 2.5} fill={col}/>
                {isHovered && <>
                  <rect x={anchor[0]+7} y={anchor[1]-9} width={tickerLabel.length*7+4} height={16} rx={3}
                    fill="var(--color-background-primary)" opacity="0.88"/>
                  <text x={anchor[0]+9} y={anchor[1]+3}
                    style={{fontSize:11,fontWeight:700,fill:col,fontFamily:"var(--font-mono)"}}>
                    {tickerLabel}
                  </text>
                </>}
              </g>
            )}
          </g>;
        })}

        {/* Input |z| circle */}
        {inMod*pxScale>1 && inMod*pxScale<H &&
          <circle cx={cx} cy={cy} r={inMod*pxScale} fill="none" stroke={COL.in} strokeWidth="1" strokeDasharray="5 4" opacity="0.25"/>}

        {/* Output |f(z)| circle */}
        {outOk && outMod*pxScale>1 && outMod*pxScale<H &&
          <circle cx={cx} cy={cy} r={outMod*pxScale} fill="none" stroke={COL.outC} strokeWidth="1" strokeDasharray="5 4" opacity="0.4"/>}

        {/* Rotation arc */}
        {outOk && inMod*pxScale>8 && outMod*pxScale>4 && (()=>{
          const arcR=Math.min(inMod*pxScale*0.35,50);
          let d=outArg-inArg;
          while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
          if(Math.abs(d)<0.05||Math.abs(d)>Math.PI-0.05) return null;
          const sw=d>0?0:1;
          const x1=cx+arcR*Math.cos(inArg),y1=cy-arcR*Math.sin(inArg);
          const x2=cx+arcR*Math.cos(outArg),y2=cy-arcR*Math.sin(outArg);
          const ma=inArg+d/2, lx=cx+(arcR+14)*Math.cos(ma), ly=cy-(arcR+14)*Math.sin(ma);
          return <g>
            <path d={`M${x1} ${y1} A${arcR} ${arcR} 0 0 ${sw} ${x2} ${y2}`} fill="none" stroke={COL.arc} strokeWidth="1.5" strokeDasharray="4 3"/>
            {/* arc label pill */}
            <rect x={lx-18} y={ly-10} width={36} height={18} rx={4} fill={COL.arc} opacity={0.18}/>
            <text x={lx} y={ly+1} textAnchor="middle" dominantBaseline="central"
              style={{fontSize:11,fontWeight:600,fill:COL.arc,fontFamily:"var(--font-sans)"}}>{fN(Math.abs(d*180/Math.PI),0)}°</text>
          </g>;
        })()}

        {/* Input vector */}
        {inMod*pxScale>1 && (inOOB ? renderOOB(zRe,zIm,COL.in,"z") : renderVec(zRe,zIm,COL.in,"z","arr-in"))}

        {/* Output vector */}
        {outOk && outMod*pxScale>1 && (outOOB ? renderOOB(outRe,outIm,COL.out,"f(z)") : renderVec(outRe,outIm,COL.out,"f(z)","arr-out"))}

        {!isDragging && <text x={W-10} y={H-10} textAnchor="end"
          style={{fontSize:11,fill:"var(--color-text-tertiary)",fontFamily:"var(--font-sans)"}}>click or drag to move z</text>}
      </svg>

      {/* Legend */}
      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:8,fontSize:12,color:"var(--color-text-secondary)"}}>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:20,height:3,background:COL.in,borderRadius:2,display:"inline-block"}}/> z</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:20,height:3,background:COL.out,borderRadius:2,display:"inline-block"}}/> f(z)</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:20,height:2,borderTop:`2px dashed ${COL.arc}`,display:"inline-block"}}/> rotation</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:14,height:14,border:`1.5px dashed ${COL.outC}`,borderRadius:"50%",opacity:0.6,display:"inline-block"}}/> |f(z)|</span>
      </div>

      {/* Syntax */}
      <details style={{marginTop:14,fontSize:12,color:"var(--color-text-secondary)"}}>
        <summary style={{cursor:"pointer",fontWeight:600,userSelect:"none"}}>Syntax reference</summary>
        <div style={{marginTop:6,fontFamily:"var(--font-mono)",lineHeight:2,padding:"10px 14px",
          background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",
          border:"1.5px solid var(--color-border-secondary)"}}>
          <div>Operators: + − * / ^</div>
          <div>Constants: i, e, pi, phi</div>
          <div>Functions: sin, cos, tan, sinh, cosh, tanh</div>
          <div>exp, log (= ln), sqrt, abs</div>
          <div>conj, re, im, pow(z, w)</div>
          <div>Implicit multiply: 2z, 3i, z(z+1)</div>
        </div>
      </details>
    </div>
  );
}
