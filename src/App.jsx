import { useEffect, useState } from "react";
import styles from "./App.module.css";
import SiteHeader from "./components/siteHeader";
import SiteFooter from "./components/siteFooter";
import BackToTop from "./components/backToTop";
import FitnessProgressDashboard from "./components/fitnessProgressDashboard";

const repository = "https://github.com/a2rp/fitness-progress-dashboard";
const App = () => {
    const [showBackToTop, setShowBackToTop] = useState(false);
    useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 50);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return <div className={styles["app-shell"]} id="top">
        <SiteHeader title="Milepost" mark="M" navItems={[["Overview", "#overview"], ["Activity", "#activity"], ["Log a session", "#add"]]} repoUrl={repository} />
        <main className={styles.pageContent}><FitnessProgressDashboard /></main>
        <SiteFooter repoUrl={repository} />
        <BackToTop visible={showBackToTop} />
    </div>;
};
export default App;