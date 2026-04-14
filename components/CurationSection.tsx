import styles from './CurationSection.module.css'

const PLACES = [
  {
    num: '01',
    name: '을지로 충무빌딩 2층 카페',
    tag: '집중형',
    mood: '조용한 오피스 감성',
    desc: '넓은 테이블과 콘센트가 넉넉한 을지로 카페. 점심 이후 한적한 시간대에 필사하기 좋습니다.',
  },
  {
    num: '02',
    name: '성수 대림창고 독서 라운지',
    tag: '감성형',
    mood: '인더스트리얼 무드',
    desc: '리노베이션된 창고 공간의 독서 라운지. 높은 천장 아래 긴 테이블에서 몰입감 있게 필사할 수 있어요.',
  },
  {
    num: '03',
    name: '합정 카페 보헤미안',
    tag: '여유형',
    mood: '빈티지 & 조용함',
    desc: '합정역 근처 오래된 건물에 자리한 카페. 고요한 분위기에서 천천히 글씨 연습하기 좋은 공간입니다.',
  },
]

export default function CurationSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>WHERE TO PILSA</span>
        <h2 className={styles.title}>필사하기 좋은 곳</h2>
        <p className={styles.desc}>집중과 영감을 동시에 얻는 공간</p>

        <div className={styles.list}>
          {PLACES.map((place) => (
            <div key={place.num} className={styles.item}>
              <span className={styles.num}>{place.num}</span>
              <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemName}>{place.name}</span>
                  <span className={styles.itemTag}>{place.tag}</span>
                </div>
                <span className={styles.itemMood}>{place.mood}</span>
                <p className={styles.itemDesc}>{place.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
