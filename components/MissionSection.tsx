import styles from './MissionSection.module.css'

export default function MissionSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>TODAY&apos;S MISSION</span>
        <h2 className={styles.title}>오늘의 필사</h2>

        <div className={styles.card}>
          <span className={styles.tag}>쿠션어</span>
          <blockquote className={styles.quote}>
            &ldquo;번거로우시겠지만, 한 번만 더 검토해 주시면 감사하겠습니다.&rdquo;
          </blockquote>
          <div className={styles.cardFooter}>
            <button className={styles.startBtn}>필사 시작</button>
            <button className={styles.cameraBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
