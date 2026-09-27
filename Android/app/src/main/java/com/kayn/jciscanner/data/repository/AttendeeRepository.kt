package com.kayn.jciscanner.data.repository

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import com.kayn.jciscanner.data.model.Attendee
import com.kayn.jciscanner.data.model.ScanResult
import com.kayn.jciscanner.data.remote.SupabaseApi
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
        // Starts the 5-second automatic background sync
        startPeriodicSync()
    }

    private fun startPeriodicSync() {
        scope.launch {
            // Initial sync
            syncFromCloud()

            // Continuous loop every 5 seconds
            while (isActive) {
                delay(5000L)
                syncFromCloud()
            }
        }
    }

    /**
     * Download latest guest list from Supabase
     */
    fun syncFromCloud(onComplete: ((Boolean) -> Unit)? = null) {
        scope.launch {
            _isSyncing.value = true
            val latency = api.pingServer()
            _lastLatencyMs.value = latency

            val result = api.fetchAllAttendees()
            result.onSuccess { list ->
                list.forEach { attendee ->
                    val existing = localCache[attendee.qrPayload]
                    // Race condition guard: Don't let older cloud read override a local check-in
                    if (existing?.status == "CHECKED_IN" && attendee.status != "CHECKED_IN") {
                        // Keep local checked-in state
                    } else {
                        localCache[attendee.qrPayload] = attendee
                    }
                }
                _attendees.value = localCache.values.toList().sortedBy { it.fullName }
                onComplete?.invoke(true)
            }.onFailure {
                onComplete?.invoke(false)
            }
            _isSyncing.value = false
        }
    }

    /**
     * ZERO-DELAY VALIDATION (<1ms)
     */
    fun processScan(rawPayload: String): ScanResult {
        val attendee = localCache[rawPayload] ?: return ScanResult.NotFound(rawPayload)

        return when (attendee.status) {
            "CHECKED_IN" -> ScanResult.AlreadyCheckedIn(attendee)
            "REVOKED" -> ScanResult.Revoked(attendee)
            else -> {
                val nowTime = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date())
                attendee.status = "CHECKED_IN"
                attendee.checkedInAt = nowTime

                _attendees.value = localCache.values.toList().sortedBy { it.fullName }

                // Fire background update to Supabase
                scope.launch {
                    api.updateCheckInStatus(attendee.qrPayload, "CHECKED_IN")
                }

                ScanResult.Success(attendee)
            }
        }
    }

    /**
     * Re-enable pass (Admin manual toggle)
     */
    fun togglePassStatus(attendee: Attendee, newStatus: String) {
        attendee.status = newStatus
        if (newStatus == "ACTIVE") {
            attendee.checkedInAt = null
        }
        _attendees.value = localCache.values.toList().sortedBy { it.fullName }

        scope.launch {
            api.updateCheckInStatus(attendee.qrPayload, newStatus)
        }
    }
}