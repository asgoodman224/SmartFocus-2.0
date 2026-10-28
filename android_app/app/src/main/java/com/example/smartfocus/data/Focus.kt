package com.example.smartfocus.data

import kotlin.math.roundToInt

/**
 * Focus score, 0–100: how fragmented a day's phone use was. Same placeholder formula as the
 * backend's `src/focus.js`, so the phone and server agree:
 * - Pickups (40): fewer is better; 0 → full marks, 150+ → none.
 * - Notifications (20): fewer is better; 0 → full marks, 300+ → none.
 * - Longest break (40): the longest stretch without unlocking; 90+ minutes → full marks.
 */
fun focusScore(pickups: Int, notifications: Int, longestBreakMinutes: Int): Int {
    fun clamp(v: Double) = v.coerceIn(0.0, 1.0)
    return (
        40 * clamp(1 - pickups / 150.0) +
            20 * clamp(1 - notifications / 300.0) +
            40 * clamp(longestBreakMinutes / 90.0)
        ).roundToInt()
}
