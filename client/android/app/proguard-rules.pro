# Add project specific ProGuard rules here.

# Keep JSBridge
-keep class com.autoquote.app.bridge.** { *; }
-keepclassmembers class com.autoquote.app.bridge.** {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView
-keepclassmembers class * extends android.webkit.WebView {
    public *;
}

