/* In the prototype the soundscape page was its own scroller (the app shell
   locked body scroll) and each scene walked up to the nearest scrollable
   ancestor. Here the page sits in the site's normal flow, so the document is
   the scroller: these helpers give the scenes the same three things — where an
   element sits in scroll space, the current scroll, and a way to go there. */

/** `el`'s top edge in document scroll coordinates. */
export const docTop = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY

export const scrollY = () => window.scrollY

export const scrollToY = (top: number, smooth: boolean) =>
  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
