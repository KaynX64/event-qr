package org.jci.scanner.data.remote

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.jci.scanner.data.model.Attendee
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

class SupabaseApi {
    private val baseUrl = "https://xwluratinqcvyqmfuuoa.supabase.co/rest/v1"
    private val anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bHVyYXRpbnFjdnlxbWZ1dW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDQ1NTcsImV4cCI6MjEwNTkyMDU1N30.ND-NhlMi_DBo7osQCwAMJGsGsG1t42QL-Eg7830b05Q"

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    private val json = Json { 
        ignoreUnknownKeys = true 
        isLenient = true
    }

    /**
     * Download entire attendee directory for 0ms offline memory caching
     */
    suspend fun fetchAllAttendees(): Result<List<Attendee>> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/attendees?select=*&order=full_name.asc")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code}"))
                }
                val body = response.body?.string().orEmpty()
                val list = json.decodeFromString<List<Attendee>>(body)
                Result.success(list)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Update check-in status on Supabase
     */
    suspend fun updateCheckInStatus(qrPayload: String, status: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val nowUtc = isoFormat.format(Date())

            val payloadJson = buildJsonObject {
                put("status", status)
                put("checked_in_at", if (status == "CHECKED_IN") nowUtc else null)
            }.toString()

            val requestBody = payloadJson.toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("$baseUrl/attendees?qr_payload=eq.${qrPayload}")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .addHeader("Prefer", "return=minimal")
                .patch(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) Result.success(true)
                else Result.failure(Exception("HTTP ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Ping Supabase to test real-time latency (for Tab 3: System Status)
     */
    suspend fun pingServer(): Long = withContext(Dispatchers.IO) {
        val start = System.currentTimeMillis()
        try {
            val request = Request.Builder()
                .url("$baseUrl/attendees?select=id&limit=1")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .head()
                .build()

            client.newCall(request).execute().use {
                if (it.isSuccessful) System.currentTimeMillis() - start else -1L
            }
        } catch (e: Exception) {
            -1L
        }
    }
}