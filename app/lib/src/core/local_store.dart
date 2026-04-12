import 'package:hive_flutter/hive_flutter.dart';

import 'models.dart';

class LocalStore {
  static const _sessionBoxName = 'session_box';
  static const _ordersBoxName = 'orders_box';
  static const _inventoryBoxName = 'inventory_box';
  static const _syncQueueBoxName = 'sync_queue_box';

  late Box<dynamic> _sessionBox;
  late Box<dynamic> _ordersBox;
  late Box<dynamic> _inventoryBox;
  late Box<dynamic> _syncQueueBox;

  Future<void> init() async {
    await Hive.initFlutter();
    _sessionBox = await Hive.openBox<dynamic>(_sessionBoxName);
    _ordersBox = await Hive.openBox<dynamic>(_ordersBoxName);
    _inventoryBox = await Hive.openBox<dynamic>(_inventoryBoxName);
    _syncQueueBox = await Hive.openBox<dynamic>(_syncQueueBoxName);
  }

  UserSession? readSession() {
    final raw = _sessionBox.get('active_session');
    if (raw is Map<dynamic, dynamic>) {
      return UserSession.fromJson(raw);
    }
    return null;
  }

  Future<void> writeSession(UserSession session) async {
    await _sessionBox.put('active_session', session.toJson());
  }

  Future<void> clearSession() async {
    await _sessionBox.delete('active_session');
  }

  List<StoreOrder> readOrders() {
    return _ordersBox.values
        .whereType<Map<dynamic, dynamic>>()
        .map(StoreOrder.fromJson)
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<void> upsertOrder(StoreOrder order) async {
    await _ordersBox.put(order.id, order.toJson());
  }

  Future<void> replaceOrders(List<StoreOrder> orders) async {
    await _ordersBox.clear();
    for (final order in orders) {
      await upsertOrder(order);
    }
  }

  List<InventoryItem> readInventory() {
    return _inventoryBox.values
        .whereType<Map<dynamic, dynamic>>()
        .map(InventoryItem.fromJson)
        .toList();
  }

  Future<void> replaceInventory(List<InventoryItem> items) async {
    await _inventoryBox.clear();
    for (final item in items) {
      final key = '${item.locationId}-${item.productId}';
      await _inventoryBox.put(key, item.toJson());
    }
  }

  List<SyncAction> readQueue() {
    return _syncQueueBox.values
        .whereType<Map<dynamic, dynamic>>()
        .map(SyncAction.fromJson)
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  Future<void> upsertQueueItem(SyncAction action) async {
    await _syncQueueBox.put(action.id, action.toJson());
  }

  Future<void> removeQueueItem(String id) async {
    await _syncQueueBox.delete(id);
  }

  Future<void> clearAll() async {
    await _sessionBox.clear();
    await _ordersBox.clear();
    await _inventoryBox.clear();
    await _syncQueueBox.clear();
  }
}
