package com.bankbasha.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    
    // File Upload Variables
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoPath: String? = null

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        // Handle permissions granted/rejected
    }

    // Activity Result for File Choosing
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (fileUploadCallback == null) return@registerForActivityResult

        val data = result.data
        var results: Array<Uri>? = null

        if (result.resultCode == RESULT_OK) {
            if (data == null || data.data == null) {
                // If data is null, it might be the camera intent
                if (cameraPhotoPath != null) {
                     results = arrayOf(Uri.parse(cameraPhotoPath))
                }
            } else {
                val dataString = data.dataString
                if (dataString != null) {
                    results = arrayOf(Uri.parse(dataString))
                }
            }
        }

        fileUploadCallback?.onReceiveValue(results)
        fileUploadCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)

        setupWebView()
        setupSwipeRefresh()
        checkPermissions()
        
        // Load initial URL
        val startUrl = "https://bankbasha.com" // Update to your domain
        webView.loadUrl(startUrl)
        
        // Handle Deep Links
        handleDeepLink(intent)

        // Create Notification Channel for Android 8.0+
        createNotificationChannel()

        // Get FCM token and inject into WebView after page loads
        getFcmTokenAndRegister()
    }

    private fun getFcmTokenAndRegister() {
        com.google.firebase.messaging.FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w("FCM", "Fetching FCM registration token failed", task.exception)
                return@addOnCompleteListener
            }
            val token = task.result
            Log.d("FCM", "FCM Token: $token")
            
            // Store token to inject later when page is loaded
            fcmToken = token
        }
    }

    private var fcmToken: String? = null

    // JavaScript Interface to allow WebView to get the FCM token
    inner class WebAppInterface {
        @android.webkit.JavascriptInterface
        fun getFcmToken(): String {
            return fcmToken ?: ""
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = getString(R.string.default_notification_channel_id)
            val name = "General Notifications"
            val descriptionText = "Important updates from Bank Basha"
            val importance = android.app.NotificationManager.IMPORTANCE_HIGH
            val channel = android.app.NotificationChannel(channelId, name, importance).apply {
                description = descriptionText
                enableLights(true)
                enableVibration(true)
            }
            val notificationManager: android.app.NotificationManager =
                getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null && (data.host == "bankbasha.com" || data.host == "www.bankbasha.com")) {
            webView.loadUrl(data.toString())
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        
        // Zoom settings
        settings.builtInZoomControls = true
        settings.displayZoomControls = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // User Agent
        settings.userAgentString = settings.userAgentString + " BankBashaApp/1.0"

        // Cookie Settings for Persistent Session
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true)
        }

        // Add JavaScript Interface for FCM token access
        webView.addJavascriptInterface(WebAppInterface(), "AndroidApp")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                
                // Keep internal links in WebView
                if (url.contains("bankbasha.com")) {
                    return false
                }
                
                // Open external links (Whatsapp, Facebook, etc.) in external browser/apps
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    return true
                } catch (e: Exception) {
                    return false
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                swipeRefresh.isRefreshing = false
                // Force sync cookies to disk
                CookieManager.getInstance().flush()
                
                // Inject FCM token registration script
                val token = fcmToken
                if (token != null && url?.contains("bankbasha.com") == true) {
                    val jsCode = """
                        (function() {
                            var token = '$token';
                            if (token && token !== '') {
                                fetch('/api/user/fcm-token', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ token: token }),
                                    credentials: 'include'
                                }).then(function(response) {
                                    console.log('FCM token registered:', response.status);
                                }).catch(function(error) {
                                    console.log('FCM token registration failed:', error);
                                });
                            }
                        })();
                    """.trimIndent()
                    view?.evaluateJavascript(jsCode, null)
                }
                
                super.onPageFinished(view, url)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // For Android 5.0+
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                if (fileUploadCallback != null) {
                    fileUploadCallback?.onReceiveValue(null)
                }
                fileUploadCallback = filePathCallback

                // Create Camera Intent
                val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                if (takePictureIntent.resolveActivity(packageManager) != null) {
                    // Create the File where the photo should go
                    var photoFile: File? = null
                    try {
                        photoFile = createImageFile()
                    } catch (ex: IOException) {
                        Log.e("WebView", "Error creating file", ex)
                    }
                    
                    if (photoFile != null) {
                        cameraPhotoPath = "file:" + photoFile.absolutePath
                        val photoURI: Uri = FileProvider.getUriForFile(
                            this@MainActivity,
                            "${applicationContext.packageName}.provider",
                            photoFile
                        )
                        takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI)
                    } else {
                        takePictureIntent.action = "" // Disable camera if file creation fails
                    }
                }

                // Create Content Selection Intent
                val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT)
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE)
                contentSelectionIntent.type = "*/*"

                val intentArray: Array<Intent?> = if (takePictureIntent.action != "") {
                    arrayOf(takePictureIntent)
                } else {
                    arrayOfNulls(0)
                }

                val chooserIntent = Intent(Intent.ACTION_CHOOSER)
                chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
                chooserIntent.putExtra(Intent.EXTRA_TITLE, "Select Action")
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray)

                fileChooserLauncher.launch(chooserIntent)
                return true
            }

            // Grant permissions for camera usage from web (WebRTC)
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        // Download Listener
        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
            val request = DownloadManager.Request(Uri.parse(url))
            request.setMimeType(mimetype)
            request.addRequestHeader("cookie", CookieManager.getInstance().getCookie(url))
            request.addRequestHeader("User-Agent", userAgent)
            request.setDescription("Downloading file...")
            request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimetype))
            request.allowScanningByMediaScanner()
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, URLUtil.guessFileName(url, contentDisposition, mimetype))
            
            val dm = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(request)
            Toast.makeText(applicationContext, "Downloading File...", Toast.LENGTH_LONG).show()
        }
    }

    private fun setupSwipeRefresh() {
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }
    }

    @Throws(IOException::class)
    private fun createImageFile(): File {
        // Create an image file name
        val timeStamp: String = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val storageDir: File? = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile(
            "JPEG_${timeStamp}_", /* prefix */
            ".jpg", /* suffix */
            storageDir /* directory */
        )
    }

    private fun checkPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val permissions = arrayOf(
                Manifest.permission.CAMERA,
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            )
            
            val neededPermissions = permissions.filter {
                ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
            }
            
            if (neededPermissions.isNotEmpty()) {
                requestPermissionLauncher.launch(neededPermissions.toTypedArray())
            }
        }
        
        // For Android 13+ Notification Permission
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionLauncher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
            }
        }
    }

    override fun onPause() {
        super.onPause()
        // Ensure cookies are flushed when app goes to background
        CookieManager.getInstance().flush()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
