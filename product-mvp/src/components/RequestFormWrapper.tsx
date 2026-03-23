'use client'

import { useT } from './SettingsContext'
import RequestForm from './RequestForm'
import Breadcrumbs from './Breadcrumbs'

interface Props {
  mode: 'new' | 'edit'
  initial?: React.ComponentProps<typeof RequestForm>['initial']
}

export default function RequestFormWrapper({ mode, initial }: Props) {
  const t = useT()
  const sectionLabel = mode === 'new' ? t('form.newSectionLabel') as string : t('form.editSectionLabel') as string
  const title = mode === 'new' ? t('form.newTitle') as string : t('form.editTitle') as string

  return (
    <div className="max-w-[1050px] mx-auto px-7 py-8">
      {mode === 'edit' && initial && (
        <Breadcrumbs items={[
          { label: t('myRequests.title') as string, href: '/my/requests' },
          { label: initial.title, href: `/requests/${initial.id}` },
          { label: t('form.editBreadcrumb') as string },
        ]} />
      )}
      <h1 className="page-title mb-6">
        {title}
      </h1>
      <RequestForm initial={initial} />
    </div>
  )
}
