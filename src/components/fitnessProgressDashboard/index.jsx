import { useEffect, useMemo, useState } from "react";
import { FiActivity, FiCalendar, FiClock, FiDownload, FiPlus, FiTarget, FiTrash2, FiTrendingUp } from "react-icons/fi";
import ConfirmDialog from "../confirmDialog";
import styles from "./styles.module.css";

const storageKey = "milepost-sessions";
const goalKey = "milepost-weekly-goal";
const dateAt = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};
const moveDate = (value, offset) => {
    const date = new Date(value + "T12:00:00");
    date.setDate(date.getDate() + offset);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};
const samples = [
    { id: 1, name: "Full body strength", category: "Strength", date: dateAt(0), minutes: 48, effort: "Moderate", note: "Steady tempo" },
    { id: 2, name: "Easy neighborhood run", category: "Run", date: dateAt(-1), minutes: 32, effort: "Easy", note: "Kept it conversational" },
    { id: 3, name: "Mobility reset", category: "Mobility", date: dateAt(-2), minutes: 20, effort: "Easy", note: "Hips and shoulders" },
    { id: 4, name: "Upper body", category: "Strength", date: dateAt(-4), minutes: 42, effort: "Hard", note: "Added a set to rows" },
    { id: 5, name: "Weekend cycle", category: "Cycle", date: dateAt(-5), minutes: 55, effort: "Moderate", note: "River path" },
    { id: 6, name: "Long walk", category: "Walk", date: dateAt(-6), minutes: 38, effort: "Easy", note: "Fresh air" },
];
const categories = ["Strength", "Run", "Cycle", "Walk", "Mobility", "Other"];
const readSessions = () => {
    try { const value = localStorage.getItem(storageKey); return value ? JSON.parse(value) : samples; }
    catch { return samples; }
};
const readGoal = () => {
    const value = Number(localStorage.getItem(goalKey));
    return Number.isFinite(value) && value > 0 ? value : 180;
};
const FitnessProgressDashboard = () => {
    const [sessions, setSessions] = useState(readSessions);
    const [weeklyGoal, setWeeklyGoal] = useState(readGoal);
    const [today] = useState(() => dateAt(0));
    const [period, setPeriod] = useState("7");
    const [filter, setFilter] = useState("All activities");
    const [draft, setDraft] = useState({ name: "", category: "Strength", date: dateAt(0), minutes: "45", effort: "Moderate", note: "" });
    const [pendingDelete, setPendingDelete] = useState(null);
    useEffect(() => localStorage.setItem(storageKey, JSON.stringify(sessions)), [sessions]);
    useEffect(() => localStorage.setItem(goalKey, String(weeklyGoal)), [weeklyGoal]);

    const days = Number(period);
    const visible = useMemo(() => sessions
        .filter((item) => {
            const age = Math.floor((new Date(today + "T12:00:00").getTime() - new Date(item.date + "T12:00:00").getTime()) / 86400000);
            return age >= 0 && age < days;
        })
        .filter((item) => filter === "All activities" || item.category === filter)
        .sort((a, b) => b.date.localeCompare(a.date)), [sessions, days, filter, today]);
    const periodMinutes = visible.reduce((sum, item) => sum + Number(item.minutes), 0);
    const periodDays = new Set(visible.map((item) => item.date)).size;
    const averageMinutes = visible.length ? Math.round(periodMinutes / visible.length) : 0;
    const weekStart = moveDate(today, -((new Date(today + "T12:00:00").getDay() + 6) % 7));
    const weekMinutes = sessions.filter((item) => item.date >= weekStart && item.date <= today).reduce((sum, item) => sum + Number(item.minutes), 0);
    const goalProgress = Math.min(100, weekMinutes / weeklyGoal * 100);
    const chart = period === "7"
        ? Array.from({ length: 7 }, (_, index) => {
            const date = moveDate(today, index - 6);
            return { key: date, label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(date + "T12:00:00")), minutes: sessions.filter((item) => item.date === date).reduce((sum, item) => sum + Number(item.minutes), 0) };
        })
        : Array.from({ length: 4 }, (_, index) => {
            const start = 29 - index * 7;
            const end = index === 3 ? -1 : start - 7;
            return { key: index, label: "Week " + (4 - index), minutes: sessions.filter((item) => { const ago = Math.floor((new Date(today + "T12:00:00").getTime() - new Date(item.date + "T12:00:00").getTime()) / 86400000); return ago <= start && ago > end; }).reduce((sum, item) => sum + Number(item.minutes), 0) };
        });
    const chartMax = Math.max(30, ...chart.map((item) => item.minutes));

    const addSession = (event) => {
        event.preventDefault();
        if (!draft.name.trim() || Number(draft.minutes) <= 0) return;
        setSessions((current) => [{ ...draft, id: Date.now(), name: draft.name.trim(), minutes: Number(draft.minutes), note: draft.note.trim() }, ...current]);
        setDraft({ name: "", category: "Strength", date: dateAt(0), minutes: "45", effort: "Moderate", note: "" });
    };
    const removeSession = () => {
        setSessions((current) => current.filter((item) => item.id !== pendingDelete.id));
        setPendingDelete(null);
    };
    const exportCsv = () => {
        const rows = [["Date", "Activity", "Category", "Minutes", "Effort", "Note"], ...sessions.map((item) => [item.date, item.name, item.category, item.minutes, item.effort, item.note])];
        const csvCell = (value) => {
            const text = String(value ?? "");
            const safeText = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? "'" + text : text;
            return '"' + safeText.replaceAll('"', '""') + '"';
        };
        const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "milepost-activity.csv";
        link.hidden = true;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return <section className={styles.fitnessDashboard} id="overview">
        <div className={styles.hero}><div><p className={styles.context}>YOUR TRAINING, IN PERSPECTIVE</p><h1>Progress is built<br /><span>one session at a time.</span></h1><p className={styles.description}>Notice your rhythm. Keep showing up for what feels good.</p></div><div className={styles.weekCard}><div className={styles.weekRing} style={{ "--progress": goalProgress + "%" }}><span>{Math.round(goalProgress)}<small>%</small></span></div><div><span>THIS WEEK</span><strong>{weekMinutes}<small> / {weeklyGoal} min</small></strong><p>{weekMinutes >= weeklyGoal ? "Weekly target reached" : weeklyGoal - weekMinutes + " minutes to your goal"}</p></div></div></div>

        <div className={styles.stats}>
            <article className={styles.primaryStat}><span><FiClock aria-hidden="true" /> Training time</span><strong>{periodMinutes}<small> min</small></strong><p>in the last {days} days</p></article>
            <article><span><FiActivity aria-hidden="true" /> Sessions</span><strong>{visible.length}</strong><p>logged in this period</p></article>
            <article><span><FiCalendar aria-hidden="true" /> Active days</span><strong>{periodDays}</strong><p>days with movement</p></article>
            <article><span><FiTrendingUp aria-hidden="true" /> Session average</span><strong>{averageMinutes}<small> min</small></strong><p>per logged session</p></article>
        </div>

        <div className={styles.dashboardGrid}>
            <section className={styles.chartCard} aria-labelledby="chart-title">
                <div className={styles.cardHeading}><div><h2 id="chart-title">Your movement</h2><p>Minutes of activity over time</p></div><div className={styles.periodSwitch} role="group" aria-label="Chart range">{[["7", "7 days"], ["30", "30 days"]].map(([value, label]) => <button type="button" key={value} className={period === value ? styles.selectedPeriod : ""} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}</div></div>
                <div className={styles.chart} role="img" aria-label={(period === "7" ? "Daily" : "Weekly") + " workout minutes: " + chart.map((item) => item.label + " " + item.minutes).join(", ")}>
                    <div className={styles.axis}>{[180, 120, 60, 0].map((value) => <span key={value}>{value}</span>)}</div>
                    <div className={styles.chartPlot + (period === "30" ? " " + styles.monthChart : "")}>{chart.map((item, index) => <div className={styles.barGroup} key={item.key}><div className={styles.barSlot}><i className={index === chart.length - 1 ? styles.currentBar : ""} style={{ height: Math.max(4, item.minutes / chartMax * 100) + "%" }} title={item.minutes + " minutes"} /></div><span>{item.label}</span></div>)}</div>
                </div>
                <div className={styles.chartFoot}><span><i /> Activity minutes</span><span>Keep a pace you can repeat</span></div>
            </section>

            <aside className={styles.goalPanel}><div className={styles.goalHeading}><span><FiTarget aria-hidden="true" /></span><div><h2>Weekly rhythm</h2><p>A target you can adjust</p></div></div><div className={styles.goalNumber}><strong>{weekMinutes}</strong><span>minutes this week</span></div><div className={styles.goalTrack}><i style={{ width: goalProgress + "%" }} /></div><div className={styles.goalFooter}><span>{Math.round(goalProgress)}% complete</span><label>Weekly goal<input type="number" min="30" step="15" value={weeklyGoal} onChange={(event) => setWeeklyGoal(Math.max(30, Number(event.target.value) || 30))} aria-label="Weekly activity goal in minutes" /></label></div><div className={styles.encouragement}><span>✦</span><p>{visible.length >= 3 ? "Consistency is adding up. Your logged sessions are building a strong routine." : "Every session counts. Add a little movement and let the pattern build."}</p></div></aside>
        </div>

        <section className={styles.activityCard} id="activity">
            <div className={styles.activityHeading}><div><h2>Activity log</h2><p>Recent sessions from your selected period</p></div><div className={styles.activityTools}><select aria-label="Filter sessions by activity" value={filter} onChange={(event) => setFilter(event.target.value)}><option>All activities</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><button type="button" onClick={exportCsv} disabled={sessions.length === 0}><FiDownload aria-hidden="true" /> Export CSV</button></div></div>
            <div className={styles.sessionList}>{visible.slice(0, 5).map((item) => <article className={styles.sessionRow} key={item.id}><span className={styles.dateBadge}><strong>{new Date(item.date + "T12:00:00").getDate()}</strong><small>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(item.date + "T12:00:00"))}</small></span><div className={styles.sessionName}><strong>{item.name}</strong><small>{item.category}{item.note ? " · " + item.note : ""}</small></div><span className={styles.effort}>{item.effort}</span><strong className={styles.minutes}>{item.minutes}<small> min</small></strong><button type="button" className={styles.deleteButton} aria-label={"Delete " + item.name} onClick={() => setPendingDelete(item)}><FiTrash2 aria-hidden="true" /></button></article>)}{visible.length === 0 && <p className={styles.empty}>No sessions in this view. Add one below to start your log.</p>}</div>
            {visible.length > 5 && <p className={styles.moreNote}>Showing the latest 5 of {visible.length} sessions. Export CSV for the complete log.</p>}
        </section>

        <form className={styles.addForm} id="add" onSubmit={addSession}><div className={styles.formHeading}><span><FiPlus aria-hidden="true" /></span><div><h2>Log a session</h2><p>Record the work you did, at your own pace.</p></div></div>
            <label>Activity name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Evening walk" /></label>
            <label>Type<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Date<input type="date" max={dateAt(0)} value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label>
            <label>Minutes<input type="number" min="1" max="1440" value={draft.minutes} onChange={(event) => setDraft({ ...draft, minutes: event.target.value })} required /></label>
            <label>Effort<select value={draft.effort} onChange={(event) => setDraft({ ...draft, effort: event.target.value })}><option>Easy</option><option>Moderate</option><option>Hard</option></select></label>
            <label>Note<input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Optional" /></label>
            <button type="submit">Save session <FiPlus aria-hidden="true" /></button>
        </form>
        {pendingDelete && <ConfirmDialog title="Remove this session?" description={'"' + pendingDelete.name + '" will be removed from your activity history.'} confirmLabel="Remove session" onCancel={() => setPendingDelete(null)} onConfirm={removeSession} />}
    </section>;
};

export default FitnessProgressDashboard;
