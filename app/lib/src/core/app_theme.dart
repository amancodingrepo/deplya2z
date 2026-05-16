import 'package:flutter/material.dart';

/// SupplyOS light theme — matches design-tokens.md
class AppTheme {
  AppTheme._();

  // ─── Brand / Primary ───────────────────────────────────────────
  static const Color primary = Color(0xFF3B82F6);
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color primaryBg = Color(0xFFEFF6FF);

  // ─── Status Colors ─────────────────────────────────────────────
  static const Color amber = Color(0xFFF59E0B);
  static const Color amberBg = Color(0xFFFFFBEB);
  static const Color green = Color(0xFF10B981);
  static const Color red = Color(0xFFEF4444);
  static const Color purple = Color(0xFF8B5CF6);

  // ─── Slate Scale ───────────────────────────────────────────────
  static const Color s900 = Color(0xFF0F172A);
  static const Color s800 = Color(0xFF1E293B);
  static const Color s500 = Color(0xFF64748B);
  static const Color s200 = Color(0xFFE2E8F0);
  static const Color s50 = Color(0xFFF8FAFC);
  static const Color white = Color(0xFFFFFFFF);

  // ─── Backward-compat aliases ───────────────────────────────────
  static const Color accent = primary;
  static const Color primaryLight = Color(0xFF93C5FD); // blue-300
  static const Color accentAlt = red;

  static const Color bgDark = s50;
  static const Color bgCard = white;
  static const Color bgCardLight = Color(0xFFF1F5F9); // slate-100
  static const Color surface = primaryBg;
  static const Color surfaceLight = s200;

  static const Color textPrimary = s900;
  static const Color textSecondary = s800;
  static const Color textMuted = s500;

  static const Color success = green;
  static const Color warning = amber;
  static const Color error = red;
  static const Color info = primary;

  // ─── Gradients ─────────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [white, Color(0xFFF8FAFC)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [primary, purple],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ─── Radii ─────────────────────────────────────────────────────
  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusXl = 20;

  // ─── Spacing ───────────────────────────────────────────────────
  static const double spaceSm = 8;
  static const double spaceMd = 16;
  static const double spaceLg = 24;
  static const double spaceXl = 32;

  // ─── Shadows (design: 0 1px 3px rgba(0,0,0,0.07)) ─────────────
  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.07),
      blurRadius: 3,
      offset: const Offset(0, 1),
    ),
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.04),
      blurRadius: 2,
      offset: const Offset(0, 1),
    ),
  ];

  static List<BoxShadow> get glowShadow => [
    BoxShadow(
      color: primary.withValues(alpha: 0.25),
      blurRadius: 16,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get bottomSheetShadow => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.07),
      blurRadius: 12,
      offset: const Offset(0, -4),
    ),
  ];

  // ─── ThemeData ────────────────────────────────────────────────
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: s50,
    colorScheme: const ColorScheme.light(
      primary: primary,
      secondary: amber,
      surface: white,
      error: red,
    ),
    fontFamily: 'DM Sans',
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w800,
        color: s900,
        letterSpacing: -0.5,
        fontFamily: 'Sora',
      ),
      headlineMedium: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: s900,
        letterSpacing: -0.3,
        fontFamily: 'Sora',
      ),
      headlineSmall: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: s900,
        fontFamily: 'Sora',
      ),
      titleLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: s900,
      ),
      titleMedium: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: s900,
      ),
      bodyLarge: TextStyle(fontSize: 15, color: s900),
      bodyMedium: TextStyle(fontSize: 13, color: s800),
      bodySmall: TextStyle(fontSize: 11, color: s500),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: s900,
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: white,
      elevation: 0,
      scrolledUnderElevation: 1,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: s900,
        letterSpacing: -0.3,
        fontFamily: 'Sora',
      ),
      iconTheme: IconThemeData(color: s800),
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: CardThemeData(
      color: white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusMd),
      ),
      shadowColor: Colors.black12,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: bgCardLight,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMd),
        borderSide: const BorderSide(color: s200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMd),
        borderSide: const BorderSide(color: s200, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMd),
        borderSide: const BorderSide(color: primary, width: 1.5),
      ),
      labelStyle: const TextStyle(color: s500, fontSize: 14),
      hintStyle: const TextStyle(color: s500, fontSize: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
        textStyle: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
        elevation: 0,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
        textStyle: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: white,
      selectedItemColor: primary,
      unselectedItemColor: s500,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
    dividerTheme: const DividerThemeData(color: s200, thickness: 1),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: s800,
      contentTextStyle: const TextStyle(color: white),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusMd),
      ),
      behavior: SnackBarBehavior.floating,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: s50,
      selectedColor: primaryBg,
      labelStyle: const TextStyle(fontSize: 13, color: s800),
      side: const BorderSide(color: s200),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: primary,
      foregroundColor: white,
    ),
  );

  // Keep darkTheme alias so existing references compile
  static ThemeData get darkTheme => lightTheme;
}
