package org.jci.scanner.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// The Imperial Gala Theme (Anchored strictly to Royal Blue, Gold & Silver)
private val GalaColorScheme = darkColorScheme(
    primary = ImperialGold,
    onPrimary = RoyalBlueDeep,
    primaryContainer = RoyalBlueSurface,
    onPrimaryContainer = ImperialGoldLight,
    secondary = SterlingSilver,
    onSecondary = RoyalBlueDeep,
    background = RoyalBlueDeep,
    surface = RoyalBlueSurface,
    onSurface = SterlingSilver,
    surfaceVariant = RoyalBlueContainer,
    onSurfaceVariant = SilverMuted,
    outline = SilverBorder
)

@Composable
fun JCIScannerTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = RoyalBlueDeep.toArgb()
            window.navigationBarColor = RoyalBlueDeep.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = GalaColorScheme,
        content = content
    )
}