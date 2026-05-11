import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../core/app_logger.dart';
import '../core/local_store.dart';
import '../core/models.dart';
import '../data/mock_api.dart';
import 'app_state.dart';

class AppController extends StateNotifier<AppState> {
  AppController(this._store, this._api) : super(AppState.initial);

  final LocalStore _store;
  final MockApi _api;
  final _uuid = const Uuid();
  Timer? _liveRefreshTicker;

  String _defaultWarehouseRef() {
    for (final location in state.locations) {
      if (location.type == 'warehouse') {
        return location.code;
      }
    }
    return 'WH01';
  }

  String _locationCodeFor(String locationRef) {
    for (final location in state.locations) {
      if (location.id == locationRef || location.code == locationRef) {
        return location.code;
      }
    }
    return locationRef;
  }

  String _locationNameFor(String locationRef) {
    for (final location in state.locations) {
      if (location.id == locationRef || location.code == locationRef) {
        return location.name;
      }
    }
    return locationRef;
  }

  InventoryCatalog _mergeInventoryCatalog({
    Iterable<Product> products = const <Product>[],
    Iterable<InventoryItem> inventory = const <InventoryItem>[],
  }) {
    return state.inventoryCatalog.merge(
      products: products,
      inventory: inventory,
    );
  }

  String _buildReadableOrderId({
    required String warehouseRef,
    required String storeRef,
    required DateTime now,
  }) {
    final datePart =
        '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';
    final warehouseCode = _locationCodeFor(warehouseRef);
    final storeCode = _locationCodeFor(storeRef);
    final sequence =
        state.orders.where((order) {
          final sameWarehouse =
              order.warehouseId == warehouseRef ||
              order.warehouseId == warehouseCode;
          final sameStore =
              order.storeId == storeRef || order.storeId == storeCode;
          final sameDate =
              order.createdAt.year == now.year &&
              order.createdAt.month == now.month &&
              order.createdAt.day == now.day;
          return sameWarehouse && sameStore && sameDate;
        }).length +
        1;

    return 'ORD-$warehouseCode-$storeCode-$datePart-${sequence.toString().padLeft(3, '0')}';
  }

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  void _startLiveRefreshTicker() {
    _liveRefreshTicker?.cancel();
    _liveRefreshTicker = Timer.periodic(const Duration(seconds: 12), (_) {
      if (!state.isOnline || state.session == null) {
        return;
      }
      unawaited(refreshForCurrentRole());
    });
  }

  Future<void> initialize() async {
    AppLogger.info('Initializing app controller');
    await _store.init();

    final session = _store.readSession();
    final orders = _store.readOrders();
    final inventory = _store.readInventory();
    final queue = _store.readQueue();
    final inventoryCatalog = _store.readInventoryCatalog();

    state = state.copyWith(
      initialized: true,
      session: session,
      orders: orders,
      inventory: inventory,
      syncQueue: queue,
      inventoryCatalog: inventoryCatalog.merge(inventory: inventory),
      isOnline: true,
    );

    _connectivitySub?.cancel();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = !results.contains(ConnectivityResult.none);
      state = state.copyWith(isOnline: online);
      if (online) {
        unawaited(syncPendingActions());
        unawaited(refreshForCurrentRole());
      }
    });

    _startLiveRefreshTicker();

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
        } catch (error) {
          AppLogger.error('Token refresh failed; clearing local session', error: error);
          await _store.clearAll();
          state = state.copyWith(clearSession: true);
          return;
        }
      }

      if (state.isOnline) {
        await _verifyBackendReachability();
        await refreshForCurrentRole();
      }
    }
  }

  Future<bool> _verifyBackendReachability() async {
    final healthy = await _api.healthCheck();
    if (!healthy) {
      state = state.copyWith(
        message:
            'Backend is not reachable from this device. Check API URL, server port/firewall, and Android network policy.',
      );
      return false;
    }
    return true;
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
      final backendReady = await _verifyBackendReachability();
      if (!backendReady) {
        state = state.copyWith(loading: false);
        return;
      }
      final session = await _api.login(
        email: email,
        password: password,
        role: role,
      );
      await _store.writeSession(session);
      state = state.copyWith(session: session, loading: false);
      await refreshData();
    } catch (error) {
      AppLogger.error('Login failed', error: error);
      state = state.copyWith(loading: false, message: error.toString());
    }
  }

  Future<void> logout() async {
    _liveRefreshTicker?.cancel();
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
        final inventoryCatalog = _mergeInventoryCatalog(
          inventory: adminInventory,
        );
        await _store.writeInventoryCatalog(inventoryCatalog);
        state = state.copyWith(
          loading: false,
          employees: users,
          locations: locations,
          attendanceRecords: staff.attendance,
          salaryPayouts: staff.salaryPayouts,
          leaveRecords: staff.leaveRecords,
          adminInventory: adminInventory,
          inventoryCatalog: inventoryCatalog,
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
      final inventoryCatalog = _mergeInventoryCatalog(
        products: products,
        inventory: inventory,
      );
      await _store.writeInventoryCatalog(inventoryCatalog);

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
        inventoryCatalog: inventoryCatalog,
      );
    } catch (error) {
      AppLogger.error('Refresh data failed', error: error);
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> refreshForCurrentRole() async {
    final session = state.session;
    if (session == null || !state.isOnline) {
      return;
    }

    if (session.role == UserRole.superadmin) {
      await refreshData();
      return;
    }

    if (session.role == UserRole.warehouseManager) {
      await _refreshWarehouseView();
      return;
    }

    await _refreshStoreView();
  }

  Future<void> refreshOrdersOnly() async {
    final session = state.session;
    if (session == null || !state.isOnline) {
      return;
    }

    try {
      final orders = await _api.fetchOrders(session);
      await _store.replaceOrders(orders);
      state = state.copyWith(orders: orders);
    } catch (error) {
      AppLogger.error('Refresh orders failed', error: error);
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> refreshInventoryOnly() async {
    final session = state.session;
    if (session == null || !state.isOnline) {
      return;
    }

    try {
      final inventory = await _api.fetchInventory(
        session.locationId,
        session.token,
      );
      await _store.replaceInventory(inventory);
      final inventoryCatalog = _mergeInventoryCatalog(inventory: inventory);
      await _store.writeInventoryCatalog(inventoryCatalog);
      state = state.copyWith(inventory: inventory);
    } catch (error) {
      AppLogger.error('Refresh inventory failed', error: error);
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> _refreshWarehouseView() async {
    final session = state.session;
    if (session == null || !state.isOnline) {
      return;
    }

    state = state.copyWith(loading: true);
    try {
      final inventory = await _api.fetchInventory(
        session.locationId,
        session.token,
      );
      final orders = await _api.fetchOrders(session);
      final locations = state.locations.isEmpty
          ? await _api.fetchLocations(session.token)
          : state.locations;

      await _store.replaceInventory(inventory);
      await _store.replaceOrders(orders);
      final inventoryCatalog = _mergeInventoryCatalog(inventory: inventory);
      await _store.writeInventoryCatalog(inventoryCatalog);

      state = state.copyWith(
        loading: false,
        inventory: inventory,
        orders: orders,
        locations: locations,
        inventoryCatalog: inventoryCatalog,
      );
    } catch (error) {
      state = state.copyWith(
        loading: false,
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> _refreshStoreView() async {
    final session = state.session;
    if (session == null || !state.isOnline) {
      return;
    }

    state = state.copyWith(loading: true);
    try {
      final inventory = await _api.fetchInventory(
        session.locationId,
        session.token,
      );
      final orders = await _api.fetchOrders(session);
      final locations = state.locations.isEmpty
          ? await _api.fetchLocations(session.token)
          : state.locations;

      await _store.replaceInventory(inventory);
      await _store.replaceOrders(orders);
      final inventoryCatalog = _mergeInventoryCatalog(inventory: inventory);
      await _store.writeInventoryCatalog(inventoryCatalog);

      state = state.copyWith(
        loading: false,
        inventory: inventory,
        orders: orders,
        locations: locations,
        inventoryCatalog: inventoryCatalog,
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
    String? warehouseRef,
  }) async {
    await createCartOrderRequest(
      warehouseRef: warehouseRef,
      items: [
        OrderItem(
          productId: productId,
          title: title,
          sku: sku,
          quantity: quantity,
        ),
      ],
    );
  }

  Future<bool> createCartOrderRequest({
    required List<OrderItem> items,
    String? warehouseRef,
  }) async {
    final session = state.session;
    if (session == null) return false;
    if (session.role != UserRole.storeManager) {
      state = state.copyWith(
        message: 'Only store manager can create order requests.',
      );
      return false;
    }

    final normalizedItems = items
        .where((item) => item.quantity > 0)
        .map(
          (item) => OrderItem(
            productId: item.productId,
            title: item.title,
            sku: item.sku,
            quantity: item.quantity,
          ),
        )
        .toList(growable: false);

    if (normalizedItems.isEmpty) {
      state = state.copyWith(message: 'Add at least one item to place order.');
      return false;
    }

    final now = DateTime.now();
    final targetWarehouseRef =
        (warehouseRef != null && warehouseRef.trim().isNotEmpty)
        ? warehouseRef.trim()
        : _defaultWarehouseRef();
    final orderId = _buildReadableOrderId(
      warehouseRef: targetWarehouseRef,
      storeRef: session.locationId,
      now: now,
    );
    final localOrder = StoreOrder(
      id: _uuid.v4(),
      orderId: orderId,
      storeId: session.locationId,
      storeName: _locationNameFor(session.locationId),
      warehouseId: targetWarehouseRef,
      warehouseName: _locationNameFor(targetWarehouseRef),
      status: OrderStatus.pendingWarehouseApproval,
      items: normalizedItems,
      reservedAmount: normalizedItems.fold<int>(
        0,
        (sum, item) => sum + item.quantity,
      ),
      createdAt: now,
      updatedAt: now,
      syncStatus: SyncStatus.synced,
    );

    final payloadItems = normalizedItems
        .map((item) => {'product_id': item.productId, 'qty': item.quantity})
        .toList(growable: false);

    if (state.isOnline) {
      try {
        await _api.createOrderOnline(
          session: session,
          warehouseId: targetWarehouseRef,
          items: payloadItems,
          idempotencyKey: _uuid.v4(),
        );
        final updatedOrders = [localOrder, ...state.orders];
        await _store.upsertOrder(localOrder);
        state = state.copyWith(
          orders: updatedOrders,
          message: normalizedItems.length > 1
              ? 'Cart order submitted.'
              : 'Order submitted.',
        );
        unawaited(refreshForCurrentRole());
        return true;
      } catch (error) {
        AppLogger.error('Online order submission failed; queuing offline', error: error);
        state = state.copyWith(
          message: 'Online submit failed. Saved offline and queued for sync.',
        );
      }
    }

    final order = StoreOrder(
      id: _uuid.v4(),
      orderId: orderId,
      storeId: session.locationId,
      storeName: _locationNameFor(session.locationId),
      warehouseId: targetWarehouseRef,
      warehouseName: _locationNameFor(targetWarehouseRef),
      status: OrderStatus.draft,
      items: normalizedItems,
      reservedAmount: normalizedItems.fold<int>(
        0,
        (sum, item) => sum + item.quantity,
      ),
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
        'warehouseId': targetWarehouseRef,
        'items': payloadItems,
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
    return true;
  }

  Future<void> transitionOrder(StoreOrder order, OrderStatus target) async {
    final session = state.session;
    if (session == null) return;

    final requiresOnlineApproval =
        target == OrderStatus.warehouseApproved ||
        target == OrderStatus.warehouseRejected;

    final updated = order.copyWith(
      status: target,
      updatedAt: DateTime.now(),
      syncStatus: SyncStatus.synced,
    );

    if (!state.isOnline && requiresOnlineApproval) {
      state = state.copyWith(message: 'Warehouse approval needs connectivity.');
      return;
    }

    if (state.isOnline) {
      try {
        await _api.transitionOrderOnline(
          session: session,
          orderRef: order.id,
          target: target,
        );

        final updatedOrders = state.orders
            .map((item) => item.id == order.id ? updated : item)
            .toList(growable: false);
        await _store.upsertOrder(updated);
        state = state.copyWith(
          orders: updatedOrders,
          message: 'Order updated to ${target.name}.',
        );
        unawaited(refreshForCurrentRole());
        return;
      } catch (error) {
        state = state.copyWith(
          message: error.toString().replaceFirst('Exception: ', ''),
        );
        return;
      }
    }

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
        AppLogger.error('Sync action failed', error: error, context: {
          'actionId': action.id,
          'actionType': action.type.name,
        });
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

    if (nextQueue.isEmpty) {
      unawaited(refreshForCurrentRole());
    }
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
      if (session.role == UserRole.superadmin) {
        await refreshData();
      } else {
        await refreshInventoryOnly();
      }
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
      if (session.role == UserRole.superadmin) {
        await refreshData();
      } else {
        await refreshInventoryOnly();
      }
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
      if (session.role == UserRole.superadmin) {
        await refreshData();
      } else {
        await refreshInventoryOnly();
      }
      state = state.copyWith(message: 'Inventory item deleted.');
    } catch (error) {
      state = state.copyWith(
        message: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> addInventoryCatalogValue(
    CatalogEntryType type,
    String value,
  ) async {
    final nextCatalog = state.inventoryCatalog.addValue(type, value);
    await _store.writeInventoryCatalog(nextCatalog);
    state = state.copyWith(
      inventoryCatalog: nextCatalog,
      message: '${type.label} added to quick options.',
    );
  }

  void clearMessage() {
    state = state.copyWith(clearMessage: true);
  }

  @override
  void dispose() {
    _liveRefreshTicker?.cancel();
    _connectivitySub?.cancel();
    super.dispose();
  }
}
