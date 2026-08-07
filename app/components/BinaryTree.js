'use client';
/**
 * BinaryTree — rock-solid genealogy tree
 * Renders as positioned <div> elements inside a pannable/zoomable container.
 * No SVG crashes, no hook-in-SVG issues, works on all browsers and mobile.
 */
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';

// ── Layout constants ──────────────────────────────────────
const NW = 160;   // node width  px
const NH = 90;    // node height px
const HG = 48;    // horizontal gap between siblings
const VG = 80;    // vertical gap between rows

const fmtNum = n => n ? String(n).padStart(5, '0') : '?????';

// ── Pure layout: returns tree of {id,x,y,w,depth,L,R} ────
// x,y = top-left of node box. x is relative to subtree origin.
function buildLayout(id, pmap, depth = 0) {
  const children = pmap[id] || [];
  const lChild   = children.find(c => c.leg === 'L');
  const rChild   = children.find(c => c.leg === 'R');
  const lTree    = lChild ? buildLayout(lChild.id, pmap, depth + 1) : null;
  const rTree    = rChild ? buildLayout(rChild.id, pmap, depth + 1) : null;

  let w, selfX;

  if (lTree && rTree) {
    // Place right subtree after left subtree + gap
    const rOff = lTree.w + HG;
    w           = lTree.w + HG + rTree.w;
    selfX       = lTree.w + HG / 2 - NW / 2; // centre over children gap
    return {
      id, depth, x: selfX, y: depth * (NH + VG), w,
      L: lTree,
      R: addXOffset(rTree, rOff),
    };
  } else if (lTree) {
    w     = Math.max(lTree.w, NW);
    selfX = lTree.x + lTree.w / 2 - NW / 2;
    return { id, depth, x: selfX, y: depth * (NH + VG), w, L: lTree, R: null };
  } else if (rTree) {
    w     = Math.max(rTree.w, NW);
    selfX = rTree.x + rTree.w / 2 - NW / 2;
    return { id, depth, x: selfX, y: depth * (NH + VG), w, L: null, R: rTree };
  } else {
    return { id, depth, x: 0, y: depth * (NH + VG), w: NW, L: null, R: null };
  }
}

function addXOffset(node, dx) {
  if (!node) return null;
  return {
    ...node,
    x: node.x + dx,
    L: node.L ? addXOffset(node.L, dx) : null,
    R: node.R ? addXOffset(node.R, dx) : null,
  };
}

// ── Flatten tree into arrays of nodes + edges ─────────────
function flatten(tree, nodes = [], edges = []) {
  if (!tree) return;
  nodes.push(tree);
  if (tree.L) {
    edges.push({ from: tree, to: tree.L, leg: 'L' });
    flatten(tree.L, nodes, edges);
  }
  if (tree.R) {
    edges.push({ from: tree, to: tree.R, leg: 'R' });
    flatten(tree.R, nodes, edges);
  }
  return { nodes, edges };
}

// ── SVG connector line (90° L-shape) ─────────────────────
function Connector({ fx, fy, tx, ty, leg }) {
  const color = leg === 'L' ? '#6366F1' : '#0EA5E9';
  // fx,fy = centre-bottom of parent. tx,ty = centre-top of child.
  const midY = fy + VG / 2;
  const r    = Math.min(10, Math.abs(tx - fx) / 2, Math.abs(midY - fy));
  const s    = tx >= fx ? 1 : -1;
  let d;
  if (Math.abs(tx - fx) < 3) {
    d = `M${fx},${fy} L${tx},${ty}`;
  } else {
    d = [
      `M${fx},${fy}`,
      `L${fx},${midY - r}`,
      `Q${fx},${midY} ${fx + s * r},${midY}`,
      `L${tx - s * r},${midY}`,
      `Q${tx},${midY} ${tx},${midY + r}`,
      `L${tx},${ty}`,
    ].join(' ');
  }
  return <path d={d} fill="none" stroke={color} strokeWidth={2} opacity={0.6} />;
}

// ── Single member card ────────────────────────────────────
function MemberCard({ data, x, y }) {
  const active = data.status === 'active';
  const color  = active ? '#10B981' : '#EF4444';
  const bgPill = active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';

  return (
    <div style={{
      position:     'absolute',
      left:         x,
      top:          y,
      width:        NW,
      height:       NH,
      background:   '#fff',
      borderRadius: 12,
      border:       `2px solid ${color}`,
      boxShadow:    '0 2px 8px rgba(0,0,0,0.10)',
      display:      'flex',
      flexDirection:'column',
      alignItems:   'center',
      justifyContent:'center',
      gap:          2,
      userSelect:   'none',
      overflow:     'hidden',
    }}>
      {/* Top colour bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:color, borderRadius:'10px 10px 0 0' }}/>
      {/* Member number */}
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#9CA3AF', marginTop:6 }}>
        #{fmtNum(data.mn)}
      </div>
      {/* Name */}
      <div style={{ fontSize:14, fontWeight:800, color:'#111827', letterSpacing:'-0.01em', maxWidth:NW-16, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'center' }}>
        {data.name || '?'}
      </div>
      {/* Status pill */}
      <div style={{ background:bgPill, color, fontSize:9, fontWeight:700, letterSpacing:'0.08em', padding:'2px 10px', borderRadius:999, textTransform:'uppercase' }}>
        {data.status || 'pending'}
      </div>
      {/* Leg counts */}
      <div style={{ fontSize:9, color:'#9CA3AF', marginTop:2 }}>
        L:{data.lc} &nbsp;·&nbsp; R:{data.rc}
      </div>
    </div>
  );
}

// ── Open registration slot ────────────────────────────────
function SlotCard({ x, y, leg, parentId, onRegister }) {
  const [hov, setHov] = useState(false);
  const color = leg === 'L' ? '#6366F1' : '#0EA5E9';
  return (
    <div
      onClick={() => onRegister && onRegister(parentId, leg)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:     'absolute',
        left:         x,
        top:          y,
        width:        NW,
        height:       NH,
        background:   hov ? color : '#fff',
        borderRadius: 12,
        border:       `2px dashed ${color}`,
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        justifyContent:'center',
        gap:          4,
        cursor:       'pointer',
        transition:   'background 0.15s',
        userSelect:   'none',
      }}>
      <div style={{ fontSize: 28, color: hov ? '#fff' : color, lineHeight: 1 }}>+</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: hov ? '#fff' : color, letterSpacing: '0.06em' }}>
        {leg === 'L' ? 'ADD LEFT' : 'ADD RIGHT'}
      </div>
    </div>
  );
}

// ── Main BinaryTree component ─────────────────────────────
export default function BinaryTree({
  nodes        = [],
  members      = [],
  rootMemberId,
  onRegister,
  isAdmin      = false,
  height       = 520,
}) {
  const containerRef = useRef(null);
  const dragRef      = useRef(null);
  const pinchRef     = useRef(null);
  const [tf, setTf]  = useState({ x: 60, y: 30, scale: 1 });

  const clamp = s => Math.max(0.15, Math.min(3, s));

  // ── Build data maps (memoised — only recalculate on data change) ──
  const { nmap, pmap, rootId } = useMemo(() => {
    const nmap = {};
    const pmap = {};

    nodes.forEach(nd => {
      const m = members.find(x => x.id === nd.member_id);
      nmap[nd.id] = {
        id:     nd.id,
        name:   m?.full_name || '?',
        mn:     m?.member_number,
        status: m?.status || 'pending',
        lc:     nd.left_count  || 0,
        rc:     nd.right_count || 0,
      };
      if (nd.parent_id) {
        if (!pmap[nd.parent_id]) pmap[nd.parent_id] = [];
        pmap[nd.parent_id].push({ id: nd.id, leg: nd.leg });
      }
    });

    const rootNd = isAdmin
      ? nodes.find(n => !n.parent_id)
      : nodes.find(n => n.member_id === rootMemberId);

    return { nmap, pmap, rootId: rootNd?.id ?? null };
  }, [nodes, members, isAdmin, rootMemberId]);

  // ── Build layout (memoised) ──
  const layout = useMemo(() => {
    if (!rootId) return null;
    try {
      return buildLayout(rootId, pmap, 0);
    } catch (e) {
      console.error('BinaryTree layout error:', e);
      return null;
    }
  }, [rootId, pmap]);

  // ── Flatten to render lists ──
  const { allNodes, allEdges, slotList } = useMemo(() => {
    if (!layout) return { allNodes: [], allEdges: [], slotList: [] };
    const { nodes: allNodes, edges: allEdges } = flatten(layout) || { nodes: [], edges: [] };

    // Build slot list: for every node missing L or R child, add a slot
    const slotList = [];
    allNodes.forEach(t => {
      const hasL = !!t.L;
      const hasR = !!t.R;
      if (!hasL || !hasR) {
        const nodeCX = t.x + NW / 2;
        const slotY  = t.y + NH + VG;
        if (!hasL && !hasR) {
          slotList.push({ leg: 'L', parentId: t.id, x: nodeCX - NW - HG / 2, y: slotY });
          slotList.push({ leg: 'R', parentId: t.id, x: nodeCX + HG / 2,       y: slotY });
        } else if (!hasL) {
          const rightX = t.R.x;
          slotList.push({ leg: 'L', parentId: t.id, x: rightX - NW - HG, y: slotY });
        } else {
          const leftX = t.L.x;
          slotList.push({ leg: 'R', parentId: t.id, x: leftX + NW + HG, y: slotY });
        }
      }
    });

    return { allNodes, allEdges, slotList };
  }, [layout]);

  // ── Canvas size ──
  const canvasW = layout ? layout.w + 120 + NW : NW + 120;
  const maxD    = layout ? Math.max(0, ...allNodes.map(n => n.depth)) : 0;
  const canvasH = (maxD + 2) * (NH + VG) + 80;

  // ── Pan & zoom handlers ──
  const onMD = useCallback(e => {
    if (e.button !== 0) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, tx: tf.x, ty: tf.y };
  }, [tf.x, tf.y]);

  const onMM = useCallback(e => {
    if (!dragRef.current) return;
    setTf(t => ({ ...t, x: dragRef.current.tx + e.clientX - dragRef.current.sx, y: dragRef.current.ty + e.clientY - dragRef.current.sy }));
  }, []);

  const onMU = useCallback(() => { dragRef.current = null; }, []);

  const onWheel = useCallback(e => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const f  = e.deltaY > 0 ? 0.88 : 1.14;
    setTf(t => {
      const ns = clamp(t.scale * f);
      const r  = ns / t.scale;
      return { scale: ns, x: mx - r * (mx - t.x), y: my - r * (my - t.y) };
    });
  }, []);

  const onTS = useCallback(e => {
    if (e.touches.length === 1) {
      dragRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, tx: tf.x, ty: tf.y };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        dist:  Math.hypot(dx, dy),
        scale: tf.scale, tx: tf.x, ty: tf.y,
        mx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        my: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      dragRef.current = null;
    }
  }, [tf]);

  const onTM = useCallback(e => {
    e.preventDefault();
    if (e.touches.length === 1 && dragRef.current) {
      setTf(t => ({ ...t, x: dragRef.current.tx + e.touches[0].clientX - dragRef.current.sx, y: dragRef.current.ty + e.touches[0].clientY - dragRef.current.sy }));
    } else if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d  = Math.hypot(dx, dy);
      const ns = clamp(pinchRef.current.scale * d / pinchRef.current.dist);
      const r  = ns / pinchRef.current.scale;
      const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const mx = pinchRef.current.mx - rect.left;
      const my = pinchRef.current.my - rect.top;
      setTf({ scale: ns, x: mx - r * (mx - pinchRef.current.tx), y: my - r * (my - pinchRef.current.ty) });
    }
  }, []);

  const onTE = useCallback(() => { dragRef.current = null; pinchRef.current = null; }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel',     onWheel, { passive: false });
    el.addEventListener('touchmove', onTM,    { passive: false });
    return () => {
      el.removeEventListener('wheel',     onWheel);
      el.removeEventListener('touchmove', onTM);
    };
  }, [onWheel, onTM]);

  // ── Empty / loading state ──────────────────────────────
  if (!layout) {
    return (
      <div style={{ height, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F9FAFB', borderRadius:'0 0 14px 14px', color:'#9CA3AF', gap:10 }}>
        <div style={{ fontSize: 40 }}>🌳</div>
        <div style={{ fontWeight: 600 }}>
          {nodes.length === 0 ? 'Loading network data…' : isAdmin ? 'No root node found in network' : 'Your account is not yet placed in the network'}
        </div>
        <div style={{ fontSize: 12 }}>
          {nodes.length > 0 && !rootId && 'Contact admin to resolve placement'}
        </div>
      </div>
    );
  }

  const zoomIn  = () => setTf(t => ({ ...t, scale: clamp(t.scale * 1.25) }));
  const zoomOut = () => setTf(t => ({ ...t, scale: clamp(t.scale * 0.8) }));
  const reset   = () => setTf({ x: 60, y: 30, scale: 1 });

  return (
    <div style={{ position:'relative', background:'#F9FAFB', borderRadius:'0 0 14px 14px', overflow:'hidden' }}>

      {/* Controls */}
      <div style={{ position:'absolute', top:12, right:12, zIndex:20, display:'flex', flexDirection:'column', gap:6 }}>
        {[['+', zoomIn], ['−', zoomOut], ['⌂', reset]].map(([lbl, fn]) => (
          <button key={lbl} onClick={fn} style={{ width:36, height:36, background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, fontWeight:700, fontSize: lbl === '⌂' ? 14 : 20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', color:'#374151', fontFamily:'inherit' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Scale badge */}
      <div style={{ position:'absolute', top:12, left:12, zIndex:20, background:'#fff', border:'1px solid #E5E7EB', borderRadius:6, padding:'4px 10px', fontSize:11, color:'#6B7280', fontWeight:600 }}>
        {Math.round(tf.scale * 100)}%
      </div>

      {/* Legend */}
      <div style={{ position:'absolute', bottom:12, left:12, zIndex:20, background:'rgba(255,255,255,0.95)', border:'1px solid #E5E7EB', borderRadius:6, padding:'5px 12px', display:'flex', gap:12, fontSize:10, color:'#6B7280', fontWeight:600 }}>
        {[['#6366F1','Left leg'],['#0EA5E9','Right leg'],['#10B981','Active'],['#EF4444','Inactive']].map(([col,label]) => (
          <span key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width: label.includes('leg') ? 14 : 8, height: label.includes('leg') ? 3 : 8, background:col, display:'inline-block', borderRadius: label.includes('leg') ? 2 : '50%' }}/>
            {label}
          </span>
        ))}
      </div>

      {/* Pannable / zoomable canvas */}
      <div
        ref={containerRef}
        style={{ overflow:'hidden', height, cursor:'grab', userSelect:'none', touchAction:'none' }}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onTouchStart={onTS} onTouchEnd={onTE}
      >
        {/* Inner transform container */}
        <div style={{ position:'absolute', transformOrigin:'0 0', transform:`translate(${tf.x}px,${tf.y}px) scale(${tf.scale})`, width: canvasW, height: canvasH }}>

          {/* SVG layer: connectors only — no hooks in SVG */}
          <svg style={{ position:'absolute', top:0, left:0, width:canvasW, height:canvasH, overflow:'visible', pointerEvents:'none' }}>
            {/* Member→member edges */}
            {allEdges.map((e, i) => (
              <Connector key={i}
                fx={e.from.x + NW / 2} fy={e.from.y + NH}
                tx={e.to.x   + NW / 2} ty={e.to.y}
                leg={e.leg}
              />
            ))}
            {/* Slot edges */}
            {onRegister && slotList.map((s, i) => (
              <Connector key={`s${i}`}
                fx={(() => {
                  const parent = allNodes.find(n => n.id === s.parentId);
                  return parent ? parent.x + NW / 2 : 0;
                })()}
                fy={(() => {
                  const parent = allNodes.find(n => n.id === s.parentId);
                  return parent ? parent.y + NH : 0;
                })()}
                tx={s.x + NW / 2}
                ty={s.y}
                leg={s.leg}
              />
            ))}
          </svg>

          {/* HTML layer: member cards */}
          {allNodes.map(t => {
            const data = nmap[t.id];
            if (!data) return null;
            return <MemberCard key={t.id} data={data} x={t.x} y={t.y} />;
          })}

          {/* HTML layer: registration slots */}
          {onRegister && slotList.map((s, i) => (
            <SlotCard key={`slot-${i}`} x={s.x} y={s.y} leg={s.leg} parentId={s.parentId} onRegister={onRegister} />
          ))}

        </div>
      </div>
    </div>
  );
}
