import { site, acquiredLabel, type Acquired } from '../data/site'

/* The resume, stripped back for print and PDF (/about/print, outside the site shell): one column of
   black type on white, A4, no media, no motion. Same data as /about (site.resume), so the two never
   drift apart. public/mark-boyes-smith-resume.pdf is printed from this page:

     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer \
       --print-to-pdf=public/mark-boyes-smith-resume.pdf http://localhost:5173/about/print
*/

const CSS = `
@page { size: A4; margin: 14mm 17mm; }
html, body { margin: 0; background: #fff; }
.rp { max-width: 174mm; margin: 0 auto; padding: 16mm 0; color: #111; font: 400 9pt/1.4 'ABC Areal', 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.005em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media print { .rp { padding: 0; } }
.rp * { box-sizing: border-box; }
.rp h1 { margin: 0; font-size: 20pt; font-weight: 500; letter-spacing: -0.02em; line-height: 1.1; }
.rp__headline { margin: 3pt 0 0; font-size: 11pt; color: #555; }
.rp__contact { display: flex; flex-wrap: wrap; gap: 4pt 14pt; margin: 8pt 0 0; font-size: 8.5pt; color: #555; }
.rp__contact a { color: inherit; text-decoration: none; }
.rp__statement { margin: 16pt 0 0; font-size: 11pt; line-height: 1.4; font-weight: 500; letter-spacing: -0.01em; text-wrap: balance; }
.rp section { margin-top: 22pt; }
.rp h2 { margin: 0 0 10pt; padding-bottom: 5pt; border-bottom: 0.5pt solid #ccc; font-size: 8pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #555; }
.rp__job { padding: 8pt 0; }
.rp__job:first-of-type { padding-top: 0; }
.rp__row, .rp__role { break-after: avoid; } /* a role may run over a page, but never leave its heading behind */
.rp li { break-inside: avoid; }
.rp__job:not(:last-child) { border-bottom: 0.5pt solid #eee; } /* under each role, so a page break never opens on a rule */
.rp__row { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
.rp__org { font-size: 10.5pt; font-weight: 600; }
.rp__acq { margin-left: 6pt; font-size: 8pt; font-weight: 400; color: #666; }
.rp__when { flex: none; font-size: 8.5pt; color: #666; font-variant-numeric: tabular-nums; }
.rp__role { margin-top: 1pt; color: #444; }
.rp ul { margin: 5pt 0 0; padding: 0 0 0 11pt; }
.rp li { margin: 2pt 0; padding-left: 2pt; text-wrap: pretty; }
.rp li::marker { color: #999; }
.rp__principles { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt 20pt; }
.rp__principles b { margin-bottom: 1pt; }
.rp__principles b { display: block; font-weight: 600; }
.rp__principles span { color: #444; }
.rp .rp__talks { margin: 0; padding: 0; list-style: none; }
.rp .rp__talks li { display: flex; justify-content: space-between; gap: 12pt; margin: 0; padding: 2.5pt 0; }
.rp__talks a { color: inherit; text-decoration: none; }
.rp__talks .rp__when { color: #888; }
.rp__kind { color: #888; }
`

export default function ResumePrint() {
  const r = site.resume
  return (
    <div className="rp">
      <style>{CSS}</style>
      <header>
        <h1>{site.name}</h1>
        <p className="rp__headline">{r.headline}</p>
        <p className="rp__contact">
          <span>{r.location}</span>
          <a href={`mailto:${r.email}`}>{r.email}</a>
          <a href={r.linkedin}>{r.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</a>
        </p>
      </header>
      <p className="rp__statement">{r.intro.highlight} {r.intro.statement}</p>

      <section>
        <h2>Principles</h2>
        <div className="rp__principles">
          {r.principles.map((p) => <div key={p.lead}><b>{p.lead}</b><span>{p.short}</span></div>)}
        </div>
      </section>

      <section>
        <h2>Experience</h2>
        {r.experience.map((j) => (
          <div className="rp__job" key={j.company + j.when}>
            <div className="rp__row">
              <span className="rp__org">
                {j.company}
                {'clients' in j && j.clients && <span className="rp__acq">Clients include {j.clients.join(', ')}</span>}
                {'acquired' in j && j.acquired && <span className="rp__acq">{acquiredLabel(j.acquired as Acquired)} {j.acquired.by}{(j.acquired as Acquired).price && ` for ${(j.acquired as Acquired).price}`}</span>}
              </span>
              <span className="rp__when">{j.when}</span>
            </div>
            {'title' in j && j.title && <div className="rp__role">{j.title}</div>}
            {'details' in j && j.details && <ul>{j.details.map((d) => <li key={d}>{d}</li>)}</ul>}
          </div>
        ))}
      </section>

      <section>
        <h2>Education</h2>
        <div className="rp__job">
          <div className="rp__row">
            <span className="rp__org">{r.education.school}</span>
            <span className="rp__when">{r.education.when}</span>
          </div>
          <div className="rp__role">{r.education.degree}</div>
          {r.education.dissertation && (
            <ul><li>{r.education.dissertation.grade} dissertation: {r.education.dissertation.title}</li></ul>
          )}
        </div>
      </section>


      <section>
        <h2>Talks &amp; media</h2>
        <ul className="rp__talks">
          {r.media.map((m) => (
            <li key={m.href}>
              <a href={m.href}><span className="rp__kind">{m.kind}</span> · {m.title}{'show' in m && m.show ? `, ${m.show}` : ''}</a>
              <span className="rp__when">{m.year}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
