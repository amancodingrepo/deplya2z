import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:http_parser/http_parser.dart';
import 'package:uuid/uuid.dart';

import '../core/models.dart';

class MockApi {
  MockApi() : _dio = _buildDio() {
    // In debug mode, log every request/response to the console for easier debugging
    if (kDebugMode) {
      _dio.interceptors.add(
        LogInterceptor(
          requestHeader: false,
          requestBody: true,
          responseHeader: false,
          responseBody: true,
          error: true,
          logPrint: (o) => debugPrint('[API] $o'),
        ),
      );
    }
  }

  static Dio _buildDio() {
    final baseUrl = _resolveBaseUrl();
    debugPrint('[API] Base URL: $baseUrl');
    return Dio(
      BaseOptions(
        baseUrl: baseUrl,
        // Physical devices on mobile networks need more headroom than emulators
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 20),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
  }

  final _uuid = const Uuid();
  final Dio _dio;

  static String _resolveBaseUrl() {
    // Hardcoded production API URL
    const productionUrl = 'http://69.62.84.211:8080/v1';

    // Allow override via dart-define for local dev
    const configured = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: productionUrl,
    );

    if (kIsWeb) return configured;

    final uri = Uri.tryParse(configured);
    if (uri == null) return configured;

    // Android emulator: remap localhost → 10.0.2.2
    if (Platform.isAndroid && uri.host == 'localhost') {
      return uri.replace(host: '10.0.2.2').toString();
    }

    return configured;
  }

  String _errorMessage(Object error) {
    if (error is DioException) {
      // Always prefer the server's own error message / code first
      final data = error.response?.data;
      if (data is Map) {
        if (data['message'] is String && (data['message'] as String).isNotEmpty) {
          return data['message'] as String;
        }
        if (data['error'] is String && (data['error'] as String).isNotEmpty) {
          return data['error'] as String;
        }
        if (data['code'] is String && (data['code'] as String).isNotEmpty) {
          return data['code'] as String;
        }
      }

      // Classify network-level errors with human-readable messages
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
          return 'Connection timed out. Please check your internet and try again.';
        case DioExceptionType.sendTimeout:
          return 'Request timed out while sending. Please check your connection.';
        case DioExceptionType.receiveTimeout:
          return 'Server took too long to respond. Please try again.';
        case DioExceptionType.connectionError:
          final inner = error.error?.toString() ?? '';
          final serverUrl = _resolveBaseUrl();
          if (inner.contains('refused') || inner.contains('ECONNREFUSED')) {
            return 'Server refused the connection. The service may be temporarily down.';
          }
          if (inner.contains('NetworkException') ||
              inner.contains('SocketException') ||
              inner.contains('errno = 101') ||
              inner.contains('errno = 111')) {
            return 'No network route to server. Check Wi-Fi/mobile data.';
          }
          return 'Cannot reach server ($serverUrl). Check your internet connection.';
        case DioExceptionType.badResponse:
          final status = error.response?.statusCode ?? 0;
          if (status == 401) return 'Incorrect email or password.';
          if (status == 403) return 'Access denied for your account.';
          if (status == 404) return 'API endpoint not found. Please update the app.';
          if (status == 429) return 'Too many attempts. Please wait a moment.';
          if (status >= 500) return 'Server error ($status). Please try again later.';
          final msg = error.message;
          return (msg != null && msg.isNotEmpty) ? msg : 'Request failed (HTTP $status).';
        case DioExceptionType.cancel:
          return 'Request was cancelled.';
        case DioExceptionType.unknown:
          final innerErr = error.error?.toString() ?? '';
          if (innerErr.contains('SocketException') ||
              innerErr.contains('Connection refused') ||
              innerErr.contains('Connection failed')) {
            return 'Cannot connect to server. Ensure internet is available.';
          }
          if (innerErr.contains('HandshakeException') ||
              innerErr.contains('CERTIFICATE') ||
              innerErr.contains('ssl')) {
            return 'SSL/TLS error connecting to server.';
          }
          final msg = error.message;
          return (msg != null && msg.trim().isNotEmpty) ? msg : innerErr.isNotEmpty ? innerErr : error.toString();
        // ignore: no_default_cases
        default:
          final msg = error.message;
          return (msg != null && msg.trim().isNotEmpty) ? msg : error.toString();
      }
    }
    return error.toString();
  }

  Options _authOptions(String token, {String? idempotencyKey}) {
    return Options(
      headers: {
        'Authorization': 'Bearer $token',
        if (idempotencyKey != null) 'Idempotency-Key': idempotencyKey,
      },
    );
  }

  String _roleToApi(UserRole role) {
    return switch (role) {
      UserRole.superadmin => 'superadmin',
      UserRole.warehouseManager => 'warehouse_manager',
      UserRole.storeManager => 'store_manager',
      UserRole.staff => 'staff',
    };
  }

  UserRole _roleFromApi(String role) {
    return switch (role) {
      'superadmin' => UserRole.superadmin,
      'warehouse_manager' => UserRole.warehouseManager,
      'store_manager' => UserRole.storeManager,
      'staff' => UserRole.staff,
      _ => UserRole.storeManager,
    };
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

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
            switch (role) {
              UserRole.superadmin => 'GLOBAL',
              UserRole.warehouseManager => 'WH01',
              UserRole.storeManager => 'ST01',
              UserRole.staff => 'ST01',
            },
        token: payload['token'] as String? ?? _uuid.v4(),
        expiry: DateTime.now().add(const Duration(hours: 24)),
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<String> refreshToken(String currentToken) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/refresh',
        options: _authOptions(currentToken),
      );
      final payload = response.data ?? <String, dynamic>{};
      return payload['token'] as String? ?? currentToken;
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Products ──────────────────────────────────────────────────────────────

  /// Returns a rich list of products for listing with images.
  Future<List<Product>> fetchProducts(String token) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/products',
        queryParameters: {'limit': 200},
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final data = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return data.map((row) {
        final json = Map<String, dynamic>.from(row as Map);
        return Product.fromJson(json);
      }).toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  Future<List<InventoryItem>> fetchInventory(
    String locationId,
    String token,
  ) async {
    try {
      final qp = <String, dynamic>{'limit': 200};
      if (locationId.isNotEmpty) qp['location_id'] = locationId;
      final response = await _dio.get<Map<String, dynamic>>(
        '/inventory',
        queryParameters: qp,
        options: _authOptions(token),
      );

      final body = response.data ?? <String, dynamic>{};
      final data = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return data
          .map((row) => Map<String, dynamic>.from(row as Map))
          .map(
            (json) => InventoryItem(
              productId: (json['product_id'] ?? '') as String,
              sku: (json['sku'] ?? '') as String,
              title: (json['title'] ?? json['product_title'] ?? '') as String,
              locationId: (json['location_id'] ?? '') as String,
              availableStock: (json['available_stock'] as num? ?? 0).toInt(),
              reservedStock: (json['reserved_stock'] as num? ?? 0).toInt(),
              totalStock: (json['total_stock'] as num? ?? 0).toInt(),
              cachedAt: DateTime.now(),
              brand: (json['brand'] ?? '') as String,
              category: (json['category'] ?? '') as String,
              model: (json['model'] ?? '') as String,
              color: (json['color'] ?? '') as String,
              imageUrl: json['image_url'] as String?,
            ),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  Future<List<StoreOrder>> fetchOrders(UserSession session) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/orders',
        queryParameters: {'limit': 100},
        options: _authOptions(session.token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
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

        final items = (json['items'] as List<dynamic>? ?? const <dynamic>[])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .map(
              (it) => OrderItem(
                productId: it['product_id'] as String,
                title:
                    (it['title'] ?? it['product_id'] ?? 'Unknown Item')
                        as String,
                sku: (it['sku'] ?? 'NA') as String,
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
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> syncAction(SyncAction action, UserSession session) async {
    try {
      switch (action.type) {
        case SyncActionType.createOrder:
          await _dio.post(
            '/orders',
            options: _authOptions(session.token, idempotencyKey: action.id),
            data: {
              'store_id': action.payload['storeId'] ?? session.locationId,
              'warehouse_id': action.payload['warehouseId'] ?? 'WH01',
              'items': action.payload['items'] ?? <dynamic>[],
            },
          );
        case SyncActionType.markPacked:
          await _dio.patch(
            '/orders/${action.entityId}/pack',
            options: _authOptions(session.token, idempotencyKey: action.id),
          );
        case SyncActionType.markDispatched:
          await _dio.patch(
            '/orders/${action.entityId}/dispatch',
            options: _authOptions(session.token, idempotencyKey: action.id),
          );
        case SyncActionType.confirmReceive:
          await _dio.patch(
            '/orders/${action.entityId}/confirm-receive',
            options: _authOptions(session.token, idempotencyKey: action.id),
          );
        case SyncActionType.checkIn:
          await _dio.post(
            '/staff/attendance/check-in',
            options: _authOptions(session.token, idempotencyKey: action.id),
            data: {
              'lat': action.payload['lat'],
              'lng': action.payload['lng'],
              if (action.payload['notes'] != null)
                'notes': action.payload['notes'],
            },
          );
        case SyncActionType.checkOut:
          final attendanceId = action.entityId;
          await _dio.post(
            '/staff/attendance/$attendanceId/check-out',
            options: _authOptions(session.token, idempotencyKey: action.id),
            data: {
              'latitude': action.payload['lat'],
              'longitude': action.payload['lng'],
              if (action.payload['notes'] != null)
                'notes': action.payload['notes'],
            },
          );
        case SyncActionType.startTask:
          await _dio.patch(
            '/staff/tasks/${action.entityId}/start',
            options: _authOptions(session.token, idempotencyKey: action.id),
          );
        case SyncActionType.completeTask:
          await _dio.patch(
            '/staff/tasks/${action.entityId}/complete',
            options: _authOptions(session.token, idempotencyKey: action.id),
            data: {
              if (action.payload['completionNote'] != null)
                'completion_note': action.payload['completionNote'],
            },
          );
      }
    } catch (error) {
      throw Exception(_errorMessage(error));
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
      options: _authOptions(session.token, idempotencyKey: idempotencyKey),
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
      OrderStatus.confirmed => '/orders/$orderRef/approve',
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
      options: _authOptions(session.token, idempotencyKey: _uuid.v4()),
    );
  }

  // ── Locations ─────────────────────────────────────────────────────────────

  Future<List<AppLocation>> fetchLocations(String token) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/locations',
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return rows
          .map(
            (row) =>
                AppLocation.fromJson(Map<String, dynamic>.from(row as Map)),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Users / Employees ─────────────────────────────────────────────────────

  Future<List<EmployeeUser>> fetchUsers(String token) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/users',
        queryParameters: {'limit': 200},
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return rows
          .map(
            (row) =>
                EmployeeUser.fromJson(Map<String, dynamic>.from(row as Map)),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<EmployeeUser> createEmployeeUser({
    required String token,
    required String email,
    required String name,
    required String password,
    required UserRole role,
    String? locationId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/users',
        options: _authOptions(token),
        data: {
          'email': email,
          'name': name,
          'password': password,
          'role': _roleToApi(role),
          'location_id': role == UserRole.superadmin ? null : locationId,
        },
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return EmployeeUser.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<EmployeeUser> updateEmployeeStatus({
    required String token,
    required String userId,
    required bool active,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/users/$userId',
        options: _authOptions(token),
        data: {'status': active ? 'active' : 'inactive'},
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return EmployeeUser.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> deleteEmployeeUser({
    required String token,
    required String userId,
  }) async {
    try {
      await _dio.delete<void>('/users/$userId', options: _authOptions(token));
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Inventory CRUD ────────────────────────────────────────────────────────

  Future<InventoryItem> createInventoryItem({
    required String token,
    required String locationId,
    required String sku,
    required String title,
    required String brand,
    required int totalStock,
    String? category,
    String? model,
    String? color,
    List<int>? imageBytes,
    String? imageFilename,
  }) async {
    try {
      // Step 1: create the product
      final productRes = await _dio.post<Map<String, dynamic>>(
        '/products',
        options: _authOptions(token),
        data: {
          'title': title,
          'short_name': sku,
          'sku': sku,
          'brand': brand,
          'category': category ?? '',
          'model': model ?? '',
          'color': color ?? '',
          'status': 'present',
          'custom_style': 'default',
        },
      );
      final productData = (productRes.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      final productId = productData['id'] as String;

      // Step 2: upload image if provided
      if (imageBytes != null) {
        final ext = (imageFilename ?? 'image.jpg').split('.').last.toLowerCase();
        final mime = ext == 'png' ? 'png' : (ext == 'webp' ? 'webp' : 'jpeg');
        await _dio.post<void>(
          '/products/$productId/image',
          options: _authOptions(token),
          data: FormData.fromMap({
            'image': MultipartFile.fromBytes(
              imageBytes,
              filename: imageFilename ?? 'image.jpg',
              contentType: MediaType('image', mime),
            ),
          }),
        );
      }

      // Step 3: add stock to the location
      await _dio.post<void>(
        '/inventory/add',
        options: _authOptions(token),
        data: {
          'product_id': productId,
          'location_id': locationId,
          'quantity_to_add': totalStock,
          'reason': 'Initial stock',
        },
      );

      return InventoryItem(
        productId: productId,
        sku: sku,
        title: title,
        locationId: locationId,
        availableStock: totalStock,
        reservedStock: 0,
        totalStock: totalStock,
        cachedAt: DateTime.now(),
        brand: brand,
        category: category ?? '',
        model: model ?? '',
        color: color ?? '',
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<InventoryItem> updateInventoryItem({
    required String token,
    required String productRef,
    required String locationId,
    int? totalStock,
    int? reservedStock,
    int? issuedStock,
    String? title,
    String? brand,
    String? category,
    String? model,
    String? color,
    String? status,
    List<int>? imageBytes,
    String? imageFilename,
  }) async {
    try {
      // Update product metadata fields
      final productFields = <String, dynamic>{
        if (title != null) 'title': title,
        if (brand != null) 'brand': brand,
        if (category != null) 'category': category,
        if (model != null) 'model': model,
        if (color != null) 'color': color,
        if (status != null) 'status': status,
      };
      if (productFields.isNotEmpty) {
        await _dio.patch<void>(
          '/products/$productRef',
          options: _authOptions(token),
          data: productFields,
        );
      }

      // Upload image if provided
      if (imageBytes != null) {
        final ext = (imageFilename ?? 'image.jpg').split('.').last.toLowerCase();
        final mime = ext == 'png' ? 'png' : (ext == 'webp' ? 'webp' : 'jpeg');
        await _dio.post<void>(
          '/products/$productRef/image',
          options: _authOptions(token),
          data: FormData.fromMap({
            'image': MultipartFile.fromBytes(
              imageBytes,
              filename: imageFilename ?? 'image.jpg',
              contentType: MediaType('image', mime),
            ),
          }),
        );
      }

      // Adjust stock quantity
      if (totalStock != null) {
        await _dio.post<void>(
          '/inventory/adjust',
          options: _authOptions(token),
          data: {
            'product_id': productRef,
            'location_id': locationId,
            'new_quantity': totalStock,
            'reason': 'Manual update',
          },
        );
      }

      return InventoryItem(
        productId: productRef,
        sku: '',
        title: title ?? '',
        locationId: locationId,
        availableStock: totalStock ?? 0,
        reservedStock: reservedStock ?? 0,
        totalStock: totalStock ?? 0,
        cachedAt: DateTime.now(),
        brand: brand ?? '',
        category: category ?? '',
        model: model ?? '',
        color: color ?? '',
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> deleteInventoryItem({
    required String token,
    required String productRef,
    required String locationId,
  }) async {
    try {
      await _dio.delete<void>(
        '/inventory/$productRef',
        queryParameters: {'location_id': locationId},
        options: _authOptions(token),
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Legacy Staff Records (superadmin attendance) ──────────────────────────

  Future<StaffRecordsBundle> fetchMyStaffRecords(String token) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/staff/me',
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final data = (body['data'] as Map<String, dynamic>?) ?? body;
      return StaffRecordsBundle.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<StaffRecordsBundle> fetchStaffRecordsForAdmin({
    required String token,
    String? userId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/staff/records',
        queryParameters: {
          if (userId != null && userId.isNotEmpty) 'user_id': userId,
        },
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final data = (body['data'] as Map<String, dynamic>?) ?? body;
      return StaffRecordsBundle.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<AttendanceRecord> addAttendance({
    required String token,
    required String userId,
    required DateTime date,
    required AttendanceStatus status,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/staff/attendance',
        options: _authOptions(token),
        data: {
          'user_id': userId,
          'attendance_date': date.toIso8601String().split('T').first,
          'status': status.apiValue,
        },
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? (response.data ?? <String, dynamic>{});
      return AttendanceRecord.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Staff Members ─────────────────────────────────────────────────────────

  Future<List<StaffMember>> fetchStaffMembers({
    required String token,
    String? locationId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/staff/members',
        queryParameters: {
          if (locationId != null && locationId.isNotEmpty)
            'location_id': locationId,
          'limit': 200,
        },
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return rows
          .map(
            (row) =>
                StaffMember.fromJson(Map<String, dynamic>.from(row as Map)),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── GPS Attendance (Staff) ────────────────────────────────────────────────

  /// Records a check-in event. [lat]/[lng] are the device's GPS coordinates.
  Future<StaffAttendanceRecord> staffCheckIn({
    required String token,
    required double lat,
    required double lng,
    String? notes,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/staff/attendance/check-in',
        options: _authOptions(token, idempotencyKey: const Uuid().v4()),
        data: {
          'latitude': lat,
          'longitude': lng,
          if (notes != null) 'notes': notes,
        },
      );
      final data = (response.data?['data'] ?? response.data) as Map<String, dynamic>? ?? <String, dynamic>{};
      return StaffAttendanceRecord.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  /// Records a check-out event for an existing attendance record.
  Future<StaffAttendanceRecord> staffCheckOut({
    required String token,
    required String attendanceId,
    required double lat,
    required double lng,
    String? notes,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/staff/attendance/$attendanceId/check-out',
        options: _authOptions(token, idempotencyKey: const Uuid().v4()),
        data: {
          'latitude': lat,
          'longitude': lng,
          if (notes != null) 'notes': notes,
        },
      );
      final data = (response.data?['data'] ?? response.data) as Map<String, dynamic>? ?? <String, dynamic>{};
      return StaffAttendanceRecord.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<List<StaffAttendanceRecord>> fetchStaffAttendance({
    required String token,
    String? staffId,
    int? month,
    int? year,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/staff/attendance',
        queryParameters: {
          if (staffId != null) 'staff_id': staffId,
          if (month != null) 'month': month,
          if (year != null) 'year': year,
          'limit': 100,
        },
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return rows
          .map(
            (row) => StaffAttendanceRecord.fromJson(
              Map<String, dynamic>.from(row as Map),
            ),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<List<AttendanceMonthlySummary>> fetchAttendanceSummary({
    required String token,
    String? locationId,
    int? month,
    int? year,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/staff/attendance/summary',
        queryParameters: {
          if (locationId != null) 'location_id': locationId,
          if (month != null) 'month': month,
          if (year != null) 'year': year,
        },
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return rows
          .map(
            (row) => AttendanceMonthlySummary.fromJson(
              Map<String, dynamic>.from(row as Map),
            ),
          )
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  Future<List<Task>> fetchTasks({
    required String token,
    String? assignedToId,
    String? locationId,
    String? status,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/staff/tasks',
        queryParameters: {
          if (assignedToId != null) 'assigned_to_id': assignedToId,
          if (locationId != null) 'location_id': locationId,
          if (status != null) 'status': status,
          'limit': 100,
        },
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return rows
          .map((row) => Task.fromJson(Map<String, dynamic>.from(row as Map)))
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<Task> createTask({
    required String token,
    required String title,
    required String description,
    required String locationId,
    required String assignedToId,
    required TaskPriority priority,
    required DateTime dueDate,
    String? relatedOrderId,
    String? relatedEntityType,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/staff/tasks',
        options: _authOptions(token),
        data: {
          'title': title,
          'description': description,
          'location_id': locationId,
          'assigned_to_id': assignedToId,
          'priority': priority.apiValue,
          'due_date': dueDate.toIso8601String().split('T')[0],
          if (relatedOrderId != null) 'related_order_id': relatedOrderId,
          if (relatedEntityType != null)
            'related_entity_type': relatedEntityType,
        },
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return Task.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<Task> updateTaskStatus({
    required String token,
    required String taskId,
    required TaskStatus status,
    String? completionNote,
  }) async {
    try {
      final endpoint = status == TaskStatus.inProgress
          ? '/staff/tasks/$taskId/start'
          : '/staff/tasks/$taskId/complete';

      final response = await _dio.patch<Map<String, dynamic>>(
        endpoint,
        options: _authOptions(token),
        data: {
          if (completionNote != null) 'completion_note': completionNote,
        },
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return Task.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  InventoryItem _inventoryFromApi(Map<String, dynamic> json) {
    return InventoryItem(
      productId: json['product_id'] as String,
      sku: json['sku'] as String,
      title: json['title'] as String,
      locationId: json['location_id'] as String,
      availableStock: (json['available_stock'] as num).toInt(),
      reservedStock: (json['reserved_stock'] as num).toInt(),
      totalStock: (json['total_stock'] as num).toInt(),
      cachedAt: DateTime.now(),
      brand: (json['brand'] ?? '') as String,
      category: (json['category'] ?? '') as String,
      model: (json['model'] ?? '') as String,
      color: (json['color'] ?? '') as String,
      imageUrl: json['image_url'] as String?,
    );
  }

  // ── Orders — extended ─────────────────────────────────────────────────────

  Future<void> rejectOrder({
    required String token,
    required String orderRef,
    required String reason,
  }) async {
    try {
      await _dio.patch(
        '/orders/$orderRef/reject',
        options: _authOptions(token, idempotencyKey: _uuid.v4()),
        data: {'reason': reason},
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> dispatchOrderWithNotes({
    required String token,
    required String orderRef,
    String? notes,
  }) async {
    try {
      await _dio.patch(
        '/orders/$orderRef/dispatch',
        options: _authOptions(token, idempotencyKey: _uuid.v4()),
        data: {if (notes != null && notes.isNotEmpty) 'notes': notes},
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> createMultiItemOrderOnline({
    required UserSession session,
    required String warehouseId,
    required List<Map<String, dynamic>> items,
    required String idempotencyKey,
  }) async {
    try {
      await _dio.post(
        '/orders',
        options: _authOptions(session.token, idempotencyKey: idempotencyKey),
        data: {
          'store_id': session.locationId,
          'warehouse_id': warehouseId,
          'items': items,
        },
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Inventory — adjust stock ───────────────────────────────────────────────

  Future<void> adjustStock({
    required String token,
    required String productRef,
    required String locationId,
    required int newQuantity,
    required String reason,
    String? notes,
  }) async {
    try {
      await _dio.post(
        '/inventory/adjust',
        options: _authOptions(token),
        data: {
          'product_id': productRef,
          'location_id': locationId,
          'new_quantity': newQuantity,
          'reason': reason,
          if (notes != null) 'notes': notes,
        },
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<List<StockMovement>> fetchStockMovements({
    required String token,
    String? locationId,
    String? productId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/inventory/movements',
        queryParameters: {
          if (locationId != null) 'location_id': locationId,
          if (productId != null) 'product_id': productId,
          'limit': 100,
        },
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return rows
          .map((r) => StockMovement.fromJson(Map<String, dynamic>.from(r as Map)))
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Stock Transfers ────────────────────────────────────────────────────────

  Future<void> transferStock({
    required String token,
    required String fromLocationId,
    required String toLocationId,
    required String productId,
    required int quantity,
    String? note,
  }) async {
    try {
      await _dio.post(
        '/transfers',
        options: _authOptions(token, idempotencyKey: _uuid.v4()),
        data: {
          'from_location_id': fromLocationId,
          'to_location_id': toLocationId,
          'product_id': productId,
          'quantity': quantity,
          if (note != null) 'note': note,
        },
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Bulk Orders ───────────────────────────────────────────────────────────

  Future<List<BulkOrder>> fetchBulkOrders(String token) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/bulk-orders',
        queryParameters: {'limit': 100},
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return rows
          .map((r) => BulkOrder.fromJson(Map<String, dynamic>.from(r as Map)))
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> transitionBulkOrder({
    required String token,
    required String orderId,
    required BulkOrderStatus target,
  }) async {
    final endpoint = switch (target) {
      BulkOrderStatus.packed => '/bulk-orders/$orderId/pack',
      BulkOrderStatus.dispatched => '/bulk-orders/$orderId/dispatch',
      BulkOrderStatus.cancelled => '/bulk-orders/$orderId/cancel',
      _ => null,
    };
    if (endpoint == null) return;
    try {
      await _dio.patch(
        endpoint,
        options: _authOptions(token, idempotencyKey: _uuid.v4()),
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> createBulkOrder({
    required String token,
    required String clientId,
    required String warehouseId,
    required List<Map<String, dynamic>> items,
  }) async {
    try {
      await _dio.post(
        '/bulk-orders',
        options: _authOptions(token, idempotencyKey: _uuid.v4()),
        data: {
          'client_store_id': clientId,
          'warehouse_id': warehouseId,
          'items': items,
        },
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Products CRUD ─────────────────────────────────────────────────────────

  Future<Product> createProduct({
    required String token,
    required String title,
    required String shortName,
    required String sku,
    required String brand,
    required String category,
    required String model,
    required String color,
    String status = 'present',
    String customStyle = 'default',
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/products',
        options: _authOptions(token),
        data: {
          'title': title,
          'short_name': shortName,
          'sku': sku,
          'brand': brand,
          'category': category,
          'model': model,
          'color': color,
          'status': status,
          'custom_style': customStyle,
        },
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return Product.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<Product> updateProduct({
    required String token,
    required String productId,
    String? title,
    String? shortName,
    String? brand,
    String? category,
    String? model,
    String? color,
    String? status,
    String? customStyle,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/products/$productId',
        options: _authOptions(token),
        data: {
          if (title != null) 'title': title,
          if (shortName != null) 'short_name': shortName,
          if (brand != null) 'brand': brand,
          if (category != null) 'category': category,
          if (model != null) 'model': model,
          if (color != null) 'color': color,
          if (status != null) 'status': status,
          if (customStyle != null) 'custom_style': customStyle,
        },
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return Product.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> deleteProduct({
    required String token,
    required String productId,
  }) async {
    try {
      await _dio.delete<void>('/products/$productId', options: _authOptions(token));
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  /// Upload (or replace) the image for an existing product.
  /// Returns the public URL of the uploaded image.
  Future<String> uploadProductImage({
    required String token,
    required String productId,
    required Uint8List bytes,
    required String filename,
  }) async {
    try {
      final ext = filename.split('.').last.toLowerCase();
      final mime = ext == 'png' ? 'png' : (ext == 'webp' ? 'webp' : 'jpeg');
      final form = FormData.fromMap({
        'image': MultipartFile.fromBytes(
          bytes,
          filename: filename,
          contentType: MediaType('image', mime),
        ),
      });
      final response = await _dio.post<Map<String, dynamic>>(
        '/products/$productId/image',
        options: _authOptions(token),
        data: form,
      );
      final data = response.data ?? <String, dynamic>{};
      return (data['data']?['url'] as String?) ?? '';
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  Future<({List<AppNotification> items, int unreadCount})> fetchNotifications({
    required String token,
    bool? unreadOnly,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/notifications',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (unreadOnly == true) 'read': 'false',
        },
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final items = (body['data'] as List<dynamic>? ?? const <dynamic>[])
          .map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      final unreadCount = (body['unread_count'] as num?)?.toInt() ?? 0;
      return (items: items, unreadCount: unreadCount);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> markNotificationRead({
    required String token,
    required String notificationId,
  }) async {
    try {
      await _dio.patch<void>(
        '/notifications/$notificationId/read',
        options: _authOptions(token),
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> markAllNotificationsRead({required String token}) async {
    try {
      await _dio.patch<void>(
        '/notifications/read-all',
        options: _authOptions(token),
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Locations CRUD ────────────────────────────────────────────────────────

  Future<AppLocation> createLocation({
    required String token,
    required String code,
    required String name,
    required String type,
    String address = '',
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/locations',
        options: _authOptions(token),
        data: {'location_code': code, 'name': name, 'type': type, 'address': address},
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return AppLocation.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<AppLocation> updateLocation({
    required String token,
    required String locationId,
    String? code,
    String? name,
    String? address,
    String? status,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/locations/$locationId',
        options: _authOptions(token),
        data: {
          if (code != null) 'location_code': code,
          if (name != null) 'name': name,
          if (address != null) 'address': address,
          if (status != null) 'status': status,
        },
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return AppLocation.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Clients CRUD ──────────────────────────────────────────────────────────

  Future<List<Client>> fetchClients(String token) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/clients',
        queryParameters: {'limit': 200},
        options: _authOptions(token),
      );
      final body = response.data ?? <String, dynamic>{};
      final rows = (body['data'] as List<dynamic>?) ?? <dynamic>[];
      return rows
          .map((r) => Client.fromJson(Map<String, dynamic>.from(r as Map)))
          .toList();
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<Client> createClient({
    required String token,
    required String name,
    required String code,
    required String contactName,
    required String contactEmail,
    String phone = '',
    String address = '',
    String city = '',
    String gstNumber = '',
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/clients',
        options: _authOptions(token),
        data: {
          'name': name,
          'code': code,
          'contact_name': contactName,
          'contact_email': contactEmail,
          'phone': phone,
          'address': address,
          'city': city,
          'gst_number': gstNumber,
        },
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return Client.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<Client> updateClientStatus({
    required String token,
    required String clientId,
    required String status,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/clients/$clientId/status',
        options: _authOptions(token),
        data: {'status': status},
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return Client.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ── Users — extended ──────────────────────────────────────────────────────

  Future<EmployeeUser> updateEmployee({
    required String token,
    required String userId,
    String? name,
    String? email,
    String? role,
    String? locationId,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/users/$userId',
        options: _authOptions(token),
        data: {
          if (name != null) 'name': name,
          if (email != null) 'email': email,
          if (role != null) 'role': role,
          if (locationId != null) 'location_id': locationId,
        },
      );
      final data = (response.data?['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      return EmployeeUser.fromJson(data);
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  Future<void> resetEmployeePassword({
    required String token,
    required String userId,
    required String newPassword,
  }) async {
    try {
      await _dio.patch(
        '/users/$userId',
        options: _authOptions(token),
        data: {'password': newPassword},
      );
    } catch (error) {
      throw Exception(_errorMessage(error));
    }
  }

  // ─── Rich mock product catalog ──────────────────────────────────

  static final List<Product> _mockProducts = [
    const Product(
      id: 'P001',
      title: 'Samsung 55" QLED Smart TV',
      shortName: 'TV-55-SM',
      sku: 'SKU-TV-001',
      brand: 'Samsung',
      category: 'Electronics',
      model: 'QN55Q80C',
      color: 'Titan Black',
      status: 'present',
      customStyle: 'premium',
      imageUrl:
          'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P002',
      title: 'LG Double Door Refrigerator',
      shortName: 'FRD-DD-LG',
      sku: 'SKU-FRD-001',
      brand: 'LG',
      category: 'Home Appliances',
      model: 'GL-T292RPZX',
      color: 'Shiny Steel',
      status: 'present',
      customStyle: 'featured',
      imageUrl:
          'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P003',
      title: 'Sony WH-1000XM5 Headphones',
      shortName: 'HP-XM5-SN',
      sku: 'SKU-HP-001',
      brand: 'Sony',
      category: 'Audio',
      model: 'WH-1000XM5',
      color: 'Midnight Blue',
      status: 'present',
      customStyle: 'premium',
      imageUrl:
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P004',
      title: 'Apple MacBook Pro 14"',
      shortName: 'MBP-14-AP',
      sku: 'SKU-LPT-001',
      brand: 'Apple',
      category: 'Computers',
      model: 'M3 Pro',
      color: 'Space Black',
      status: 'present',
      customStyle: 'premium',
      imageUrl:
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P005',
      title: 'Dyson V15 Detect Vacuum',
      shortName: 'VAC-V15-DY',
      sku: 'SKU-VAC-001',
      brand: 'Dyson',
      category: 'Home Appliances',
      model: 'V15 Detect',
      color: 'Yellow Nickel',
      status: 'present',
      customStyle: 'featured',
      imageUrl:
          'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P006',
      title: 'Samsung Galaxy S24 Ultra',
      shortName: 'PH-S24U-SM',
      sku: 'SKU-PH-001',
      brand: 'Samsung',
      category: 'Smartphones',
      model: 'S24 Ultra',
      color: 'Titanium Violet',
      status: 'present',
      customStyle: 'premium',
      imageUrl:
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P007',
      title: 'Bosch Front Load Washer 8kg',
      shortName: 'WSH-8K-BS',
      sku: 'SKU-WSH-001',
      brand: 'Bosch',
      category: 'Home Appliances',
      model: 'WAJ2846SIN',
      color: 'Silver',
      status: 'present',
      customStyle: 'default',
      imageUrl:
          'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=300&h=300&fit=crop',
    ),
    const Product(
      id: 'P008',
      title: 'LG 27" UltraGear Monitor',
      shortName: 'MON-27-LG',
      sku: 'SKU-MON-001',
      brand: 'LG',
      category: 'Electronics',
      model: '27GR95QE',
      color: 'Matte Black',
      status: 'present',
      customStyle: 'featured',
      imageUrl:
          'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&h=300&fit=crop',
    ),
  ];

  static final List<StoreOrder> _mockOrders = [
    StoreOrder(
      id: 'O1',
      orderId: 'ORD-ST01-20260412-0001',
      storeId: 'ST01',
      warehouseId: 'WH01',
      status: OrderStatus.confirmed,
      items: const [
        OrderItem(
          productId: 'P001',
          title: 'Samsung 55" QLED Smart TV',
          sku: 'SKU-TV-001',
          quantity: 5,
        ),
      ],
      reservedAmount: 5,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
      syncStatus: SyncStatus.synced,
    ),
    StoreOrder(
      id: 'O2',
      orderId: 'ORD-ST01-20260412-0002',
      storeId: 'ST01',
      warehouseId: 'WH01',
      status: OrderStatus.packed,
      items: const [
        OrderItem(
          productId: 'P002',
          title: 'LG Double Door Refrigerator',
          sku: 'SKU-FRD-001',
          quantity: 3,
        ),
      ],
      reservedAmount: 3,
      createdAt: DateTime.now().subtract(const Duration(hours: 5)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 1)),
      syncStatus: SyncStatus.synced,
    ),
    StoreOrder(
      id: 'O3',
      orderId: 'ORD-ST01-20260411-0003',
      storeId: 'ST01',
      warehouseId: 'WH01',
      status: OrderStatus.dispatched,
      items: const [
        OrderItem(
          productId: 'P003',
          title: 'Sony WH-1000XM5 Headphones',
          sku: 'SKU-HP-001',
          quantity: 10,
        ),
        OrderItem(
          productId: 'P006',
          title: 'Samsung Galaxy S24 Ultra',
          sku: 'SKU-PH-001',
          quantity: 4,
        ),
      ],
      reservedAmount: 14,
      createdAt: DateTime.now().subtract(const Duration(hours: 26)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 6)),
      syncStatus: SyncStatus.synced,
    ),
    StoreOrder(
      id: 'O4',
      orderId: 'ORD-ST01-20260410-0004',
      storeId: 'ST01',
      warehouseId: 'WH01',
      status: OrderStatus.completed,
      items: const [
        OrderItem(
          productId: 'P004',
          title: 'Apple MacBook Pro 14"',
          sku: 'SKU-LPT-001',
          quantity: 2,
        ),
      ],
      reservedAmount: 2,
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
      updatedAt: DateTime.now().subtract(const Duration(days: 2)),
      syncStatus: SyncStatus.synced,
    ),
  ];
}
