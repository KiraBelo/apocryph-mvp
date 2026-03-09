'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from './Landing.module.css'

function cx(...classes: string[]) {
  return classes.join(' ')
}

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!rootRef.current) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add(styles.on) }),
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' },
    )
    rootRef.current.querySelectorAll(`.${styles.r}`).forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div ref={rootRef} className={styles.landing}>
      {/* nav */}
      <nav className={styles.nav}>
        <div className={styles.logo}><em>А</em><span className={styles.logoAccent}>покриф</span></div>
        <div className={styles.navRight}>
          <Link href="/auth/login" className={cx(styles.btn, styles.btnOutline)}>Войти</Link>
          <Link href="/auth/register" className={cx(styles.btn, styles.btnPrimary)}>Начать игру →</Link>
        </div>
      </nav>

      {/* hero */}
      <section className={styles.hero} id="hero">
        <div className={styles.container}>
          <div className={styles.heroInner}>
            <span className={cx(styles.chapter, styles.r)}>Анонимные текстовые ролевые игры</span>

            <h1 className={cx(styles.r, styles.d1)}>
              Найди соигрока. <strong>Отыграй историю.</strong><br />
              Оставь реал в офлайне.
            </h1>

            <p className={cx(styles.heroOneliner, styles.r, styles.d2)}>
              Без профиля, без онлайн-статуса, без лишних глаз — сыграй одну горячую сцену сегодня вечером или веди совместную историю годами.
            </p>

            <ul className={cx(styles.heroFeatures, styles.r, styles.d3)}>
              <li>Найди заявку под себя: выбери фандом или оригинальную историю, пейринг, количество острого контента и начинай игру сразу.</li>
              <li>Публикуй заявку, чтобы найти единомышленника.</li>
              <li>Заявка нравится, но времени пока нет? Сохрани её в закладки и вернись к ней позже.</li>
              <li>Оформляй посты как душе угодно — форматирование текста, аватар, баннер</li>
              <li>Покинь игру, когда история закончится, никаких цифровых следов и личных данных.</li>
            </ul>

            <div className={cx(styles.r, styles.d4)}>
              <Link href="/auth/register" className={cx(styles.btn, styles.btnPrimary)}>Найти игру →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ticker */}
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          <span>Анонимность</span><span>✦</span>
          <span>Текстовые ролевые игры</span><span>✦</span>
          <span>Фандомы</span><span>✦</span>
          <span>Ориджиналы</span><span>✦</span>
          <span>Свобода творчества</span><span>✦</span>
          <span>Приватность</span><span>✦</span>
          <span>Игры на любой вкус</span><span>✦</span>
          <span>Анонимность</span><span>✦</span>
          <span>Текстовые ролевые игры</span><span>✦</span>
          <span>Фандомы</span><span>✦</span>
          <span>Ориджиналы</span><span>✦</span>
          <span>Свобода творчества</span><span>✦</span>
          <span>Приватность</span><span>✦</span>
          <span>Игры на любой вкус</span><span>✦</span>
        </div>
      </div>

      {/* aha */}
      <section id="aha" className={styles.section}>
        <div className={styles.container}>
          <span className={cx(styles.chapter, styles.r)}>§ 1. Начало</span>
          <h2 className={cx(styles.r, styles.d1)}>Попробуй прямо сейчас</h2>
          <div className={styles.ahaGrid}>
            <div className={cx(styles.ahaItem, styles.r, styles.d2)}>
              <div className={styles.ahaNum}>I.</div>
              <h3>Создай заявку за две минуты</h3>
              <p>Название, теги жанра, уровень контента — и публикуй. Ни анкет, ни сложного кода. Первый отклик может прийти уже сегодня.</p>
            </div>
            <div className={cx(styles.ahaItem, styles.r, styles.d3)}>
              <div className={styles.ahaNum}>II.</div>
              <h3>Откликнись и войди в игру</h3>
              <p>Понравилась заявка в ленте — нажал «Ответить» — выбрал никнейм — написал первый пост. Ваша история только между вами.</p>
            </div>
          </div>
        </div>
      </section>

      {/* benefits */}
      <section id="benefits" className={styles.section}>
        <div className={styles.container}>
          <span className={cx(styles.chapter, styles.r)}>§ 2. Возможности</span>
          <h2 className={cx(styles.r, styles.d1)}>Что ты получишь</h2>
          <div className={styles.benefits}>
            <div className={cx(styles.benefit, styles.r, styles.d1)}>
              <span className={styles.benefitMark}>[ 01 ]</span>
              <h3>Лента заявок с умным фильтром</h3>
              <p>По тегам, жанру, типу игры и уровню контента. Найди именно то, что хочешь сыграть прямо сейчас.</p>
            </div>
            <div className={cx(styles.benefit, styles.r, styles.d2)}>
              <span className={styles.benefitMark}>[ 02 ]</span>
              <h3>Текстовый редактор с оформлением</h3>
              <p>Форматирование, баннер, аватар персонажа прямо внутри диалога. Пост выглядит как история, а не переписка в мессенджере.</p>
            </div>
            <div className={cx(styles.benefit, styles.r, styles.d3)}>
              <span className={styles.benefitMark}>[ 03 ]</span>
              <h3>Анонимность по умолчанию</h3>
              <p>Никнейм — только внутри этой игры. Никакого онлайн-статуса, никакой истории активности, никакой связи с реальным аккаунтом.</p>
            </div>
            <div className={cx(styles.benefit, styles.r, styles.d4)}>
              <span className={styles.benefitMark}>[ 04 ]</span>
              <h3>Никакого гостинга</h3>
              <p>Выйти из игры — только с причиной из списка. Ты всегда узнаешь, что произошло. Партнёр не уйдёт молча.</p>
            </div>
          </div>
        </div>
      </section>

      {/* recognition */}
      <section id="recognition" className={cx(styles.section, styles.bgAlt)}>
        <div className={styles.container}>
          <span className={cx(styles.chapter, styles.r)}>§ 3. Узнаёшь себя?</span>
          <h2 className={cx(styles.r, styles.d1)}>Хочется пространство, где можно быть кем угодно — без оглядки на то, кто ты снаружи?</h2>
          <ul className={styles.triggers}>
            <li className={cx(styles.r, styles.d1)}>Есть шип или сцена, которую хочется отыграть — но ты не готова, чтобы это видел фандом или знакомые?</li>
            <li className={cx(styles.r, styles.d2)}>Нашла идеального соигрока, а потом он просто перестал отвечать?</li>
            <li className={cx(styles.r, styles.d3)}>Устала вести ролевые страницы и думать, как это выглядит со стороны?</li>
            <li className={cx(styles.r, styles.d4)}>Хочется просто — найти человека, написать историю и уйти, когда она закончена?</li>
            <li className={cx(styles.r, styles.d1)}>Раздражает, что в интернете всё на виду?</li>
            <li className={cx(styles.r, styles.d2)}>Есть контент, который ты хочешь исследовать — но не готова рисковать тем, что кто-то узнает?</li>
          </ul>
          <div className={cx(styles.callout, styles.r, styles.d3)}>
            <p>Здесь — лента заявок, анонимность по умолчанию и никнейм, который живёт только внутри одной истории.</p>
          </div>
        </div>
      </section>

      {/* how-to */}
      <section id="howto" className={styles.section}>
        <div className={styles.container}>
          <span className={cx(styles.chapter, styles.r)}>§ 4. Как это работает</span>
          <h2 className={cx(styles.r, styles.d1)}>Как ты решишь свои задачи</h2>

          <div className={cx(styles.scenario, styles.r, styles.d2)}>
            <div className={styles.scenarioHeader}>
              <span className={styles.scenarioN}>/ 01 /</span>
              <h3>Когда хочется сыграть прямо сейчас</h3>
            </div>
            <ul className={styles.steps}>
              <li><span className={styles.stepN}>—</span> Открываешь ленту, фильтруешь по нужным тегам, видишь подходящие заявки</li>
              <li><span className={styles.stepN}>—</span> Нажимаешь «Ответить» — попадаешь в диалог, задаёшь никнейм, начинаешь писать. Меньше минуты.</li>
              <li><span className={styles.stepN}>—</span> Хочешь конкретного человека — отправляешь инвайт-ссылку, и вы сразу в игре</li>
            </ul>
          </div>

          <div className={cx(styles.scenario, styles.r, styles.d2)}>
            <div className={styles.scenarioHeader}>
              <span className={styles.scenarioN}>/ 02 /</span>
              <h3>Когда ищешь долгую совместную историю</h3>
            </div>
            <ul className={styles.steps}>
              <li><span className={styles.stepN}>—</span> Публикуешь заявку с подробным описанием — что хочешь играть, темп, уровень контента</li>
              <li><span className={styles.stepN}>—</span> Добавляешь интересные заявки в закладки, пока ждёшь отклика на свою</li>
              <li><span className={styles.stepN}>—</span> Когда история закончена — экспортируешь диалог и сохраняешь у себя</li>
            </ul>
          </div>

          <div className={cx(styles.scenario, styles.r, styles.d3)}>
            <div className={styles.scenarioHeader}>
              <span className={styles.scenarioN}>/ 03 /</span>
              <h3>Когда пишешь и хочешь красоты</h3>
            </div>
            <ul className={styles.steps}>
              <li><span className={styles.stepN}>—</span> Форматирование в редакторе: курсив, жирный, шрифт, интервалы, смс-игра, кубики, и т.д.</li>
              <li><span className={styles.stepN}>—</span> Аватар персонажа — виден только внутри этой игры, только тебе и соигроку</li>
              <li><span className={styles.stepN}>—</span> Баннер внутри игры для атмосферы</li>
            </ul>
          </div>

          <div className={cx(styles.scenario, styles.r, styles.d4)}>
            <div className={styles.scenarioHeader}>
              <span className={styles.scenarioN}>/ 04 /</span>
              <h3>Когда что-то идёт не так</h3>
            </div>
            <ul className={styles.steps}>
              <li><span className={styles.stepN}>—</span> Соигрок ведёт себя некомфортно — выходишь из игры с причиной из списка. Без объяснений, без конфликта.</li>
              <li><span className={styles.stepN}>—</span> Если ситуация серьёзная — жалоба модераторам. Заявки пользователя, получившего много жалоб, скрываются из ленты.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* destination */}
      <section id="destination" className={cx(styles.section, styles.bgAlt)}>
        <div className={styles.container}>
          <span className={cx(styles.chapter, styles.r)}>§ 5. Результат</span>
          <h2 className={cx(styles.r, styles.d1)}>К чему ты придёшь</h2>
          <div className={styles.destGrid}>
            <div className={cx(styles.destItem, styles.r, styles.d1)}><div className={styles.destNum}>i.</div><p>Соигрок под конкретную историю — без долгого ожидания в пустом чате</p></div>
            <div className={cx(styles.destItem, styles.r, styles.d2)}><div className={styles.destNum}>ii.</div><p>Твои игры — только твоё дело. Никто снаружи не узнает, что ты здесь был</p></div>
            <div className={cx(styles.destItem, styles.r, styles.d3)}><div className={styles.destNum}>iii.</div><p>Пространство, где можно быть кем угодно — и это останется между тобой и соигроком</p></div>
          </div>
          <div className={styles.destGrid} style={{ marginTop: '-1px' }}>
            <div className={cx(styles.destItem, styles.r, styles.d1)}><div className={styles.destNum}>iv.</div><p>Истории, которые до этого оставались только в голове — теперь написаны</p></div>
            <div className={cx(styles.destItem, styles.r, styles.d2)}><div className={styles.destNum}>v.</div><p>Никакого гостинга — партнёр не уйдёт молча</p></div>
            <div className={cx(styles.destItem, styles.r, styles.d3)}><div className={styles.destNum}>vi.</div><p>Быстрый вход — от регистрации до первой заявки меньше десяти минут</p></div>
          </div>
        </div>
      </section>

      {/* doubts */}
      <section id="doubts" className={styles.section}>
        <div className={styles.container}>
          <span className={cx(styles.chapter, styles.r)}>§ 6. Вопросы</span>
          <h2 className={cx(styles.r, styles.d1)}>Есть сомнения?</h2>
          <div className={styles.doubts}>
            <div className={cx(styles.doubt, styles.r, styles.d1)}>
              <p className={styles.doubtQ}>«А вдруг меня вычислят?»</p>
              <p>Никнейм существует только внутри одной игры — снаружи тебя не существует. Нет онлайн-статуса, нет истории активности, нет связи между разными играми. Ни соигроки, ни посторонние не видят, что ты здесь.</p>
            </div>
            <div className={cx(styles.doubt, styles.r, styles.d2)}>
              <p className={styles.doubtQ}>«А вдруг партнёр снова исчезнет по-английски?»</p>
              <p>Выйти из игры можно только выбрав причину из предустановленного списка. Тебя не бросят в пустоте — ты всегда узнаешь, что произошло.</p>
            </div>
            <div className={cx(styles.doubt, styles.r, styles.d3)}>
              <p className={styles.doubtQ}>«А если в ленте никого не будет?»</p>
              <p>Используй инвайт-ссылку — отправь заявку напрямую в фандомный чат или конкретному человеку. Заявка не обязана идти в ленту: можно играть только с теми, кого ты сама позовёшь.</p>
            </div>
          </div>
        </div>
      </section>

      {/* competitors */}
      <section id="competitors" className={cx(styles.section, styles.bgAlt)}>
        <div className={styles.container}>
          <span className={cx(styles.chapter, styles.r)}>§ 7. Сравнение</span>
          <h2 className={cx(styles.r, styles.d1)}>Почему не Discord, ВКонтакте или Telegram</h2>
          <div className={styles.compGrid}>
            <div className={cx(styles.comp, styles.r, styles.d1)}>
              <p className={styles.compName}>Discord <span className={styles.compX}>✕</span></p>
              <p>Твой сервер виден всем участникам сообщества. История сообщений, онлайн-статус, с кем ты играешь — всё доступно тем, кому ты не хочешь это показывать.</p>
            </div>
            <div className={cx(styles.comp, styles.r, styles.d2)}>
              <p className={styles.compName}>ВКонтакте <span className={styles.compX}>✕</span></p>
              <p>Аккаунт привязан к реальной личности. Группы публичны, переписки в сообществах видны подписчикам. Анонимность — только иллюзия.</p>
            </div>
            <div className={cx(styles.comp, styles.r, styles.d3)}>
              <p className={styles.compName}>Telegram <span className={styles.compX}>✕</span></p>
              <p>Личка не анонимна: другой человек знает твой номер или username. Нет ленты заявок, нет способа найти незнакомого соигрока.</p>
            </div>
            <div className={cx(styles.comp, styles.r, styles.d4)}>
              <p className={styles.compName}>Форумы <span className={styles.compX}>✕</span></p>
              <p>Много мороки с анкетами и кодами. Относительная публичность: профили видны всем, история активности не скрыта.</p>
            </div>
          </div>
        </div>
      </section>

      {/* final cta */}
      <section id="final-cta" className={styles.finalCta}>
        <div className={styles.container}>
          <span className={cx(styles.ctaOrnament, styles.r)}>❧</span>
          <h2 className={cx(styles.r, styles.d1)}>Твоя история ждёт соигрока.</h2>
          <p className={cx(styles.r, styles.d2)}>Регистрация без подтверждения. Первая заявка — за две минуты.</p>
          <div className={cx(styles.r, styles.d3)}>
            <Link href="/auth/register" className={cx(styles.btn, styles.btnPrimary)}>Отправить первую заявку →</Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>© 2026 &nbsp;·&nbsp; <em>Апокриф</em> &nbsp;·&nbsp; Анонимные текстовые ролевые игры</footer>
    </div>
  )
}
