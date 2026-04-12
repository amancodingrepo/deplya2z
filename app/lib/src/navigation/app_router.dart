import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/models.dart';
import '../state/providers.dart';
import '../ui/inventory_screen.dart';
import '../ui/login_screen.dart';
import '../ui/store_screen.dart';
import '../ui/warehouse_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final appState = ref.watch(appControllerProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final loggedIn = appState.session != null;
      final goingToLogin = state.matchedLocation == '/login';

      if (!loggedIn) {
        return goingToLogin ? null : '/login';
      }

      if (goingToLogin) {
        return appState.session!.role == UserRole.warehouseManager
            ? '/warehouse'
            : '/store';
      }

      if (state.matchedLocation == '/warehouse' &&
          appState.session!.role != UserRole.warehouseManager) {
        return '/store';
      }

      if (state.matchedLocation == '/store' &&
          appState.session!.role != UserRole.storeManager) {
        return '/warehouse';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/warehouse',
        builder: (context, state) => const WarehouseScreen(),
      ),
      GoRoute(path: '/store', builder: (context, state) => const StoreScreen()),
      GoRoute(
        path: '/inventory',
        builder: (context, state) => const InventoryScreen(),
      ),
    ],
  );
});
