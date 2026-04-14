import styles from './HeroSection.module.css'

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.bgGrid} />
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />
      <div className={styles.bgNoise} />

      <div className={styles.content}>
        <span className={styles.eyebrow}>FOR YOUNG PROFESSIONALS</span>
        <h1 className={styles.headline}>
          말이 달라지면,<br />
          일이 달라진다
        </h1>
        <p className={styles.sub}>비즈니스 한국어, 하루 5분이면 충분합니다.</p>
      </div>

      <div className={styles.loginBanner}>
        <div>
          <p className={styles.loginGreet}>안녕하세요</p>
          <p className={styles.loginSub}>
            <span className={styles.loginLink}>로그인</span>하고 시작하세요
          </p>
        </div>
        <div className={styles.levelBadge}>Lv. —</div>
      </div>
    </section>
  )
}
