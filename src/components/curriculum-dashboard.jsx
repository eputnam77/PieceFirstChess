import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Gauge,
  Lock,
  Play,
  Target,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CURRICULUM, PF_STEPS, TIERS } from "@/data/curriculum";
import { getItemStatus, getPositionsForItem } from "@/lib/curriculum";
import { isDue } from "@/lib/srs";
import useSrsStore from "@/store/use-srs-store";
import { displayBand } from "@pf/band";
import { lockMap } from "@pf/locks.js";

/**
 * The Mastery Dashboard — the curriculum's table of contents, with your state on it.
 *
 * `docs/PF7/LEARNING-SYSTEM.md` §3.6: "Bounded curricula are motivating only if
 * the bound is visible." That is the whole job of this screen. Ninety-nine items,
 * all of them on one page, each showing whether it is new, being learned, young
 * or mature — so "how far in am I?" has an answer at a glance rather than a
 * feeling.
 *
 * It is also the way into any single item, which matters because a schedule you
 * cannot override is a schedule you end up fighting. That is the same reason
 * the locks added here are informational only: every row stays drillable, and
 * the padlock reports what the *scheduler* will offer, never what the learner
 * is allowed to open (PRD §81.1).
 */

/** How each learning state is shown. Order matters: it is the progress bar. */
const STATUSES = [
  {
    key: "mature",
    label: "Mature",
    dot: "bg-emerald-400",
    bar: "bg-emerald-500",
    text: "text-emerald-300",
  },
  {
    key: "young",
    label: "Young",
    dot: "bg-cyan-400",
    bar: "bg-cyan-500",
    text: "text-cyan-300",
  },
  {
    key: "learning",
    label: "Learning",
    dot: "bg-orange-400",
    bar: "bg-orange-500",
    text: "text-orange-300",
  },
  {
    key: "new",
    label: "Not started",
    dot: "bg-muted-foreground/40",
    bar: "bg-muted",
    text: "text-muted-foreground",
  },
];

const STATUS_BY_KEY = Object.fromEntries(
  STATUSES.map((status) => [status.key, status]),
);

const FILTERS = [
  { key: "all", label: "All" },
  { key: "due", label: "Due now" },
  { key: "open", label: "Open now" },
  { key: "locked", label: "Locked" },
  { key: "started", label: "In progress" },
  { key: "new", label: "Not started" },
];

/** Tiers 0–2 are where the rating actually moves, so they open by default. */
const INITIALLY_OPEN = new Set(["0", "1", "2"]);

/**
 * One row of the table of contents.
 *
 * A locked row differs from an open one in exactly two ways: a padlock beside
 * the id, and a sentence naming the key (PRD §81.2). It is **not** dimmed and
 * its Drill button is **not** disabled — §81.1 makes that non-negotiable, and a
 * lock the learner cannot override is the thing that gets the whole curriculum
 * resented within a week. The lock says what the scheduler will offer, nothing
 * more.
 * @param {object} props component props
 * @param {object} props.item a curriculum item
 * @param {object|null} props.card its SRS card, if any
 * @param {object|null} props.lock its lock, from `lockFor`, or null when open
 * @param {number} props.now timestamp used for due checks
 * @param {Function} props.onDrill called with the item id to study it now
 */
const ItemRow = ({ item, card, lock, now, onDrill }) => {
  const status = STATUS_BY_KEY[getItemStatus(card)];
  const positions = getPositionsForItem(item.id).length;
  const due = card !== null && isDue(card, now);

  return (
    <li className="flex items-center gap-3 rounded-md border border-border/50 px-2.5 py-2 hover:border-border transition">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`}
        title={status.label}
      />
      <span className="font-mono text-[11px] text-muted-foreground w-16 shrink-0 flex items-center gap-1">
        {lock && (
          <Lock
            className="w-2.5 h-2.5 shrink-0 text-muted-foreground/70"
            aria-label="Locked"
          />
        )}
        {item.id}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-foreground truncate">
          {item.title}
        </span>
        <span className="block text-[11px] text-muted-foreground truncate">
          {item.pfStep} · {positions} drill{positions === 1 ? "" : "s"}
          {due && <span className="text-primary"> · due now</span>}
        </span>
        {lock && (
          <span className="block text-[11px] text-muted-foreground/80 mt-0.5">
            {lock.sentence}
          </span>
        )}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDrill(item.id)}
        disabled={positions === 0}
        aria-label={`Drill ${item.title}`}
        title={
          lock
            ? "Locked items are still yours to drill — the lock only decides what the schedule offers"
            : `Drill ${item.title}`
        }
      >
        <Play className="w-3.5 h-3.5" />
      </Button>
    </li>
  );
};

/**
 * The dashboard overlay.
 * @param {object} props component props
 * @param {Function} props.onClose called when the overlay should close
 * @param {Function} props.onDrillItem called with an item id to open a drill
 * @param {Function} props.onStartSession called to start the scheduled session
 * @param {number} props.now timestamp used for every due check on this screen,
 *   captured when the dashboard was opened so no two rows disagree about it
 */
export default function CurriculumDashboard({
  onClose,
  onDrillItem,
  onStartSession,
  now,
}) {
  const { bands, cards, getStats, getWeakSteps } = useSrsStore();
  const [openTiers, setOpenTiers] = useState(INITIALLY_OPEN);
  const [filter, setFilter] = useState("all");

  const stats = getStats();
  const weakSteps = getWeakSteps();

  const dueCount = useMemo(
    () =>
      Object.values(cards).filter(
        (card) =>
          isDue(card, now) && getPositionsForItem(card.itemId).length > 0,
      ).length,
    [cards, now],
  );

  // One pass for all ninety-nine rows rather than one query per row.
  const { locks, openCount } = useMemo(() => lockMap(cards), [cards]);

  // Steps whose staircase has enough reps behind it to mean anything. It is
  // "puzzle difficulty", never a rating: a Lichess rating is how hard a
  // position is for the population, not how strong this learner is (D4, D15).
  const difficulties = useMemo(
    () =>
      Object.entries(bands ?? {})
        .map(([step, state]) => [step, displayBand(state)])
        .filter(([, band]) => band !== null)
        .sort((a, b) => b[1] - a[1]),
    [bands],
  );

  const matches = useCallback(
    (item) => {
      const card = cards[item.id] ?? null;
      switch (filter) {
        case "due": {
          return card !== null && isDue(card, now);
        }
        case "open": {
          return !locks.has(item.id);
        }
        case "locked": {
          return locks.has(item.id);
        }
        case "started": {
          return card !== null;
        }
        case "new": {
          return card === null;
        }
        default: {
          return true;
        }
      }
    },
    [cards, filter, locks, now],
  );

  const toggleTier = useCallback((tier) => {
    setOpenTiers((open) => {
      const next = new Set(open);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }, []);

  const { total } = stats;
  const done = total.total - total.new;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[94vh]">
        <div className="flex items-start justify-between p-4 border-b border-border shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> The Curriculum
            </p>
            <h2 className="text-base font-semibold text-foreground mt-0.5">
              {done} of {total.total} items started
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total.mature} mature · {total.young} young · {total.learning}{" "}
              learning · {openCount} open now
              {dueCount > 0 && (
                <span className="text-primary"> · {dueCount} due now</span>
              )}
            </p>
            {/* The other half of D16: Study is the queue, this is the map. */}
            <p className="text-xs text-muted-foreground mt-0.5">
              The map and your progress — every item, and where you stand on it.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close the curriculum"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-4 py-3 border-b border-border shrink-0 space-y-3">
          {/* The bound, made visible: the whole curriculum as one bar. */}
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            {STATUSES.map((status) =>
              total[status.key] > 0 ? (
                <div
                  key={status.key}
                  className={status.bar}
                  style={{
                    width: `${(total[status.key] / total.total) * 100}%`,
                  }}
                  title={`${total[status.key]} ${status.label}`}
                />
              ) : null,
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {STATUSES.map((status) => (
              <span
                key={status.key}
                className="flex items-center gap-1.5 text-muted-foreground"
              >
                <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                {status.label} {total[status.key]}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={onStartSession}>
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {dueCount > 0 ? `Study ${dueCount} due` : "Start a session"}
            </Button>
            <div className="flex gap-1">
              {FILTERS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={`text-[11px] rounded px-2 py-1 border transition ${
                    filter === option.key
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {difficulties.length > 0 && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Gauge className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
              <span>
                Puzzle difficulty you are solving at:{" "}
                {difficulties
                  .map(([step, band]) => `${step} around ${band}`)
                  .join(" · ")}
                . That is how hard the positions are, not a chess rating.
              </span>
            </p>
          )}

          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Lock className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground/70" />
            <span>
              A padlock means the schedule will not offer it yet, and names what
              opens it. Anything here can still be drilled now — press play.
            </span>
          </p>

          {weakSteps.length > 0 && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Target className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
              <span>
                From your own games, your weakest step is{" "}
                <strong className="text-foreground">{weakSteps[0]}</strong> —{" "}
                {PF_STEPS[weakSteps[0]]}. Items on that step get pulled forward.
              </span>
            </p>
          )}
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {Object.entries(TIERS).map(([tier, meta]) => {
            const items = CURRICULUM.filter(
              (item) => String(item.tier) === tier,
            );
            const shown = items.filter(matches);
            const tierStats = stats.tiers[tier];
            const open = openTiers.has(tier);

            return (
              <section key={tier}>
                <button
                  type="button"
                  onClick={() => toggleTier(tier)}
                  className="w-full flex items-center gap-2 text-left group"
                >
                  {open ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    Tier {tier} · {meta.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {tierStats.total - tierStats.new}/{tierStats.total}
                  </span>
                </button>
                <p className="text-[11px] text-muted-foreground/80 ml-6 mt-0.5">
                  {meta.description}
                </p>

                {open && (
                  <ul className="mt-2 ml-6 space-y-1">
                    {shown.length === 0 ? (
                      <li className="text-[11px] text-muted-foreground/70 py-1">
                        Nothing here matches that filter.
                      </li>
                    ) : (
                      shown.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          card={cards[item.id] ?? null}
                          lock={locks.get(item.id) ?? null}
                          now={now}
                          onDrill={onDrillItem}
                        />
                      ))
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
