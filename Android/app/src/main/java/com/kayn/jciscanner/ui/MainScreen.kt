package com.kayn.jciscanner.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.kayn.jciscanner.data.repository.AttendeeRepository
import com.kayn.jciscanner.ui.directory.DirectoryTab
import com.kayn.jciscanner.ui.scanner.ScannerTab
import com.kayn.jciscanner.ui.status.StatusTab
import com.kayn.jciscanner.ui.theme.*

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