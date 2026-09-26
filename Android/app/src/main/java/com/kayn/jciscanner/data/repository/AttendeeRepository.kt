package org.jci.scanner.data.repository

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.jci.scanner.data.model.Attendee
import org.jci.scanner.data.model.ScanResult
import org.jci.scanner.data.remote.SupabaseApi
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

class AttendeeRepository(private val api: SupabaseApi = SupabaseApi()) {

    // Thread-safe In-Memory Cache for ZERO-LATENCY (<1ms) scanning
    private val localCache = ConcurrentHashMap<String, Attendee>()

    private val _attendees = MutableStateFlow<List<Attendee>>(emptyList())
    val attendees: StateFlow<List<Attendee>> = _attendees.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _lastLatencyMs = MutableStateFlow<Long>(-1)
    val lastLatencyMs: StateFlow<Long> = _lastLatencyMs.asStateFlow()

    private val scope = CoroutineScope(Dispatchers.IO)

    init {
        syncFromCloud()
    }

    /**
     * Download the latest guest list from Supabase
     */
    fun syncFromCloud(onComplete: ((Boolean) -> Unit)? = null) {
        scope.launch {
            _isSyncing.value = true
            val latency = api.pingServer()
            _lastLatencyMs.value = latency

            val result = api.fetchAllAttendees()
            result.onSuccess { list ->
                localCache.clear()
                list.forEach { attendee ->
                    localCache[attendee.qrPayload] = attendee
                }
                _attendees.value = list
                onComplete?.invoke(true)
            }.onFailure {
                onComplete?.invoke(false)
            }
            _isSyncing.value = false
        }
    }

    /**
     * ZERO-DELAY VALIDATION (<1ms):
     * Evaluates local in-memory cache instantly, then syncs to Supabase in the background
     */
    fun processScan(rawPayload: String): ScanResult {
        val attendee = localCache[rawPayload] ?: return ScanResult.NotFound(rawPayload)

        return when (attendee.status) {
            "CHECKED_IN" -> ScanResult.AlreadyCheckedIn(attendee)
            "REVOKED" -> ScanResult.Revoked(attendee)
            else -> {
                // INSTANT STATE MUTATION (Local 0ms flip)
                val nowTime = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date())
                attendee.status = "CHECKED_IN"
                attendee.checkedInAt = nowTime

                // Update UI state flow
                _attendees.value = localCache.values.toList()

                // Background fire-and-forget sync to Supabase
                scope.launch {
                    api.updateCheckInStatus(attendee.qrPayload, "CHECKED_IN")
                }

                ScanResult.Success(attendee)
            }
        }
    }

    /**
     * Re-enable a pass (Admin manual toggle)
     */
    fun togglePassStatus(attendee: Attendee, newStatus: String) {
        attendee.status = newStatus
        if (newStatus == "ACTIVE") {
            attendee.checkedInAt = null
        }
        _attendees.value = localCache.values.toList()

        scope.launch {
            api.updateCheckInStatus(attendee.qrPayload, newStatus)
        }
    }
}