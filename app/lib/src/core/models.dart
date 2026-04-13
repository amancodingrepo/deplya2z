enum UserRole { superadmin, warehouseManager, storeManager }

enum OrderStatus {
  draft,
  confirmed,
  packed,
  dispatched,
  storeReceived,
  completed,
  cancelled,
}

enum SyncStatus { local, synced, pendingUpload, failed }

enum SyncActionType { createOrder, confirmReceive, markPacked, markDispatched }

class UserSession {
  const UserSession({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.locationId,
    required this.token,
    required this.expiry,
  });

  final String id;
  final String name;
  final String email;
  final UserRole role;
  final String locationId;
  final String token;
  final DateTime expiry;

  bool get shouldRefreshToken =>
      expiry.difference(DateTime.now()).inHours < 2 &&
      expiry.isAfter(DateTime.now());

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'role': role.name,
    'locationId': locationId,
    'token': token,
    'expiry': expiry.toIso8601String(),
  };

  factory UserSession.fromJson(Map<dynamic, dynamic> json) => UserSession(
    id: json['id'] as String,
    name: json['name'] as String,
    email: json['email'] as String,
    role: UserRole.values.byName(json['role'] as String),
    locationId: json['locationId'] as String,
    token: json['token'] as String,
    expiry: DateTime.parse(json['expiry'] as String),
  );
}

class OrderItem {
  const OrderItem({
    required this.productId,
    required this.title,
    required this.sku,
    required this.quantity,
  });

  final String productId;
  final String title;
  final String sku;
  final int quantity;

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'title': title,
    'sku': sku,
    'quantity': quantity,
  };

  factory OrderItem.fromJson(Map<dynamic, dynamic> json) => OrderItem(
    productId: json['productId'] as String,
    title: json['title'] as String,
    sku: json['sku'] as String,
    quantity: json['quantity'] as int,
  );
}

class StoreOrder {
  const StoreOrder({
    required this.id,
    required this.orderId,
    required this.storeId,
    required this.warehouseId,
    required this.status,
    required this.items,
    required this.reservedAmount,
    required this.createdAt,
    required this.updatedAt,
    required this.syncStatus,
  });

  final String id;
  final String orderId;
  final String storeId;
  final String warehouseId;
  final OrderStatus status;
  final List<OrderItem> items;
  final int reservedAmount;
  final DateTime createdAt;
  final DateTime updatedAt;
  final SyncStatus syncStatus;

  StoreOrder copyWith({
    OrderStatus? status,
    DateTime? updatedAt,
    SyncStatus? syncStatus,
    List<OrderItem>? items,
  }) {
    return StoreOrder(
      id: id,
      orderId: orderId,
      storeId: storeId,
      warehouseId: warehouseId,
      status: status ?? this.status,
      items: items ?? this.items,
      reservedAmount: reservedAmount,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'orderId': orderId,
    'storeId': storeId,
    'warehouseId': warehouseId,
    'status': status.name,
    'items': items.map((e) => e.toJson()).toList(),
    'reservedAmount': reservedAmount,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'syncStatus': syncStatus.name,
  };

  factory StoreOrder.fromJson(Map<dynamic, dynamic> json) => StoreOrder(
    id: json['id'] as String,
    orderId: json['orderId'] as String,
    storeId: json['storeId'] as String,
    warehouseId: json['warehouseId'] as String,
    status: OrderStatus.values.byName(json['status'] as String),
    items: (json['items'] as List<dynamic>)
        .map((e) => OrderItem.fromJson(e as Map<dynamic, dynamic>))
        .toList(),
    reservedAmount: json['reservedAmount'] as int,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
    syncStatus: SyncStatus.values.byName(json['syncStatus'] as String),
  );
}

class Product {
  const Product({
    required this.id,
    required this.title,
    required this.shortName,
    required this.sku,
    required this.brand,
    required this.category,
    required this.model,
    required this.color,
    required this.status,
    required this.customStyle,
    this.imageUrl,
    this.localImagePath,
  });

  final String id;
  final String title;
  final String shortName;
  final String sku;
  final String brand;
  final String category;
  final String model;
  final String color;
  final String status; // present | inactive | discontinued
  final String customStyle; // default | premium | featured | sale | catalogue_ready
  final String? imageUrl;
  final String? localImagePath;

  Product copyWith({
    String? imageUrl,
    String? localImagePath,
    String? status,
  }) {
    return Product(
      id: id,
      title: title,
      shortName: shortName,
      sku: sku,
      brand: brand,
      category: category,
      model: model,
      color: color,
      status: status ?? this.status,
      customStyle: customStyle,
      imageUrl: imageUrl ?? this.imageUrl,
      localImagePath: localImagePath ?? this.localImagePath,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'shortName': shortName,
    'sku': sku,
    'brand': brand,
    'category': category,
    'model': model,
    'color': color,
    'status': status,
    'customStyle': customStyle,
    'imageUrl': imageUrl,
    'localImagePath': localImagePath,
  };

  factory Product.fromJson(Map<dynamic, dynamic> json) => Product(
    id: json['id'] as String,
    title: json['title'] as String,
    shortName: (json['shortName'] ?? json['short_name'] ?? '') as String,
    sku: json['sku'] as String,
    brand: (json['brand'] ?? '') as String,
    category: (json['category'] ?? '') as String,
    model: (json['model'] ?? '') as String,
    color: (json['color'] ?? '') as String,
    status: (json['status'] ?? 'present') as String,
    customStyle: (json['customStyle'] ?? json['custom_style'] ?? 'default') as String,
    imageUrl: json['imageUrl'] as String?,
    localImagePath: json['localImagePath'] as String?,
  );
}

class InventoryItem {
  const InventoryItem({
    required this.productId,
    required this.sku,
    required this.title,
    required this.locationId,
    required this.availableStock,
    required this.reservedStock,
    required this.totalStock,
    required this.cachedAt,
    this.brand = '',
    this.category = '',
    this.model = '',
    this.color = '',
    this.imageUrl,
    this.localImagePath,
  });

  final String productId;
  final String sku;
  final String title;
  final String locationId;
  final int availableStock;
  final int reservedStock;
  final int totalStock;
  final DateTime cachedAt;
  final String brand;
  final String category;
  final String model;
  final String color;
  final String? imageUrl;
  final String? localImagePath;

  bool get isLowStock => availableStock <= 3;

  InventoryItem copyWith({
    String? imageUrl,
    String? localImagePath,
  }) {
    return InventoryItem(
      productId: productId,
      sku: sku,
      title: title,
      locationId: locationId,
      availableStock: availableStock,
      reservedStock: reservedStock,
      totalStock: totalStock,
      cachedAt: cachedAt,
      brand: brand,
      category: category,
      model: model,
      color: color,
      imageUrl: imageUrl ?? this.imageUrl,
      localImagePath: localImagePath ?? this.localImagePath,
    );
  }

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'sku': sku,
    'title': title,
    'locationId': locationId,
    'availableStock': availableStock,
    'reservedStock': reservedStock,
    'totalStock': totalStock,
    'cachedAt': cachedAt.toIso8601String(),
    'brand': brand,
    'category': category,
    'model': model,
    'color': color,
    'imageUrl': imageUrl,
    'localImagePath': localImagePath,
  };

  factory InventoryItem.fromJson(Map<dynamic, dynamic> json) => InventoryItem(
    productId: json['productId'] as String,
    sku: json['sku'] as String,
    title: json['title'] as String,
    locationId: json['locationId'] as String,
    availableStock: json['availableStock'] as int,
    reservedStock: json['reservedStock'] as int,
    totalStock: json['totalStock'] as int,
    cachedAt: DateTime.parse(json['cachedAt'] as String),
    brand: (json['brand'] ?? '') as String,
    category: (json['category'] ?? '') as String,
    model: (json['model'] ?? '') as String,
    color: (json['color'] ?? '') as String,
    imageUrl: json['imageUrl'] as String?,
    localImagePath: json['localImagePath'] as String?,
  );
}

class SyncAction {
  const SyncAction({
    required this.id,
    required this.type,
    required this.entityId,
    required this.payload,
    required this.createdAt,
    required this.status,
    required this.retryCount,
    this.errorMessage,
  });

  final String id;
  final SyncActionType type;
  final String entityId;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final SyncStatus status;
  final int retryCount;
  final String? errorMessage;

  SyncAction copyWith({
    SyncStatus? status,
    int? retryCount,
    String? errorMessage,
  }) {
    return SyncAction(
      id: id,
      type: type,
      entityId: entityId,
      payload: payload,
      createdAt: createdAt,
      status: status ?? this.status,
      retryCount: retryCount ?? this.retryCount,
      errorMessage: errorMessage,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.name,
    'entityId': entityId,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
    'status': status.name,
    'retryCount': retryCount,
    'errorMessage': errorMessage,
  };

  factory SyncAction.fromJson(Map<dynamic, dynamic> json) => SyncAction(
    id: json['id'] as String,
    type: SyncActionType.values.byName(json['type'] as String),
    entityId: json['entityId'] as String,
    payload: Map<String, dynamic>.from(
      json['payload'] as Map<dynamic, dynamic>,
    ),
    createdAt: DateTime.parse(json['createdAt'] as String),
    status: SyncStatus.values.byName(json['status'] as String),
    retryCount: json['retryCount'] as int,
    errorMessage: json['errorMessage'] as String?,
  );
}

class AppLocation {
  const AppLocation({
    required this.id,
    required this.code,
    required this.name,
    required this.type,
    required this.status,
  });

  final String id;
  final String code;
  final String name;
  final String type;
  final String status;

  factory AppLocation.fromJson(Map<dynamic, dynamic> json) => AppLocation(
    id: json['id'] as String,
    code: json['location_code'] as String,
    name: json['name'] as String,
    type: json['type'] as String,
    status: (json['status'] ?? 'active') as String,
  );
}

class EmployeeUser {
  const EmployeeUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.status,
    required this.locationId,
    required this.locationName,
    required this.createdAt,
  });

  final String id;
  final String email;
  final String name;
  final UserRole role;
  final String status;
  final String? locationId;
  final String? locationName;
  final DateTime createdAt;

  String get roleLabel => switch (role) {
    UserRole.superadmin => 'Superadmin',
    UserRole.warehouseManager => 'Warehouse Manager',
    UserRole.storeManager => 'Store Manager',
  };

  bool get isActive => status == 'active';

  factory EmployeeUser.fromJson(Map<dynamic, dynamic> json) => EmployeeUser(
    id: json['id'] as String,
    email: json['email'] as String,
    name: json['name'] as String,
    role: switch (json['role'] as String) {
      'superadmin' => UserRole.superadmin,
      'warehouse_manager' => UserRole.warehouseManager,
      _ => UserRole.storeManager,
    },
    status: (json['status'] ?? 'active') as String,
    locationId: json['location_id'] as String?,
    locationName: json['location_name'] as String?,
    createdAt: DateTime.tryParse((json['created_at'] ?? '') as String) ??
        DateTime.now(),
  );
}
