package com.smartvisitor

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class SaveImageModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SaveImageModule"
    }

    @ReactMethod
    fun saveBase64Image(base64Data: String, fileName: String, promise: Promise) {
        try {
            val cleanBase64 = if (base64Data.contains(",")) {
                base64Data.substringAfter(",")
            } else {
                base64Data
            }
            val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val finalFileName = if (fileName.endsWith(".png", ignoreCase = true)) fileName else "$fileName.png"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+) MediaStore Downloads directory
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, finalFileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SmartVisitor")
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }

                val resolver = reactContext.contentResolver
                var uri: Uri? = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)

                // Fallback to Images media if Downloads URI is unavailable
                if (uri == null) {
                    contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/SmartVisitor")
                    uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                }

                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { outputStream ->
                        outputStream.write(imageBytes)
                        outputStream.flush()
                    }

                    contentValues.clear()
                    contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                    resolver.update(uri, contentValues, null, null)

                    promise.resolve("Downloads/SmartVisitor/$finalFileName")
                } else {
                    promise.reject("SAVE_FAILED", "Failed to create file in device storage")
                }
            } else {
                // Older Android fallback
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val targetDir = File(downloadsDir, "SmartVisitor")
                if (!targetDir.exists()) {
                    targetDir.mkdirs()
                }
                val targetFile = File(targetDir, finalFileName)
                FileOutputStream(targetFile).use { fos ->
                    fos.write(imageBytes)
                    fos.flush()
                }
                promise.resolve(targetFile.absolutePath)
            }
        } catch (e: Exception) {
            promise.reject("SAVE_ERROR", e.message, e)
        }
    }
}
