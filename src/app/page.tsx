import FeedClient from '@/components/FeedClient'
import { getUser } from '@/lib/session'

export default async function FeedPage() {
  const user = await getUser()
  return <FeedClient user={user} />
}
