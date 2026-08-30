import Link from "next/link";
import {
  FiArrowRight,
  FiBell,
  FiCompass,
  FiHome,
  FiPlusSquare,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import styles from "./landing.module.css";

const campuses = ["Bangalore", "Pune", "Delhi NCR", "Hyderabad"];

const features = [
  {
    title: "Student discovery",
    copy: "Find verified students by campus, year, skills, or interests.",
  },
  {
    title: "A useful feed",
    copy: "Share updates, ideas, opportunities, and the work you are building.",
  },
  {
    title: "Build together",
    copy: "Meet people with complementary skills and turn ideas into projects.",
  },
];

function FeatureVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div
        className={`${styles.featureVisual} ${styles.discoveryVisual}`}
        aria-hidden="true"
      >
        <div className={styles.visualSearch}>
          <FiSearch /> Search students
        </div>
        {["AS", "MK", "RV"].map((initials, itemIndex) => (
          <div className={styles.visualPerson} key={initials}>
            <i>{initials}</i>
            <span>
              <b>{["Aditi Sharma", "Manav Kumar", "Riya Verma"][itemIndex]}</b>
              <small>
                {
                  ["Product design", "Full-stack", "Machine learning"][
                    itemIndex
                  ]
                }
              </small>
            </span>
            <em>View</em>
          </div>
        ))}
      </div>
    );
  }

  if (index === 1) {
    return (
      <div
        className={`${styles.featureVisual} ${styles.feedVisual}`}
        aria-hidden="true"
      >
        <div className={styles.visualPost}>
          <div className={styles.visualPostAuthor}>
            <i>NK</i>
            <span>
              <b>Naina Khurana</b>
              <small>NST Pune · 2h</small>
            </span>
          </div>
          <p>
            Sharing a first look at the project our team has been building this
            semester.
          </p>
          <div className={styles.visualMedia}>
            <span>
              PROJECT
              <br />
              <strong>01</strong>
            </span>
          </div>
          <div className={styles.visualActions}>
            <span>♡ 24</span>
            <span>◯ 7</span>
            <span>↗</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.featureVisual} ${styles.networkVisual}`}
      aria-hidden="true"
    >
      <span className={styles.networkLineA} />
      <span className={styles.networkLineB} />
      <span className={styles.networkLineC} />
      <i className={styles.networkCenter}>PG</i>
      <i className={styles.networkNode}>DA</i>
      <i className={styles.networkNode}>SR</i>
      <i className={styles.networkNode}>AM</i>
      <div>
        <FiUsers />
        <strong>Find your team</strong>
        <small>Skills that fit together</small>
      </div>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className={styles.previewShell} aria-hidden="true">
      <div className={styles.previewWindow}>
        <div className={styles.windowBar}>
          <span className="bg-[#ff605c]" />
          <span className="bg-[#ffbd44]" />
          <span className="bg-[#00ca4e]" />
          <div className={styles.previewSearch}>
            <FiSearch />
            <span>Search PeerGrid</span>
          </div>
          <FiBell className="ml-auto" />
        </div>

        <div className={styles.previewBody}>
          <aside className={styles.previewNav}>
            <span className={styles.previewBrand}>PG</span>
            <FiHome />
            <FiCompass />
            <FiPlusSquare />
            <FiUsers />
          </aside>

          <div className={styles.previewFeed}>
            <div className={styles.previewHeading}>
              <div>
                <span>YOUR NETWORK</span>
                <strong>Good morning, Dhairya</strong>
              </div>
              <button type="button">Create post</button>
            </div>
            <div className={styles.peopleRow}>
              {["AK", "MS", "RS"].map((initials, index) => (
                <div className={styles.personCard} key={initials}>
                  <span className={styles.personAvatar}>{initials}</span>
                  <div>
                    <strong>
                      {["Aarav Kapoor", "Mira Shah", "Rohan Singh"][index]}
                    </strong>
                    <small>
                      {["Design", "Engineering", "Startups"][index]}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.previewColumns}>
              <div className={styles.miniPost}>
                <div className={styles.postAuthor}>
                  <span>NT</span>
                  <div>
                    <strong>Neha Tiwari</strong>
                    <small>NST Bangalore</small>
                  </div>
                </div>
                <p>
                  Looking for a teammate to build an accessibility-first campus
                  app.
                </p>
                <div className={styles.postActions}>
                  <span>♡ 18</span>
                  <span>◯ 4</span>
                </div>
              </div>
              <div className={styles.miniSidebar}>
                <span>People to follow</span>
                {["VD", "SZ", "AM"].map((initials) => (
                  <div key={initials}>
                    <i>{initials}</i>
                    <b />
                    <em>Follow</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="PeerGrid home">
            <span>PG</span>
            <strong>PeerGrid</strong>
          </Link>
        </div>
      </header>

      <section className={styles.hero} id="network">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>The verified NST network</p>
          <h1>
            Find your people.
            <br />
            Build what&apos;s next.
          </h1>
          <p className={styles.intro}>
            Discover verified students across NST campuses. Follow their work,
            share what you are building, and find the right people to build
            with.
          </p>
          <div className={styles.heroActions}>
            <Link href="/auth/signup">
              Join PeerGrid <FiArrowRight />
            </Link>
            <Link href="/auth/login">Sign in</Link>
          </div>
        </div>
        <ProductPreview />
      </section>

      <div className={styles.campusStrip} id="campuses">
        <div>
          {[...campuses, ...campuses].map((campus, index) => (
            <span key={`${campus}-${index}`}>
              NST {campus}
              <i>—</i>
            </span>
          ))}
        </div>
      </div>

      <section className={styles.features} id="about">
        {features.map((feature, index) => (
          <article className={styles.feature} key={feature.title}>
            <FeatureVisual index={index} />
            <h2>{feature.title}</h2>
            <p>{feature.copy}</p>
          </article>
        ))}
      </section>

      <section className={styles.proof}>
        <p className={styles.eyebrow}>One network. Four campuses.</p>
        <h2>
          Meet students already
          <br />
          building what&apos;s next.
        </h2>
        <div className={styles.avatarStack} aria-hidden="true">
          {["DA", "AS", "NK", "RM", "SK"].map((initials) => (
            <span key={initials}>{initials}</span>
          ))}
        </div>
        <p className={styles.proofCopy}>
          Manually verified NST student profiles only.
        </p>
        <div className={styles.liveStatus}>
          <i /> Live across 4 campuses
        </div>
      </section>

      <section className={styles.cta}>
        <h2>Build what&apos;s next.</h2>
        <p>
          Create your profile and start meeting peers across the NST network.
        </p>
        <Link href="/auth/signup">
          Join PeerGrid <FiArrowRight />
        </Link>
      </section>

      <footer className={styles.footer}>
        <div>
          <span>© 2026 PeerGrid. Built for NST.</span>
          <span>Verified students. Useful connections.</span>
        </div>
      </footer>
    </main>
  );
}
