package expo.modules.emmadownloads

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

// FIX-049: the Client app saves an invoice into the phone's Descargas
// (Download) folder. From Android 10 MediaStore lets an app add its own file
// there with no permission and no picker; on Android 9 and older saveAsync
// answers false and the app falls back to the folder picker.
class EmmaDownloadsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("EmmaDownloads")

    AsyncFunction("saveAsync") { fileUri: String, fileName: String, mediaType: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return@AsyncFunction false
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val source = File(Uri.parse(fileUri).path ?: throw IllegalArgumentException("fileUri"))
      val resolver = context.contentResolver
      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
        put(MediaStore.MediaColumns.MIME_TYPE, mediaType)
        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
        put(MediaStore.MediaColumns.IS_PENDING, 1)
      }
      val target = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
        ?: throw IllegalStateException("downloads_insert_failed")
      try {
        resolver.openOutputStream(target)?.use { output ->
          source.inputStream().use { input -> input.copyTo(output) }
        } ?: throw IllegalStateException("downloads_open_failed")
        resolver.update(
          target,
          ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) },
          null,
          null,
        )
      } catch (error: Exception) {
        resolver.delete(target, null, null)
        throw error
      }
      true
    }
  }
}
