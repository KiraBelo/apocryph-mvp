'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSettings, useT } from './SettingsContext'
import type { Message, GameDialogProps } from './game/types'
import Modal from './game/Modal'
import MessageFeed from './game/MessageFeed'
import MessageEditor from './game/MessageEditor'
import SearchPanel from './game/SearchPanel'
import StatusBanners from './game/StatusBanners'
import ExportModal from './game/ExportModal'
import SettingsModal from './game/SettingsModal'
import TopBar from './game/TopBar'
import NotesTab from './game/NotesTab'
import { useGameSSE } from './hooks/useGameSSE'
import { useGameChat } from './hooks/useGameChat'
import { useGameNotes } from './hooks/useGameNotes'
import { useGameSearch } from './hooks/useGameSearch'
import { useDiceRoller } from './hooks/useDiceRoller'

export default function GameDialogClient({ gameId, game, initialMessages, initialPage, totalPages: initTotalPages, participants, me, userId, requestTitle }: GameDialogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { notesEnabled } = useSettings()
  const t = useT()

  // ── Tab state ──
  const initialTab = searchParams.get('tab') === 'ooc' ? 'ooc' as const : searchParams.get('tab') === 'notes' ? 'notes' as const : 'ic' as const
  const [activeTab, setActiveTab] = useState<'ic' | 'ooc' | 'notes'>(initialTab)

  // ── Hooks ──
  const chat = useGameChat({ gameId, participantId: me.id, activeTab, t }, { messages: initialMessages, page: initialPage, totalPages: initTotalPages })
  const notesHook = useGameNotes({ gameId, t })
  const search = useGameSearch({ gameId, icMessages: chat.icMessages, oocMessages: chat.oocMessages, notes: notesHook.notes })
  const dice = useDiceRoller({ gameId, participantId: me.id, t })

  // ── Layout state ──
  const [fullscreen, setFullscreen] = useState(false)
  const [editorCollapsed, setEditorCollapsed] = useState(false)
  const [editorPinned, setEditorPinned] = useState(false)

  // ── Modal visibility ──
  const [showLeave, setShowLeave] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')
  const [reportReason, setReportReason] = useState('')

  // ── Game settings (local form state for SettingsModal) ──
  const [nickname, setNickname] = useState(me.nickname)
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(me.banner_url ?? '')
  const [bannerPref, setBannerPref] = useState<'own' | 'partner' | 'none'>(me.banner_pref as 'own' | 'partner' | 'none' ?? 'own')
  const [oocEnabled, setOocEnabled] = useState(game.ooc_enabled)

  // ── Game lifecycle ──
  const isLeft = !!me.left_at
  const isFrozen = !!(game.moderation_status && game.moderation_status !== 'visible')
  const [gameStatus, setGameStatus] = useState(game.status || 'active')
  const isFinished = gameStatus === 'finished'
  const partner = participants.find(p => p.user_id !== userId)
  const [myFinishConsent, setMyFinishConsent] = useState(!!me.finish_consent)
  const [partnerFinishConsent, setPartnerFinishConsent] = useState(!!partner?.finish_consent)
  const [finishLoading, setFinishLoading] = useState(false)
  const [myPublishConsent, setMyPublishConsent] = useState(false)
  const [partnerPublishConsent, setPartnerPublishConsent] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishLoaded, setPublishLoaded] = useState(false)
  const [icPostCount, setIcPostCount] = useState(0)

  // ── Scroll collapse refs ──
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreScrollRef = useRef(false)

  // ── Derived ──
  const isOoc = activeTab === 'ooc'
  const isNotes = activeTab === 'notes'
  const visibleMessages = isOoc ? chat.oocMessages : chat.icMessages
  const activePartner = participants.find(p => p.user_id !== userId && !p.left_at)
  const effectiveBanner = bannerPref === 'none' ? null : bannerPref === 'partner' ? (activePartner?.banner_url ?? null) : (bannerUrl || null)

  // ── Effects ──
  useEffect(() => {
    if (!isFinished || publishLoaded) return
    fetch(`/api/games/${gameId}/publish-consent`).then(r => r.json()).then(data => {
      if (data.participants) {
        const myP = data.participants.find((p: { participant_id: string }) => p.participant_id === me.id)
        const otherP = data.participants.find((p: { participant_id: string }) => p.participant_id !== me.id)
        setMyPublishConsent(!!myP?.consented)
        setPartnerPublishConsent(!!otherP?.consented)
      }
      if (data.icPostCount != null) setIcPostCount(data.icPostCount)
      setPublishLoaded(true)
    }).catch(() => {})
  }, [isFinished, publishLoaded, gameId, me.id])

  useEffect(() => () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    if (scrollStopRef.current) clearTimeout(scrollStopRef.current)
  }, [])

  useEffect(() => {
    if (!fullscreen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setFullscreen(false); setEditorCollapsed(false) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [fullscreen])

  useEffect(() => { fetch(`/api/games/${gameId}/read`, { method: 'POST' }).catch(() => {}) }, [gameId])

  useEffect(() => {
    if (activeTab === 'ooc') fetch(`/api/games/${gameId}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tab: 'ooc' }) }).catch(() => {})
    else if (activeTab === 'ic') fetch(`/api/games/${gameId}/read`, { method: 'POST' }).catch(() => {})
  }, [activeTab, gameId])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab === 'notes' && notesEnabled && !notesHook.notesLoaded) notesHook.loadNotes() }, [activeTab, notesEnabled, notesHook.notesLoaded])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab === 'ooc' && !chat.oocLoaded) chat.loadOocHistory() }, [activeTab, chat.oocLoaded])

  useEffect(() => {
    if (!chat.scrollToMsgId) return
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-msg-id="${chat.scrollToMsgId}"]`)
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as HTMLElement).style.outline = '2px solid var(--accent)'; setTimeout(() => { (el as HTMLElement).style.outline = '' }, 2500) }
      chat.setScrollToMsgId(null)
    }, 100)
    return () => clearTimeout(timer)
  }, [chat.scrollToMsgId, chat.icMessages, chat.oocMessages, chat])

  useGameSSE({
    gameId, isLeft,
    onNewMessage: (msg) => { msg.type === 'ooc' ? chat.appendOocMessage(msg) : chat.appendIcMessage(msg) },
    onEditMessage: (data) => chat.updateMessage(data),
    onDiceMessage: (data) => dice.enqueueDice(data),
  })

  // ── Handlers ──
  function handleMessagesScroll() {
    if (chat.editingId || editorPinned || ignoreScrollRef.current) return
    if (!editorCollapsed) {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => { ignoreScrollRef.current = true; setEditorCollapsed(true); setTimeout(() => { ignoreScrollRef.current = false }, 100) }, 150)
    }
    if (scrollStopRef.current) clearTimeout(scrollStopRef.current)
    scrollStopRef.current = setTimeout(() => { ignoreScrollRef.current = true; setEditorCollapsed(false); setTimeout(() => { ignoreScrollRef.current = false }, 100) }, 2000)
  }

  function handleSpoilerClick(e: React.MouseEvent) { const el = e.target as HTMLElement; if (el.classList.contains('ooc-spoiler')) el.classList.toggle('ooc-spoiler-open') }

  async function handleFinishConsent(consent: boolean) {
    setFinishLoading(true)
    const res = await fetch(`/api/games/${gameId}/finish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent }) })
    const data = await res.json()
    if (data.ok) { setMyFinishConsent(consent); if (data.finished) setGameStatus('finished') }
    setFinishLoading(false)
  }

  async function handleReopen() {
    setFinishLoading(true)
    const res = await fetch(`/api/games/${gameId}/finish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reopen' }) })
    const data = await res.json()
    if (data.ok) { setGameStatus('active'); setMyFinishConsent(false); setPartnerFinishConsent(false); setMyPublishConsent(false); setPartnerPublishConsent(false); setPublishLoaded(false) }
    setFinishLoading(false)
  }

  async function handlePublishConsent(consent: boolean) {
    setPublishLoading(true)
    const res = await fetch(`/api/games/${gameId}/publish-consent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent }) })
    if (res.ok) setMyPublishConsent(consent)
    setPublishLoading(false)
  }

  // ── Render ──
  return (
    <div className={fullscreen ? 'fixed inset-0 z-[500] flex flex-col bg-surface' : 'flex flex-col bg-surface'} style={fullscreen ? undefined : { height: 'calc(100vh - 60px)' }}>
      {/* Banner */}
      {effectiveBanner && !fullscreen && (
        <div className="relative h-[180px] shrink-0 overflow-hidden">
          <div className="absolute inset-0" style={{ background: `url(${effectiveBanner}) center/cover` }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 px-6 py-3">
            {requestTitle && <p className="font-heading italic text-[1.25rem] m-0" style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>{requestTitle}</p>}
          </div>
        </div>
      )}

      <TopBar
        requestTitle={requestTitle} effectiveBanner={effectiveBanner}
        activeTab={activeTab} setActiveTab={setActiveTab}
        oocEnabled={oocEnabled} fullscreen={fullscreen} isLeft={isLeft}
        participants={participants} userId={userId} notesCount={notesHook.notes.length}
        onSearchToggle={() => { search.setSearchOpen(s => !s); search.setSearchQuery(''); search.setSearchScope(activeTab === 'notes' ? 'notes' : activeTab === 'ooc' ? 'ooc' : 'ic') }}
        onExport={() => setShowExport(true)} onSettings={() => setShowSettings(true)}
        onReport={() => setShowReport(true)} onLeave={() => setShowLeave(true)}
        onFullscreenToggle={() => setFullscreen(f => { const next = !f; setEditorCollapsed(next); return next })}
      />

      {search.searchOpen && (
        <SearchPanel
          searchQuery={search.searchQuery} searchScope={search.searchScope} searchLoading={search.searchLoading}
          serverSearchResults={search.serverSearchResults} noteSearchResults={search.noteSearchResults}
          onQueryChange={search.setSearchQuery} onScopeChange={search.setSearchScope}
          onResultClick={async (r) => { setActiveTab(search.searchScope === 'ooc' ? 'ooc' : 'ic'); await chat.goToPage(search.searchScope === 'ooc' ? 'ooc' : 'ic', r.page); chat.setScrollToMsgId(r.id) }}
          onNoteClick={(noteId) => { setActiveTab('notes'); setTimeout(() => { const el = document.querySelector(`[data-note-id="${noteId}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as HTMLElement).style.outline = '2px solid var(--accent)'; setTimeout(() => { (el as HTMLElement).style.outline = '' }, 2000) } }, 100) }}
          onClose={() => search.setSearchOpen(false)}
        />
      )}

      <StatusBanners gameStatus={gameStatus} isLeft={isLeft} isFrozen={isFrozen} moderationStatus={game.moderation_status}
        myFinishConsent={myFinishConsent} partnerFinishConsent={partnerFinishConsent}
        myPublishConsent={myPublishConsent} partnerPublishConsent={partnerPublishConsent}
        icPostCount={icPostCount} finishLoading={finishLoading} publishLoading={publishLoading} publishLoaded={publishLoaded}
        onFinishConsent={handleFinishConsent} onReopen={handleReopen} onPublishConsent={handlePublishConsent}
      />

      {isNotes ? (
        <NotesTab
          notes={notesHook.notes} notesLoading={notesHook.notesLoading} isLeft={isLeft} isFrozen={isFrozen}
          fullscreen={fullscreen} editorCollapsed={editorCollapsed} setEditorCollapsed={setEditorCollapsed}
          noteEditingId={notesHook.noteEditingId} setNoteEditingId={notesHook.setNoteEditingId}
          noteEditTitle={notesHook.noteEditTitle} setNoteEditTitle={notesHook.setNoteEditTitle}
          noteEditContent={notesHook.noteEditContent} setNoteEditContent={notesHook.setNoteEditContent}
          noteEditSaving={notesHook.noteEditSaving} expandedNotes={notesHook.expandedNotes}
          deleteConfirmId={notesHook.deleteConfirmId} setDeleteConfirmId={notesHook.setDeleteConfirmId}
          newNoteTitle={notesHook.newNoteTitle} setNewNoteTitle={notesHook.setNewNoteTitle}
          newNoteContent={notesHook.newNoteContent} setNewNoteContent={notesHook.setNewNoteContent}
          newNoteKey={notesHook.newNoteKey} newNoteSending={notesHook.newNoteSending}
          onStartNoteEdit={notesHook.startNoteEdit} onSaveNoteEdit={notesHook.saveNoteEdit}
          onDeleteNote={notesHook.deleteNote} onToggleExpand={notesHook.toggleNoteExpand} onSubmitNote={notesHook.submitNote}
        />
      ) : (
        <>
          <MessageFeed
            messages={visibleMessages} userId={userId} isOoc={isOoc} isLeft={isLeft} isFinished={isFinished} isFrozen={isFrozen}
            fullscreen={fullscreen} editingId={chat.editingId} notesEnabled={notesEnabled} pageLoading={chat.pageLoading}
            currentPage={isOoc ? chat.oocPage : chat.icPage} totalPages={isOoc ? chat.oocTotalPages : chat.icTotalPages}
            scrollRef={chat.scrollRef} onScroll={handleMessagesScroll} onSpoilerClick={handleSpoilerClick}
            onStartEdit={chat.startEdit} onCancelEdit={chat.cancelEdit} onQuotePost={(msg) => notesHook.quotePost(msg, setActiveTab)} onGoToPage={chat.goToPage}
          />
          <MessageEditor
            isOoc={isOoc} isLeft={isLeft} isFrozen={isFrozen} isFinished={isFinished} fullscreen={fullscreen}
            editingId={chat.editingId} editorCollapsed={editorCollapsed} setEditorCollapsed={setEditorCollapsed}
            editorPinned={editorPinned} setEditorPinned={setEditorPinned}
            content={chat.content} setContent={chat.setContent} sendKey={chat.sendKey}
            oocContent={chat.oocContent} setOocContent={chat.setOocContent} oocSendKey={chat.oocSendKey}
            sending={chat.sending} editSaving={chat.editSaving} onSend={chat.send} onSaveEdit={chat.saveEdit} onCancelEdit={chat.cancelEdit}
            showDicePanel={dice.showDicePanel} setShowDicePanel={dice.setShowDicePanel}
            diceSides={dice.diceSides} setDiceSides={dice.setDiceSides} diceRolling={dice.diceRolling} onRollDice={dice.rollDice}
          />
        </>
      )}

      {/* Quote toast */}
      {notesHook.quoteToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-surface font-mono text-[0.7rem] tracking-[0.08em] px-[1.1rem] py-2 z-[600] pointer-events-none">{t('game.quotedToNotes') as string}</div>
      )}

      {/* Dice popup */}
      {dice.diceQueue.length > 0 && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={dice.dismissDice}>
          <div onClick={e => e.stopPropagation()} className="bg-surface border border-edge p-[2rem_3rem] text-center min-w-[200px]" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
            <p className="font-mono text-[0.6rem] text-ink-2 tracking-[0.15em] uppercase mb-3">{dice.diceQueue[0].roller} · d{dice.diceQueue[0].sides}{dice.diceQueue.length > 1 && <span className="ml-3 opacity-50">+{dice.diceQueue.length - 1}</span>}</p>
            <p className="font-heading text-[4rem] text-accent italic leading-none mb-6">{dice.diceQueue[0].result}</p>
            <button onClick={dice.dismissDice} className="btn-ghost text-[0.65rem] tracking-[0.1em] p-[0.35rem_1.25rem]">{dice.diceQueue.length > 1 ? t('game.diceNext') as string : t('game.diceClose') as string}</button>
          </div>
        </div>
      )}

      {showExport && <ExportModal icMessages={chat.icMessages} notes={notesHook.notes} requestTitle={requestTitle} notesEnabled={notesEnabled} onClose={() => setShowExport(false)} />}

      {showLeave && (
        <Modal onClose={() => setShowLeave(false)} title={t('game.leaveTitle') as string}>
          <p className="text-ink-2 font-body mb-5">{t('game.leavePrompt') as string}</p>
          <div className="flex flex-col gap-2 mb-5">
            {(t('game.leaveReasons') as readonly string[]).map((r: string) => (
              <label key={r} className="flex items-center gap-[0.6rem] cursor-pointer font-body" style={{ color: leaveReason === r ? 'var(--accent)' : 'var(--text)' }}>
                <input type="radio" value={r} checked={leaveReason === r} onChange={() => setLeaveReason(r)} style={{ accentColor: 'var(--accent)' }} />{r}
              </label>
            ))}
          </div>
          <button onClick={async () => { if (!leaveReason) { alert(t('errors.selectLeaveReason') as string); return }; await fetch(`/api/games/${gameId}/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: leaveReason }) }); router.push('/my/games') }} className="bg-[#c0392b] text-white font-heading italic border-none p-[0.6rem_1.4rem] cursor-pointer">{t('game.leaveButton') as string}</button>
        </Modal>
      )}

      {showReport && (
        <Modal onClose={() => setShowReport(false)} title={t('game.reportTitle') as string}>
          <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder={t('game.reportPlaceholder') as string} rows={4} className="w-full font-body text-[1rem] bg-surface border border-edge text-ink p-[0.65rem] outline-none resize-y mb-4" />
          <button onClick={async () => { await fetch(`/api/games/${gameId}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reportReason }) }); setShowReport(false); alert(t('game.reportSent') as string) }} className="btn-primary p-[0.6rem_1.4rem] text-[1rem]">{t('game.reportButton') as string}</button>
        </Modal>
      )}

      {showSettings && (
        <SettingsModal
          gameId={gameId} game={game} me={me} partner={partner}
          nickname={nickname} setNickname={setNickname} avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl}
          bannerUrl={bannerUrl} setBannerUrl={setBannerUrl} bannerPref={bannerPref} setBannerPref={setBannerPref}
          oocEnabled={oocEnabled} setOocEnabled={setOocEnabled}
          isFinished={isFinished} isLeft={isLeft} gameStatus={gameStatus} setGameStatus={setGameStatus}
          myFinishConsent={myFinishConsent} setMyFinishConsent={setMyFinishConsent} partnerFinishConsent={partnerFinishConsent}
          myPublishConsent={myPublishConsent} setMyPublishConsent={setMyPublishConsent}
          partnerPublishConsent={partnerPublishConsent} setPartnerPublishConsent={setPartnerPublishConsent}
          publishLoaded={publishLoaded} setPublishLoaded={setPublishLoaded} icPostCount={icPostCount}
          finishLoading={finishLoading} setFinishLoading={setFinishLoading} publishLoading={publishLoading} setPublishLoading={setPublishLoading}
          onSettingsSaved={(n, a) => { chat.updateLocalNickname(userId, n, a || null); router.refresh() }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
