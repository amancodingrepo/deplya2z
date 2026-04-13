import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/models.dart';
import '../state/providers.dart';
import '../ui/employee_screen.dart';
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
        return switch (appState.session!.role) {
          UserRole.superadmin => '/employee',
          UserRole.warehouseManager => '/warehouse',
          UserRole.storeManager => '/store',
        };
      }

      if (state.matchedLocation == '/employee' &&
          appState.session!.role != UserRole.superadmin) {
        return appState.session!.role == UserRole.warehouseManager
            ? '/warehouse'
            : '/store';
      }

      if (state.matchedLocation == '/warehouse' &&
          appState.session!.role != UserRole.warehouseManager) {
        return appState.session!.role == UserRole.superadmin
            ? '/employee'
            : '/store';
      }

      if (state.matchedLocation == '/store' &&
          appState.session!.role != UserRole.storeManager) {
        return appState.session!.role == UserRole.superadmin
            ? '/employee'
            : '/warehouse';
      }

      if (state.matchedLocation == '/inventory' &&
          appState.session!.role == UserRole.superadmin) {
        return '/employee';
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
        path: '/employee',
        builder: (context, state) => const EmployeeScreen(),
      ),
      GoRoute(
        path: '/inventory',
        builder: (context, state) => const InventoryScreen(),
      ),
    ],
  );
});
