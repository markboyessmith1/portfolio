import { useParams } from 'react-router-dom'
import Carousel from '../components/Carousel'
import Shelves from '../components/shelf/PagedShelf'
import RequestAccess from '../components/RequestAccess'
import { site, type WorkItem } from '../data/site'
import { useAccess } from '../lib/access'

/** Portfolio: pinned intro card with a vertical carousel of work beside it.
 *  A case study with shelves continues into them below the chapters.
 *  The carousel is public; each case study is gated, and one approval opens them all. */
export default function Home() {
  const { slug } = useParams()
  const access = useAccess()
  const item: WorkItem | undefined = slug ? site.work.find((w) => w.href === `/work/${slug}`) : undefined
  const shelves = item?.shelves

  if (item) {
    if (!access) return <div className="request-wrap" aria-busy />
    if (!access.granted) {
      return (
        <RequestAccess
          key={slug}
          slug={slug}
          title={item.title}
          lede="Enter your email to open this case study."
        />
      )
    }
  }

  return (
    <>
      <Carousel />
      {shelves && <Shelves key={slug} shelves={shelves} />}
    </>
  )
}
