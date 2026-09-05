import { FlaskConical } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getEvents } from "@/lib/srs-db";
import {
  GATE_SOURCE,
  isCommitGateEnabled,
  setCommitGateEnabled,
  summarizePilot,
} from "@pf/commit-gate.js";

/** A share as a percentage, or an em dash when there is nothing to divide by. */
const pct = (share) =>
  share === null || share === undefined ? "—" : `${Math.round(share * 100)}%`;

const secs = (value) =>
  value === null || value === undefined ? "—" : `${value.toFixed(1)}s`;

const oneDecimal = (value) =>
  value === null || value === undefined ? "—" : value.toFixed(1);

/**
 * The flag, and the four numbers that decide whether it should stay one.
 *
 * The gate is default-off behind this switch for one instrumented pilot (D12).
 * Making it default-on is not a taste question — it turns on whether learners
 * actually answer it, and how many seconds it costs them when they do. So the
 * switch and the measurement live in the same place, and the readout is shown
 * whether or not the gate is currently on: the numbers from a pilot you have
 * since switched off are still the numbers.
 *
 * Nothing here judges. There is no target and no green tick, because a target
 * set before the data would just be the same guess wearing a number.
 * @param {object} props component props
 * @param {boolean} [props.open] whether the containing dialog is open
 */
const CommitGateSettings = ({ open = true }) => {
  const [enabled, setEnabled] = useState(isCommitGateEnabled);
  const [pilot, setPilot] = useState(null);

  const refresh = useCallback(() => {
    getEvents({ source: GATE_SOURCE })
      .then((events) => setPilot(summarizePilot(events)))
      // No readout is a better outcome than a broken dialog.
      .catch(() => setPilot(null));
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const toggle = (next) => {
    setCommitGateEnabled(next);
    setEnabled(next);
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <FlaskConical className="h-3.5 w-3.5 text-cyan-400" />
            Coached reveal
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Analyze and Best Move ask what you would play before showing the
            answer. The engine searches while you think, so it costs no waiting.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Coached reveal"
          onClick={() => toggle(!enabled)}
          className={`mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${
            enabled
              ? "border-cyan-500/60 bg-cyan-500/40"
              : "border-border bg-secondary"
          }`}
        >
          <span
            className={`block h-3.5 w-3.5 rounded-full bg-foreground transition-transform ${
              enabled ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </button>
      </div>

      {pilot && pilot.queries > 0 && (
        <div className="space-y-1.5 border-t border-border/70 pt-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Pilot so far · {pilot.queries} question
            {pilot.queries === 1 ? "" : "s"}
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Answered</dt>
            <dd className="text-right font-mono">
              {pct(pilot.completionRate)}
            </dd>
            <dt className="text-muted-foreground">Skipped</dt>
            <dd className="text-right font-mono">{pct(pilot.skipRate)}</dd>
            <dt className="text-muted-foreground">Median time to answer</dt>
            <dd className="text-right font-mono">
              {secs(pilot.medianSecondsToCommit)}
            </dd>
            <dt className="text-muted-foreground">Questions per session</dt>
            <dd className="text-right font-mono">
              {oneDecimal(pilot.eventsPerSession)}
            </dd>
            <dt className="text-muted-foreground">
              You matched the engine&rsquo;s move
            </dt>
            <dd className="text-right font-mono">{pct(pilot.accuracy)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
};

export default CommitGateSettings;
