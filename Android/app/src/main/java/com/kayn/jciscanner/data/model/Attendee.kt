package org.jci.scanner.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Attendee(
    val id: String,
    val code: String,
    @SerialName("qr_payload") val qrPayload: String,
    @SerialName("full_name") val fullName: String,
    val category: String = "DELEGATE",
    var status: String = "ACTIVE", // ACTIVE, CLAIMED, CHECKED_IN, REVOKED
    @SerialName("claimed_at") val claimedAt: String? = null,
    @SerialName("checked_in_at") var checkedInAt: String? = null
)

sealed class ScanResult {
    data class Success(val attendee: Attendee) : ScanResult()
    data class AlreadyCheckedIn(val attendee: Attendee) : ScanResult()
    data class Revoked(val attendee: Attendee) : ScanResult()
    data class NotFound(val rawPayload: String) : ScanResult()
}