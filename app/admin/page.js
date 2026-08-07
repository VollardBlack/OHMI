'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import BinaryTree from '@/app/components/BinaryTree';

const TABS = [
  { id: 'dashboard', icon: 'ti-layout-dashboard', tip: 'Dashboard' },
  { id: 'members',   icon: 'ti-users',            tip: 'Members' },
  { id: 'network',   icon: 'ti-binary-tree-2',    tip: 'Binary Tree' },
  { id: 'orders',    icon: 'ti-shopping-bag',     tip: 'Orders' },
  { id: 'billing',   icon: 'ti-coin',             tip: 'Billing' },
  { id: 'ledger',    icon: 'ti-file-invoice',     tip: 'Ledger' },
  { id: 'calc',      icon: 'ti-calculator',       tip: 'Profit Calc' },
  { id: 'foundation',icon: 'ti-heart',            tip: 'Foundation' },
  { id: 'products',  icon: 'ti-package',         tip: 'Products' },
  { id: 'travel',    icon: 'ti-plane',           tip: 'Travel Bookings' },
];

const MN = n => n ? String(n).padStart(5,'0') : '—';
const fmtR = n => 'R\u202f' + Number(n||0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtD = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';



// ── Profit Calculator ────────────────────────────────────────────────────────
function ProfitCalc() {
  const PKGS = [
    { id: 'starter', name: 'Starter Pack', kg: 0.25, retail: 1500, pool: 500 },
    { id: 'builder', name: 'Builder Pack', kg: 1,    retail: 1500, pool: 500 },
    { id: 'legacy',  name: 'Legacy Pack',  kg: 2,    retail: 2500, pool: 1000 },
    { id: 'empire',  name: 'Empire Pack',  kg: 5,    retail: 5000, pool: 1500 },
  ];

  const [sel, setSel] = useState('builder');
  const [costs, setCosts] = useState({
    greenBeans:  153.50,
    roasting:     27.50,
    packaging:     8.00,
    delivery:     15.00,
    foundation:   15.00,
  });
  const [overrides, setOverrides] = useState({});

  const pkg = PKGS.find(p => p.id === sel);
  const c = { ...costs, ...overrides };

  const costPerKg = c.greenBeans + c.roasting;
  const coffeeCost = costPerKg * pkg.kg;
  const packCost   = c.packaging * (pkg.kg >= 1 ? pkg.kg : 1);
  const foundCost  = c.foundation * pkg.kg;
  const delivCost  = c.delivery;
  const totalCost  = coffeeCost + packCost + foundCost + delivCost;
  const repPool    = pkg.pool * 0.30;
  const ohmiPool   = pkg.pool * 0.70;
  const netRevenue = pkg.retail - pkg.pool;
  const grossProfit = netRevenue - totalCost;
  const marginPct  = ((grossProfit / pkg.retail) * 100);
  const ohmiTotal  = grossProfit + ohmiPool;

  const row = (label, val, editable, key) => (
    <div className="calc-row" key={label}>
      <span className="calc-row-label">{label}</span>
      {editable ? (
        <input className="calc-row-input" type="number" step="0.01"
          value={overrides[key] ?? costs[key]}
          onChange={e => setOverrides(o => ({ ...o, [key]: parseFloat(e.target.value)||0 }))}
        />
      ) : (
        <span className="calc-row-val">{val}</span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Package selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PKGS.map(p => (
          <button key={p.id}
            className={`btn btn-sm ${sel===p.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setSel(p.id); setOverrides({}); }}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="calc-grid">
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>Cost inputs — editable</div>
          <div className="calc-inputs">
            {row('Green beans (Uganda Bugisu AA)', null, true, 'greenBeans')}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 14px' }}>per kg · from Green Coffee Supply</div>
            {row('Roasting cost', null, true, 'roasting')}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 14px' }}>per kg · Wiara Coffee (under 100kg rate)</div>
            {row('Packaging (per bag)', null, true, 'packaging')}
            {row('Foundation allocation', null, true, 'foundation')}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 14px' }}>per kg · Bitou region</div>
            {row('Delivery estimate', null, true, 'delivery')}
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
            {row(`Coffee cost (${pkg.kg}kg × R${c.greenBeans+c.roasting})`, `R${coffeeCost.toFixed(2)}`, false)}
            {row('Packaging total', `R${packCost.toFixed(2)}`, false)}
            {row('Foundation total', `R${foundCost.toFixed(2)}`, false)}
            {row('Delivery', `R${delivCost.toFixed(2)}`, false)}
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
            {row('Total cost of goods', `R${totalCost.toFixed(2)}`, false)}
            {row('Retail price', fmtR(pkg.retail), false)}
            {row('Pool contribution (total)', fmtR(pkg.pool), false)}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 14px' }}>
              → Rep share (30%): {fmtR(repPool)} · OHMI retention (70%): {fmtR(ohmiPool)}
            </div>
            {row('Net revenue (retail − pool)', `R${netRevenue.toFixed(2)}`, false)}
          </div>
        </div>

        <div className="calc-result">
          <div style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            {pkg.name}
          </div>

          <div className="calc-result-item">
            <span className="calc-result-label">Gross profit</span>
            <span className="calc-result-val" style={{ color: grossProfit > 0 ? 'var(--amber)' : 'var(--red)' }}>
              {fmtR(Math.round(grossProfit))}
            </span>
            <span className="calc-result-sub">per unit after COGS</span>
          </div>

          <div className="calc-divider" />

          <div className="calc-result-item">
            <span className="calc-result-label">Margin %</span>
            <span className="calc-result-val" style={{ color: marginPct > 0 ? 'var(--amber)' : 'var(--red)', fontSize: 32 }}>
              {Math.round(marginPct)}%
            </span>
            <span className="calc-result-sub">of retail price</span>
          </div>

          <div className="calc-divider" />

          <div className="calc-result-item">
            <span className="calc-result-label">OHMI total take</span>
            <span className="calc-result-val" style={{ fontSize: 22 }}>{fmtR(Math.round(ohmiTotal))}</span>
            <span className="calc-result-sub">gross profit + 70% pool retention</span>
          </div>

          <div className="calc-divider" />

          <div className="calc-result-item">
            <span className="calc-result-label">OHMI min. guaranteed</span>
            <span className="calc-result-val" style={{ fontSize: 22, color: 'var(--green)' }}>{fmtR(Math.round(ohmiPool))}</span>
            <span className="calc-result-sub">from pool retention alone</span>
          </div>

          <div className="calc-divider" />

          <div style={{ padding: '10px 0' }}>
            <div className="calc-result-label" style={{ marginBottom: 6 }}>Breakeven (units)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[10,50,100].map(u => (
                <div key={u} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-dim)' }}>{u} units</span>
                  <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{fmtR(Math.round(ohmiTotal * u))}</span>
                </div>
              ))}
            </div>
          </div>

          {grossProfit > 0 && (
            <div className="calc-alert">
              <div className="calc-alert-text">
                OHMI retains minimum {fmtR(Math.round(ohmiPool))} per unit sold — mathematically guaranteed per OHMI-ACT-2026-002.
              </div>
            </div>
          )}
          {grossProfit <= 0 && (
            <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(192,80,58,0.2)' }}>
              <div style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5 }}>
                ⚠ COGS exceeds net revenue. Adjust pricing or reduce costs.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Product Form ─────────────────────────────────────────
function ProductForm({ product, onSave, onCancel }) {
  const isNew = !product?.id;
  const [f, setF] = useState({
    sku: '', name: '', category: 'coffee', description: '',
    status: 'active', weight_g: '', unit: 'bag',
    price_retail: '', price_member: '', price_wholesale: '',
    cost_green_beans: '', cost_roasting: '', cost_packaging: '',
    cost_labour: '', cost_shipping: '', cost_other: '',
    foundation_per_unit: '', pool_contribution: '',
    stock_qty: '0', stock_low_threshold: '10', stock_unit: 'units',
    image_url: '', notes: '', sort_order: '0',
    ...product,
  });
  const [busy, setBusy] = useState(false);

  const set = (k,v) => setF(prev=>({...prev,[k]:v}));
  const num = k => Number(f[k]||0);

  const totalCOGS = num('cost_green_beans')+num('cost_roasting')+num('cost_packaging')+num('cost_labour')+num('cost_shipping')+num('cost_other')+num('foundation_per_unit')+num('pool_contribution');
  const grossProfit = num('price_retail') - totalCOGS;
  const margin = num('price_retail') ? (grossProfit/num('price_retail')*100).toFixed(1) : 0;

  async function save() {
    if(!f.sku||!f.name||!f.price_retail){alert('SKU, name and retail price are required');return;}
    setBusy(true);
    const payload = {
      sku:f.sku, name:f.name, category:f.category, description:f.description,
      status:f.status, weight_g:Number(f.weight_g)||null, unit:f.unit,
      price_retail:Number(f.price_retail), price_member:Number(f.price_member)||null,
      price_wholesale:Number(f.price_wholesale)||null,
      cost_green_beans:Number(f.cost_green_beans)||0,
      cost_roasting:Number(f.cost_roasting)||0,
      cost_packaging:Number(f.cost_packaging)||0,
      cost_labour:Number(f.cost_labour)||0,
      cost_shipping:Number(f.cost_shipping)||0,
      cost_other:Number(f.cost_other)||0,
      foundation_per_unit:Number(f.foundation_per_unit)||0,
      pool_contribution:Number(f.pool_contribution)||0,
      stock_qty:Number(f.stock_qty)||0,
      stock_low_threshold:Number(f.stock_low_threshold)||10,
      stock_unit:f.stock_unit||'units',
      image_url:f.image_url||null,
      notes:f.notes||null,
      sort_order:Number(f.sort_order)||0,
      updated_at: new Date().toISOString(),
    };
    if(product?.id) payload.id = product.id;
    await onSave(payload);
    setBusy(false);
  }

  const Field = ({label,k,type='text',placeholder='',hint=''}) => (
    <div className="field">
      <label className="field-label">{label}</label>
      <input className="field-input" type={type} value={f[k]||''} placeholder={placeholder}
        onChange={e=>set(k,e.target.value)}/>
      {hint&&<div style={{fontSize:10,color:'var(--text-muted)',marginTop:3}}>{hint}</div>}
    </div>
  );

  const NumField = ({label,k,prefix='R',hint=''}) => (
    <div className="field">
      <label className="field-label">{label}</label>
      <div style={{position:'relative'}}>
        {prefix&&<span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:13,fontWeight:600}}>{prefix}</span>}
        <input className="field-input" type="number" step="0.01" value={f[k]||''} placeholder="0.00"
          onChange={e=>set(k,e.target.value)}
          style={prefix?{paddingLeft:28}:{}}/>
      </div>
      {hint&&<div style={{fontSize:10,color:'var(--text-muted)',marginTop:3}}>{hint}</div>}
    </div>
  );

  const Section = ({title,color='var(--primary)'}) => (
    <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:10,marginTop:8,marginBottom:2}}>
      <div style={{width:4,height:18,background:color,borderRadius:2}}/>
      <span style={{fontSize:11,fontWeight:800,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--text-sub)'}}>{title}</span>
      <div style={{flex:1,height:1,background:'var(--border)'}}/>
    </div>
  );

  return (
    <div style={{maxWidth:820}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div className="section-title">{isNew?'Add new product':'Edit product'}</div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>All costs auto-calculate margin in real time</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy?'Saving…':'Save product'}</button>
        </div>
      </div>

      {/* Live margin card */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8,marginBottom:16}}>
        {[
          ['Retail price',`R ${Number(f.price_retail||0).toFixed(2)}`,'var(--text-h)',true],
          ['Total COGS',`R ${totalCOGS.toFixed(2)}`,'var(--red-text)',false],
          ['Gross profit',`R ${grossProfit.toFixed(2)}`,grossProfit>=0?'var(--green-text)':'var(--red-text)',false],
          ['Margin',`${margin}%`,Number(margin)>=30?'var(--green-text)':Number(margin)>=15?'var(--amber)':'var(--red-text)',false],
        ].map(([l,v,col,bold])=>(
          <div key={l} style={{padding:'14px 16px',background:l==='Margin'&&Number(margin)>=30?'rgba(16,185,129,0.06)':l==='Margin'&&Number(margin)<15?'rgba(239,68,68,0.06)':'var(--white)',borderRadius:'var(--r-sm)',border:'1px solid var(--border)',boxShadow:'var(--shadow-xs)'}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>{l}</div>
            <div style={{fontSize:18,fontWeight:bold?800:700,color:col,letterSpacing:'-0.02em'}}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
          <Section title="Product identity"/>
          <Field label="SKU *" k="sku" placeholder="OHMI-BUGISU-250" hint="Unique product code"/>
          <Field label="Name *" k="name" placeholder="Uganda Bugisu AA — 250g"/>
          <div className="field">
            <label className="field-label">Category</label>
            <select className="field-input" value={f.category} onChange={e=>set('category',e.target.value)}>
              {['coffee','merchandise','accessory','bundle','other'].map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Status</label>
            <select className="field-input" value={f.status} onChange={e=>set('status',e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <NumField label="Weight (g)" k="weight_g" prefix="" placeholder="250"/>
          <div className="field">
            <label className="field-label">Unit</label>
            <select className="field-input" value={f.unit} onChange={e=>set('unit',e.target.value)}>
              {['bag','kg','unit','box','bottle'].map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="field" style={{gridColumn:'1/-1'}}>
            <label className="field-label">Description</label>
            <textarea className="field-input" rows={2} value={f.description||''} onChange={e=>set('description',e.target.value)} placeholder="Tasting notes, origin, roast profile…" style={{resize:'vertical'}}/>
          </div>

          <Section title="Pricing" color="var(--teal)"/>
          <NumField label="Retail price (R) *" k="price_retail" hint="Public / online shop price"/>
          <NumField label="Member price (R)" k="price_member" hint="Subscriber discount price"/>
          <NumField label="Wholesale price (R)" k="price_wholesale" hint="B2B / bulk price"/>

          <Section title="Manufacturing costs" color="var(--green)"/>
          <NumField label="Green beans (R)" k="cost_green_beans" hint="Raw bean cost per unit"/>
          <NumField label="Roasting (R)" k="cost_roasting" hint="Roasting energy + equipment"/>
          <NumField label="Packaging (R)" k="cost_packaging" hint="Bags, labels, sealing"/>
          <NumField label="Labour (R)" k="cost_labour" hint="Packing, QC, handling"/>
          <NumField label="Shipping (R)" k="cost_shipping" hint="Outbound delivery cost"/>
          <NumField label="Other costs (R)" k="cost_other" hint="Any miscellaneous COGS"/>

          <Section title="Allocations" color="var(--purple)"/>
          <NumField label="Foundation per unit (R)" k="foundation_per_unit" hint="R15/kg → Bitou Foundation"/>
          <NumField label="Pool contribution (R)" k="pool_contribution" hint="Amount credited to binary pool per unit sold"/>

          <Section title="Stock management" color="var(--amber)"/>
          <NumField label="Opening stock" k="stock_qty" prefix="" hint="Current units on hand"/>
          <NumField label="Low-stock alert" k="stock_low_threshold" prefix="" hint="Alert when stock drops below this"/>
          <div className="field">
            <label className="field-label">Stock unit</label>
            <select className="field-input" value={f.stock_unit||'units'} onChange={e=>set('stock_unit',e.target.value)}>
              {['units','kg','bags','boxes','bottles'].map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <Section title="Media & meta" color="var(--text-muted)"/>
          <Field label="Image URL" k="image_url" placeholder="https://…" hint="Product photo"/>
          <NumField label="Sort order" k="sort_order" prefix="" hint="Display order in shop (0 = first)"/>
          <div className="field" style={{gridColumn:'1/-1'}}>
            <label className="field-label">Notes</label>
            <textarea className="field-input" rows={2} value={f.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Internal notes, supplier info…" style={{resize:'vertical'}}/>
          </div>
        </div>

        <div style={{display:'flex',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid var(--border)'}}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{flex:1}} disabled={busy} onClick={save}>{busy?'Saving…':'Save product'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Stock Panel ───────────────────────────────────────────
function StockPanel({ product, products, movements, onSelectProduct, onAdjust }) {
  const [selId, setSelId] = useState(product?.id||'');
  const [type, setType] = useState('in');
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const sel = products.find(p=>p.id===selId)||product;
  const myMoves = movements.filter(m=>m.product_id===selId).slice(0,30);

  async function submit() {
    if(!selId||!qty){alert('Select a product and enter a quantity');return;}
    setBusy(true);
    await onAdjust(selId,type,qty,unitCost||null,ref||null,note||null);
    setQty('');setUnitCost('');setRef('');setNote('');
    setBusy(false);
  }

  const MOVE_TYPES = {
    in:        {label:'Stock in',    color:'var(--green-text)',  sign:'+'},
    out:       {label:'Stock out',   color:'var(--red-text)',    sign:'−'},
    sale:      {label:'Sale',        color:'var(--primary)',     sign:'−'},
    adjustment:{label:'Adjustment',  color:'var(--amber)',       sign:'±'},
    return:    {label:'Return',      color:'var(--teal)',        sign:'+'},
    write_off: {label:'Write-off',   color:'var(--red-text)',    sign:'−'},
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:16,alignItems:'start'}}>
      {/* Left: adjustment form */}
      <div className="card">
        <div className="section-title" style={{marginBottom:16}}>Stock adjustment</div>

        <div className="field">
          <label className="field-label">Product</label>
          <select className="field-input" value={selId} onChange={e=>{setSelId(e.target.value);onSelectProduct&&onSelectProduct(products.find(p=>p.id===e.target.value));}}>
            <option value="">Select product…</option>
            {products.map(p=><option key={p.id} value={p.id}>{p.name} — {p.stock_qty} {p.stock_unit||'units'}</option>)}
          </select>
        </div>

        {sel&&(
          <div style={{padding:'10px 14px',background:'var(--primary-bg)',borderRadius:'var(--r-sm)',border:'1px solid var(--primary-border)',marginBottom:14,fontSize:13}}>
            <span style={{color:'var(--primary)',fontWeight:700}}>{Number(sel.stock_qty)} {sel.stock_unit||'units'}</span>
            <span style={{color:'var(--text-muted)'}}> on hand</span>
            {Number(sel.stock_qty)<=Number(sel.stock_low_threshold)&&<span style={{marginLeft:8,color:'var(--red-text)',fontWeight:600}}>⚠ Low stock</span>}
          </div>
        )}

        <div className="field">
          <label className="field-label">Movement type</label>
          <select className="field-input" value={type} onChange={e=>setType(e.target.value)}>
            {Object.entries(MOVE_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label className="field-label">Quantity *</label>
          <input className="field-input" type="number" min="0" step="1" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0"/>
        </div>

        <div className="field">
          <label className="field-label">Unit cost (R)</label>
          <input className="field-input" type="number" step="0.01" value={unitCost} onChange={e=>setUnitCost(e.target.value)} placeholder="Cost per unit (optional)"/>
        </div>

        <div className="field">
          <label className="field-label">Reference</label>
          <input className="field-input" value={ref} onChange={e=>setRef(e.target.value)} placeholder="PO number, invoice, order ID…"/>
        </div>

        <div className="field">
          <label className="field-label">Note</label>
          <textarea className="field-input" rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Why are you adjusting stock?" style={{resize:'vertical'}}/>
        </div>

        <button className="btn btn-primary btn-full" disabled={busy||!selId||!qty} onClick={submit}>
          {busy?'Saving…':`Record ${MOVE_TYPES[type]?.label||type}`}
        </button>
      </div>

      {/* Right: movement log */}
      <div>
        {/* Stock summary across all products */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8,marginBottom:12}}>
          {products.slice(0,4).map(p=>{
            const low = Number(p.stock_qty)<=Number(p.stock_low_threshold);
            return (
              <div key={p.id} onClick={()=>{setSelId(p.id);onSelectProduct&&onSelectProduct(p);}}
                style={{padding:'12px 14px',background:low?'rgba(239,68,68,0.06)':'var(--white)',borderRadius:'var(--r-sm)',border:`1px solid ${low?'rgba(239,68,68,0.2)':'var(--border)'}`,cursor:'pointer',transition:'box-shadow 0.15s',boxShadow:selId===p.id?'var(--shadow-md)':'var(--shadow-xs)'}}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name.split('—')[1]?.trim()||p.name}</div>
                <div style={{fontSize:20,fontWeight:800,color:low?'var(--red-text)':'var(--text-h)',letterSpacing:'-0.02em'}}>{Number(p.stock_qty)}</div>
                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{p.stock_unit||'units'} · {low?'LOW STOCK':'OK'}</div>
              </div>
            );
          })}
        </div>

        <div className="card card-flush">
          <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span className="section-label">Movement log{sel?` · ${sel.name}`:' · all products'}</span>
            <span style={{fontSize:11,color:'var(--text-muted)'}}>{myMoves.length} recent movements</span>
          </div>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Unit cost</th><th>Ref</th><th>Note</th></tr></thead>
            <tbody>
              {myMoves.length?myMoves.map(m=>{
                const mt = MOVE_TYPES[m.type]||{label:m.type,color:'var(--text-muted)',sign:'±'};
                const prod = products.find(p=>p.id===m.product_id);
                return (
                  <tr key={m.id}>
                    <td style={{fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap'}}>{m.created_at?new Date(m.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}</td>
                    <td style={{fontSize:12,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{prod?.name?.split('—')[1]?.trim()||prod?.name||'—'}</td>
                    <td><span style={{fontSize:10,fontWeight:700,color:mt.color,background:'rgba(0,0,0,0.04)',padding:'2px 8px',borderRadius:'var(--r-full)',border:`1px solid ${mt.color}33`}}>{mt.label}</span></td>
                    <td style={{fontWeight:800,color:['in','return'].includes(m.type)?'var(--green-text)':'var(--red-text)',fontSize:14}}>{mt.sign}{Number(m.qty)}</td>
                    <td style={{color:'var(--text-muted)',fontSize:12}}>{m.qty_before??'—'}</td>
                    <td style={{fontWeight:600,color:'var(--text-h)',fontSize:13}}>{m.qty_after??'—'}</td>
                    <td style={{color:'var(--text-muted)',fontSize:12}}>{m.unit_cost?`R ${Number(m.unit_cost).toFixed(2)}`:'—'}</td>
                    <td style={{color:'var(--primary)',fontSize:11,fontFamily:'monospace'}}>{m.reference||'—'}</td>
                    <td style={{color:'var(--text-muted)',fontSize:12,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.note||'—'}</td>
                  </tr>
                );
              }):(
                <tr><td colSpan="9" style={{textAlign:'center',padding:28,color:'var(--text-muted)'}}>No movements yet{selId?` for ${sel?.name}`:''} — use the form to record stock in/out.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin ───────────────────────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [members, setMembers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subs, setSubs] = useState([]);
  const [activations, setActivations] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [foundation, setFoundation] = useState([]);
  const [balances, setBalances] = useState([]);
  const [packages, setPackages] = useState([]);
  const [pkgOrders, setPkgOrders] = useState([]);
  const [toast, setToast] = useState('');
  const [travelBookings, setTravelBookings] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [productTab, setProductTab] = useState('list'); // list | form | stock
  const [editProduct, setEditProduct] = useState(null); // null=new, obj=editing
  const [stockProduct, setStockProduct] = useState(null);
  const [busy, setBusy] = useState('');
  const [billingResult, setBillingResult] = useState(null);
  const [memberFilter, setMemberFilter] = useState('');

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    const [m, n, o, s, a, l, f, b, p, po, tb, pr, sm] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('tree_view').select('*'),
      supabase.from('retail_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*'),
      supabase.from('activations').select('*'),
      supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('foundation_ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('member_balances').select('*'),
      supabase.from('packages').select('*').order('sort_order'),
      supabase.from('package_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('travel_bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('sort_order'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }),
    ]);
    setMembers(m.data||[]);
    setNodes(n.data||[]);
    setOrders(o.data||[]);
    setSubs(s.data||[]);
    setActivations(a.data||[]);
    setLedger(l.data||[]);
    setFoundation(f.data||[]);
    setBalances(b.data||[]);
    setPackages(p.data||[]);
    setPkgOrders(po.data||[]);
    setTravelBookings(tb.data||[]);
    setProducts(pr.data||[]);
    setStockMovements(sm.data||[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeMembers      = members.filter(m => m.status === 'active');
  const pendingActivations = activations.filter(a => a.status === 'pending');
  const pendingOrders      = [...orders.filter(o=>o.status==='pending'), ...pkgOrders.filter(o=>o.status==='pending')];
  const poolTotal          = activeMembers.length * 500;
  const totalRevenue       = orders.filter(o=>o.status==='fulfilled').reduce((s,o)=>s+Number(o.total),0);
  const foundationTotal    = foundation.reduce((s,f)=>s+Number(f.amount),0);
  const memberById         = useMemo(() => Object.fromEntries(members.map(m=>[m.id,m.full_name])), [members]);

  // Tree rendering handled by BinaryTree component

  async function approveActivation(actId, memberId) {
    setBusy(actId);
    await supabase.from('activations').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', actId);
    await supabase.from('members').update({ status: 'active' }).eq('id', memberId);
    if (!subs.find(s=>s.member_id===memberId)) {
      await supabase.from('subscriptions').insert({ member_id: memberId, amount: 1500, pool_contribution: 500, status: 'active', next_billing_date: new Date(Date.now()+30*86400000).toISOString().slice(0,10) });
    }
    flash('✓ Activation approved');
    setBusy(''); load();
  }

  async function runBilling() {
    setBusy('billing');
    setBillingResult(null);
    const period = new Date().toISOString().slice(0,7) + '-01';
    const { data, error } = await supabase.rpc('run_billing', { p_period: period });
    if (error) { flash('Billing error: ' + error.message); setBusy(''); return; }
    setBillingResult(data);
    flash(`✓ Billing complete — ${data.length} members processed`);
    setBusy(''); load();
  }

  const filteredMembers = members.filter(m =>
    !memberFilter || m.full_name?.toLowerCase().includes(memberFilter.toLowerCase()) || m.email?.toLowerCase().includes(memberFilter.toLowerCase())
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <span className="mobile-topbar-logo">Admin</span>
        <div style={{ display:'flex', gap:8 }}>
          <span className="topbar-badge topbar-badge-gold" style={{ fontSize:9 }}>{activeMembers.length} active</span>
        </div>
      </div>

      <div className="app-shell">

        {/* Sidebar — desktop */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-text">OHMI Admin</div>
            <div className="sidebar-logo-sub">Control panel</div>
          </div>
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{background:'linear-gradient(135deg,#EF4444,#F59E0B)'}}>A</div>
            <div>
              <div className="sidebar-name">Admin Panel</div>
              <div className="sidebar-rank">{activeMembers.length} active · {fmtR(poolTotal)} pool</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-section">Overview</div>
            {[TABS[0],TABS[1],TABS[2]].map(t=>(
              <button key={t.id} className={`sidebar-item${tab===t.id?' on':''}`} onClick={()=>setTab(t.id)}>
                <i className={`ti ${t.icon}`} aria-hidden="true"/>
                {t.tip}
                {t.id==='members'&&pendingActivations.length>0&&<span className="s-badge">{pendingActivations.length}</span>}
              </button>
            ))}
            <div className="sidebar-section">Commerce</div>
            {[TABS[3],TABS[4],TABS[5]].map(t=>(
              <button key={t.id} className={`sidebar-item${tab===t.id?' on':''}`} onClick={()=>setTab(t.id)}>
                <i className={`ti ${t.icon}`} aria-hidden="true"/>
                {t.tip}
                {t.id==='orders'&&pendingOrders.length>0&&<span className="s-badge">{pendingOrders.length}</span>}
              </button>
            ))}
            <div className="sidebar-section">Tools</div>
            {[TABS[6],TABS[7]].map(t=>(
              <button key={t.id} className={`sidebar-item${tab===t.id?' on':''}`} onClick={()=>setTab(t.id)}>
                <i className={`ti ${t.icon}`} aria-hidden="true"/>
                {t.tip}
              </button>
            ))}
            <div className="sidebar-section">Catalogue</div>
            {[TABS[8],TABS[9]].map(t=>(
              <button key={t.id} className={`sidebar-item${tab===t.id?' on':''}`} onClick={()=>setTab(t.id)}>
                <i className={`ti ${t.icon}`} aria-hidden="true"/>
                {t.tip}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <a href="/dashboard" className="btn btn-white btn-sm" style={{flex:1,textAlign:'center',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <i className="ti ti-layout-dashboard" aria-hidden="true" style={{fontSize:14}}/>Member portal
            </a>
          </div>
        </aside>

        {/* Rail — tablet */}
        <aside className="rail">
          <div className="rail-logo">A</div>
          <nav className="rail-nav">
            {TABS.map(t => (
              <button key={t.id} className={`rail-item${tab===t.id?' on':''}`}
                data-tip={t.tip} onClick={() => setTab(t.id)} aria-label={t.tip}>
                <i className={`ti ${t.icon}`} aria-hidden="true" />
                {t.id==='members' && pendingActivations.length>0 && <span className="badge">{pendingActivations.length}</span>}
                {t.id==='orders'  && pendingOrders.length>0     && <span className="badge" style={{ background:'var(--red)' }}>{pendingOrders.length}</span>}
              </button>
            ))}
          </nav>
          <div className="rail-divider" />
          <div className="rail-bottom">
            <a href="/dashboard" className="rail-item" data-tip="← Member portal" aria-label="Member portal" style={{color:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-layout-dashboard" aria-hidden="true"/></a>
            <a href="/login" className="rail-item" data-tip="Sign out" aria-label="Sign out" style={{display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ti ti-logout" aria-hidden="true"/></a>
          </div>
        </aside>

        {/* Main */}
        <div className="app-main">
          <div className="app-topbar">
            <span className="app-topbar-title">{TABS.find(t=>t.id===tab)?.tip}</span>
            <span className="app-topbar-sub">· OHMI Admin</span>
            <div className="app-topbar-right">
              <span className="topbar-badge topbar-badge-gold">{activeMembers.length} active</span>
              <span className="topbar-badge topbar-badge-green">{fmtR(poolTotal)} pool</span>
              <Link href="/dashboard">
                <button className="btn btn-white btn-sm" style={{display:'flex',alignItems:'center',gap:6}}>
                  <i className="ti ti-layout-dashboard" aria-hidden="true" style={{fontSize:14}}/>
                  Member portal
                </button>
              </Link>
            </div>
          </div>

          <div className="app-content">

            {/* ── DASHBOARD ── */}
            {tab === 'dashboard' && <>

              {/* Alerts */}
              {pendingActivations.length > 0 && (
                <div style={{background:'linear-gradient(135deg,#F59E0B,#EF4444)',borderRadius:'var(--r)',padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'var(--shadow-md)'}}>
                  <div style={{width:36,height:36,borderRadius:'var(--r-sm)',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>⚡</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:'#fff',fontSize:14}}>{pendingActivations.length} activation{pendingActivations.length!==1?'s':''} awaiting approval</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.75)',marginTop:2}}>New members cannot access the platform until activated</div>
                  </div>
                  <button className="btn btn-sm" style={{background:'#fff',color:'#D97706',fontWeight:700,flexShrink:0}} onClick={()=>setTab('members')}>Review →</button>
                </div>
              )}

              {/* KPI row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12}}>
                {[
                  {icon:'ti-users',      cls:'stat-icon-primary', val:members.length,            label:'Total members'},
                  {icon:'ti-user-check', cls:'stat-icon-green',   val:activeMembers.length,      label:'Active members'},
                  {icon:'ti-user-x',     cls:'stat-icon-amber',   val:members.filter(m=>m.status==='pending').length, label:'Pending'},
                  {icon:'ti-coin',       cls:'stat-icon-teal',    val:fmtR(poolTotal),           label:'Pool this month'},
                  {icon:'ti-trending-up',cls:'stat-icon-purple',  val:fmtR(totalRevenue),        label:'Retail revenue'},
                  {icon:'ti-package',    cls:'stat-icon-primary', val:products.length,           label:'Products'},
                ].map(s=>(
                  <div key={s.label} className="stat-card">
                    <div className={`stat-icon ${s.cls}`}><i className={`ti ${s.icon}`} aria-hidden="true"/></div>
                    <div><div className="stat-val" style={{fontSize:18}}>{s.val}</div><div className="stat-label">{s.label}</div></div>
                  </div>
                ))}
              </div>

              {/* Pool breakdown */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[
                  ['Total pool',       fmtR(poolTotal),       `${activeMembers.length} members × R500`, 'linear-gradient(135deg,#6366F1,#0EA5E9)'],
                  ['Commission pool',  fmtR(poolTotal*0.3),   '30% distributed to reps',                'linear-gradient(135deg,#10B981,#0EA5E9)'],
                  ['OHMI retention',   fmtR(poolTotal*0.7),   '70% ops, foundation & growth',           'linear-gradient(135deg,#8B5CF6,#6366F1)'],
                ].map(([label,val,sub,bg])=>(
                  <div key={label} style={{padding:'20px',background:bg,borderRadius:'var(--r)',boxShadow:'var(--shadow-md)',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.07)',top:-25,right:-25}}/>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',marginBottom:8}}>{label}</div>
                    <div style={{fontSize:28,fontWeight:800,color:'#fff',letterSpacing:'-0.02em',lineHeight:1}}>{val}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:6}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Two column: recent members + recent orders */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

                {/* Recent members */}
                <div className="card card-flush">
                  <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--surface-1)'}}>
                    <span className="section-label">Recent members</span>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setTab('members')}>View all</button>
                  </div>
                  {members.slice(0,6).map(m=>(
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 18px',borderBottom:'1px solid var(--border)'}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>
                        {m.full_name?.[0]||'?'}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13,color:'var(--text-h)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.full_name}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.email}</div>
                      </div>
                      <span className={`pill pill-${m.status==='active'?'green':m.status==='pending'?'amber':'red'}`} style={{flexShrink:0}}>{m.status}</span>
                    </div>
                  ))}
                  {members.length===0&&<div style={{padding:'24px',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>No members yet</div>}
                </div>

                {/* Recent orders + quick actions */}
                <div style={{display:'flex',flexDirection:'column',gap:12}}>

                  {/* Quick actions */}
                  <div className="card">
                    <div className="section-label" style={{marginBottom:12}}>Quick actions</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[
                        ['ti-users',     'Members',     ()=>setTab('members')],
                        ['ti-binary-tree-2','Tree',     ()=>setTab('network')],
                        ['ti-shopping-bag','Orders',    ()=>setTab('orders')],
                        ['ti-coin',      'Billing',     ()=>setTab('billing')],
                        ['ti-package',   'Products',    ()=>setTab('products')],
                        ['ti-plane',     'Travel',      ()=>setTab('travel')],
                      ].map(([icon,label,fn])=>(
                        <button key={label} onClick={fn} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:'var(--surface-1)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,color:'var(--text-body)',transition:'all 0.15s',textAlign:'left'}}
                          onMouseEnter={e=>{e.currentTarget.style.background='var(--primary-bg)';e.currentTarget.style.borderColor='var(--primary-border)';e.currentTarget.style.color='var(--primary)';}}
                          onMouseLeave={e=>{e.currentTarget.style.background='var(--surface-1)';e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-body)';}}>
                          <i className={`ti ${icon}`} style={{fontSize:15}} aria-hidden="true"/>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent orders */}
                  <div className="card card-flush" style={{flex:1}}>
                    <div style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--surface-1)'}}>
                      <span className="section-label">Recent orders</span>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setTab('orders')}>View all</button>
                    </div>
                    {[...pkgOrders].slice(0,5).map(o=>{
                      const m=members.find(x=>x.id===o.member_id);
                      const p=packages.find(x=>x.id===o.package_id)||products.find(x=>x.id===o.package_id);
                      return(
                        <div key={o.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 18px',borderBottom:'1px solid var(--border)'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,fontSize:12,color:'var(--text-h)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m?.full_name||'?'}</div>
                            <div style={{fontSize:11,color:'var(--text-muted)'}}>{p?.name||'Product'}</div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontWeight:700,fontSize:13,color:'var(--text-h)'}}>{fmtR(o.total)}</div>
                            <span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'amber':'red'}`} style={{fontSize:9}}>{o.status}</span>
                          </div>
                        </div>
                      );
                    })}
                    {pkgOrders.length===0&&<div style={{padding:'24px',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>No orders yet</div>}
                  </div>
                </div>
              </div>

              {/* Pending activations table — always shown if any */}
              {pendingActivations.length > 0 && (
                <div className="card card-flush">
                  <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',background:'rgba(245,158,11,0.06)',display:'flex',alignItems:'center',gap:10}}>
                    <i className="ti ti-alert-circle" style={{color:'var(--amber)',fontSize:16}} aria-hidden="true"/>
                    <span className="section-label">Pending activations — R2,500 payment required</span>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Member</th><th>Email</th><th>Phone</th><th>Registered</th><th>Amount</th><th>Action</th></tr></thead>
                    <tbody>
                      {pendingActivations.map(a=>{
                        const m=members.find(x=>x.id===a.member_id);
                        return(
                          <tr key={a.id}>
                            <td style={{fontWeight:600}}>{m?.full_name}</td>
                            <td style={{color:'var(--text-muted)',fontSize:12}}>{m?.email}</td>
                            <td style={{color:'var(--text-muted)',fontSize:12}}>{m?.phone||'—'}</td>
                            <td style={{color:'var(--text-muted)',fontSize:12}}>{fmtD(a.created_at)}</td>
                            <td style={{fontWeight:700,color:'var(--amber)'}}>{fmtR(a.amount)}</td>
                            <td>
                              <button className="btn btn-primary btn-xs" disabled={busy===a.id} onClick={()=>approveActivation(a.id,a.member_id)}>
                                {busy===a.id?'…':'Approve & activate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Stock alerts */}
              {products.filter(p=>Number(p.stock_qty)<=Number(p.stock_low_threshold)).length>0&&(
                <div className="card card-flush">
                  <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',background:'rgba(239,68,68,0.04)',display:'flex',alignItems:'center',gap:10}}>
                    <i className="ti ti-alert-triangle" style={{color:'var(--red)',fontSize:16}} aria-hidden="true"/>
                    <span className="section-label">Low stock alerts</span>
                    <button className="btn btn-ghost btn-xs" style={{marginLeft:'auto'}} onClick={()=>setTab('products')}>Manage stock</button>
                  </div>
                  <div style={{padding:'14px 18px',display:'flex',gap:10,flexWrap:'wrap'}}>
                    {products.filter(p=>Number(p.stock_qty)<=Number(p.stock_low_threshold)).map(p=>(
                      <div key={p.id} style={{padding:'8px 14px',background:'var(--red-bg)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'var(--r-sm)',display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:12,fontWeight:600,color:'var(--red-text)'}}>{p.name}</span>
                        <span style={{fontSize:11,color:'var(--red-text)',fontWeight:800}}>{Number(p.stock_qty)} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </>}

            {/* ── MEMBERS ── */}
            {tab === 'members' && <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="field-input" style={{ maxWidth: 300 }} placeholder="Search members…"
                  value={memberFilter} onChange={e => setMemberFilter(e.target.value)} />
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{filteredMembers.length} of {members.length}</span>
              </div>
              <div className="card card-flush">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Activation</th><th>Subscription</th><th>Balance</th><th>Joined</th><th>Action</th></tr></thead>
                  <tbody>
                    {filteredMembers.map(m => {
                      const act = activations.find(a => a.member_id === m.id);
                      const sub = subs.find(s => s.member_id === m.id);
                      const bal = balances.find(b => b.member_id === m.id);
                      return (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 500 }}>{m.full_name}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.email}</td>
                          <td><span className={`pill pill-${m.status==='active'?'green':m.status==='pending'?'gold':'red'}`}>{m.status}</span></td>
                          <td>
                            {act ? (act.status==='paid'
                              ? <span className="pill pill-green">Paid</span>
                              : <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                                  <span className="pill pill-gold">Pending</span>
                                  <button className="btn btn-primary btn-xs" disabled={busy===act.id} onClick={() => approveActivation(act.id,m.id)}>
                                    {busy===act.id?'…':'Approve'}
                                  </button>
                                </div>
                            ) : <span style={{ color:'var(--text-dim)',fontSize:12 }}>—</span>}
                          </td>
                          <td><span className={`pill pill-${sub?.status==='active'?'green':'grey'}`}>{sub?`R${sub.amount}/mo`:'None'}</span></td>
                          <td style={{ color:'var(--amber)',fontWeight:500 }}>{Number(bal?.balance)>0?fmtR(bal.balance):'—'}</td>
                          <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(m.created_at)}</td>
                          <td>
                            {m.status==='active' && (
                              <button className="btn btn-ghost btn-xs"
                                onClick={async()=>{await supabase.from('members').update({status:'suspended'}).eq('id',m.id);flash('Suspended');load();}}>
                                Suspend
                              </button>
                            )}
                            {m.status==='suspended' && (
                              <button className="btn btn-primary btn-xs"
                                onClick={async()=>{await supabase.from('members').update({status:'active'}).eq('id',m.id);flash('Reinstated');load();}}>
                                Reinstate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── BINARY TREE ── */}
            {tab === 'network' && <>
              <div className="metric-grid">
                {[['Total nodes',nodes.length,''],['Left leg',nodes.find(n=>!n.parent_id)?.left_count||0,'gold'],['Right leg',nodes.find(n=>!n.parent_id)?.right_count||0,'gold'],['Max depth',Math.max(0,...nodes.map(n=>n.depth||0)),'']].map(([l,v,c])=>(
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card card-flush" style={{ overflow:'auto' }}>
                <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)' }}>
                  <span className="section-label">Binary network · click to expand/collapse</span>
                </div>
                <div className="tree-wrap" style={{ padding:24,minWidth:500 }}>
                  {rootTreeNode ? <TreeNode node={rootTreeNode} map={treeMap} /> : <p style={{ color:'var(--text-dim)' }}>No network yet.</p>}
                </div>
              </div>
              <div className="card card-flush">
                <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)' }}>
                  <span className="section-label">Node registry</span>
                </div>
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Status</th><th>Leg</th><th>Depth</th><th>Left count</th><th>Right count</th><th>Subscribed</th></tr></thead>
                  <tbody>
                    {[...nodes].sort((a,b)=>a.depth-b.depth||(a.leg||'').localeCompare(b.leg||'')).map(n=>{
                      const m=members.find(x=>x.id===n.member_id);
                      return (
                        <tr key={n.node_id||n.id}>
                          <td style={{ fontWeight:500 }}>{m?.full_name||'?'}</td>
                          <td><span className={`pill pill-${m?.status==='active'?'green':'grey'}`}>{m?.status||'?'}</span></td>
                          <td style={{ color:n.leg==='L'?'var(--blue)':n.leg==='R'?'var(--amber)':'var(--text-muted)', fontWeight:500 }}>{n.leg||'Root'}</td>
                          <td style={{ color:'var(--text-dim)' }}>{n.depth}</td>
                          <td style={{ color:'var(--amber)',fontWeight:500 }}>{n.left_count}</td>
                          <td style={{ color:'var(--amber)',fontWeight:500 }}>{n.right_count}</td>
                          <td><span className={`pill pill-${n.subscribed?'green':'red'}`}>{n.subscribed?'Yes':'No'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── ORDERS ── */}
            {tab === 'orders' && <>
              <div className="metric-grid">
                {[['Retail orders',orders.length,''],['Pending retail',orders.filter(o=>o.status==='pending').length,'gold'],['Package orders',pkgOrders.length,''],['Revenue',fmtR(totalRevenue),'gold']].map(([l,v,c])=>(
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Retail orders</span></div>
                <table className="data-table">
                  <thead><tr><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                  <tbody>
                    {orders.map(o=>(
                      <tr key={o.id}>
                        <td style={{ fontWeight:500 }}>{o.customer_name}<div style={{ fontSize:11,color:'var(--text-dim)' }}>{o.customer_email}</div></td>
                        <td style={{ color:'var(--text-muted)',fontSize:12 }}>{Array.isArray(o.items)?o.items.map(i=>`${i.size}×${i.qty}`).join(', '):'—'}</td>
                        <td style={{ color:'var(--amber)',fontWeight:500 }}>{fmtR(o.total)}</td>
                        <td><span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'gold':'red'}`}>{o.status}</span></td>
                        <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(o.created_at)}</td>
                        <td>
                          {o.status==='pending'&&(
                            <div style={{ display:'flex',gap:6 }}>
                              <button className="btn btn-primary btn-xs" disabled={busy===o.id}
                                onClick={async()=>{setBusy(o.id);await supabase.from('retail_orders').update({status:'fulfilled'}).eq('id',o.id);flash('Fulfilled');setBusy('');load();}}>
                                Fulfil
                              </button>
                              <button className="btn btn-ghost btn-xs" disabled={busy===o.id}
                                onClick={async()=>{setBusy(o.id);await supabase.from('retail_orders').update({status:'cancelled'}).eq('id',o.id);flash('Cancelled');setBusy('');load();}}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {orders.length===0&&<tr><td colSpan="6" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>No retail orders.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Package orders</span></div>
                <table className="data-table">
                  <thead><tr><th>Member</th><th>Package</th><th>Qty</th><th>Total</th><th>Pool</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                  <tbody>
                    {pkgOrders.map(o=>{
                      const pkg=packages.find(p=>p.id===o.package_id);
                      return (
                        <tr key={o.id}>
                          <td style={{ fontWeight:500 }}>{memberById[o.member_id]||'?'}</td>
                          <td style={{ color:'var(--text-muted)',fontSize:12 }}>{pkg?.name||'?'}</td>
                          <td>{o.quantity}</td>
                          <td style={{ color:'var(--amber)',fontWeight:500 }}>{fmtR(o.total)}</td>
                          <td style={{ color:'var(--text-muted)' }}>{fmtR(o.pool_contribution)}</td>
                          <td><span className={`pill pill-${o.status==='fulfilled'?'green':o.status==='pending'?'gold':'red'}`}>{o.status}</span></td>
                          <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(o.created_at)}</td>
                          <td>
                            {o.status==='pending'&&(
                              <button className="btn btn-primary btn-xs" disabled={busy===o.id}
                                onClick={async()=>{setBusy(o.id);await supabase.from('package_orders').update({status:'fulfilled'}).eq('id',o.id);flash('Fulfilled');setBusy('');load();}}>
                                Fulfil
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {pkgOrders.length===0&&<tr><td colSpan="8" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>No package orders.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── BILLING ── */}
            {tab === 'billing' && <>
              <div className="card">
                <div className="section-label" style={{ marginBottom: 12 }}>Monthly billing run · {new Date().toISOString().slice(0,7)}</div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18 }}>
                  {[['Active members',activeMembers.length],['Pool total',fmtR(poolTotal)],['Rep share 30%',fmtR(poolTotal*0.3)],['OHMI retention 70%',fmtR(poolTotal*0.7)],['Foundation est.',fmtR(activeMembers.length*2*15)],['Period',new Date().toISOString().slice(0,7)]].map(([l,v])=>(
                    <div key={l} style={{ padding:'12px 14px',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:'var(--r-md)' }}>
                      <div style={{ fontSize:10,color:'var(--text-dim)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4 }}>{l}</div>
                      <div style={{ fontFamily:'var(--display)',fontSize:18,color:'var(--amber)',fontWeight:600 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" disabled={busy==='billing'} onClick={runBilling}>
                  {busy==='billing' ? 'Running billing…' : `Run billing · ${new Date().toISOString().slice(0,7)}`}
                </button>
                <p style={{ fontSize:11,color:'var(--text-dim)',marginTop:10,lineHeight:1.6 }}>
                  Records pool contributions, distributes 30% to ranked reps pro-rata, allocates foundation funds. Idempotent — safe to re-run.
                </p>
              </div>
              {billingResult && (
                <div className="card card-flush">
                  <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Billing results</span></div>
                  <table className="data-table">
                    <thead><tr><th>Member</th><th>Rank</th><th>Pool share</th><th>Note</th></tr></thead>
                    <tbody>
                      {billingResult.map((r,i)=>(
                        <tr key={i}>
                          <td style={{ fontWeight:500 }}>{r.out_member_name}</td>
                          <td><span className={`pill pill-${r.out_rank_name!=='Unranked'?'gold':'grey'}`}>{r.out_rank_name}</span></td>
                          <td style={{ fontFamily:'var(--display)',fontSize:18,color:'var(--amber)',fontWeight:600 }}>{fmtR(r.out_pool_share)}</td>
                          <td style={{ fontSize:12,color:'var(--text-dim)' }}>{r.out_message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Payout queue */}
              {ledger.filter(l=>l.entry_type==='payout').length>0&&(
                <div className="card card-flush">
                  <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Payout queue</span></div>
                  <table className="data-table">
                    <thead><tr><th>Member</th><th>Amount</th><th>Date</th><th>Note</th></tr></thead>
                    <tbody>
                      {ledger.filter(l=>l.entry_type==='payout').map(p=>(
                        <tr key={p.id}>
                          <td style={{ fontWeight:500 }}>{memberById[p.member_id]}</td>
                          <td style={{ fontFamily:'var(--display)',fontSize:18,color:'var(--red)',fontWeight:600 }}>{fmtR(p.amount)}</td>
                          <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(p.created_at)}</td>
                          <td style={{ color:'var(--text-muted)',fontSize:12 }}>{p.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>}

            {/* ── LEDGER ── */}
            {tab === 'ledger' && <>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Member balances</span></div>
                <table className="data-table">
                  <thead><tr><th>Member</th><th>Status</th><th>Earned</th><th>Paid out</th><th>Balance</th></tr></thead>
                  <tbody>
                    {balances.filter(b=>Number(b.total_earned)>0||Number(b.balance)>0).map(b=>(
                      <tr key={b.member_id}>
                        <td style={{ fontWeight:500 }}>{b.full_name}</td>
                        <td><span className={`pill pill-${b.status==='active'?'green':'grey'}`}>{b.status}</span></td>
                        <td style={{ color:'var(--amber)',fontWeight:500 }}>{fmtR(b.total_earned)}</td>
                        <td style={{ color:'var(--red)' }}>{fmtR(b.total_paid)}</td>
                        <td style={{ fontFamily:'var(--display)',fontSize:20,color:'var(--amber)',fontWeight:600 }}>{fmtR(b.balance)}</td>
                      </tr>
                    ))}
                    {balances.every(b=>Number(b.total_earned)===0)&&<tr><td colSpan="5" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>Run billing to populate balances.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">CPA s43 audit trail · all commission entries</span></div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Member</th><th>Type</th><th>Period</th><th>Note</th><th style={{ textAlign:'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {ledger.map(l=>(
                      <tr key={l.id}>
                        <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(l.created_at)}</td>
                        <td style={{ fontWeight:500 }}>{memberById[l.member_id]||'?'}</td>
                        <td><span className={`pill pill-${l.entry_type==='payout'?'red':l.entry_type==='pool_share'?'gold':'grey'}`}>{l.entry_type.replace('_',' ')}</span></td>
                        <td style={{ color:'var(--text-dim)',fontSize:12 }}>{l.period?.slice(0,7)||'—'}</td>
                        <td style={{ color:'var(--text-muted)',fontSize:12 }}>{l.note}</td>
                        <td style={{ textAlign:'right',fontFamily:'var(--display)',fontSize:18,fontWeight:600,color:l.entry_type==='payout'?'var(--red)':'var(--amber)' }}>{fmtR(l.amount)}</td>
                      </tr>
                    ))}
                    {ledger.length===0&&<tr><td colSpan="6" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>No ledger entries.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}

            {/* ── PROFIT CALC ── */}
            {tab === 'calc' && <ProfitCalc />}

            {/* ── FOUNDATION ── */}
            {tab === 'foundation' && <>
              <div className="metric-grid">
                {[['Total allocated',fmtR(foundationTotal),'gold'],['Kg equivalent',(foundation.reduce((s,f)=>s+Number(f.kg_equivalent),0)).toFixed(1)+' kg',''],['Billing runs',foundation.length,''],['Rate','R15/kg','']].map(([l,v,c])=>(
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card" style={{ borderLeft:'3px solid var(--amber)',paddingLeft:20 }}>
                <div style={{ fontFamily:'var(--display)',fontSize:20,color:'var(--amber)',marginBottom:8 }}>Every kilogram feeds a child in Bitou.</div>
                <p style={{ fontSize:13,color:'var(--text-muted)',lineHeight:1.8 }}>
                  R15 per kilogram is a fixed structural cost — not a discretionary donation. Allocated automatically on every billing run and tracked here for full transparency.
                </p>
              </div>
              <div className="card card-flush">
                <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)' }}><span className="section-label">Foundation ledger</span></div>
                <table className="data-table">
                  <thead><tr><th>Period</th><th>Kg equivalent</th><th>Amount</th><th>Note</th><th>Date</th></tr></thead>
                  <tbody>
                    {foundation.map(f=>(
                      <tr key={f.id}>
                        <td style={{ fontWeight:500 }}>{f.period?.slice(0,7)||'—'}</td>
                        <td style={{ color:'var(--amber)',fontWeight:500 }}>{Number(f.kg_equivalent).toFixed(1)} kg</td>
                        <td style={{ fontFamily:'var(--display)',fontSize:18,color:'var(--amber)',fontWeight:600 }}>{fmtR(f.amount)}</td>
                        <td style={{ color:'var(--text-muted)',fontSize:12 }}>{f.note}</td>
                        <td style={{ color:'var(--text-dim)',fontSize:12 }}>{fmtD(f.created_at)}</td>
                      </tr>
                    ))}
                    {foundation.length===0&&<tr><td colSpan="5" style={{ color:'var(--text-dim)',textAlign:'center',padding:24 }}>Run billing to allocate foundation funds.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>}


            {/* ── PRODUCTS ── */}
            {tab==='products'&&<>
              {/* Sub-nav */}
              <div style={{display:'flex',gap:0,background:'var(--white)',borderRadius:'var(--r)',overflow:'hidden',boxShadow:'var(--shadow-sm)',flexShrink:0}}>
                {[['list','📦 Products'],['form', editProduct?'✏️ Edit product':'➕ New product'],['stock','📊 Stock ledger']].map(([id,label])=>(
                  <button key={id} onClick={()=>{setProductTab(id);if(id==='form'&&id!=='form')setEditProduct(null);}}
                    style={{flex:1,padding:'12px 10px',background:productTab===id?'var(--primary)':'transparent',color:productTab===id?'#fff':'var(--text-muted)',border:'none',fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:'0.06em',cursor:'pointer',transition:'all 0.15s'}}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── PRODUCT LIST ── */}
              {productTab==='list'&&<>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div className="section-title">Product catalogue · {products.length} products</div>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Click a product to edit · manage stock inline</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={()=>{setEditProduct({});setProductTab('form');}}>+ Add product</button>
                </div>
                {products.map(p=>{
                  const totalCost = Number(p.cost_green_beans)+Number(p.cost_roasting)+Number(p.cost_packaging)+Number(p.cost_labour)+Number(p.cost_shipping)+Number(p.cost_other)+Number(p.foundation_per_unit)+Number(p.pool_contribution);
                  const margin = Number(p.price_retail) ? ((Number(p.price_retail)-totalCost)/Number(p.price_retail)*100).toFixed(1) : 0;
                  const profit = Number(p.price_retail) - totalCost;
                  const low = Number(p.stock_qty) <= Number(p.stock_low_threshold);
                  return (
                    <div key={p.id} className="card" style={{padding:0,overflow:'hidden'}}>
                      {/* Header row */}
                      <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)'}}>
                        <div style={{width:44,height:44,borderRadius:'var(--r-sm)',background:'linear-gradient(135deg,#6366F1,#0EA5E9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#fff',flexShrink:0}}>☕</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:14,color:'var(--text-h)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>SKU: {p.sku} · {p.category} · {p.weight_g}g</div>
                        </div>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                          <span className={`pill pill-${p.status==='active'?'green':'grey'}`}>{p.status}</span>
                          {low&&<span className="pill pill-red">Low stock</span>}
                          <button className="btn btn-white btn-xs" onClick={()=>{setEditProduct(p);setProductTab('form');}}>Edit</button>
                          <button className="btn btn-white btn-xs" onClick={()=>{setStockProduct(p);setProductTab('stock');}}>Stock</button>
                        </div>
                      </div>
                      {/* Pricing + cost grid */}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:0,borderBottom:'1px solid var(--border)'}}>
                        {[
                          ['Retail price', `R ${Number(p.price_retail).toLocaleString('en-ZA',{maximumFractionDigits:0})}`, 'var(--text-h)', true],
                          ['Member price', `R ${Number(p.price_member||0).toLocaleString('en-ZA',{maximumFractionDigits:0})}`, 'var(--primary)', false],
                          ['Total COGS', `R ${totalCost.toLocaleString('en-ZA',{maximumFractionDigits:2})}`, 'var(--red-text)', false],
                          ['Gross profit', `R ${profit.toLocaleString('en-ZA',{maximumFractionDigits:2})}`, profit>0?'var(--green-text)':'var(--red-text)', false],
                          ['Margin', `${margin}%`, Number(margin)>30?'var(--green-text)':Number(margin)>15?'var(--amber)':'var(--red-text)', false],
                          ['Stock', `${Number(p.stock_qty)} ${p.stock_unit||'units'}`, low?'var(--red-text)':'var(--text-h)', false],
                        ].map(([label,val,col,bold],i)=>(
                          <div key={label} style={{padding:'12px 14px',borderRight:i<5?'1px solid var(--border)':'none'}}>
                            <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>{label}</div>
                            <div style={{fontSize:15,fontWeight:bold?800:600,color:col,letterSpacing:'-0.01em'}}>{val}</div>
                          </div>
                        ))}
                      </div>
                      {/* Cost breakdown bar */}
                      <div style={{padding:'10px 20px',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                        <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,marginRight:4}}>COGS:</span>
                        {[['Green beans',p.cost_green_beans,'#6366F1'],['Roasting',p.cost_roasting,'#0EA5E9'],['Packaging',p.cost_packaging,'#10B981'],['Labour',p.cost_labour,'#F59E0B'],['Shipping',p.cost_shipping,'#8B5CF6'],['Other',p.cost_other,'#EC4899'],['Foundation',p.foundation_per_unit,'#EF4444'],['Pool',p.pool_contribution,'#374151']].filter(([_,v])=>Number(v)>0).map(([label,val,col])=>(
                          <span key={label} style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:'var(--text-sub)',background:'var(--surface-1)',padding:'2px 8px',borderRadius:'var(--r-full)',border:'1px solid var(--border)'}}>
                            <span style={{width:6,height:6,borderRadius:'50%',background:col,display:'inline-block'}}/>
                            {label}: <strong style={{color:'var(--text-h)'}}>R{Number(val).toFixed(2)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {products.length===0&&(
                  <div style={{textAlign:'center',padding:'48px 20px',background:'var(--white)',borderRadius:'var(--r)',boxShadow:'var(--shadow-sm)'}}>
                    <div style={{fontSize:40,marginBottom:12}}>📦</div>
                    <div style={{fontSize:16,fontWeight:700,color:'var(--text-h)',marginBottom:6}}>No products yet</div>
                    <button className="btn btn-primary" onClick={()=>{setEditProduct({});setProductTab('form');}}>Add first product</button>
                  </div>
                )}
              </>}

              {/* ── PRODUCT FORM (create / edit) ── */}
              {productTab==='form'&&<ProductForm
                product={editProduct}
                onSave={async(data)=>{
                  if(data.id){
                    await supabase.from('products').update(data).eq('id',data.id);
                    flash('✓ Product updated');
                  } else {
                    await supabase.from('products').insert(data);
                    flash('✓ Product created');
                  }
                  await load();
                  setProductTab('list');
                }}
                onCancel={()=>setProductTab('list')}
              />}

              {/* ── STOCK LEDGER ── */}
              {productTab==='stock'&&<StockPanel
                product={stockProduct}
                products={products}
                movements={stockMovements}
                onSelectProduct={p=>{setStockProduct(p);}}
                onAdjust={async(productId,type,qty,unitCost,ref,note)=>{
                  const prod = products.find(p=>p.id===productId);
                  if(!prod){flash('Product not found');return;}
                  const qBefore = Number(prod.stock_qty);
                  const qAfter = type==='in' ? qBefore+Number(qty) : Math.max(0,qBefore-Number(qty));
                  await supabase.from('stock_movements').insert({product_id:productId,type,qty:Number(qty),qty_before:qBefore,qty_after:qAfter,unit_cost:unitCost||null,reference:ref||null,note:note||null,created_by:'admin'});
                  await supabase.from('products').update({stock_qty:qAfter,updated_at:new Date().toISOString()}).eq('id',productId);
                  flash(`✓ Stock ${type==='in'?'added':'removed'} · new qty: ${qAfter}`);
                  await load();
                }}
              />}
            </>}

            {/* ── TRAVEL BOOKINGS ── */}
            {tab==='travel'&&<>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
                {[
                  ['Total bookings',travelBookings.length,''],
                  ['Confirmed',travelBookings.filter(b=>b.status==='confirmed').length,'green'],
                  ['Pending',travelBookings.filter(b=>b.status==='pending').length,'primary'],
                  ['Revenue',`R ${travelBookings.reduce((s,b)=>s+Number(b.total_cost),0).toLocaleString('en-ZA',{maximumFractionDigits:0})}`, 'teal'],
                  ['Points used',travelBookings.reduce((s,b)=>s+Number(b.points_used),0).toLocaleString(),''],
                  ['Cash due',`R ${travelBookings.reduce((s,b)=>s+Number(b.cash_due),0).toLocaleString('en-ZA',{maximumFractionDigits:0})}`,'amber'],
                ].map(([l,v,c])=>(
                  <div key={l} className="metric"><div className={`metric-val ${c}`}>{v}</div><div className="metric-label">{l}</div></div>
                ))}
              </div>
              <div className="card card-flush">
                <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface-1)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className="section-label">All travel bookings · {travelBookings.length} total</span>
                  <div style={{display:'flex',gap:6}}>
                    {['all','pending','confirmed','cancelled'].map(s=>(
                      <span key={s} style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:'var(--r-full)',background:s==='all'?'var(--primary)':'var(--surface-2)',color:s==='all'?'#fff':'var(--text-muted)',cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.06em'}}>{s}</span>
                    ))}
                  </div>
                </div>
                <table className="data-table">
                  <thead><tr><th>Ref</th><th>Member</th><th>Booking</th><th>Dates</th><th>Total</th><th>Points</th><th>Cash due</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {travelBookings.length?travelBookings.map(b=>{
                      const m=members.find(x=>x.id===b.member_id);
                      return(
                        <tr key={b.id}>
                          <td style={{fontWeight:700,color:'var(--primary)',fontSize:11,fontFamily:'monospace'}}>{b.booking_ref}</td>
                          <td>
                            <div style={{fontWeight:600,fontSize:13}}>{m?.full_name||'?'}</div>
                            <div style={{fontSize:10,color:'var(--text-muted)'}}>#{MN(m?.member_number)}</div>
                          </td>
                          <td>
                            <div style={{fontWeight:500,fontSize:12,maxWidth:180}}>{b.hotel_name}</div>
                            <div style={{fontSize:10,color:'var(--text-muted)'}}>{b.hotel_location} · {b.room_name}</div>
                          </td>
                          <td style={{fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap'}}>
                            {b.check_in} → {b.check_out}
                            <div style={{fontSize:10,color:'var(--text-dim)'}}>{b.nights} {b.nights===1?'night':'nights'} · {b.guests} guests</div>
                          </td>
                          <td style={{fontWeight:700,fontSize:13}}>R {Number(b.total_cost).toLocaleString('en-ZA',{maximumFractionDigits:0})}</td>
                          <td style={{color:'var(--purple)',fontWeight:600}}>{Number(b.points_used)>0?`${Number(b.points_used).toLocaleString()} pts`:'—'}</td>
                          <td style={{fontWeight:700,color:Number(b.cash_due)>0?'var(--amber)':'var(--green-text)'}}>
                            {Number(b.cash_due)>0?`R ${Number(b.cash_due).toLocaleString('en-ZA',{maximumFractionDigits:0})}`:'Covered'}
                          </td>
                          <td><span className={`pill pill-${b.status==='confirmed'?'green':b.status==='pending'?'amber':b.status==='completed'?'primary':'red'}`}>{b.status}</span></td>
                          <td>
                            <div style={{display:'flex',gap:6}}>
                              {b.status==='pending'&&(
                                <>
                                  <button className="btn btn-xs" style={{background:'var(--green-bg)',color:'var(--green-text)',border:'1px solid rgba(16,185,129,0.2)'}}
                                    onClick={async()=>{await supabase.from('travel_bookings').update({status:'confirmed'}).eq('id',b.id);flash('✓ Booking confirmed');const {data}=await supabase.from('travel_bookings').select('*').order('created_at',{ascending:false});setTravelBookings(data||[]);}}>
                                    Confirm
                                  </button>
                                  <button className="btn btn-xs" style={{background:'var(--red-bg)',color:'var(--red-text)',border:'1px solid rgba(239,68,68,0.2)'}}
                                    onClick={async()=>{await supabase.from('travel_bookings').update({status:'cancelled'}).eq('id',b.id);flash('Booking cancelled');const {data}=await supabase.from('travel_bookings').select('*').order('created_at',{ascending:false});setTravelBookings(data||[]);}}>
                                    Cancel
                                  </button>
                                </>
                              )}
                              {b.status==='confirmed'&&(
                                <button className="btn btn-xs" style={{background:'var(--primary-bg)',color:'var(--primary)',border:'1px solid var(--primary-border)'}}
                                  onClick={async()=>{await supabase.from('travel_bookings').update({status:'completed'}).eq('id',b.id);flash('Marked as completed');const {data}=await supabase.from('travel_bookings').select('*').order('created_at',{ascending:false});setTravelBookings(data||[]);}}>
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }):(
                      <tr><td colSpan="9" style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>No travel bookings yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>}

          </div>
        </div>
      </div>
      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          <button className={`mobile-nav-item${tab==='dashboard'?' on':''}`} onClick={()=>setTab('dashboard')}>
            <i className="ti ti-layout-dashboard" aria-hidden="true"/><span>Home</span>
          </button>
          <button className={`mobile-nav-item${tab==='members'?' on':''}`} onClick={()=>setTab('members')}>
            <i className="ti ti-users" aria-hidden="true"/><span>Members</span>
            {pendingActivations.length>0&&<span className="m-badge">{pendingActivations.length}</span>}
          </button>
          <button className={`mobile-nav-item${tab==='network'?' on':''}`} onClick={()=>setTab('network')}>
            <i className="ti ti-binary-tree-2" aria-hidden="true"/><span>Tree</span>
          </button>
          <button className={`mobile-nav-item${tab==='orders'?' on':''}`} onClick={()=>setTab('orders')}>
            <i className="ti ti-shopping-bag" aria-hidden="true"/><span>Orders</span>
            {pendingOrders.length>0&&<span className="m-badge" style={{background:'var(--red)'}}>{pendingOrders.length}</span>}
          </button>
          <a href="/dashboard" className="mobile-nav-item" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,textDecoration:'none',color:'var(--text-muted)',flex:1,padding:'6px 2px 8px'}}>
            <i className="ti ti-user" aria-hidden="true"/><span>Member</span>
          </a>
          <button className={`mobile-nav-item${['billing','ledger','calc','foundation','travel'].includes(tab)?' on':''}`} onClick={()=>setTab(tab==='billing'?'ledger':tab==='ledger'?'calc':tab==='calc'?'foundation':tab==='foundation'?'travel':'billing')}>
            <i className="ti ti-dots" aria-hidden="true"/><span>More</span>
          </button>
        </div>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
