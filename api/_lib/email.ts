/* The look of every email the site sends, matched to the portfolio: warm off-white page, one white
   rounded card, the ring mark, a big tight headline, quiet grey body copy and a near-black pill button.
   Tables and inline styles only, so it holds up in Gmail, Outlook and Apple Mail. Each email also gets a
   plain-text twin. */

export type Mail = { html: string; text: string }

type Parts = {
  preheader?: string // the grey preview line inboxes show after the subject
  eyebrow?: string // small label above the headline
  title: string
  lines?: string[] // short paragraphs
  button?: { href: string; label: string }
  footnote?: string // small print under the button
  sign?: boolean // "Mark" sign-off
}

const C = { page: '#FAF9F7', card: '#FFFFFF', ink: '#222120', body: '#33322F', muted: '#6B6863', faint: '#A9A6A0', rule: '#E8E6E2' }
const FONT = `'ABC Areal','Inter',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif`

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// the site's favicon: a plain ring
const RING = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="width:18px;height:18px;border:2.5px solid ${C.ink};border-radius:50%;font-size:0;line-height:0">&nbsp;</td>
<td style="padding-left:10px;font-family:${FONT};font-size:14px;line-height:20px;color:${C.ink};letter-spacing:-0.01em">Mark Boyes-Smith</td>
</tr></table>`

export function mail(p: Parts): Mail {
  const lines = p.lines ?? []
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${esc(p.title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
${p.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(p.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
<tr><td style="padding:0 8px 20px">${RING}</td></tr>
<tr><td style="background:${C.card};border-radius:28px;padding:44px 40px 40px">
${p.eyebrow ? `<p style="margin:0 0 12px;font-family:${FONT};font-size:13px;line-height:18px;color:${C.muted};letter-spacing:-0.01em">${esc(p.eyebrow)}</p>` : ''}
<h1 style="margin:0 0 18px;font-family:${FONT};font-size:30px;line-height:34px;font-weight:500;color:${C.ink};letter-spacing:-0.03em">${esc(p.title)}</h1>
${lines.map((l) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.body};letter-spacing:-0.015em">${esc(l)}</p>`).join('\n')}
${p.sign ? `<p style="margin:22px 0 0;font-family:${FONT};font-size:16px;line-height:24px;color:${C.ink};letter-spacing:-0.015em">Mark</p>` : ''}
${p.button ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px"><tr>
<td style="background:${C.ink};border-radius:999px"><a href="${esc(p.button.href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:500;color:#FFFFFF;text-decoration:none;letter-spacing:-0.01em">${esc(p.button.label)}&nbsp;&nbsp;&rarr;</a></td>
</tr></table>` : ''}
${p.footnote ? `<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${C.rule};font-family:${FONT};font-size:13px;line-height:19px;color:${C.muted};letter-spacing:-0.01em">${esc(p.footnote)}</p>` : ''}
</td></tr>
<tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint};letter-spacing:-0.01em">
<a href="https://boyes-smith.com" style="color:${C.faint};text-decoration:none">boyes-smith.com</a></td></tr>
</table></td></tr></table></body></html>`

  const text = [
    p.title,
    '',
    ...lines.flatMap((l) => [l, '']),
    ...(p.sign ? ['Mark', ''] : []),
    ...(p.button ? [`${p.button.label}: ${p.button.href}`, ''] : []),
    ...(p.footnote ? [p.footnote, ''] : []),
    'boyes-smith.com',
  ].join('\n')

  return { html, text }
}

/** A message Mark writes on the review screen: his words, in the same frame, no headline or button. */
export function letter(body: string): Mail {
  const paras = body.trim().split(/\n{2,}/)
  const html = mail({ title: '' }).html
    .replace(/<h1[^>]*><\/h1>/, '')
    .replace('<td style="background:#FFFFFF;border-radius:28px;padding:44px 40px 40px">',
      `<td style="background:#FFFFFF;border-radius:28px;padding:40px">${paras
        .map((p) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.body};letter-spacing:-0.015em">${esc(p).replace(/\n/g, '<br>')}</p>`)
        .join('\n')}`)
  return { html, text: body.trim() }
}
