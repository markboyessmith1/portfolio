/* A company's ident beside its name on the resume: its LinkedIn logo, in its own colours, as a
   small rounded tile. The logos live in src/assets/logos/<slug>.jpg (or .png), slug being the name
   lowercased with anything not a letter or digit dropped ("Mark-Ross Ltd" → markrossltd); a company
   with no file yet gets a tile with its initial instead. Drop a file in and it's picked up. */

const FILES = import.meta.glob('../assets/logos/*.{jpg,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const LOGOS = Object.fromEntries(Object.entries(FILES).map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url]))

export const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

export default function CompanyMark({ name }: { name: string }) {
  const key = slug(name), url = LOGOS[key]
  return url
    ? <img className="company-mark" data-logo={key} src={url} alt="" aria-hidden loading="lazy" />
    : <span className="company-mark company-mark--initial" aria-hidden>{name[0]}</span>
}
