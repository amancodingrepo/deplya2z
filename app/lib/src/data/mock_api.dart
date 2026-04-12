import 'dart:math';

import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import '../core/models.dart';

class MockApi {
  MockApi()
    : _dio = Dio(
        BaseOptions(
          baseUrl: const String.fromEnvironment(
            'API_BASE_URL',
            defaultValue: 'http://localhost:8080/v1',
          ),
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 8),
        ),
      );

  final _uuid = const Uuid();
  final _random = Random();
  final Dio _dio;

  String _roleToApi(UserRole role) {
    return switch (role) {
      UserRole.warehouseManager => 'warehouse_manager',
      UserRole.storeManager => 'store_manager',
    };
  }

  UserRole _roleFromApi(String role) {
    return switch (role) {
      'warehouse_manager' => UserRole.warehouseManager,
      'store_manager' => UserRole.storeManager,
      _ => UserRole.storeManager,
    };
  }

  Future<UserSession> login({
    required String email,
    required String password,
    required UserRole role,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      final payload = response.data ?? <String, dynamic>{};
      final user = Map<String, dynamic>.from(
        payload['user'] as Map? ?? <String, dynamic>{},
      );

      final apiRole = user['role'] as String? ?? _roleToApi(role);

      return UserSession(
        id: user['id'] as String? ?? _uuid.v4(),
        name: user['name'] as String? ?? 'User',
        email: user['email'] as String? ?? email,
        role: _roleFromApi(apiRole),
        locationId:
            user['location_id'] as String? ??
            (role == UserRole.warehouseManager ? 'WH01' : 'ST01'),
        token: payload['token'] as String? ?? _uuid.v4(),
        expiry: DateTime.now().add(const Duration(hours: 24)),
      );
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      if (password.length < 4) {
        throw Exception('Invalid credentials');
      }

      return UserSession(
        id: _uuid.v4(),
        name: role == UserRole.warehouseManager
            ? 'Warehouse Manager'
            : 'Store Manager',
        email: email,
        role: role,
        locationId: role == UserRole.warehouseManager ? 'WH01' : 'ST01',
        token: 'token-${_roleToApi(role)}',
        expiry: DateTime.now().add(const Duration(hours: 24)),
      );
    }
  }

  Future<String> refreshToken(String currentToken) async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
    return '${currentToken.substring(0, 8)}-${_uuid.v4()}';
  }

  Future<List<InventoryItem>> fetchInventory(
    String locationId,
    String token,
  ) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/inventory',
        queryParameters: {'location_id': locationId},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      final data = response.data ?? <dynamic>[];
      return data
          .map((row) => Map<String, dynamic>.from(row as Map))
          .map(
            (json) => InventoryItem(
              productId: json['product_id'] as String,
              sku: json['sku'] as String,
              title: json['title'] as String,
              locationId: json['location_id'] as String,
              availableStock: (json['available_stock'] as num).toInt(),
              reservedStock: (json['reserved_stock'] as num).toInt(),
              totalStock: (json['total_stock'] as num).toInt(),
              cachedAt: DateTime.now(),
            ),
          )
          .toList();
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 250));
      return [
        InventoryItem(
          productId: 'P001',
          sku: 'SKU-TV-001',
          title: 'Samsung 55in TV',
          locationId: locationId,
          availableStock: _random.nextInt(8) + 1,
          reservedStock: _random.nextInt(4),
          totalStock: 12,
          cachedAt: DateTime.now(),
        ),
        InventoryItem(
          productId: 'P002',
          sku: 'SKU-FRD-001',
          title: 'LG Double Door Fridge',
          locationId: locationId,
          availableStock: _random.nextInt(6) + 1,
          reservedStock: _random.nextInt(2),
          totalStock: 8,
          cachedAt: DateTime.now(),
        ),
      ];
    }
  }

  Future<List<StoreOrder>> fetchOrders(UserSession session) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/orders',
        options: Options(headers: {'Authorization': 'Bearer ${session.token}'}),
      );
      final rows = response.data ?? <dynamic>[];
      return rows.map((row) {
        final json = Map<String, dynamic>.from(row as Map);
        final status = OrderStatus.values.firstWhere(
          (s) => s.name == (json['status'] as String).replaceAll('_', ''),
          orElse: () {
            final raw = json['status'] as String;
            if (raw == 'store_received') return OrderStatus.storeReceived;
            return OrderStatus.draft;
          },
        );

        final items = (json['items'] as List<dynamic>)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .map(
              (it) => OrderItem(
                productId: it['product_id'] as String,
                title: it['title'] as String,
                sku: it['sku'] as String,
                quantity: (it['qty'] as num).toInt(),
              ),
            )
            .toList();

        return StoreOrder(
          id: json['id'] as String,
          orderId: json['order_id'] as String,
          storeId: json['store_id'] as String,
          warehouseId: json['warehouse_id'] as String,
          status: status,
          items: items,
          reservedAmount: items.fold<int>(0, (sum, i) => sum + i.quantity),
          createdAt: DateTime.parse(json['created_at'] as String),
          updatedAt: DateTime.parse(json['updated_at'] as String),
          syncStatus: SyncStatus.synced,
        );
      }).toList();
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 250));
      return [
        StoreOrder(
          id: 'O1',
          orderId: 'ORD-ST01-20260412-0001',
          storeId: 'ST01',
          warehouseId: 'WH01',
          status: OrderStatus.confirmed,
          items: const [
            OrderItem(
              productId: 'P001',
              title: 'Samsung 55in TV',
              sku: 'SKU-TV-001',
              quantity: 5,
            ),
          ],
          reservedAmount: 5,
          createdAt: DateTime.now().subtract(const Duration(hours: 3)),
          updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
          syncStatus: SyncStatus.synced,
        ),
      ];
    }
  }

  Future<void> syncAction(SyncAction action, UserSession session) async {
    try {
      if (action.type == SyncActionType.createOrder) {
        await _dio.post(
          '/orders',
          options: Options(
            headers: {
              'Authorization': 'Bearer ${session.token}',
              'Idempotency-Key': action.id,
            },
          ),
          data: {
            'store_id': action.payload['storeId'] ?? session.locationId,
            'warehouse_id': action.payload['warehouseId'] ?? 'WH01',
            'items': action.payload['items'] ?? <dynamic>[],
          },
        );
      } else if (action.type == SyncActionType.markPacked) {
        await _dio.patch(
          '/orders/${action.entityId}/pack',
          options: Options(
            headers: {
              'Authorization': 'Bearer ${session.token}',
              'Idempotency-Key': action.id,
            },
          ),
        );
      } else if (action.type == SyncActionType.markDispatched) {
        await _dio.patch(
          '/orders/${action.entityId}/dispatch',
          options: Options(
            headers: {
              'Authorization': 'Bearer ${session.token}',
              'Idempotency-Key': action.id,
            },
          ),
        );
      } else {
        await _dio.patch(
          '/orders/${action.entityId}/confirm-receive',
          options: Options(
            headers: {
              'Authorization': 'Bearer ${session.token}',
              'Idempotency-Key': action.id,
            },
          ),
        );
      }
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 250));
      if (_random.nextInt(20) == 0) {
        throw Exception('Temporary sync failure');
      }
    }
  }

  Future<void> createOrderOnline({
    required UserSession session,
    required String warehouseId,
    required String productId,
    required int quantity,
    required String idempotencyKey,
  }) async {
    await _dio.post(
      '/orders',
      options: Options(
        headers: {
          'Authorization': 'Bearer ${session.token}',
          'Idempotency-Key': idempotencyKey,
        },
      ),
      data: {
        'store_id': session.locationId,
        'warehouse_id': warehouseId,
        'items': [
          {'product_id': productId, 'qty': quantity},
        ],
      },
    );
  }

  Future<void> transitionOrderOnline({
    required UserSession session,
    required String orderRef,
    required OrderStatus target,
  }) async {
    final endpoint = switch (target) {
      OrderStatus.packed => '/orders/$orderRef/pack',
      OrderStatus.dispatched => '/orders/$orderRef/dispatch',
      OrderStatus.storeReceived ||
      OrderStatus.completed => '/orders/$orderRef/confirm-receive',
      _ => null,
    };

    if (endpoint == null) {
      return;
    }

    await _dio.patch(
      endpoint,
      options: Options(
        headers: {
          'Authorization': 'Bearer ${session.token}',
          'Idempotency-Key': _uuid.v4(),
        },
      ),
    );
  }
}
