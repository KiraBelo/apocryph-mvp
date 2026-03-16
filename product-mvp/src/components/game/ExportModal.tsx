'use client'
import { useT } from '../SettingsContext'
import Modal from './Modal'
import { exportTxt, exportHtml, exportMd, exportPdf, exportNotesTxt, exportNotesHtml } from './exportUtils'
import type { Message, NoteEntry } from './types'

interface ExportModalProps {
  icMessages: Message[]
  notes: NoteEntry[]
  requestTitle: string | null
  notesEnabled: boolean
  onClose: () => void
}

export default function ExportModal({ icMessages, notes, requestTitle, notesEnabled, onClose }: ExportModalProps) {
  const t = useT()

  return (
    <Modal onClose={onClose} title={t('game.exportTitle') as string}>
      <p className="text-ink-2 font-body mb-4 text-[0.9rem]">
        {t('game.exportGameHistory') as string}
      </p>
      <div className="flex gap-3 mb-6 flex-wrap">
        <button onClick={() => { exportTxt(icMessages, notes, requestTitle, t); onClose() }} className="flex-1 min-w-[100px] bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
          .txt
        </button>
        <button onClick={() => { exportHtml(icMessages, notes, requestTitle, t); onClose() }} className="flex-1 min-w-[100px] bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
          .html
        </button>
        <button onClick={() => { exportMd(icMessages, notes, requestTitle, t); onClose() }} className="flex-1 min-w-[100px] bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
          .md
        </button>
        <button onClick={() => { exportPdf(icMessages, notes, requestTitle, t); onClose() }} className="flex-1 min-w-[100px] bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
          PDF
        </button>
      </div>
      {notesEnabled && notes.length > 0 && (
        <>
          <p className="text-ink-2 font-body mb-4 text-[0.9rem]">
            {t('game.exportMyNotes') as string}
          </p>
          <div className="flex gap-3">
            <button onClick={() => { exportNotesTxt(icMessages, notes, requestTitle, t); onClose() }} className="flex-1 bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
              .txt
            </button>
            <button onClick={() => { exportNotesHtml(icMessages, notes, requestTitle, t); onClose() }} className="flex-1 bg-surface-2 border border-edge text-ink font-heading italic text-[1rem] p-3 cursor-pointer text-center">
              .html
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
