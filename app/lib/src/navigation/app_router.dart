import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/models.dart';
import '../state/providers.dart';
import '../ui/employee_screen.dart';
import '../ui/inventory_screen.dart';
import '../ui/login_screen.dart';
import '../ui/staff_screen.dart';
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
          UserRole.staff => '/staff',
        };
      }

      final role = appState.session!.role;
      final loc = state.matchedLocation;

      // Staff can only access /staff
      if (role == UserRole.staff && loc != '/staff') {
        return '/staff';
      }

      // Non-staff roles are blocked from /staff
      if (role != UserRole.staff && loc == '/staff') {
        return switch (role) {
          UserRole.superadmin => '/employee',
          UserRole.warehouseManager => '/warehouse',
          UserRole.storeManager => '/store',
          UserRole.staff => '/staff',
        };
      }

      if (loc == '/employee' && role != UserRole.superadmin) {
        return role == UserRole.warehouseManager ? '/warehouse' : '/store';
      }

      if (loc == '/warehouse' && role != UserRole.warehouseManager) {
        return role == UserRole.superadmin ? '/employee' : '/store';
      }

      if (loc == '/store' && role != UserRole.storeManager) {
        return role == UserRole.superadmin ? '/employee' : '/warehouse';
      }

      if (loc == '/inventory' && role == UserRole.superadmin) {
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
      GoRoute(
        path: '/staff',
        builder: (context, state) => const StaffScreen(),
      ),
    ],
  );
});
