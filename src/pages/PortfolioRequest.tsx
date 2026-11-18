import { useNavigate, useSearchParams } from 'react-router-dom'
import RequestAccess from '../components/RequestAccess'

/* /portfolio: ask for access to every case study at once (each case study also has its own gate).
   Requests go through api/request (Resend); the sign-in links land back here when they can't be used. */

const NOTICES: Record<string, string> = {
  expired: 'That link has expired. If you’re approved, entering your email lets you straight in.',
  revoked: 'That link no longer gives access.',
  error: 'Something went wrong opening that link. Please try again.',
}

export default function PortfolioRequest() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const notice = NOTICES[params.get('link') ?? '']
  return (
    <RequestAccess
      title="Portfolio"
      lede="Enter your email to open my case studies."
      notice={notice}
      onGranted={() => navigate('/')}
    />
  )
}
