import { site } from '../data/site'

export default function Footer() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} {site.name}</span>
      <nav>
        <a href="https://x.com/markboyessmith" target="_blank" rel="noreferrer">X</a>
        <a href="https://www.linkedin.com/in/markboyessmith/" target="_blank" rel="noreferrer">LinkedIn</a>
        <a href="mailto:hello@example.com">Email</a>
      </nav>
    </footer>
  )
}
