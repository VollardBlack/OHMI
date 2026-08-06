import Link from 'next/link';

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="wordmark">OHMI<span>.</span> COFFEE CO.</div>
          <nav className="nav">
            <Link href="/" className="active">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/shop#subscribe">Subscribe</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <div className="eyebrow">Roasted in Middelburg · Mpumalanga</div>
          <h1>Coffee with a <em>backbone.</em></h1>
          <p className="lede">
            Single-origin Uganda Bugisu AA, contract-roasted in small batches and
            shipped fresh across South Africa. Every kilogram sold puts R15 toward
            feeding children in the Bitou region — the OHMI Foundation promise,
            printed on every bag.
          </p>
          <div className="cta-row">
            <Link href="/shop" className="btn primary">Shop the roast</Link>
            <Link href="/shop#subscribe" className="btn ghost">Monthly subscription</Link>
          </div>
          <div className="roast-meter" aria-hidden="true">
            <i></i><i></i><i></i><i></i><i></i>
          </div>
          <div className="roast-label">Roast profile — Medium · Full body · Cocoa &amp; stone fruit</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="kicker">The OHMI standard</div>
          <h2>One origin. One roaster.<br />Zero shortcuts.</h2>
          <div className="product-grid">
            <div className="product-card">
              <div className="product-body">
                <h3>Sourced honestly</h3>
                <p className="notes">Uganda Bugisu AA green beans from the slopes of Mount Elgon, bought at fair volume-based pricing through Green Coffee Supply.</p>
              </div>
            </div>
            <div className="product-card">
              <div className="product-body">
                <h3>Roasted fresh</h3>
                <p className="notes">Small-batch contract roasting means your bag is roasted to order — not warehoused. Roast date on every label.</p>
              </div>
            </div>
            <div className="product-card">
              <div className="product-body">
                <h3>Sold on merit</h3>
                <p className="notes">Our representatives earn from real coffee sold and consumed — never from recruitment. It&apos;s the law, and it&apos;s the point.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="impact">
        <div className="container">
          <div>
            <div className="kicker" style={{ color: 'var(--copper)' }}>OHMI Foundation</div>
            <h2>Every kilo feeds a child.</h2>
          </div>
          <p>
            R15 from every kilogram roasted is allocated to feeding programmes for
            children in the Bitou region. It isn&apos;t a marketing line — it&apos;s a
            standing allocation in our cost structure, audited annually.
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div>© {new Date().getFullYear()} OHMI Coffee Co. · Middelburg, South Africa</div>
          <div>Representatives earn commission on product sales only, in accordance with CPA s43.</div>
        </div>
      </footer>
    </>
  );
}
