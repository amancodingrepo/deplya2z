import 'package:flutter/foundation.dart';

class AppLogger {
  const AppLogger._();

  static void info(String message, [Map<String, Object?> context = const {}]) {
    _write('INFO', message, context);
  }

  static void warning(
    String message, [
    Map<String, Object?> context = const {},
  ]) {
    _write('WARN', message, context);
  }

  static void error(
    String message, {
    Object? error,
    StackTrace? stackTrace,
    Map<String, Object?> context = const {},
  }) {
    _write('ERROR', message, {
      ...context,
      if (error != null) 'error': error,
    });
    if (stackTrace != null && kDebugMode) {
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  static void _write(
    String level,
    String message,
    Map<String, Object?> context,
  ) {
    final timestamp = DateTime.now().toIso8601String();
    final fields = context.entries
        .where((entry) => entry.value != null)
        .map((entry) => '${entry.key}=${entry.value}')
        .join(' ');
    debugPrint(
      fields.isEmpty
          ? '[$timestamp] [$level] $message'
          : '[$timestamp] [$level] $message $fields',
    );
  }
}
