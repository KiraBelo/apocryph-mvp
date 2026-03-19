import { getUser } from '@/lib/session'
import PublicGameViewer from '@/components/PublicGameViewer'

export default async function PublicGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  return <PublicGameViewer gameId={id} userId={user?.id ?? null} />
}
