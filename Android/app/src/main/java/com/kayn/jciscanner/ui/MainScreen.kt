package org.jci.scanner.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import org.jci.scanner.data.repository.AttendeeRepository
import org.jci.scanner.ui.directory.DirectoryTab
import org.jci.scanner.ui.scanner.ScannerTab
import org.jci.scanner.ui.status.StatusTab
import org.jci.scanner.ui.theme.*

@Composable
fun MainScreen(repository: AttendeeRepository) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = RoyalBlueDeep,
                contentColor = SterlingSilver
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.QrCodeScanner, null) },
                    label = { Text("Scanner") },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = RoyalBlueSurface,
                        selectedIconColor = ImperialGold,
                        selectedTextColor = ImperialGold,
                        unselectedIconColor = SilverMuted,
                        unselectedTextColor = SilverMuted
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.People, null) },
                    label = { Text("Guests") },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = RoyalBlueSurface,
                        selectedIconColor = ImperialGold,
                        selectedTextColor = ImperialGold,
                        unselectedIconColor = SilverMuted,
                        unselectedTextColor = SilverMuted
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Cloud, null) },
                    label = { Text("Status") },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor = RoyalBlueSurface,
                        selectedIconColor = ImperialGold,
                        selectedTextColor = ImperialGold,
                        unselectedIconColor = SilverMuted,
                        unselectedTextColor = SilverMuted
                    )
                )
            }
        }
    ) { padding ->
        Surface(modifier = Modifier.padding(padding), color = RoyalBlueDeep) {
            when (selectedTab) {
                0 -> ScannerTab(repository)
                1 -> DirectoryTab(repository)
                2 -> StatusTab(repository)
            }
        }
    }
}