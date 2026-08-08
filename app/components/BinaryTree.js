'use client';
/**
 * BinaryTree v6 — crash-proof
 * All touch/mouse handling at container level only.
 * No event handlers on child div nodes or slots.
 * Tap-to-register detected by comparing touchstart/end position (< 8px movement = tap).
 */
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';

const NW = 160;
const NH = 90;
const HG = 48;
const VG = 80;
const fmtN = n => n ? String(n).padStart(5,'0') : '?????';

// ── Pure layout ────────────────────────────────────────────
function buildLayout(id, pmap, depth=0) {
  const kids  = pmap[id] || [];
  const lKid  = kids.find(c=>c.leg==='L');
  const rKid  = kids.find(c=>c.leg==='R');
  const lTree = lKid ? buildLayout(lKid.id, pmap, depth+1) : null;
  const rTree = rKid ? buildLayout(rKid.id, pmap, depth+1) : null;
  let w, selfX;
  if (lTree && rTree) {
    const rOff = lTree.w + HG;
    w = lTree.w + HG + rTree.w;
    selfX = lTree.w + HG/2 - NW/2;
    return { id, depth, x:selfX, y:depth*(NH+VG), w, L:lTree, R:shiftTree(rTree,rOff) };
  } else if (lTree) {
    w = Math.max(lTree.w, NW);
    return { id, depth, x:lTree.x+lTree.w/2-NW/2, y:depth*(NH+VG), w, L:lTree, R:null };
  } else if (rTree) {
    w = Math.max(rTree.w, NW);
    return { id, depth, x:rTree.x+rTree.w/2-NW/2, y:depth*(NH+VG), w, L:null, R:rTree };
  }
  return { id, depth, x:0, y:depth*(NH+VG), w:NW, L:null, R:null };
}

function shiftTree(t, dx) {
  if (!t) return null;
  return { ...t, x:t.x+dx, L:shiftTree(t.L,dx), R:shiftTree(t.R,dx) };
}

function getMaxDepth(t) {
  if (!t) return 0;
  return Math.max(t.depth, getMaxDepth(t.L), getMaxDepth(t.R));
}

function flattenTree(t, nodes=[], edges=[]) {
  if (!t) return;
  nodes.push(t);
  if (t.L) { edges.push({from:t, to:t.L, leg:'L'}); flattenTree(t.L, nodes, edges); }
  if (t.R) { edges.push({from:t, to:t.R, leg:'R'}); flattenTree(t.R, nodes, edges); }
}

// ── SVG connector ─────────────────────────────────────────
function Connector({fx, fy, tx, ty, leg}) {
  const col  = leg==='L' ? '#6366F1' : '#0EA5E9';
  const midY = fy + VG/2;
  const r    = Math.min(10, Math.abs(tx-fx)/2, Math.abs(midY-fy));
  const s    = tx>=fx ? 1 : -1;
  const d    = Math.abs(tx-fx)<3
    ? `M${fx},${fy} L${tx},${ty}`
    : `M${fx},${fy} L${fx},${midY-r} Q${fx},${midY} ${fx+s*r},${midY} L${tx-s*r},${midY} Q${tx},${midY} ${tx},${midY+r} L${tx},${ty}`;
  return <path d={d} fill="none" stroke={col} strokeWidth={2} opacity={0.6}/>;
}

export default function BinaryTree({
  nodes=[], members=[], rootMemberId,
  onRegister, isAdmin=false, height=520,
}) {
  const ref      = useRef(null);
  const drag     = useRef(null);   // { sx,sy,tx,ty }
  const pinch    = useRef(null);   // { dist,scale,tx,ty,mx,my }
  const touchRef = useRef(null);   // { x,y } — touchstart pos for tap detection
  const [tf, setTf] = useState({x:60, y:30, scale:1});

  const clamp = s => Math.max(0.15, Math.min(3, s));

  // ── Data maps ─────────────────────────────────────────
  const {nmap, pmap, rootId} = useMemo(() => {
    const nmap={}, pmap={};
    nodes.forEach(nd => {
      const m = members.find(x=>x.id===nd.member_id);
      nmap[nd.id] = {
        id:nd.id, name:m?.full_name||'?', mn:m?.member_number,
        status:m?.status||'pending', lc:nd.left_count||0, rc:nd.right_count||0,
      };
      if (nd.parent_id) {
        if (!pmap[nd.parent_id]) pmap[nd.parent_id]=[];
        pmap[nd.parent_id].push({id:nd.id, leg:nd.leg});
      }
    });
    const rootNd = isAdmin ? nodes.find(n=>!n.parent_id) : nodes.find(n=>n.member_id===rootMemberId);
    return {nmap, pmap, rootId:rootNd?.id??null};
  }, [nodes, members, isAdmin, rootMemberId]);

  // ── Layout ────────────────────────────────────────────
  const layout = useMemo(() => {
    if (!rootId) return null;
    try { return buildLayout(rootId, pmap, 0); } catch(e) { return null; }
  }, [rootId, pmap]);

  // ── Flatten ───────────────────────────────────────────
  const {allNodes, allEdges, slotList} = useMemo(() => {
    if (!layout) return {allNodes:[], allEdges:[], slotList:[]};
    const allNodes=[], allEdges=[];
    flattenTree(layout, allNodes, allEdges);
    const slotList=[];
    allNodes.forEach(t => {
      const cx = t.x + NW/2;
      const sY = t.y + NH + VG;
      if (!t.L && !t.R) {
        slotList.push({leg:'L', parentId:t.id, x:cx-NW-HG/2, y:sY, pcx:cx, pby:t.y+NH});
        slotList.push({leg:'R', parentId:t.id, x:cx+HG/2,    y:sY, pcx:cx, pby:t.y+NH});
      } else if (!t.L) {
        slotList.push({leg:'L', parentId:t.id, x:t.R.x-NW-HG, y:sY, pcx:cx, pby:t.y+NH});
      } else if (!t.R) {
        slotList.push({leg:'R', parentId:t.id, x:t.L.x+NW+HG, y:sY, pcx:cx, pby:t.y+NH});
      }
    });
    return {allNodes, allEdges, slotList};
  }, [layout]);

  const canvasW = layout ? layout.w + 120 + NW : NW+120;
  const canvasH = layout ? (getMaxDepth(layout)+2)*(NH+VG)+80 : NH+VG+80;

  // ── Hit-test: given canvas coords, return slot index or -1 ──
  const hitSlot = useCallback((cx, cy) => {
    for (let i=0; i<slotList.length; i++) {
      const s = slotList[i];
      if (cx >= s.x && cx <= s.x+NW && cy >= s.y && cy <= s.y+NH) return i;
    }
    return -1;
  }, [slotList]);

  // ── Convert screen coords → canvas coords ─────────────
  const screenToCanvas = useCallback((sx, sy) => {
    const rect = ref.current?.getBoundingClientRect() || {left:0,top:0};
    return {
      cx: (sx - rect.left - tf.x) / tf.scale,
      cy: (sy - rect.top  - tf.y) / tf.scale,
    };
  }, [tf]);

  // ── Mouse ─────────────────────────────────────────────
  const onMD = useCallback(e => {
    if (e.button!==0) return;
    drag.current = {sx:e.clientX, sy:e.clientY, tx:tf.x, ty:tf.y};
  }, [tf.x, tf.y]);

  const onMM = useCallback(e => {
    if (!drag.current) return;
    setTf(t=>({...t, x:drag.current.tx+e.clientX-drag.current.sx, y:drag.current.ty+e.clientY-drag.current.sy}));
  }, []);

  const onMU = useCallback(e => {
    if (!drag.current) return;
    const moved = Math.abs(e.clientX-drag.current.sx) + Math.abs(e.clientY-drag.current.sy);
    drag.current = null;
    // If barely moved, treat as click → check slot hit
    if (moved < 8 && onRegister) {
      const {cx,cy} = screenToCanvas(e.clientX, e.clientY);
      const idx = hitSlot(cx, cy);
      if (idx>=0) onRegister(slotList[idx].parentId, slotList[idx].leg);
    }
  }, [onRegister, screenToCanvas, hitSlot, slotList]);

  // ── Wheel ─────────────────────────────────────────────
  const onWheel = useCallback(e => {
    e.preventDefault();
    const rect = ref.current?.getBoundingClientRect(); if (!rect) return;
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const f = e.deltaY>0 ? 0.88 : 1.14;
    setTf(t => { const ns=clamp(t.scale*f), r=ns/t.scale; return {scale:ns, x:mx-r*(mx-t.x), y:my-r*(my-t.y)}; });
  }, []);

  // ── Touch — ALL handled at container, nothing on children ──
  const onTS = useCallback(e => {
    if (e.touches.length===1) {
      const t0 = e.touches[0];
      drag.current  = {sx:t0.clientX, sy:t0.clientY, tx:tf.x, ty:tf.y};
      touchRef.current = {x:t0.clientX, y:t0.clientY};   // record start for tap detection
      pinch.current = null;
    } else if (e.touches.length===2) {
      drag.current = null;
      touchRef.current = null;
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      pinch.current = {
        dist:Math.hypot(dx,dy), scale:tf.scale, tx:tf.x, ty:tf.y,
        mx:(e.touches[0].clientX+e.touches[1].clientX)/2,
        my:(e.touches[0].clientY+e.touches[1].clientY)/2,
      };
    }
  }, [tf]);

  const onTM = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length===1 && drag.current) {
      const t0=e.touches[0];
      setTf(t=>({...t, x:drag.current.tx+t0.clientX-drag.current.sx, y:drag.current.ty+t0.clientY-drag.current.sy}));
    } else if (e.touches.length===2 && pinch.current) {
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      const d=Math.hypot(dx,dy), ns=clamp(pinch.current.scale*d/pinch.current.dist), r=ns/pinch.current.scale;
      const rect=ref.current?.getBoundingClientRect()||{left:0,top:0};
      const mx=pinch.current.mx-rect.left, my=pinch.current.my-rect.top;
      setTf({scale:ns, x:mx-r*(mx-pinch.current.tx), y:my-r*(my-pinch.current.ty)});
    }
  }, []);

  const onTE = useCallback(e => {
    // Detect tap: single touch, minimal movement
    if (e.changedTouches.length===1 && touchRef.current && drag.current && onRegister) {
      const t0 = e.changedTouches[0];
      const moved = Math.abs(t0.clientX-touchRef.current.x) + Math.abs(t0.clientY-touchRef.current.y);
      if (moved < 12) {
        const {cx,cy} = screenToCanvas(t0.clientX, t0.clientY);
        const idx = hitSlot(cx, cy);
        if (idx>=0) onRegister(slotList[idx].parentId, slotList[idx].leg);
      }
    }
    drag.current  = null;
    pinch.current = null;
    touchRef.current = null;
  }, [onRegister, screenToCanvas, hitSlot, slotList]);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.addEventListener('wheel',     onWheel, {passive:false});
    el.addEventListener('touchmove', onTM,    {passive:false});
    return () => {
      el.removeEventListener('wheel',     onWheel);
      el.removeEventListener('touchmove', onTM);
    };
  }, [onWheel, onTM]);

  // ── Empty state ────────────────────────────────────────
  if (!layout) return (
    <div style={{height, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F9FAFB', borderRadius:'0 0 14px 14px', color:'#9CA3AF', gap:10}}>
      <div style={{fontSize:40}}>🌳</div>
      <div style={{fontWeight:600}}>{nodes.length===0?'Loading network…':isAdmin?'No root node found':'Not yet placed in the network'}</div>
    </div>
  );

  return (
    <div style={{position:'relative', background:'#F9FAFB', borderRadius:'0 0 14px 14px', overflow:'hidden'}}>

      {/* Zoom controls */}
      <div style={{position:'absolute', top:12, right:12, zIndex:20, display:'flex', flexDirection:'column', gap:6}}>
        {[['+',()=>setTf(t=>({...t,scale:clamp(t.scale*1.25)}))],
          ['−',()=>setTf(t=>({...t,scale:clamp(t.scale*0.8)}))],
          ['⌂',()=>setTf({x:60,y:30,scale:1})]
        ].map(([lbl,fn])=>(
          <button key={lbl} onClick={fn} style={{width:36,height:36,background:'#fff',border:'1px solid #E5E7EB',borderRadius:8,fontWeight:700,fontSize:lbl==='⌂'?14:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',color:'#374151',fontFamily:'inherit'}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Scale */}
      <div style={{position:'absolute',top:12,left:12,zIndex:20,background:'#fff',border:'1px solid #E5E7EB',borderRadius:6,padding:'4px 10px',fontSize:11,color:'#6B7280',fontWeight:600}}>
        {Math.round(tf.scale*100)}%
      </div>

      {/* Legend */}
      <div style={{position:'absolute',bottom:12,left:12,zIndex:20,background:'rgba(255,255,255,0.95)',border:'1px solid #E5E7EB',borderRadius:6,padding:'5px 12px',display:'flex',gap:12,fontSize:10,color:'#6B7280',fontWeight:600}}>
        {[['#6366F1','Left'],['#0EA5E9','Right'],['#10B981','Active'],['#EF4444','Inactive']].map(([col,label])=>(
          <span key={label} style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{width:label==='Left'||label==='Right'?12:8,height:label==='Left'||label==='Right'?3:8,background:col,display:'inline-block',borderRadius:label==='Left'||label==='Right'?2:'50%'}}/>
            {label}
          </span>
        ))}
      </div>

      {/* Canvas — ALL interaction handled here, nothing on children */}
      <div
        ref={ref}
        style={{overflow:'hidden', height, cursor:'grab', userSelect:'none', touchAction:'none'}}
        onMouseDown={onMD}
        onMouseMove={onMM}
        onMouseUp={onMU}
        onMouseLeave={onMU}
        onTouchStart={onTS}
        onTouchEnd={onTE}
      >
        <div style={{position:'absolute', transformOrigin:'0 0', transform:`translate(${tf.x}px,${tf.y}px) scale(${tf.scale})`, width:canvasW, height:canvasH}}>

          {/* SVG connectors — no events */}
          <svg style={{position:'absolute',top:0,left:0,width:canvasW,height:canvasH,overflow:'visible',pointerEvents:'none'}}>
            {allEdges.map((e,i)=>(
              <Connector key={i} fx={e.from.x+NW/2} fy={e.from.y+NH} tx={e.to.x+NW/2} ty={e.to.y} leg={e.leg}/>
            ))}
            {onRegister && slotList.map((s,i)=>(
              <Connector key={`sc${i}`} fx={s.pcx} fy={s.pby} tx={s.x+NW/2} ty={s.y} leg={s.leg}/>
            ))}
          </svg>

          {/* Member cards — no mouse/touch events, pointer-events none so container gets all events */}
          {allNodes.map(t => {
            const n=nmap[t.id]; if (!n) return null;
            const active=n.status==='active';
            const col=active?'#10B981':'#EF4444';
            return (
              <div key={t.id} style={{position:'absolute',left:t.x,top:t.y,width:NW,height:NH,background:'#fff',borderRadius:12,border:`2px solid ${col}`,boxShadow:'0 2px 8px rgba(0,0,0,0.10)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,overflow:'hidden',userSelect:'none',pointerEvents:'none'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:col,borderRadius:'10px 10px 0 0'}}/>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',color:'#9CA3AF',marginTop:4}}>#{fmtN(n.mn)}</div>
                <div style={{fontSize:14,fontWeight:800,color:'#111827',maxWidth:NW-16,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'center'}}>{n.name}</div>
                <div style={{background:active?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)',color:col,fontSize:9,fontWeight:700,letterSpacing:'0.08em',padding:'2px 10px',borderRadius:999,textTransform:'uppercase'}}>{n.status||'pending'}</div>
                <div style={{fontSize:9,color:'#9CA3AF',marginTop:2}}>L:{n.lc} · R:{n.rc}</div>
              </div>
            );
          })}

          {/* Slot cards — pointer-events auto (clickable), but NO onMouseDown/onTouchStart/onTouchEnd */}
          {onRegister && slotList.map((s,i) => {
            const col = s.leg==='L' ? '#6366F1' : '#0EA5E9';
            return (
              <div key={`slot${i}`}
                data-slot={i}
                style={{position:'absolute',left:s.x,top:s.y,width:NW,height:NH,background:'#fff',borderRadius:12,border:`2px dashed ${col}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,userSelect:'none',pointerEvents:'none'}}>
                <div style={{fontSize:28,color:col,lineHeight:1}}>+</div>
                <div style={{fontSize:10,fontWeight:700,color:col,letterSpacing:'0.06em'}}>{s.leg==='L'?'ADD LEFT':'ADD RIGHT'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
