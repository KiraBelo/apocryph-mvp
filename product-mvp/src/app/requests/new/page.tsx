import { redirect } from 'next/navigation'
import { getUser } from '@/lib/session'
import RequestForm from '@/components/RequestForm'

export default async function NewRequestPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  return (
    <div className="max-w-[1050px] mx-auto p-[3rem_1.75rem]">
      <p className="section-label text-accent-2 mb-3">§ Новая заявка</p>
      <h1 className="font-heading text-[clamp(1.8rem,4vw,2.8rem)] italic font-light text-ink mb-10">
        Создать заявку
      </h1>
      <RequestForm />
    </div>
  )
}
