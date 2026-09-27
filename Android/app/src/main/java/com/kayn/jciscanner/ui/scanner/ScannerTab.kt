package com.kayn.jciscanner.ui.scanner

import android.content.Context
import android.hardware.camera2.CameraManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kayn.jciscanner.data.model.ScanResult
import com.kayn.jciscanner.data.repository.AttendeeRepository
import com.kayn.jciscanner.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScannerTab(repository: AttendeeRepository) {
    val context = LocalContext.current
    var scanResult by remember { mutableStateOf<ScanResult?>(null) }
    var isFlashOn by remember { mutableStateOf(false) }

    // Scanner is active ONLY when no popup is displayed
    val isScanningEnabled = scanResult == null

    Box(modifier = Modifier.fillMaxSize()) {
        // 1. Camera Viewport
        CameraPreview(
            isScanningEnabled = isScanningEnabled,
            onQrCodeScanned = { rawPayload ->
                if (scanResult == null) {
                    val result = repository.processScan(rawPayload)
                    scanResult = result
                    triggerHapticFeedback(context, result)
                }
            }
        )

        // 2. High-Tech Gold Viewfinder Reticle
        Box(
            modifier = Modifier
                .size(270.dp)
                .align(Alignment.Center)
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val cornerLength = 36.dp.toPx()
                val strokeWidth = 4.dp.toPx()
                val gold = Color(0xFFD4AF37)

                // Top-Left Corner
                drawLine(gold, Offset(0f, 0f), Offset(cornerLength, 0f), strokeWidth, StrokeCap.Round)
                drawLine(gold, Offset(0f, 0f), Offset(0f, cornerLength), strokeWidth, StrokeCap.Round)

                // Top-Right Corner
                drawLine(gold, Offset(size.width, 0f), Offset(size.width - cornerLength, 0f), strokeWidth, StrokeCap.Round)
                drawLine(gold, Offset(size.width, 0f), Offset(size.width, cornerLength), strokeWidth, StrokeCap.Round)

                // Bottom-Left Corner
                drawLine(gold, Offset(0f, size.height), Offset(cornerLength, size.height), strokeWidth, StrokeCap.Round)
                drawLine(gold, Offset(0f, size.height), Offset(0f, size.height - cornerLength), strokeWidth, StrokeCap.Round)

                // Bottom-Right Corner
                drawLine(gold, Offset(size.width, size.height), Offset(size.width - cornerLength, size.height), strokeWidth, StrokeCap.Round)
                drawLine(gold, Offset(size.width, size.height), Offset(size.width, size.height - cornerLength), strokeWidth, StrokeCap.Round)
            }
        }

        // 3. Top Action Header (Status + Flashlight Toggle)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 40.dp, start = 20.dp, end = 20.dp)
                .align(Alignment.TopCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Instruction Pill
            Surface(
                color = RoyalBlueDeep.copy(alpha = 0.85f),
                shape = RoundedCornerShape(24.dp),
                border = BorderStroke(1.dp, ImperialGold.copy(alpha = 0.4f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.size(7.dp).background(if (isScanningEnabled) ImperialGold else Color.Gray, CircleShape))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isScanningEnabled) "ALIGN QR IN BOX" else "SCANNER PAUSED",
                        color = SterlingSilver,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }
            }

            // Torch Button
            IconButton(
                onClick = {
                    isFlashOn = !isFlashOn
                    toggleTorch(context, isFlashOn)
                },
                modifier = Modifier
                    .size(44.dp)
                    .background(RoyalBlueDeep.copy(alpha = 0.85f), CircleShape)
                    .border(1.dp, if (isFlashOn) ImperialGold else SilverBorder, CircleShape)
            ) {
                Icon(
                    imageVector = if (isFlashOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                    contentDescription = "Toggle Torch",
                    tint = if (isFlashOn) ImperialGold else SterlingSilver
                )
            }
        }

        // 4. Luxury Check-In Bottom Sheet
        scanResult?.let { result ->
            ModalBottomSheet(
                onDismissRequest = { scanResult = null },
                containerColor = RoyalBlueDeep,
                dragHandle = {
                    Box(
                        modifier = Modifier
                            .padding(top = 12.dp)
                            .size(36.dp, 4.dp)
                            .background(ImperialGold.copy(alpha = 0.5f), RoundedCornerShape(2.dp))
                    )
                }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    when (result) {
                        is ScanResult.Success -> {
                            Surface(
                                color = ImperialGold.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, ImperialGold.copy(alpha = 0.4f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Shield, null, tint = ImperialGold, modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("INVITED GUEST", color = ImperialGoldLight, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))
                            Text(result.attendee.fullName, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = SterlingSilver)
                            Text("ACCESS CODE: ${result.attendee.code}", color = SilverMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 2.dp))

                            Spacer(modifier = Modifier.height(18.dp))

                            Surface(
                                color = GalaSuccessContainer,
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(1.dp, GalaSuccess.copy(alpha = 0.5f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Icon(Icons.Default.CheckCircle, null, tint = GalaSuccess, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("CHECKED IN SUCCESSFULLY", color = GalaSuccess, fontWeight = FontWeight.Bold, fontSize = 13.sp, letterSpacing = 0.5.sp)
                                }
                            }
                        }

                        is ScanResult.AlreadyCheckedIn -> {
                            Surface(
                                color = GalaErrorContainer,
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(1.dp, GalaError.copy(alpha = 0.5f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.Error, null, tint = GalaError, modifier = Modifier.size(36.dp))
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text("ALREADY USED", color = GalaError, fontWeight = FontWeight.Bold, fontSize = 15.sp, letterSpacing = 1.sp)
                                    Text(result.attendee.fullName, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SterlingSilver, modifier = Modifier.padding(top = 4.dp))
                                    Text("First checked in at: ${result.attendee.checkedInAt ?: "Earlier"}", color = SilverMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
                                }
                            }
                        }

                        is ScanResult.Revoked -> {
                            Text("CREDENTIAL REVOKED", color = GalaError, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(result.attendee.fullName, fontSize = 18.sp, color = SterlingSilver)
                        }

                        is ScanResult.NotFound -> {
                            Text("INVALID PASS", color = GalaError, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text("QR Code not recognized in registry", color = SilverMuted, fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Re-arms the scanner when clicked!
                    Button(
                        onClick = { scanResult = null },
                        colors = ButtonDefaults.buttonColors(containerColor = ImperialGold, contentColor = RoyalBlueDeep),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth().height(50.dp)
                    ) {
                        Text("READY FOR NEXT GUEST", fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

private fun toggleTorch(context: Context, state: Boolean) {
    try {
        val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val cameraId = cameraManager.cameraIdList[0]
        cameraManager.setTorchMode(cameraId, state)
    } catch (_: Exception) {}
}

private fun triggerHapticFeedback(context: Context, result: ScanResult) {
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        manager.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }

    if (result is ScanResult.Success) {
        vibrator.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE))
    } else {
        val timings = longArrayOf(0, 120, 80, 180)
        vibrator.vibrate(VibrationEffect.createWaveform(timings, -1))
    }
}