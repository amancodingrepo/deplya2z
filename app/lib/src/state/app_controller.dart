import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../core/local_store.dart';
import '../core/models.dart';
import '../data/mock_api.dart';
import 'app_state.dart';

class AppController extends StateNotifier<AppState> {
  AppController(this._store, this._api) : super(AppState.initial);

  final LocalStore _store;
  final MockApi _api;
  final _uuid = const Uuid();

  String _defaultWarehouseRef() {
    for (final location in state.locations) {
      if (location.type == 'warehouse') {
        return location.code;
      }
    }
    return 'WH01';
  }

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  Future<void> initialize() async {
    await _store.init();

    final session = _store.readSession();
    final orders = _store.readOrders();
    final inventory = _store.readInventory();
    final queue = _store.readQueue();

    state = state.copyWith(
      initialized: true,
      session: session,
      orders: orders,
      inventory: inventory,
      syncQueue: queue,
      isOnline: true,
    );

    _connectivitySub?.cancel();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = !results.contains(ConnectivityResult.none);
      state = state.copyWith(isOnline: online);
      if (online) {
        unawaited(syncPendingActions());
        unawaited(refreshData());
      }
    });

    if (session != null) {
      if (session.shouldRefreshToken) {
        try {
          final token = await _api.refreshToken(session.token);
          final refreshed = UserSession(
            id: session.id,
            name: session.name,
            email: session.email,
            role: session.role,
            locationId: session.locationId,
            token: token,
            expiry: DateTime.now().add(const Duration(hours: 24)),
          );
          await _store.writeSession(refreshed);
          state = state.copyWith(session: refreshed);
        } catch (_) {
          await _store.clearAll();
          state = state.copyWith(clearSession: true);
          return;
        }
      }

      if (state.isOnline) {
        await refreshData();
      }
    }
  }

  Future<void> login({
    required String email,
    required String password,
    required UserRole role,
  }) async {
    if (!state.isOnline) {
      state = state.copyWith(
        message: 'No internet connection. Login requires connectivity.',
      );
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      final session = await _api.login(
        email: email,
        password: password,
        role: role,
      );
      await _store.writeSession(session);
      state = state.copyWith(session: session, loading: false);
      await refreshData();
    } catch (error) {
      state = state.copyWith(loading: false, message: error.toString());
    }
  }

  Future<void> logout() async {
    await _store.clearAll();
    state = AppState.initial.copyWith(
      initialized: true,
      isOnline: state.isOnline,
    );
  }

  Future<void> refreshData() async {
    final session = state.session;
    if (session == null || !state.isOnline) {
      return;
    }

    state = state.copyWith(loading: true);
    try {
      if (session.role == UserRole.superadmin) {
        final users = await _api.fetchUsers(session.token);
        final locations = await _api.fetchLocations(session.token);
        final staff = await _api.fetchStaffRecordsForAdmin(
          token: session.token,
        );
        final adminInventory = await _api.fetchInventory('', session.token);
        final orders = await _api.fetchOrders(session);
        state = state.copyWith(
          loading: false,
          employees: users,
          locations: locations,
          attendanceRecords: staff.attendance,
          salaryPayouts: staff.salaryPayouts,
          leaveRecords: staff.leaveRecords,
          adminInventory: adminInventory,
          products: const <Product>[],
          orders: orders,
          inventory: const <InventoryItem>[],
        );
        return;
      }

      final products = await _api.fetchProducts(session.token);
      final inventory = await _api.fetchInventory(
        session.locationId,
        session.token,
      );
      final orders = await _api.fetchOrders(session);
      final locations = await _api.fetchLocations(session.token);
      final staff = await _api.fetchMyStaffRecords(session.token);

      await _store.replaceInventory(inventory);
      await _store.replaceOrders(orders);

      state = state.copyWith(
        loading: false,
        products: products,
        inventory: inventory,
        orders: orders,
        locations: locations,
        attendanceRecords: staff.attendance,
        salaryPayouts: staff.salaryPayouts,
        leaveRecords: staff.leaveRecords,
        adminInventory: const <InventoryItem>[],
        employees: const <EmployeeUser>[],
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  /// Update the local image path on an inventory item (camera/gallery pick).
  void setProductImage(String productId, String localPath) {
    final updatedInventory = state.inventory.map((item) {
      if (item.productId == productId) {
        return item.copyWith(localImagePath: localPath);
      }
      return item;
    }).toList();

    final updatedProducts = state.products.map((p) {
      if (p.id == productId) {
        return p.copyWith(localImagePath: localPath);
      }
      return p;
    }).toList();

    state = state.copyWith(
      inventory: updatedInventory,
      products: updatedProducts,
    );
  }

  Future<void> createOrderRequest({
    required String productId,
    required String title,
    required String sku,
    required int quantity,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (session.role != UserRole.storeManager) {
      state = state.copyWith(
        message: 'Only store manager can create order requests.',
      );
      return;
    }

    final now = DateTime.now();
    final warehouseRef = _defaultWarehouseRef();

    if (state.isOnline) {
      try {
        await _api.createOrderOnline(
          session: session,
          warehouseId: warehouseRef,
          productId: productId,
          quantity: quantity,
          idempotencyKey: _uuid.v4(),
        );
        state = state.copyWith(message: 'Order submitted.');
        await refreshData();
        return;
      } catch (_) {
        state = state.copyWith(
          message: 'Online submit failed. Saved offline and queued for sync.',
        );
      }
    }

    final order = StoreOrder(
      id: _uuid.v4(),
      orderId:
          'ORD-ST01-${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}-${now.millisecond.toString().padLeft(4, '0')}',
      storeId: session.locationId,
      warehouseId: warehouseRef,
      status: OrderStatus.draft,
      items: [
        OrderItem(
          productId: productId,
          title: title,
          sku: sku,
          quantity: quantity,
        ),
      ],
      reservedAmount: quantity,
      createdAt: now,
      updatedAt: now,
      syncStatus: SyncStatus.pendingUpload,
    );

    final updatedOrders = [order, ...state.orders];
    await _store.upsertOrder(order);

    var updatedQueue = state.syncQueue;
    final action = SyncAction(
      id: _uuid.v4(),
      type: SyncActionType.createOrder,
      entityId: order.id,
      payload: {
        'storeId': session.locationId,
        'warehouseId': warehouseRef,
        'items': [
          {'product_id': productId, 'qty': quantity},
        ],
      },
      createdAt: now,
      status: SyncStatus.pendingUpload,
      retryCount: 0,
    );
    await _store.upsertQueueItem(action);
    updatedQueue = [...state.syncQueue, action];

    state = state.copyWith(
      orders: updatedOrders,
      syncQueue: updatedQueue,
      message: 'Order saved offline and queued for sync.',
    );
  }

  Future<void> transitionOrder(StoreOrder order, OrderStatus target) async {
    final session = state.session;
    if (session == null) return;

    if (state.isOnline) {
      try {
        await _api.transitionOrderOnline(
          session: session,
          orderRef: order.id,
          target: target,
        );
        state = state.copyWith(message: 'Order updated to ${target.name}.');
        await refreshData();
        return;
      } catch (_) {
        if (session.role == UserRole.superadmin) {
          state = state.copyWith(message: 'Failed to approve order online.');
          return;
        }
        state = state.copyWith(
          message: 'Online update failed. Saved offline and queued.',
        );
      }
    }

    if (session.role == UserRole.superadmin) {
      state = state.copyWith(
        message: 'Superadmin order approval requires internet.',
      );
      return;
    }

    final updated = order.copyWith(
      status: target,
      updatedAt: DateTime.now(),
      syncStatus: SyncStatus.pendingUpload,
    );

    final updatedOrders = state.orders
        .map((o) => o.id == order.id ? updated : o)
        .toList(growable: false);
    await _store.upsertOrder(updated);

    var updatedQueue = state.syncQueue;
    final actionType = switch (target) {
      OrderStatus.packed => SyncActionType.markPacked,
      OrderStatus.dispatched => SyncActionType.markDispatched,
      OrderStatus.storeReceived ||
      OrderStatus.completed => SyncActionType.confirmReceive,
      _ => SyncActionType.markPacked,
    };

    final action = SyncAction(
      id: _uuid.v4(),
      type: actionType,
      entityId: order.id,
      payload: {'orderId': order.id, 'status': target.name},
      createdAt: DateTime.now(),
      status: SyncStatus.pendingUpload,
      retryCount: 0,
    );
    await _store.upsertQueueItem(action);
    updatedQueue = [...state.syncQueue, action];

    state = state.copyWith(
      orders: updatedOrders,
      syncQueue: updatedQueue,
      message: 'Order updated offline and queued.',
    );
  }

  Future<void> syncPendingActions() async {
    if (!state.isOnline || state.syncQueue.isEmpty || state.session == null) {
      return;
    }

    final currentQueue = [...state.syncQueue];
    final nextQueue = <SyncAction>[];

    for (final action in currentQueue) {
      if (action.status == SyncStatus.synced) {
        continue;
      }

      try {
        await _api.syncAction(action, state.session!);
        await _store.removeQueueItem(action.id);
      } catch (error) {
        final failed = action.copyWith(
          status: SyncStatus.failed,
          retryCount: action.retryCount + 1,
          errorMessage: error.toString(),
        );
        await _store.upsertQueueItem(failed);
        nextQueue.add(failed);
      }
    }

    state = state.copyWith(
      syncQueue: nextQueue,
      message: nextQueue.isEmpty
          ? 'Synced successfully.'
          : '${nextQueue.length} queued action(s) need manual review.',
    );
  }

  Future<void> createEmployee({
    required String name,
    required String email,
    required String password,
    required UserRole role,
    String? locationId,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only superadmin can manage employees.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Employee creation requires internet.');
      return;
    }

    state = state.copyWith(loading: true, clearMessage: true);
    try {
      await _api.createEmployeeUser(
        token: session.token,
        email: email.trim(),
        name: name.trim(),
        password: password,
        role: role,
        locationId: locationId,
      );
      final users = await _api.fetchUsers(session.token);
      state = state.copyWith(
        loading: false,
        employees: users,
        message: 'Employee created successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> setEmployeeActive(String userId, bool active) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only superadmin can manage employees.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Status update requires internet.');
      return;
    }

    try {
      final updated = await _api.updateEmployeeStatus(
        token: session.token,
        userId: userId,
        active: active,
      );
      final employees = state.employees
          .map((user) => user.id == updated.id ? updated : user)
          .toList(growable: false);
      state = state.copyWith(
        employees: employees,
        message: 'Employee status updated.',
      );
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> deleteEmployee(String userId) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only superadmin can delete employees.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'User deletion requires internet.');
      return;
    }

    try {
      await _api.deleteEmployeeUser(token: session.token, userId: userId);
      final users = await _api.fetchUsers(session.token);
      state = state.copyWith(
        employees: users,
        message: 'Employee deleted successfully.',
      );
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> addAttendanceForEmployee({
    required String userId,
    required DateTime attendanceDate,
    required AttendanceStatus status,
  }) async {
    final session = state.session;
    if (session == null || session.role != UserRole.superadmin) {
      state = state.copyWith(message: 'Only superadmin can add attendance.');
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Attendance update requires internet.');
      return;
    }

    try {
      await _api.addAttendance(
        token: session.token,
        userId: userId,
        date: attendanceDate,
        status: status,
      );
      final staff = await _api.fetchStaffRecordsForAdmin(token: session.token);
      state = state.copyWith(
        attendanceRecords: staff.attendance,
        salaryPayouts: staff.salaryPayouts,
        leaveRecords: staff.leaveRecords,
        message: 'Attendance saved.',
      );
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> createInventoryItem({
    required String sku,
    required String title,
    required String brand,
    required int totalStock,
    String? category,
    String? model,
    String? color,
    String? locationId,
    List<int>? imageBytes,
    String? imageFilename,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (!(session.role == UserRole.warehouseManager ||
        session.role == UserRole.superadmin)) {
      state = state.copyWith(
        message: 'Only warehouse manager/superadmin can create inventory.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Inventory update requires internet.');
      return;
    }

    final targetLocation = locationId ?? session.locationId;
    try {
      await _api.createInventoryItem(
        token: session.token,
        locationId: targetLocation,
        sku: sku,
        title: title,
        brand: brand,
        totalStock: totalStock,
        category: category,
        model: model,
        color: color,
        imageBytes: imageBytes,
        imageFilename: imageFilename,
      );
      await refreshData();
      state = state.copyWith(message: 'Inventory item created.');
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> updateInventoryItem({
    required String productRef,
    int? totalStock,
    int? reservedStock,
    int? issuedStock,
    String? title,
    String? brand,
    String? category,
    String? model,
    String? color,
    String? status,
    String? locationId,
    List<int>? imageBytes,
    String? imageFilename,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (!(session.role == UserRole.warehouseManager ||
        session.role == UserRole.superadmin)) {
      state = state.copyWith(
        message: 'Only warehouse manager/superadmin can update inventory.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Inventory update requires internet.');
      return;
    }

    final targetLocation = locationId ?? session.locationId;
    try {
      await _api.updateInventoryItem(
        token: session.token,
        productRef: productRef,
        locationId: targetLocation,
        totalStock: totalStock,
        reservedStock: reservedStock,
        issuedStock: issuedStock,
        title: title,
        brand: brand,
        category: category,
        model: model,
        color: color,
        status: status,
        imageBytes: imageBytes,
        imageFilename: imageFilename,
      );
      await refreshData();
      state = state.copyWith(message: 'Inventory item updated.');
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> deleteInventoryItem({
    required String productRef,
    String? locationId,
  }) async {
    final session = state.session;
    if (session == null) return;
    if (!(session.role == UserRole.warehouseManager ||
        session.role == UserRole.superadmin)) {
      state = state.copyWith(
        message: 'Only warehouse manager/superadmin can delete inventory.',
      );
      return;
    }

    if (!state.isOnline) {
      state = state.copyWith(message: 'Inventory update requires internet.');
      return;
    }

    final targetLocation = locationId ?? session.locationId;
    try {
      await _api.deleteInventoryItem(
        token: session.token,
        productRef: productRef,
        locationId: targetLocation,
      );
      await refreshData();
      state = state.copyWith(message: 'Inventory item deleted.');
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  void clearMessage() {
    state = state.copyWith(clearMessage: true);
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }
}
