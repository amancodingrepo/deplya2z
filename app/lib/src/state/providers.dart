import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/local_store.dart';
import '../data/mock_api.dart';
import 'app_controller.dart';
import 'app_state.dart';

final localStoreProvider = Provider<LocalStore>((ref) => LocalStore());
final mockApiProvider = Provider<MockApi>((ref) => MockApi());

final appControllerProvider = StateNotifierProvider<AppController, AppState>((
  ref,
) {
  final controller = AppController(
    ref.read(localStoreProvider),
    ref.read(mockApiProvider),
  );
  return controller;
});
