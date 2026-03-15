import PublicGameViewer from '@/components/PublicGameViewer'

export default async function PublicGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PublicGameViewer gameId={id} />
}
