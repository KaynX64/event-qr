package org.jci.scanner.ui.directory

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.jci.scanner.data.model.Attendee
import org.jci.scanner.data.repository.AttendeeRepository
import org.jci.scanner.ui.theme.*
import androidx.compose.foundation.border

@Composable
fun DirectoryTab(repository: AttendeeRepository) {
    val attendees by repository.attendees.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") }

    val checkedInCount = attendees.count { it.status == "CHECKED_IN" }

    val filteredList = attendees.filter { attendee ->
        val matchesSearch = attendee.fullName.contains(searchQuery, ignoreCase = true) ||
                attendee.code.contains(searchQuery, ignoreCase = true) ||
                attendee.category.contains(searchQuery, ignoreCase = true)

        val matchesFilter = when (selectedFilter) {
            "CHECKED_IN" -> attendee.status == "CHECKED_IN"
            "PENDING" -> attendee.status != "CHECKED_IN"
            else -> true
        }
        matchesSearch && matchesFilter
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RoyalBlueDeep)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        // 1. KPI Progress Header Card
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = RoyalBlueSurface,
            border = BorderStroke(1.dp, SilverBorder.copy(alpha = 0.5f)),
            modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("GALA ATTENDANCE", color = ImperialGold, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Text("$checkedInCount of ${attendees.size} Guests In", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = SterlingSilver)
                }

                // Mini Percentage Pill
                val percent = if (attendees.isNotEmpty()) (checkedInCount * 100 / attendees.size) else 0
                Surface(
                    color = ImperialGold.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, ImperialGold.copy(alpha = 0.4f))
                ) {
                    Text("$percent%", color = ImperialGoldLight, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
                }
            }
        }

        // 2. Search Input
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search by guest name or code...", color = SilverMuted, fontSize = 13.sp) },
            leadingIcon = { Icon(Icons.Default.Search, null, tint = ImperialGold) },
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = ImperialGold,
                unfocusedBorderColor = SilverBorder,
                focusedContainerColor = RoyalBlueSurface,
                unfocusedContainerColor = RoyalBlueSurface,
                focusedTextColor = SterlingSilver,
                unfocusedTextColor = SterlingSilver
            ),
            modifier = Modifier.fillMaxWidth()
        )

        // 3. Filter Chips
        Row(
            modifier = Modifier.padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = selectedFilter == "ALL",
                onClick = { selectedFilter = "ALL" },
                label = { Text("All (${attendees.size})") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = ImperialGold,
                    selectedLabelColor = RoyalBlueDeep
                )
            )
            FilterChip(
                selected = selectedFilter == "CHECKED_IN",
                onClick = { selectedFilter = "CHECKED_IN" },
                label = { Text("Checked In ($checkedInCount)") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = ImperialGold,
                    selectedLabelColor = RoyalBlueDeep
                )
            )
            FilterChip(
                selected = selectedFilter == "PENDING",
                onClick = { selectedFilter = "PENDING" },
                label = { Text("Pending (${attendees.size - checkedInCount})") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = ImperialGold,
                    selectedLabelColor = RoyalBlueDeep
                )
            )
        }

        // 4. Attendee Cards List
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(filteredList, key = { it.id }) { attendee ->
                AttendeeCard(attendee = attendee, onToggleStatus = { newStatus ->
                    repository.togglePassStatus(attendee, newStatus)
                })
            }
        }
    }
}

@Composable
fun AttendeeCard(attendee: Attendee, onToggleStatus: (String) -> Unit) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = RoyalBlueSurface,
        border = BorderStroke(1.dp, SilverBorder.copy(alpha = 0.35f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                // Initial Badge Avatar with Gold Trim
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .background(RoyalBlueDeep, CircleShape)
                        .border(1.dp, ImperialGold.copy(alpha = 0.5f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        attendee.fullName.take(1).uppercase(),
                        color = ImperialGold,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(attendee.fullName, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = SterlingSilver)
                    Text(attendee.category, color = ImperialGold, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    Text("PASS ID: ${attendee.code}", color = SilverMuted, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                }
            }

            // Quick Status Actions
            if (attendee.status == "CHECKED_IN") {
                // Re-Enable Pass Button
                IconButton(
                    onClick = { onToggleStatus("ACTIVE") },
                    colors = IconButtonDefaults.iconButtonColors(contentColor = ImperialGold)
                ) {
                    Icon(Icons.Default.Replay, contentDescription = "Re-Enable Pass", modifier = Modifier.size(20.dp))
                }
            } else {
                // Manual Check-in Button
                IconButton(
                    onClick = { onToggleStatus("CHECKED_IN") },
                    colors = IconButtonDefaults.iconButtonColors(contentColor = GalaSuccess)
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = "Check-In", modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}