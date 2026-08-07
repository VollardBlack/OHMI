'use client';
import { useRef, useState, useEffect, useCallback } from 'react';

// ── Layout constants ──────────────────────────────────────
const NW = 136; // node width
const NH = 80;  // node height
const HG = 36;  // horizontal gap between siblings
const VG = 68;  // vertical gap between rows

const fmt = n => n ? String(n).padStart(5,'0') : '?????';

// ── Shift an entire subtree by dx ─────────────────────────
function shift(node, dx) {
  if (!node) return;
  node.x += dx;
  shift(node.L, dx);
  shift(node.R, dx);
}

// ── Compute layout tree ───────────────────────────────────
// Returns { id, x, y, w, depth, L, R }
function layout(id, parentMap, depth) {
  const children = parentMap[id] || [];
  const lChild = children.find(c => c.leg === 'L');
  const rChild = children.find(c => c.leg === 'R');
  const lTree = lChild ? layout(lChild.id, parentMap, depth + 1) : null;
  const rTree = rChild ? layout(rChild.id, parentMap, depth + 1) : null;

  let w, cx;
  if (lTree && rTree) {
    w = lTree.w + HG + rTree.w;
    shift(rTree, lTree.w + HG);
    cx = (lTree.x + NW/2 + rTree.x + NW/2) / 2 - NW/2;
  } else if (lTree) {
    w = Math.max(lTree.w, NW);
    cx = lTree.x;
  } else if (rTree) {
    w = Math.max(rTree.w, NW);
    cx = rTree.x;
  } else {
    w = NW;
    cx = 0;
  }

  return { id, x: cx, y: depth * (NH + VG), w, depth, L: lTree, R: rTree };
}

// ── SVG 90° connector with rounded corner ─────────────────
function Connector({ px, py, cx, cy, leg }) {
  const color = leg === 'L' ? '#6366F1' : '#0EA5E9';
  const midY = py + VG / 2;
  const r = Math.min(8, Math.abs(cx - px) / 2, Math.abs(midY - py) / 2);
  const dx = cx >= px ? 1 : -1;
  let d;
  if (Math.abs(cx - px) < 2) {
    d = `M${px},${py} L${cx},${cy}`;
  } else {
    d = `M${px},${py} L${px},${midY - r} Q${px},${midY} ${px + dx*r},${midY} L${cx - dx*r},${midY} Q${cx},${midY} ${cx},${midY + r} L${cx},${cy}`;
  }
  return <path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6}/>;
}

// ── Member node card ──────────────────────────────────────
function MemberCard({ n, x, y }) {
  const active = n.status === 'active';
  const col = active ? '#10B981' : '#EF4444';
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={2} y={3} width={NW} height={NH} rx={8} fill="rgba(0,0,0,0.06)"/>
      <rect x={0} y={0} width={NW} height={NH} rx={8} fill="white" stroke={col} strokeWidth={1.5}/>
      <rect x={0} y={0} width={NW} height={4} rx={2} fill={col}/>
      <rect x={4} y={0} width={NW-8} height={4} fill={col}/>
      <text x={NW/2} y={21} textAnchor="middle" fontSize={9} fontWeight={700} letterSpacing={0.8} fill="#9CA3AF" fontFamily="Inter,sans-serif">#{fmt(n.mn)}</text>
      <text x={NW/2} y={38} textAnchor="middle" fontSize={12} fontWeight={700} fill="#111827" fontFamily="Inter,sans-serif">
        {(n.name||'').length > 14 ? n.name.slice(0,13)+'…' : (n.name||'?')}
      </text>
      <rect x={(NW-52)/2} y={44} width={52} height={15} rx={7} fill={active?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'}/>
      <text x={NW/2} y={55} textAnchor="middle" fontSize={9} fontWeight={700} fill={col} fontFamily="Inter,sans-serif" letterSpacing={0.4}>
        {(n.status||'pending').toUpperCase()}
      </text>
      <text x={10} y={72} fontSize={9} fill="#9CA3AF" fontFamily="Inter,sans-serif">L:{n.lc||0}</text>
      <text x={NW-10} y={72} textAnchor="end" fontSize={9} fill="#9CA3AF" fontFamily="Inter,sans-serif">R:{n.rc||0}</text>
    </g>
  );
}

// ── Open slot (register button) ───────────────────────────
function Slot({ x, y, leg, parentId, onRegister }) {
  const [hov, setHov] = useState(false);
  const col = leg === 'L' ? '#6366F1' : '#0EA5E9';
  return (
    <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }}
      onClick={() => onRegister && onRegister(parentId, leg)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <rect x={0} y={0} width={NW} height={NH} rx={8}
        fill={hov ? col : 'white'} stroke={col} strokeWidth={1.5} strokeDasharray="5,3"/>
      <text x={NW/2} y={36} textAnchor="middle" fontSize={24} fill={hov?'white':col} fontFamily="Inter,sans-serif">+</text>
      <text x={NW/2} y={56} textAnchor="middle" fontSize={10} fontWeight={700}
        fill={hov?'white':col} fontFamily="Inter,sans-serif" letterSpacing={0.3}>
        {leg==='L'?'ADD LEFT':'ADD RIGHT'}
      </text>
    </g>
  );
}

// ── Recursive tree renderer ───────────────────────────────
function Nodes({ tree, nodeMap, xOff, onRegister }) {
  if (!tree) return null;
  const n = nodeMap[tree.id];
  if (!n) return null;

  const nx = tree.x + xOff;
  const ny = tree.y;
  const px = nx + NW/2;
  const py = ny + NH;
  const slotY = ny + NH + VG;

  // Calculate slot positions for missing children
  let slotLx, slotRx;
  if (!tree.L && !tree.R) {
    slotLx = nx - NW/2 - HG/2;
    slotRx = nx + NW/2 + HG/2;
  } else if (!tree.L) {
    slotLx = (tree.R ? tree.R.x + xOff : nx) - NW - HG;
  } else if (!tree.R) {
    slotRx = (tree.L ? tree.L.x + xOff : nx) + NW + HG;
  }

  return (
    <>
      <MemberCard n={n} x={nx} y={ny}/>

      {tree.L ? (
        <>
          <Connector px={px} py={py} cx={tree.L.x+xOff+NW/2} cy={tree.L.y} leg="L"/>
          <Nodes tree={tree.L} nodeMap={nodeMap} xOff={xOff} onRegister={onRegister}/>
        </>
      ) : onRegister && slotLx !== undefined ? (
        <>
          <Connector px={px} py={py} cx={slotLx+NW/2} cy={slotY} leg="L"/>
          <Slot x={slotLx} y={slotY} leg="L" parentId={tree.id} onRegister={onRegister}/>
        </>
      ) : null}

      {tree.R ? (
        <>
          <Connector px={px} py={py} cx={tree.R.x+xOff+NW/2} cy={tree.R.y} leg="R"/>
          <Nodes tree={tree.R} nodeMap={nodeMap} xOff={xOff} onRegister={onRegister}/>
        </>
      ) : onRegister && slotRx !== undefined ? (
        <>
          <Connector px={px} py={py} cx={slotRx+NW/2} cy={slotY} leg="R"/>
          <Slot x={slotRx} y={slotY} leg="R" parentId={tree.id} onRegister={onRegister}/>
        </>
      ) : null}
    </>
  );
}

// ── Main exported component ───────────────────────────────
export default function BinaryTree({ nodes, members, rootMemberId, onRegister, isAdmin=false, height=460 }) {
  const ref = useRef(null);
  const [tf, setTf] = useState({ x: 40, y: 20, scale: 1 });
  const drag = useRef(null);
  const pinch = useRef(null);

  // Build data maps
  const nodeMap = {};   // id → enriched node data
  const parentMap = {}; // parentId → [{id, leg}]

  nodes.forEach(nd => {
    const m = members.find(x => x.id === nd.member_id);
    nodeMap[nd.id] = {
      ...nd,
      name: m?.full_name?.split(' ')[0] || '?',
      mn: m?.member_number,
      status: m?.status || 'pending',
      lc: nd.left_count || 0,
      rc: nd.right_count || 0,
    };
    if (nd.parent_id) {
      if (!parentMap[nd.parent_id]) parentMap[nd.parent_id] = [];
      parentMap[nd.parent_id].push({ id: nd.id, leg: nd.leg });
    }
  });

  const rootNode = isAdmin
    ? nodes.find(n => !n.parent_id)
    : nodes.find(n => n.member_id === rootMemberId);

  const clamp = s => Math.min(3, Math.max(0.15, s));

  // Pan — mouse
  const onMD = useCallback(e => {
    if (e.button !== 0) return;
    drag.current = { sx: e.clientX, sy: e.clientY, tx: tf.x, ty: tf.y };
  }, [tf]);

  const onMM = useCallback(e => {
    if (!drag.current) return;
    setTf(t => ({ ...t, x: drag.current.tx + e.clientX - drag.current.sx, y: drag.current.ty + e.clientY - drag.current.sy }));
  }, []);

  const onMU = useCallback(() => { drag.current = null; }, []);

  // Zoom — wheel
  const onWheel = useCallback(e => {
    e.preventDefault();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    setTf(t => {
      const ns = clamp(t.scale * factor);
      const r = ns / t.scale;
      return { scale: ns, x: mx - r*(mx - t.x), y: my - r*(my - t.y) };
    });
  }, []);

  // Touch — pan + pinch
  const onTS = useCallback(e => {
    if (e.touches.length === 1) {
      drag.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, tx: tf.x, ty: tf.y };
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinch.current = { dist: d, scale: tf.scale, tx: tf.x, ty: tf.y, mx: (e.touches[0].clientX+e.touches[1].clientX)/2, my: (e.touches[0].clientY+e.touches[1].clientY)/2 };
      drag.current = null;
    }
  }, [tf]);

  const onTM = useCallback(e => {
    e.preventDefault();
    if (e.touches.length === 1 && drag.current) {
      setTf(t => ({ ...t, x: drag.current.tx + e.touches[0].clientX - drag.current.sx, y: drag.current.ty + e.touches[0].clientY - drag.current.sy }));
    } else if (e.touches.length === 2 && pinch.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const ns = clamp(pinch.current.scale * (d / pinch.current.dist));
      const r = ns / pinch.current.scale;
      const rect = ref.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const mx = pinch.current.mx - rect.left;
      const my = pinch.current.my - rect.top;
      setTf({ scale: ns, x: mx - r*(mx - pinch.current.tx), y: my - r*(my - pinch.current.ty) });
    }
  }, []);

  const onTE = useCallback(() => { drag.current = null; pinch.current = null; }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', onTM, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTM);
    };
  }, [onWheel, onTM]);

  if (!rootNode) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '0 0 14px 14px' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🌳</div>
        <div style={{ fontWeight: 600 }}>No network data yet</div>
      </div>
    );
  }

  // Build layout tree — must deep-copy nodeMap entries since shift() mutates x
  const tree = layout(rootNode.id, parentMap, 0);
  const XOff = 40;
  const svgW = tree.w + XOff * 2 + NW;
  const maxD = (function md(t) { return t ? Math.max(t.depth, md(t.L), md(t.R)) : 0; })(tree);
  const svgH = (maxD + 2) * (NH + VG) + 60;

  const reset = () => setTf({ x: 40, y: 20, scale: 1 });

  return (
    <div style={{ position: 'relative', background: '#F9FAFB', borderRadius: '0 0 14px 14px' }}>
      {/* Controls */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          ['+', () => setTf(t => { const ns=clamp(t.scale*1.25); return {...t,scale:ns}; })],
          ['−', () => setTf(t => { const ns=clamp(t.scale*0.8); return {...t,scale:ns}; })],
          ['⌂', reset],
        ].map(([label, fn]) => (
          <button key={label} onClick={fn} style={{ width: 36, height: 36, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, fontWeight: 700, fontSize: label==='⌂'?14:20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', color: '#374151' }}>
            {label}
          </button>
        ))}
      </div>
      {/* Scale */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, background: 'white', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#6B7280', fontWeight: 600 }}>
        {Math.round(tf.scale * 100)}%
      </div>
      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10, background: 'rgba(255,255,255,0.95)', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 12px', display: 'flex', gap: 12, fontSize: 10, color: '#6B7280', fontWeight: 600 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#6366F1', display: 'inline-block', borderRadius: 2 }}/> Left</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 3, background: '#0EA5E9', display: 'inline-block', borderRadius: 2 }}/> Right</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}/> Active</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }}/> Inactive</span>
      </div>
      {/* Canvas */}
      <div
        ref={ref}
        style={{ overflow: 'hidden', height, cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onTouchStart={onTS} onTouchEnd={onTE}
      >
        <svg
          width={svgW} height={svgH}
          style={{ transform: `translate(${tf.x}px,${tf.y}px) scale(${tf.scale})`, transformOrigin: '0 0', overflow: 'visible' }}
        >
          <Nodes tree={tree} nodeMap={nodeMap} xOff={XOff} onRegister={onRegister}/>
        </svg>
      </div>
    </div>
  );
}
