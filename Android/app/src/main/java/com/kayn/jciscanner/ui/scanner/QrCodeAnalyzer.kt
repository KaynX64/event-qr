package com.kayn.jciscanner.ui.scanner

import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage

class QrCodeAnalyzer(
    private val isScanningEnabled: () -> Boolean,
    private val onQrCodeDetected: (String) -> Unit
) : ImageAnalysis.Analyzer {

    private val scanner = BarcodeScanning.getClient()

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        // 1. If scanner is locked/paused (bottom sheet is open), skip frame immediately
        if (!isScanningEnabled()) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val rotation = imageProxy.imageInfo.rotationDegrees
            val inputImage = InputImage.fromMediaImage(mediaImage, rotation)

            // Calculate oriented sensor dimensions
            val imgWidth = if (rotation == 90 || rotation == 270) mediaImage.height else mediaImage.width
            val imgHeight = if (rotation == 90 || rotation == 270) mediaImage.width else mediaImage.height

            // 2. Viewfinder Target Box Boundaries (Center ~55% of the camera frame)
            val roiLeft = imgWidth * 0.22f
            val roiRight = imgWidth * 0.78f
            val roiTop = imgHeight * 0.25f
            val roiBottom = imgHeight * 0.75f

            scanner.process(inputImage)
                .addOnSuccessListener { barcodes ->
                    if (!isScanningEnabled()) return@addOnSuccessListener

                    for (barcode in barcodes) {
                        if (barcode.format == Barcode.FORMAT_QR_CODE) {
                            val box = barcode.boundingBox ?: continue
                            val centerX = box.centerX().toFloat()
                            val centerY = box.centerY().toFloat()

                            // 3. ONLY trigger if QR center is physically inside the gold viewfinder reticle!
                            if (centerX in roiLeft..roiRight && centerY in roiTop..roiBottom) {
                                barcode.rawValue?.let { code ->
                                    onQrCodeDetected(code)
                                    return@addOnSuccessListener
                                }
                            }
                        }
                    }
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }
}