'use client';
import { useRef, useState, useEffect, useCallback } from 'react';

const NODE_W = 140;
const NODE_H = 82;
const H_GAP  = 40;
const V_GAP  = 70;

const fmtMN = n => n ? String(n).padStart(5,'0') : '?????';

// ── Layout engine ─────────────────────────────────────────
function buildLayout(nodeId, nodeMap, depth=0) {
  const kids = nodeMap[nodeId] || [];
  const L = kids.find(k=>k.leg==='L');
  const R = kids.find(k=>k.leg==='R');

  if (!L && !R) return { nodeId, depth, x:0, y:depth*(NODE_H+V_GAP), w:NODE_W, L:null, R:null };

  const lLayout = L ? buildLayout(L.id, nodeMap, depth+1) : null;
  const rLayout = R ? buildLayout(R.id, nodeMap, depth+1) : null;

  let lW = lLayout?.w || NODE_W;
  let rW = rLayout?.w || NODE_W;
  let totalW, lOff=0, rOff=0;

  if (lLayout && rLayout) {
    totalW = lW + H_GAP + rW;
    rOff = lW + H_GAP;
  } else if (lLayout) {
    totalW = Math.max(lW, NODE_W); rOff = 0;
  } else {
    totalW = Math.max(rW, NODE_W); rOff = 0;
  }

  const shiftSubtree = (layout, dx) => {
    layout.x += dx;
    if (layout.L) shiftSubtree(layout.L, dx);
    if (layout.R) shiftSubtree(layout.R, dx);
  };

  if (lLayout) shiftSubtree(lLayout, lOff);
  if (rLayout) shiftSubtree(rLayout, rOff);

  let cx;
  if (lLayout && rLayout) cx = (lLayout.x + NODE_W/2 + rLayout.x + NODE_W/2)/2 - NODE_W/2;
  else if (lLayout) cx = lLayout.x;
  else cx = rLayout.x;

  return { nodeId, depth, x:cx, y:depth*(NODE_H+V_GAP), w:totalW, L:lLayout, R:rLayout };
}

// ── Connector: 90° L-shape with rounded corner ────────────
function Edge({ px, py, cx, cy, leg }) {
  const color = leg==='L' ? '#6366F1' : '#0EA5E9';
  const midY = py + V_GAP/2;
  const r = Math.min(10, Math.abs(cx-px)/2, Math.abs(midY-py)/2, Math.abs(cy-midY)/2);
  const dx = cx > px ? 1 : -1;
  const dy = cy > midY ? 1 : -1;
  let d;
  if (Math.abs(cx-px) < 3) {
    d = `M${px},${py} L${cx},${cy}`;
  } else {
    d = [
      `M${px},${py}`,
      `L${px},${midY-r}`,
      `Q${px},${midY} ${px+dx*r},${midY}`,
      `L${cx-dx*r},${midY}`,
      `Q${cx},${midY} ${cx},${midY+r}`,
      `L${cx},${cy}`,
    ].join(' ');
  }
  return <path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55}/>;
}

// ── Member node ───────────────────────────────────────────
function MemberNode({ n, x, y }) {
  const active = n.status === 'active';
  const bc = active ? '#10B981' : '#EF4444';
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={2} y={3} width={NODE_W} height={NODE_H} rx={8} fill="rgba(0,0,0,0.05)"/>
      <rect x={0} y={0} width={NODE_W} height={NODE_H} rx={8} fill="white" stroke={bc} strokeWidth={1.5}/>
      <rect x={0} y={0} width={NODE_W} height={5} rx={4} fill={bc}/>
      <rect x={4} y={0} width={NODE_W-8} height={5} fill={bc}/>
      <text x={NODE_W/2} y={22} textAnchor="middle" fontSize={9} fontWeight={700} letterSpacing={1} fill="#9CA3AF" fontFamily="Inter,sans-serif">#{fmtMN(n.member_number)}</text>
      <text x={NODE_W/2} y={40} textAnchor="middle" fontSize={12} fontWeight={700} fill="#111827" fontFamily="Inter,sans-serif">{n.name.length>15?n.name.slice(0,14)+'…':n.name}</text>
      <rect x={(NODE_W-52)/2} y={46} width={52} height={15} rx={7} fill={active?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'}/>
      <text x={NODE_W/2} y={57} textAnchor="middle" fontSize={9} fontWeight={700} fill={bc} fontFamily="Inter,sans-serif" letterSpacing={0.5}>{(n.status||'pending').toUpperCase()}</text>
      <text x={10} y={74} fontSize={9} fill="#9CA3AF" fontFamily="Inter,sans-serif">L:{n.lc}</text>
      <text x={NODE_W-10} y={74} textAnchor="end" fontSize={9} fill="#9CA3AF" fontFamily="Inter,sans-serif">R:{n.rc}</text>
    </g>
  );
}

// ── Open slot ─────────────────────────────────────────────
function SlotNode({ x, y, leg, parentId, onRegister }) {
  const [hov, setHov] = useState(false);
  const color = leg==='L' ? '#6366F1' : '#0EA5E9';
  return (
    <g transform={`translate(${x},${y})`} style={{cursor:'pointer'}}
      onClick={()=>onRegister&&onRegister(parentId,leg)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <rect x={0} y={0} width={NODE_W} height={NODE_H} rx={8}
        fill={hov?color:'white'} stroke={color} strokeWidth={1.5} strokeDasharray="5,3"/>
      <text x={NODE_W/2} y={36} textAnchor="middle" fontSize={22} fill={hov?'white':color} fontFamily="Inter,sans-serif">+</text>
      <text x={NODE_W/2} y={56} textAnchor="middle" fontSize={10} fontWeight={700}
        fill={hov?'white':color} fontFamily="Inter,sans-serif" letterSpacing={0.4}>
        {leg==='L'?'ADD LEFT':'ADD RIGHT'}
      </text>
    </g>
  );
}

// ── Recursive renderer ────────────────────────────────────
function RenderTree({ layout, nodeDataMap, xOff, onRegister, slots }) {
  if (!layout) return null;
  const n = nodeDataMap[layout.nodeId];
  if (!n) return null;

  const nx = layout.x + xOff;
  const ny = layout.y;
  const px = nx + NODE_W/2;
  const py = ny + NODE_H;
  const slotY = ny + NODE_H + V_GAP;

  // Calculate slot x for missing children
  const hasL = !!layout.L;
  const hasR = !!layout.R;
  let slotLx, slotRx;

  if (!hasL && !hasR) {
    slotLx = nx - NODE_W/2 - H_GAP/2;
    slotRx = nx + NODE_W/2 + H_GAP/2;
  } else if (!hasL) {
    slotLx = (layout.R ? layout.R.x + xOff : nx) - NODE_W - H_GAP;
  } else if (!hasR) {
    slotRx = (layout.L ? layout.L.x + xOff : nx) + NODE_W + H_GAP;
  }

  return (
    <>
      <MemberNode n={n} x={nx} y={ny}/>

      {/* Left child or slot */}
      {hasL ? (
        <>
          <Edge px={px} py={py} cx={layout.L.x+xOff+NODE_W/2} cy={layout.L.y} leg="L"/>
          <RenderTree layout={layout.L} nodeDataMap={nodeDataMap} xOff={xOff} onRegister={onRegister} slots={slots}/>
        </>
      ) : onRegister && slotLx !== undefined && (
        <>
          <Edge px={px} py={py} cx={slotLx+NODE_W/2} cy={slotY} leg="L"/>
          <SlotNode x={slotLx} y={slotY} leg="L" parentId={layout.nodeId} onRegister={onRegister}/>
        </>
      )}

      {/* Right child or slot */}
      {hasR ? (
        <>
          <Edge px={px} py={py} cx={layout.R.x+xOff+NODE_W/2} cy={layout.R.y} leg="R"/>
          <RenderTree layout={layout.R} nodeDataMap={nodeDataMap} xOff={xOff} onRegister={onRegister} slots={slots}/>
        </>
      ) : onRegister && slotRx !== undefined && (
        <>
          <Edge px={px} py={py} cx={slotRx+NODE_W/2} cy={slotY} leg="R"/>
          <SlotNode x={slotRx} y={slotY} leg="R" parentId={layout.nodeId} onRegister={onRegister}/>
        </>
      )}
    </>
  );
}

// ── Main exported component ───────────────────────────────
export default function BinaryTree({ nodes, members, rootMemberId, onRegister, isAdmin=false, height=440 }) {
  const containerRef = useRef(null);
  const [tf, setTf] = useState({ x:40, y:20, scale:1 });
  const drag = useRef(null);
  const pinch = useRef(null);

  // Build nodeMap: nodeId → enriched node data
  // Also build parent→children map
  const nodeById = {};
  const parentMap = {};
  nodes.forEach(nd => {
    const m = members.find(x=>x.id===nd.member_id);
    nodeById[nd.id] = {
      ...nd,
      name: m?.full_name?.split(' ')[0] || '?',
      member_number: m?.member_number,
      status: m?.status || 'pending',
      lc: nd.left_count||0, rc: nd.right_count||0,
    };
    if (nd.parent_id) {
      if (!parentMap[nd.parent_id]) parentMap[nd.parent_id] = [];
      parentMap[nd.parent_id].push({ id:nd.id, leg:nd.leg });
    }
  });

  const rootNode = isAdmin
    ? nodes.find(n=>!n.parent_id)
    : nodes.find(n=>n.member_id===rootMemberId);

  const clamp = s => Math.min(3, Math.max(0.15, s));

  // Mouse pan
  const onMD = e => { if(e.button!==0)return; drag.current={sx:e.clientX,sy:e.clientY,tx:tf.x,ty:tf.y}; };
  const onMM = e => { if(!drag.current)return; setTf(t=>({...t,x:drag.current.tx+(e.clientX-drag.current.sx),y:drag.current.ty+(e.clientY-drag.current.sy)})); };
  const onMU = () => { drag.current=null; };

  // Wheel zoom
  const onWheel = useCallback(e => {
    e.preventDefault();
    const rect=containerRef.current.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const factor=e.deltaY>0?0.88:1.14;
    setTf(t=>{ const ns=clamp(t.scale*factor); const r=ns/t.scale; return{scale:ns,x:mx-r*(mx-t.x),y:my-r*(my-t.y)}; });
  },[]);

  // Touch pan + pinch
  const onTS = e => {
    if(e.touches.length===1){
      drag.current={sx:e.touches[0].clientX,sy:e.touches[0].clientY,tx:tf.x,ty:tf.y};
    } else if(e.touches.length===2){
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      pinch.current={dist:d,scale:tf.scale,tx:tf.x,ty:tf.y,
        mx:(e.touches[0].clientX+e.touches[1].clientX)/2,
        my:(e.touches[0].clientY+e.touches[1].clientY)/2};
      drag.current=null;
    }
  };
  const onTM = useCallback(e => {
    e.preventDefault();
    if(e.touches.length===1&&drag.current){
      setTf(t=>({...t,x:drag.current.tx+(e.touches[0].clientX-drag.current.sx),y:drag.current.ty+(e.touches[0].clientY-drag.current.sy)}));
    } else if(e.touches.length===2&&pinch.current){
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      const ratio=d/pinch.current.dist;
      const ns=clamp(pinch.current.scale*ratio);
      const r=ns/pinch.current.scale;
      const rect=containerRef.current?.getBoundingClientRect()||{left:0,top:0};
      const mx=pinch.current.mx-rect.left, my=pinch.current.my-rect.top;
      setTf({scale:ns,x:mx-r*(mx-pinch.current.tx),y:my-r*(my-pinch.current.ty)});
    }
  },[]);
  const onTE = () => { drag.current=null; pinch.current=null; };

  useEffect(()=>{
    const el=containerRef.current; if(!el)return;
    el.addEventListener('wheel',onWheel,{passive:false});
    el.addEventListener('touchmove',onTM,{passive:false});
    return()=>{ el.removeEventListener('wheel',onWheel); el.removeEventListener('touchmove',onTM); };
  },[onWheel,onTM]);

  if (!rootNode) return (
    <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>
      <i className="ti ti-binary-tree-2" style={{fontSize:36,display:'block',marginBottom:10}}/>
      No network data yet.
    </div>
  );

  const layout = buildLayout(rootNode.id, parentMap, 0);
  const xOff = 40;
  const totalW = layout.w + xOff * 2 + NODE_W;
  const maxDepth = (function maxD(l){return l?Math.max(l.depth,maxD(l.L),maxD(l.R)):0;})(layout);
  const totalH = (maxDepth+2)*(NODE_H+V_GAP)+60;

  return (
    <div style={{position:'relative',background:'var(--surface-1)',borderRadius:'0 0 var(--r) var(--r)'}}>
      {/* Zoom controls */}
      <div style={{position:'absolute',top:12,right:12,zIndex:10,display:'flex',gap:6,flexDirection:'column'}}>
        <button onClick={()=>setTf(t=>({...t,scale:clamp(t.scale*1.25)}))} className="btn btn-white btn-xs" style={{width:36,height:36,padding:0,borderRadius:'var(--r-xs)',fontWeight:700,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
        <button onClick={()=>setTf(t=>({...t,scale:clamp(t.scale*0.8)}))} className="btn btn-white btn-xs" style={{width:36,height:36,padding:0,borderRadius:'var(--r-xs)',fontWeight:700,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
        <button onClick={()=>setTf({x:40,y:20,scale:1})} className="btn btn-white btn-xs" style={{width:36,height:36,padding:0,borderRadius:'var(--r-xs)',fontSize:11,fontWeight:600}}>⌂</button>
      </div>
      {/* Scale indicator */}
      <div style={{position:'absolute',top:12,left:12,zIndex:10,background:'rgba(255,255,255,0.9)',border:'1px solid var(--border)',borderRadius:'var(--r-xs)',padding:'4px 10px',fontSize:11,color:'var(--text-muted)',fontWeight:600}}>
        {Math.round(tf.scale*100)}%
      </div>
      {/* Legend */}
      <div style={{position:'absolute',bottom:12,left:12,zIndex:10,display:'flex',gap:12,fontSize:10,color:'var(--text-muted)',background:'rgba(255,255,255,0.92)',padding:'5px 12px',borderRadius:'var(--r-xs)',border:'1px solid var(--border)',fontWeight:600}}>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:3,background:'#6366F1',display:'inline-block',borderRadius:2}}/> Left</span>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:12,height:3,background:'#0EA5E9',display:'inline-block',borderRadius:2}}/> Right</span>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:'50%',background:'#10B981',display:'inline-block'}}/> Active</span>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:'50%',background:'#EF4444',display:'inline-block'}}/> Inactive</span>
      </div>
      {/* Canvas */}
      <div ref={containerRef}
        style={{overflow:'hidden',height,cursor:drag.current?'grabbing':'grab',userSelect:'none'}}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onTouchStart={onTS} onTouchEnd={onTE}>
        <svg width={totalW} height={totalH}
          style={{transform:`translate(${tf.x}px,${tf.y}px) scale(${tf.scale})`,transformOrigin:'0 0',overflow:'visible'}}>
          <RenderTree layout={layout} nodeDataMap={nodeById} xOff={xOff} onRegister={onRegister} slots={{}}/>
        </svg>
      </div>
    </div>
  );
}
