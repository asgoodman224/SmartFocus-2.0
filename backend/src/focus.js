/**
 * Focus score: a 0–100 summary of how fragmented a day's phone use was.
 *
 * PLACEHOLDER FORMULA. It is deliberately simple and transparent so it can be
 * replaced once there is real data to calibrate against. Every place that
 * needs a score calls `focusScore`, so changing it here changes it everywhere.
 *
 * Three parts, each scaled 0–1 and weighted:
 *   - Pickups (40):        fewer is better; 0 pickups → full marks, 150+ → none.
 *   - Notifications (20):  fewer is better; 0 → full marks, 300+ → none.
 *   - Longest focus (40):  the longest stretch without unlocking the phone;
 *                          90+ minutes → full marks.
 */

const PICKUPS = { weight: 40, ceiling: 150 };
const NOTIFICATIONS = { weight: 20, ceiling: 300 };
const LONGEST_FOCUS = { weight: 40, targetMinutes: 90 };

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function focusScore({ pickups, notifications, longestFocusMinutes }) {
  const score =
    PICKUPS.weight * clamp01(1 - pickups / PICKUPS.ceiling) +
    NOTIFICATIONS.weight * clamp01(1 - notifications / NOTIFICATIONS.ceiling) +
    LONGEST_FOCUS.weight * clamp01(longestFocusMinutes / LONGEST_FOCUS.targetMinutes);
  return Math.round(score);
}

module.exports = { focusScore };
