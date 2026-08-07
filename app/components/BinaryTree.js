'use client';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

// ─── Constants ────────────────────────────────────────────
const NW = 140;  // node width
const NH = 82;   // node height
const HG = 44;   // horizontal gap
const VG = 72;   // vertical gap

const pad = n => n ? String(n).padStart(5,'0') : '?????';

// ─── Pure layout engine (no mutation of shared state) ────
// Returns a NEW tree object each call — safe to call repeatedly
function computeLayout(id, pmap, depth) {
  const kids   = pmap[id] || [];
  const lKid   = kids.find(k => k.leg === 'L');
  const rKid   = kids.find(k => k.leg === 'R');
  const lSub   = lKid ? computeLayout(lKid.id, pmap, depth + 1) : null;
  const rSub   = rKid ? computeLayout(rKid.id, pmap, depth + 1) : null;

  // Each subtree returned with x relative to its own origin (0).
  // We'll offset them here.
  let lOff = 0, rOff = 0, w, cx;

  if (lSub && rSub) {
    rOff = lSub.w + HG;
    w    = lSub.w + HG + rSub.w;
    cx   = (0 + NW/2 + rOff + NW/2) / 2 - NW/2;   // centre between two children
  } else if (lSub) {
    w  = Math.max(lSub.w, NW);
    cx = 0;
  } else if (rSub) {
    w  = Math.max(rSub.w, NW);
    cx = 0;
  } else {
    w  = NW;
    cx = 0;
  }

  return {
    id,
    depth,
    x:  cx,                          // x of THIS node
    y:  depth * (NH + VG),
    w,
    L:  lSub  ? offsetTree(lSub,  lOff) : null,
    R:  rSub  ? offsetTree(rSub,  rOff) : null,
  };
}

// Return a NEW tree with every x shifted by dx — pure, no mutation
function offsetTree(t, dx) {
  if (!t || dx === 0) return t;
  return {
    ...t,
    x: t.x + dx,
    L: t.L ? offsetTree(t.L, dx) : null,
    R: t.R ? offsetTree(t.R, dx) : null,
  };
}

// ─── Max depth ────────────────────────────────────────────
function maxDepth(t) {
  if (!t) return 0;
  return Math.max(t.depth, maxDepth(t.L), maxDepth(t.R));
}

// ─── SVG 90° connector ───────────────────────────────────
function Edge({ px, py, cx, cy, leg }) {
  const col   = leg === 'L' ? '#6366F1' : '#0EA5E9';
  const midY  = py + VG / 2;
  const r     = Math.min(10, Math.abs(cx - px) / 2, Math.abs(midY - py) / 2);
  const sign  = cx >= px ? 1 : -1;
  const path  = Math.abs(cx - px) < 2
    ? `M${px},${py} L${cx},${cy}`
    : [
        `M${px},${py}`,
        `L${px},${midY - r}`,
        `Q${px},${midY} ${px + sign*r},${midY}`,
        `L${cx - sign*r},${midY}`,
        `Q${cx},${midY} ${cx},${midY + r}`,
        `L${cx},${cy}`,
      ].join(' ');
  return <path d={path} fill="none" stroke={col} strokeWidth={1.5} opacity={0.55}/>;
}

// ─── Member node ─────────────────────────────────────────
function Node({ n, x, y }) {
  const active = n.status === 'active';
  const col    = active ? '#10B981' : '#EF4444';
  return (
    <g transform={`translate(${x},${y})`}>
      {/* shadow */}
      <rect x={2} y={3} width={NW} height={NH} rx={8} fill="rgba(0,0,0,0.06)"/>
      {/* card */}
      <rect x={0} y={0} width={NW} height={NH} rx={8} fill="#fff" stroke={col} strokeWidth={1.5}/>
      {/* top colour bar */}
      <rect x={0} y={0} width={NW} height={5} rx={3} fill={col}/>
      <rect x={4} y={0} width={NW-8} height={5} fill={col}/>
      {/* member number */}
      <text x={NW/2} y={22} textAnchor="middle" fontSize={9} fontWeight={700}
        letterSpacing={0.8} fill="#9CA3AF" fontFamily="Inter,sans-serif">
        #{pad(n.mn)}
      </text>
      {/* name */}
      <text x={NW/2} y={40} textAnchor="middle" fontSize={13} fontWeight={700}
        fill="#111827" fontFamily="Inter,sans-serif">
        {(n.name||'').length > 14 ? n.name.slice(0,13)+'…' : (n.name||'?')}
      </text>
      {/* status pill */}
      <rect x={(NW-54)/2} y={46} width={54} height={15} rx={7}
        fill={active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}/>
      <text x={NW/2} y={57} textAnchor="middle" fontSize={9} fontWeight={700}
        fill={col} fontFamily="Inter,sans-serif" letterSpacing={0.5}>
        {(n.status||'pending').toUpperCase()}
      </text>
      {/* leg counts */}
      <text x={10}    y={74} fontSize={9} fill="#9CA3AF" fontFamily="Inter,sans-serif">L:{n.lc||0}</text>
      <text x={NW-10} y={74} textAnchor="end" fontSize={9} fill="#9CA3AF" fontFamily="Inter,sans-serif">R:{n.rc||0}</text>
    </g>
  );
}

// ─── Open slot ────────────────────────────────────────────
function Slot({ x, y, leg, parentId, onReg }) {
  const [hov, setHov] = useState(false);
  const col = leg === 'L' ? '#6366F1' : '#0EA5E9';
  return (
    <g transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer' }}
      onClick={() => onReg(parentId, leg)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      <rect x={0} y={0} width={NW} height={NH} rx={8}
        fill={hov ? col : '#fff'} stroke={col} strokeWidth={1.5} strokeDasharray="5,3"/>
      <text x={NW/2} y={36} textAnchor="middle" fontSize={24}
        fill={hov ? '#fff' : col} fontFamily="Inter,sans-serif">+</text>
      <text x={NW/2} y={56} textAnchor="middle" fontSize={10} fontWeight={700}
        fill={hov ? '#fff' : col} fontFamily="Inter,sans-serif" letterSpacing={0.4}>
        {leg === 'L' ? 'ADD LEFT' : 'ADD RIGHT'}
      </text>
    </g>
  );
}

// ─── Recursive SVG renderer ───────────────────────────────
function TreeNodes({ tree, nmap, xOff, onReg }) {
  if (!tree) return null;
  const nd = nmap[tree.id];
  if (!nd) return null;

  const nx    = tree.x + xOff;
  const ny    = tree.y;
  const pcx   = nx + NW/2;       // parent centre x
  const pby   = ny + NH;         // parent bottom y
  const slotY = ny + NH + VG;

  // Slot x positions for missing children
  let slotLx, slotRx;
  if (!tree.L && !tree.R) {
    slotLx = nx - NW/2 - HG/2;
    slotRx = nx + NW/2 + HG/2;
  } else if (!tree.L) {
    slotLx = (tree.R.x + xOff) - NW - HG;
  } else if (!tree.R) {
    slotRx = (tree.L.x + xOff) + NW + HG;
  }

  return (
    <>
      <Node n={nd} x={nx} y={ny}/>

      {/* Left child or slot */}
      {tree.L ? (
        <>
          <Edge px={pcx} py={pby} cx={tree.L.x+xOff+NW/2} cy={tree.L.y} leg="L"/>
          <TreeNodes tree={tree.L} nmap={nmap} xOff={xOff} onReg={onReg}/>
        </>
      ) : onReg && slotLx !== undefined ? (
        <>
          <Edge px={pcx} py={pby} cx={slotLx+NW/2} cy={slotY} leg="L"/>
          <Slot x={slotLx} y={slotY} leg="L" parentId={tree.id} onReg={onReg}/>
        </>
      ) : null}

      {/* Right child or slot */}
      {tree.R ? (
        <>
          <Edge px={pcx} py={pby} cx={tree.R.x+xOff+NW/2} cy={tree.R.y} leg="R"/>
          <TreeNodes tree={tree.R} nmap={nmap} xOff={xOff} onReg={onReg}/>
        </>
      ) : onReg && slotRx !== undefined ? (
        <>
          <Edge px={pcx} py={pby} cx={slotRx+NW/2} cy={slotY} leg="R"/>
          <Slot x={slotRx} y={slotY} leg="R" parentId={tree.id} onReg={onReg}/>
        </>
      ) : null}
    </>
  );
}

// ─── Main component ───────────────────────────────────────
export default function BinaryTree({
  nodes      = [],
  members    = [],
  rootMemberId,
  onRegister,
  isAdmin    = false,
  height     = 460,
}) {
  const ref   = useRef(null);
  const drag  = useRef(null);
  const pinch = useRef(null);
  const [tf, setTf] = useState({ x: 40, y: 20, scale: 1 });

  const clamp = s => Math.min(3, Math.max(0.15, s));

  // ── Build stable data maps — only recompute when nodes/members change ──
  const { nmap, pmap, rootId } = useMemo(() => {
    const nmap  = {};
    const pmap  = {};

    nodes.forEach(nd => {
      const m = members.find(x => x.id === nd.member_id);
      nmap[nd.id] = {
        id:     nd.id,
        name:   m?.full_name?.split(' ')[0] || '?',
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

  // ── Compute layout — pure, memoized, never mutates ──
  const tree = useMemo(() => {
    if (!rootId) return null;
    return computeLayout(rootId, pmap, 0);
  }, [rootId, pmap]);

  // ── Interaction handlers ──────────────────────────────────
  const onMD = useCallback(e => {
    if (e.button !== 0) return;
    drag.current = { sx: e.clientX, sy: e.clientY, tx: tf.x, ty: tf.y };
  }, [tf.x, tf.y]);

  const onMM = useCallback(e => {
    if (!drag.current) return;
    setTf(t => ({
      ...t,
      x: drag.current.tx + e.clientX - drag.current.sx,
      y: drag.current.ty + e.clientY - drag.current.sy,
    }));
  }, []);

  const onMU = useCallback(() => { drag.current = null; }, []);

  const onWheel = useCallback(e => {
    e.preventDefault();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const f  = e.deltaY > 0 ? 0.88 : 1.14;
    setTf(t => {
      const ns = clamp(t.scale * f);
      const r  = ns / t.scale;
      return { scale: ns, x: mx - r*(mx - t.x), y: my - r*(my - t.y) };
    });
  }, []);

  const onTS = useCallback(e => {
    if (e.touches.length === 1) {
      drag.current = {
        sx: e.touches[0].clientX, sy: e.touches[0].clientY,
        tx: tf.x, ty: tf.y,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinch.current = {
        dist:  Math.hypot(dx, dy),
        scale: tf.scale,
        tx: tf.x, ty: tf.y,
        mx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        my: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      drag.current = null;
    }
  }, [tf.x, tf.y, tf.scale]);

  const onTM = useCallback(e => {
    e.preventDefault();
    if (e.touches.length === 1 && drag.current) {
      setTf(t => ({
        ...t,
        x: drag.current.tx + e.touches[0].clientX - drag.current.sx,
        y: drag.current.ty + e.touches[0].clientY - drag.current.sy,
      }));
    } else if (e.touches.length === 2 && pinch.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d  = Math.hypot(dx, dy);
      const ns = clamp(pinch.current.scale * (d / pinch.current.dist));
      const r  = ns / pinch.current.scale;
      const rect = ref.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const mx = pinch.current.mx - rect.left;
      const my = pinch.current.my - rect.top;
      setTf({
        scale: ns,
        x: mx - r*(mx - pinch.current.tx),
        y: my - r*(my - pinch.current.ty),
      });
    }
  }, []);

  const onTE = useCallback(() => {
    drag.current  = null;
    pinch.current = null;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('wheel',     onWheel, { passive: false });
    el.addEventListener('touchmove', onTM,    { passive: false });
    return () => {
      el.removeEventListener('wheel',     onWheel);
      el.removeEventListener('touchmove', onTM);
    };
  }, [onWheel, onTM]);

  // ── Empty state ───────────────────────────────────────────
  if (!tree) {
    return (
      <div style={{ padding: 48, textAlign: 'center', background: '#F9FAFB',
        borderRadius: '0 0 14px 14px', color: '#9CA3AF' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🌳</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {nodes.length === 0 ? 'Loading network…' : 'No network data found'}
        </div>
        {nodes.length > 0 && !rootId && (
          <div style={{ fontSize: 12, marginTop: 6 }}>
            {isAdmin ? 'Root node not found' : 'Your node was not found in the network'}
          </div>
        )}
      </div>
    );
  }

  const XOff  = 40;
  const svgW  = tree.w + XOff * 2 + NW;
  const svgH  = (maxDepth(tree) + 2) * (NH + VG) + 60;

  const zoomIn  = () => setTf(t => ({ ...t, scale: clamp(t.scale * 1.25) }));
  const zoomOut = () => setTf(t => ({ ...t, scale: clamp(t.scale * 0.8)  }));
  const reset   = () => setTf({ x: 40, y: 20, scale: 1 });

  return (
    <div style={{ position: 'relative', background: '#F9FAFB', borderRadius: '0 0 14px 14px' }}>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[['+', zoomIn], ['−', zoomOut], ['⌂', reset]].map(([lbl, fn]) => (
          <button key={lbl} onClick={fn} style={{
            width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: 8, fontWeight: 700, fontSize: lbl === '⌂' ? 14 : 20,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', color: '#374151',
            fontFamily: 'inherit',
          }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Scale indicator */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10,
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6,
        padding: '4px 10px', fontSize: 11, color: '#6B7280', fontWeight: 600 }}>
        {Math.round(tf.scale * 100)}%
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10,
        background: 'rgba(255,255,255,0.95)', border: '1px solid #E5E7EB',
        borderRadius: 6, padding: '5px 12px',
        display: 'flex', gap: 12, fontSize: 10, color: '#6B7280', fontWeight: 600 }}>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:12, height:3, background:'#6366F1', display:'inline-block', borderRadius:2 }}/>
          Left leg
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:12, height:3, background:'#0EA5E9', display:'inline-block', borderRadius:2 }}/>
          Right leg
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#10B981', display:'inline-block' }}/>
          Active
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#EF4444', display:'inline-block' }}/>
          Inactive
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={ref}
        style={{ overflow: 'hidden', height, cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
        onMouseDown={onMD}
        onMouseMove={onMM}
        onMouseUp={onMU}
        onMouseLeave={onMU}
        onTouchStart={onTS}
        onTouchEnd={onTE}
      >
        <svg
          width={svgW}
          height={svgH}
          style={{
            transform: `translate(${tf.x}px,${tf.y}px) scale(${tf.scale})`,
            transformOrigin: '0 0',
            overflow: 'visible',
          }}
        >
          <TreeNodes
            tree={tree}
            nmap={nmap}
            xOff={XOff}
            onReg={onRegister || null}
          />
        </svg>
      </div>
    </div>
  );
}
