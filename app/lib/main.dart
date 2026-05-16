import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'src/app.dart';
import 'src/core/app_logger.dart';
import 'src/state/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    AppLogger.error(
      'Flutter framework error',
      error: details.exception,
      stackTrace: details.stack,
    );
  };
  PlatformDispatcher.instance.onError = (error, stackTrace) {
    AppLogger.error(
      'Uncaught platform error',
      error: error,
      stackTrace: stackTrace,
    );
    return true;
  };

  AppLogger.info('App starting', {
    'mode': kReleaseMode ? 'release' : 'debug',
  });

  final container = ProviderContainer();
  await container.read(appControllerProvider.notifier).initialize();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const StoreWarehouseApp(),
    ),
  );
}
