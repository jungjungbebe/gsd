import styles from './HeroCardGrid.module.css'

export default function HeroCardGrid() {
  return (
    <div className={styles.grid}>
      <div className={`${styles.card} ${styles.cardToday}`}>
        <div className={styles.cardBg} />
        <span className={styles.cardEyebrow}>TODAY</span>
        <h3 className={styles.cardTitle}>
          오늘의<br />필사 미션
        </h3>
      </div>
      <div className={`${styles.card} ${styles.cardCuration}`}>
        <div className={styles.cardBg} />
        <span className={styles.cardEyebrow}>CURATION</span>
        <h3 className={styles.cardTitle}>
          필사하기<br />좋은 곳
        </h3>
      </div>
    </div>
  )
}
