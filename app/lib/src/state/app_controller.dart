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
      final inventory = await _api.fetchInventory(
        session.locationId,
        session.token,
      );
      final orders = await _api.fetchOrders(session);

      await _store.replaceInventory(inventory);
      await _store.replaceOrders(orders);

      state = state.copyWith(
        loading: false,
        inventory: inventory,
        orders: orders,
      );
    } catch (_) {
      state = state.copyWith(
        loading: false,
        message: 'Failed to refresh from server. Showing local data.',
      );
    }
  }

  Future<void> createOrderRequest({
    required String productId,
    required String title,
    required String sku,
    required int quantity,
  }) async {
    final session = state.session;
    if (session == null) return;

    final now = DateTime.now();

    if (state.isOnline) {
      try {
        await _api.createOrderOnline(
          session: session,
          warehouseId: 'WH01',
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
      warehouseId: 'WH01',
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
        'warehouseId': 'WH01',
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
        state = state.copyWith(
          message: 'Online update failed. Saved offline and queued.',
        );
      }
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

  void clearMessage() {
    state = state.copyWith(clearMessage: true);
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }
}
