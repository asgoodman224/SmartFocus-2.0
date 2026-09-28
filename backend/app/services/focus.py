"""Focus score: a 0–100 summary of how fragmented a day's phone use was.

PLACEHOLDER FORMULA. It is deliberately simple and transparent so it can be
replaced once there is real data to calibrate against. Every place that needs
a score calls `focus_score`, so changing it here changes it everywhere.

Three parts, each scaled 0–1 and weighted:
  - Pickups (40):        fewer is better; 0 pickups → full marks, 150+ → none.
  - Notifications (20):  fewer is better; 0 → full marks, 300+ → none.
  - Longest focus (40):  the longest stretch without unlocking the phone;
                         90+ minutes → full marks.
"""

PICKUPS_WEIGHT = 40
PICKUPS_CEILING = 150

NOTIFICATIONS_WEIGHT = 20
NOTIFICATIONS_CEILING = 300

LONGEST_FOCUS_WEIGHT = 40
LONGEST_FOCUS_TARGET_MINUTES = 90


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def focus_score(*, pickups: int, notifications: int, longest_focus_minutes: int) -> int:
    score = (
        PICKUPS_WEIGHT * _clamp01(1 - pickups / PICKUPS_CEILING)
        + NOTIFICATIONS_WEIGHT * _clamp01(1 - notifications / NOTIFICATIONS_CEILING)
        + LONGEST_FOCUS_WEIGHT * _clamp01(longest_focus_minutes / LONGEST_FOCUS_TARGET_MINUTES)
    )
    return round(score)
