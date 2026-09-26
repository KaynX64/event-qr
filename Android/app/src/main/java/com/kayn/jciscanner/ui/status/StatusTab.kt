package org.jci.scanner.ui.status

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.jci.scanner.data.repository.AttendeeRepository
import org.jci.scanner.ui.theme.*

@Composable
fun StatusTab(repository: AttendeeRepository) {
    val attendees by repository.attendees.collectAsState()
    val isSyncing by repository.isSyncing.collectAsState()
    val latencyMs by repository.lastLatencyMs.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RoyalBlueDeep)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("SYSTEM TELEMETRY", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = ImperialGold, letterSpacing = 2.sp)

        // 1. Latency Card
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = RoyalBlueSurface,
            border = BorderStroke(1.dp, SilverBorder.copy(alpha = 0.4f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(modifier = Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Speed,
                    null,
                    tint = if (latencyMs in 1..400) ImperialGold else GalaError,
                    modifier = Modifier.size(36.dp)
                )
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text("Supabase Cloud Ping", fontWeight = FontWeight.Bold, color = SterlingSilver, fontSize = 14.sp)
                    Text(
                        if (latencyMs >= 0) "$latencyMs ms • Operational" else "Disconnected",
                        color = if (latencyMs in 1..400) GalaSuccess else GalaError,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp
                    )
                }
            }
        }

        // 2. Cache Telemetry Card
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = RoyalBlueSurface,
            border = BorderStroke(1.dp, SilverBorder.copy(alpha = 0.4f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(modifier = Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CloudDone, null, tint = ImperialGold, modifier = Modifier.size(36.dp))
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text("In-Memory Local Cache", fontWeight = FontWeight.Bold, color = SterlingSilver, fontSize = 14.sp)
                    Text("${attendees.size} Passes Pre-loaded for 0ms Scans", color = SilverMuted, fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // 3. Force Sync Action Button
        Button(
            onClick = { repository.syncFromCloud() },
            enabled = !isSyncing,
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = ImperialGold, contentColor = RoyalBlueDeep),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            if (isSyncing) {
                CircularProgressIndicator(color = RoyalBlueDeep, modifier = Modifier.size(20.dp))
            } else {
                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("FORCE SYNC WITH CLOUD", fontWeight = FontWeight.Bold, letterSpacing = 1.sp, fontSize = 12.sp)
            }
        }
    }
}