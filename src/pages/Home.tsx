import { useParams } from 'react-router-dom'
import Carousel from '../components/Carousel'
import Shelves from '../components/shelf/PagedShelf'
import { site, type WorkItem } from '../data/site'

/** Portfolio: pinned intro card with a vertical carousel of work beside it.
 *  A case study with shelves continues into them below the chapters. */
export default function Home() {
  const { slug } = useParams()
  const item: WorkItem | undefined = slug ? site.work.find((w) => w.href === `/work/${slug}`) : undefined
  const shelves = item?.shelves
  return (
    <>
      <Carousel />
      {shelves && <Shelves key={slug} shelves={shelves} />}
    </>
  )
}
