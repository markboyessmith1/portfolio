import { site } from '../data/site'

export default function Footer() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} {site.name}</span>
      <nav>
        <a href="https://x.com" target="_blank" rel="noreferrer">X</a>
        <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
        <a href="mailto:hello@example.com">Email</a>
      </nav>
    </footer>
  )
}
