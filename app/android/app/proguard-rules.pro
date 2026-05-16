# Flutter wrapper — never obfuscate Flutter engine classes
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class io.flutter.embedding.** { *; }

# OkHttp — used internally by some Flutter plugins
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }

# Geolocator plugin
-keep class com.baseflow.geolocator.** { *; }

# Permission handler plugin
-keep class com.baseflow.permissionhandler.** { *; }

# Image picker plugin
-keep class io.flutter.plugins.imagepicker.** { *; }

# Connectivity plus plugin
-keep class dev.fluttercommunity.plus.connectivity.** { *; }

# Share plus plugin
-keep class dev.fluttercommunity.plus.share.** { *; }

# Google Fonts
-keep class com.google.android.gms.** { *; }

# Hive (local storage)
-keep class com.hivedb.** { *; }

# Application classes
-keep class com.example.store_warehouse_app.** { *; }

# Dart/Flutter Dart VM — keep all Dart-generated classes
-keep class **.dart_tool.** { *; }

# Prevent R8 from removing classes used only via reflection
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Suppress warnings for classes that are only present in some configurations
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
