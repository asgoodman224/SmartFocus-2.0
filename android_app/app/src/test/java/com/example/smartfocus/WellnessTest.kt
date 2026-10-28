package com.example.smartfocus

import com.example.smartfocus.data.CheckIn
import com.example.smartfocus.data.CheckInKind
import com.example.smartfocus.data.Wellness
import com.example.smartfocus.data.conditionLabel
import com.example.smartfocus.data.sampleMetrics
import com.example.smartfocus.data.samplePhoneUse
import com.example.smartfocus.data.wellnessOf
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WellnessTest {
    private fun checkIn(mood: Int, energy: Int, focus: Int, sleep: Int? = null) =
        CheckIn(0L, CheckInKind.Anytime, mood, energy, focus, sleep)

    @Test fun noScoreUntilCheckIn() {
        val w = wellnessOf(sampleMetrics, samplePhoneUse, emptyList())
        assertNull(w.mind)
        assertNull(w.score)
        assertEquals(84, w.body) // mean of 90, 82, 78, 85
        assertEquals(71, w.digital) // screen 56, pickups 74, social 83
    }

    @Test fun sampleDayScoresBalanced() {
        val w = wellnessOf(sampleMetrics, samplePhoneUse, listOf(checkIn(4, 4, 4)))
        assertEquals(75, w.mind)
        assertEquals(78, w.score)
        assertEquals("Balanced", conditionLabel(w.score!!))
    }

    @Test fun mindAveragesEveryRatingToday() {
        val w = wellnessOf(sampleMetrics, samplePhoneUse, listOf(checkIn(5, 5, 5, sleep = 1), checkIn(1, 1, 1)))
        // Ratings 5,5,5,1,1,1,1 → 100,100,100,0,0,0,0
        assertEquals(43, w.mind)
    }

    @Test fun heavyPhoneUseBottomsOut() {
        val phone = samplePhoneUse.copy(totalMinutes = 600, pickups = 400)
        val w = wellnessOf(emptyList(), phone, listOf(checkIn(1, 1, 1)))
        assertEquals(0, w.body)
        assertEquals(0, w.digital)
        assertEquals(0, w.score)
    }

    @Test fun weightsAddUp() {
        assertEquals(1.0, Wellness.BodyWeight + Wellness.MindWeight + Wellness.DigitalWeight, 1e-9)
        assertEquals(100, Wellness(100, 100, 100).score)
    }
}
