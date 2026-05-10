import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/inventory_filter_bar.dart';
import 'widgets/inventory_catalog_tools.dart';
import 'widgets/glass_card.dart';
import 'widgets/gradient_button.dart';
import 'widgets/metric_card.dart';
import 'widgets/order_journey_strip.dart';
import 'widgets/product_image.dart';
import 'widgets/status_badge.dart';

class StoreScreen extends ConsumerStatefulWidget {
  const StoreScreen({super.key});

  @override
  ConsumerState<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends ConsumerState<StoreScreen> {
  int _navIndex = 0;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.backgroundGradient),
        child: SafeArea(
          child: IndexedStack(
            index: _navIndex,
            children: [
              _DashboardTab(state: state, controller: controller),
              _ProductListTab(state: state, controller: controller),
              _OrdersTab(state: state, controller: controller),
              _SettingsTab(controller: controller, state: state),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(
          top: BorderSide(color: AppTheme.surfaceLight.withValues(alpha: 0.3)),
        ),
      ),
      child: BottomNavigationBar(
        currentIndex: _navIndex,
        onTap: (i) => setState(() => _navIndex = i),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_rounded),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shopping_bag_rounded),
            label: 'Products',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_rounded),
            label: 'My Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings_rounded),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

String _orderSummary(StoreOrder order) {
  if (order.items.isEmpty) {
    return 'No items';
  }

  final first = order.items.first;
  if (order.items.length == 1) {
    return '${first.title} • Qty ${first.quantity}';
  }

  return '${first.title} • Qty ${first.quantity} + ${order.items.length - 1} more';
}

// ══════════════════════════════════════════════════════════════════════════════
// Dashboard Tab — Store Manager
// ══════════════════════════════════════════════════════════════════════════════

class _DashboardTab extends StatelessWidget {
  const _DashboardTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  Widget build(BuildContext context) {
    final orders = state.orders as List<StoreOrder>;
    final inventory = state.inventory as List<InventoryItem>;
    final syncQueue = state.syncQueue as List;
    final pending = orders.where(
      (o) =>
          o.status == OrderStatus.draft ||
          o.status == OrderStatus.confirmed ||
          o.status == OrderStatus.pendingWarehouseApproval,
    );
    final lowStock = inventory.where((i) => i.isLowStock);
    final dispatched = orders
        .where((o) => o.status == OrderStatus.dispatched)
        .toList();

    return RefreshIndicator(
      onRefresh: () => controller.refreshForCurrentRole(),
      color: AppTheme.primary,
      backgroundColor: AppTheme.bgCard,
      child: CustomScrollView(
        slivers: [
          // Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back 👋',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Store Hub',
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => controller.refreshForCurrentRole(),
                    icon: const Icon(Icons.refresh_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: AppTheme.bgCard,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => controller.syncPendingActions(),
                    icon: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        const Icon(Icons.sync_rounded),
                        if (syncQueue.isNotEmpty)
                          Positioned(
                            right: -4,
                            top: -4,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 4,
                                vertical: 1,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.warning,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '${syncQueue.length}',
                                style: const TextStyle(
                                  color: Colors.black,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    style: IconButton.styleFrom(
                      backgroundColor: AppTheme.bgCard,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Metrics
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Row(
                children: [
                  MetricCard(
                    icon: Icons.inventory_2_rounded,
                    label: 'Products',
                    value: inventory.length,
                    color: AppTheme.primary,
                  ),
                  const SizedBox(width: 10),
                  MetricCard(
                    icon: Icons.pending_actions_rounded,
                    label: 'Pending',
                    value: pending.length,
                    color: AppTheme.info,
                  ),
                  const SizedBox(width: 10),
                  MetricCard(
                    icon: Icons.warning_amber_rounded,
                    label: 'Low Stock',
                    value: lowStock.length,
                    color: AppTheme.error,
                  ),
                ],
              ),
            ),
          ),

          // Awaiting Confirmation
          if (dispatched.isNotEmpty) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                child: Row(
                  children: [
                    const Icon(
                      Icons.local_shipping_rounded,
                      color: AppTheme.warning,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Awaiting Confirmation',
                      style: TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.warning.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${dispatched.length}',
                        style: const TextStyle(
                          color: AppTheme.warning,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final order = dispatched[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    order.orderId,
                                    style: const TextStyle(
                                      color: AppTheme.textPrimary,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _orderSummary(order),
                                    style: const TextStyle(
                                      color: AppTheme.textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                  if (order.warehouseName.isNotEmpty) ...[
                                    const SizedBox(height: 3),
                                    Text(
                                      'From ${order.warehouseName}',
                                      style: const TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            StatusBadge(status: order.status, compact: true),
                          ],
                        ),
                        const SizedBox(height: 10),
                        OrderJourneyStrip(status: order.status, compact: true),
                        const SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerRight,
                          child: GradientButton(
                            label: 'Confirm Receipt',
                            icon: Icons.check_circle_outline_rounded,
                            compact: true,
                            gradient: const LinearGradient(
                              colors: [Color(0xFF4ADE80), Color(0xFF22C55E)],
                            ),
                            onPressed: () {
                              _showReceiptDialog(context, order, controller);
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }, childCount: dispatched.length),
            ),
          ],

          // Message
          if (state.message != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.info.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    border: Border.all(
                      color: AppTheme.info.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.info_outline_rounded,
                        color: AppTheme.info,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          state.message! as String,
                          style: const TextStyle(
                            color: AppTheme.info,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Product List Tab — Blinkit-style product grid with multi-color cart
// ══════════════════════════════════════════════════════════════════════════════

class _ProductListTab extends ConsumerStatefulWidget {
  const _ProductListTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  ConsumerState<_ProductListTab> createState() => _ProductListTabState();
}

class _ProductListTabState extends ConsumerState<_ProductListTab> {
  String _search = '';
  String _selectedCategory = '';
  String _selectedDevice = '';
  String _selectedBrand = '';
  String _selectedModel = '';
  String _selectedColor = '';
  InventoryStockFilter _stockFilter = InventoryStockFilter.all;
  InventorySortOption _sortOption = InventorySortOption.relevance;
  final Map<String, int> _cartQtyByProductId = <String, int>{};
  String? _selectedWarehouseRef;
  bool _placingOrder = false;

  int _displayPriceForSku(String sku) {
    final hash = sku.codeUnits.fold<int>(0, (sum, code) => sum + code);
    return 79 + (hash % 23) * 17;
  }

  int _displayMrpForSku(String sku) {
    final price = _displayPriceForSku(sku);
    return price + (price * 0.14).round();
  }

  String _formatPrice(int value) {
    final formatter = NumberFormat.currency(symbol: 'Rs ', decimalDigits: 0);
    return formatter.format(value);
  }

  List<_ProductGroup> _groupProducts(List<InventoryItem> items) {
    final grouped = <String, List<InventoryItem>>{};
    for (final item in items) {
      final key =
          '${item.title.trim().toLowerCase()}|${item.brand.trim().toLowerCase()}|${item.model.trim().toLowerCase()}';
      grouped.putIfAbsent(key, () => <InventoryItem>[]).add(item);
    }

    final groups = grouped.entries.map((entry) {
      final variants = [
        ...entry.value,
      ]..sort((a, b) => a.color.toLowerCase().compareTo(b.color.toLowerCase()));
      return _ProductGroup(
        key: entry.key,
        title: variants.first.title,
        brand: variants.first.brand,
        model: variants.first.model,
        imageUrl: variants.first.imageUrl,
        localImagePath: variants.first.localImagePath,
        variants: variants,
        unitPrice: _displayPriceForSku(variants.first.sku),
        mrpPrice: _displayMrpForSku(variants.first.sku),
      );
    }).toList();

    if (_sortOption == InventorySortOption.nameAsc) {
      groups.sort(
        (a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()),
      );
    } else if (_sortOption == InventorySortOption.stockHighToLow) {
      groups.sort((a, b) => b.availableStock.compareTo(a.availableStock));
    } else if (_sortOption == InventorySortOption.stockLowToHigh) {
      groups.sort((a, b) => a.availableStock.compareTo(b.availableStock));
    } else if (_search.trim().isNotEmpty) {
      final query = _search.trim().toLowerCase();
      groups.sort((a, b) {
        final aStarts = a.title.toLowerCase().startsWith(query) ? 0 : 1;
        final bStarts = b.title.toLowerCase().startsWith(query) ? 0 : 1;
        if (aStarts != bStarts) {
          return aStarts.compareTo(bStarts);
        }
        return a.title.toLowerCase().compareTo(b.title.toLowerCase());
      });
    } else {
      groups.sort(
        (a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()),
      );
    }

    return groups;
  }

  void _openVariantPicker(_ProductGroup group) {
    final draft = <String, int>{
      for (final variant in group.variants)
        variant.productId: _cartQtyByProductId[variant.productId] ?? 0,
    };
    var selectedVariantId = group.variants.first.productId;
    for (final variant in group.variants) {
      if ((draft[variant.productId] ?? 0) > 0) {
        selectedVariantId = variant.productId;
        break;
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final totalQty = draft.values.fold<int>(0, (sum, qty) => sum + qty);
          final selectedVariant = group.variants.firstWhere(
            (variant) => variant.productId == selectedVariantId,
            orElse: () => group.variants.first,
          );
          final selectedLabel = selectedVariant.color.trim().isEmpty
              ? 'Default'
              : selectedVariant.color;
          final selectedQty = draft[selectedVariant.productId] ?? 0;
          return Container(
            padding: EdgeInsets.fromLTRB(
              20,
              16,
              20,
              MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
              border: Border.all(color: AppTheme.surfaceLight),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppTheme.textMuted.withValues(alpha: 0.35),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      ProductImage(
                        imageUrl: selectedVariant.imageUrl,
                        localPath: selectedVariant.localImagePath,
                        size: 76,
                        borderRadius: 18,
                        fit: BoxFit.contain,
                        padding: const EdgeInsets.all(8),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              group.title,
                              style: const TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              group.brand.isEmpty
                                  ? group.model
                                  : '${group.brand} • ${group.model}',
                              style: const TextStyle(
                                color: AppTheme.textMuted,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Text(
                                  _formatPrice(group.unitPrice),
                                  style: const TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _formatPrice(group.mrpPrice),
                                  style: TextStyle(
                                    color: AppTheme.textMuted.withValues(
                                      alpha: 0.8,
                                    ),
                                    fontSize: 12,
                                    decoration: TextDecoration.lineThrough,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Select available colors',
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: group.variants.map((variant) {
                      final label = variant.color.trim().isEmpty
                          ? 'Default'
                          : variant.color;
                      final qty = draft[variant.productId] ?? 0;
                      return _VariantCircleOption(
                        colorName: label,
                        label: label,
                        selected: selectedVariantId == variant.productId,
                        quantity: qty,
                        enabled: variant.availableStock > 0,
                        onTap: () {
                          setSheetState(() {
                            selectedVariantId = variant.productId;
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.bgCardLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.surfaceLight),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                selectedLabel,
                                style: const TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${selectedVariant.availableStock} in stock',
                                style: TextStyle(
                                  color: selectedVariant.isLowStock
                                      ? AppTheme.error
                                      : AppTheme.textMuted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _QtyStepper(
                          qty: selectedQty,
                          maxQty: selectedVariant.availableStock,
                          onChanged: (next) {
                            setSheetState(() {
                              draft[selectedVariant.productId] = next;
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  GradientButton(
                    label: totalQty == 0
                        ? 'Remove from Cart'
                        : 'Add $totalQty item(s) to Cart',
                    icon: Icons.shopping_cart_checkout_rounded,
                    onPressed: () {
                      setState(() {
                        for (final variant in group.variants) {
                          final nextQty = draft[variant.productId] ?? 0;
                          if (nextQty <= 0) {
                            _cartQtyByProductId.remove(variant.productId);
                          } else {
                            _cartQtyByProductId[variant.productId] = nextQty;
                          }
                        }
                      });
                      Navigator.pop(ctx);
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _placeOrder({
    required dynamic controller,
    required List<InventoryItem> inventory,
    required String warehouseRef,
  }) async {
    if (_placingOrder) {
      return;
    }

    final byId = {for (final item in inventory) item.productId: item};
    final entries = _cartQtyByProductId.entries
        .where((entry) => entry.value > 0)
        .toList(growable: false);

    final orderItems = <OrderItem>[];
    for (final entry in entries) {
      final item = byId[entry.key];
      if (item == null) continue;
      final qty = entry.value > item.availableStock
          ? item.availableStock
          : entry.value;
      if (qty <= 0) continue;
      orderItems.add(
        OrderItem(
          productId: item.productId,
          title: item.title,
          sku: item.sku,
          quantity: qty,
        ),
      );
    }

    if (orderItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cart has no valid stock to place an order.'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    setState(() => _placingOrder = true);
    final created = await controller.createCartOrderRequest(
      items: orderItems,
      warehouseRef: warehouseRef,
    );
    if (!mounted) {
      return;
    }

    setState(() => _placingOrder = false);
    if (!created) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not place order from cart.'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    setState(_cartQtyByProductId.clear);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          orderItems.length > 1
              ? 'Order placed for ${orderItems.length} variants.'
              : 'Order placed from cart.',
        ),
        backgroundColor: AppTheme.success,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    final inventory = filterInventoryItems(
      appState.inventory,
      search: _search,
      category: _selectedCategory,
      device: _selectedDevice,
      brand: _selectedBrand,
      model: _selectedModel,
      color: _selectedColor,
      stockFilter: _stockFilter,
      sort: _sortOption,
    );
    final groups = _groupProducts(inventory);
    final categoryOptions = appState.inventoryCatalog.categories;
    final deviceOptions = appState.inventoryCatalog.devices;
    final brandOptions = inventoryFilterValues(
      appState.inventory,
      (item) => item.brand,
    );
    final modelOptions = appState.inventoryCatalog.models;
    final colorOptions = appState.inventoryCatalog.colors.isNotEmpty
        ? appState.inventoryCatalog.colors
        : inventoryFilterValues(appState.inventory, (item) => item.color);
    final warehouses = appState.locations
        .where((location) => location.type == 'warehouse')
        .toList(growable: false);
    final activeWarehouse =
        warehouses.any((location) => location.code == _selectedWarehouseRef)
        ? _selectedWarehouseRef
        : (warehouses.isEmpty ? null : warehouses.first.code);

    final byId = {for (final item in appState.inventory) item.productId: item};
    final cartLines = _cartQtyByProductId.entries
        .where((entry) => entry.value > 0)
        .where((entry) => byId.containsKey(entry.key))
        .map((entry) => _CartLine(item: byId[entry.key]!, qty: entry.value))
        .toList(growable: false);
    final totalItems = cartLines.fold<int>(0, (sum, line) => sum + line.qty);
    final totalAmount = cartLines.fold<int>(
      0,
      (sum, line) => sum + _displayPriceForSku(line.item.sku) * line.qty,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
          child: Text(
            'Products',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
          child: Text(
            'Quick add like Blinkit: pick colors, set quantity, checkout together',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: AppTheme.textMuted),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: InventoryFilterBar(
            searchValue: _search,
            onSearchChanged: (value) => setState(() => _search = value),
            categoryValue: _selectedCategory,
            onCategoryChanged: (value) =>
                setState(() => _selectedCategory = value),
            categoryOptions: categoryOptions,
            deviceValue: _selectedDevice,
            onDeviceChanged: (value) => setState(() => _selectedDevice = value),
            deviceOptions: deviceOptions,
            brandValue: _selectedBrand,
            onBrandChanged: (value) => setState(() => _selectedBrand = value),
            brandOptions: brandOptions,
            modelValue: _selectedModel,
            onModelChanged: (value) => setState(() => _selectedModel = value),
            modelOptions: modelOptions,
            colorValue: _selectedColor,
            onColorChanged: (value) => setState(() => _selectedColor = value),
            colorOptions: colorOptions,
            stockFilter: _stockFilter,
            onStockFilterChanged: (value) =>
                setState(() => _stockFilter = value),
            sortOption: _sortOption,
            onSortChanged: (value) => setState(() => _sortOption = value),
          ),
        ),
        Expanded(
          child: groups.isEmpty
              ? const Center(
                  child: Text(
                    'No products found',
                    style: TextStyle(color: AppTheme.textMuted),
                  ),
                )
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final width = constraints.maxWidth;
                    final crossAxisCount = width > 950
                        ? 5
                        : width > 760
                        ? 4
                        : width > 540
                        ? 3
                        : 2;

                    return GridView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        childAspectRatio: 0.62,
                      ),
                      itemCount: groups.length,
                      itemBuilder: (context, index) {
                        final group = groups[index];
                        final selectedQty = group.variants.fold<int>(
                          0,
                          (sum, variant) =>
                              sum +
                              (_cartQtyByProductId[variant.productId] ?? 0),
                        );
                        return _GridProductCard(
                          group: group,
                          selectedQty: selectedQty,
                          priceLabel: _formatPrice(group.unitPrice),
                          mrpLabel: _formatPrice(group.mrpPrice),
                          onTap: () => _openVariantPicker(group),
                        );
                      },
                    );
                  },
                ),
        ),
        if (cartLines.isNotEmpty)
          Container(
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.surfaceLight),
              boxShadow: AppTheme.cardShadow,
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.warning.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '$totalItems item(s)',
                        style: const TextStyle(
                          color: AppTheme.warning,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Subtotal ${_formatPrice(totalAmount)}',
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _placingOrder
                          ? null
                          : () => setState(_cartQtyByProductId.clear),
                      child: const Text('Clear'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (activeWarehouse == null)
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'No warehouse available. Please sync locations.',
                      style: TextStyle(color: AppTheme.error, fontSize: 12),
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: AppTheme.bgCardLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.surfaceLight),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: activeWarehouse,
                        isExpanded: true,
                        items: warehouses
                            .map(
                              (location) => DropdownMenuItem<String>(
                                value: location.code,
                                child: Text(
                                  'Deliver from ${location.name} (${location.code})',
                                  style: const TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value == null) return;
                          setState(() => _selectedWarehouseRef = value);
                        },
                      ),
                    ),
                  ),
                const SizedBox(height: 10),
                GradientButton(
                  label: _placingOrder ? 'Placing Order...' : 'Place Order',
                  icon: Icons.receipt_long_rounded,
                  onPressed: activeWarehouse == null || _placingOrder
                      ? null
                      : () => _placeOrder(
                          controller: controller,
                          inventory: appState.inventory,
                          warehouseRef: activeWarehouse,
                        ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Product Grid Card
// ──────────────────────────────────────────────────────────────────────────────

class _GridProductCard extends StatelessWidget {
  const _GridProductCard({
    required this.group,
    required this.selectedQty,
    required this.priceLabel,
    required this.mrpLabel,
    required this.onTap,
  });

  final _ProductGroup group;
  final int selectedQty;
  final String priceLabel;
  final String mrpLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.surfaceLight),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    group.availableStock > 0
                        ? '${group.availableStock} in stock'
                        : 'Out of stock',
                    style: TextStyle(
                      color: group.availableStock > 0
                          ? AppTheme.success
                          : AppTheme.error,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.warning.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '${group.variants.length} colors',
                    style: const TextStyle(
                      color: AppTheme.warning,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.bgCardLight,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ProductImage(
                  imageUrl: group.imageUrl,
                  localPath: group.localImagePath,
                  size: 132,
                  borderRadius: 14,
                  fit: BoxFit.contain,
                  padding: const EdgeInsets.all(8),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              group.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w700,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              group.brand.isEmpty
                  ? group.model
                  : '${group.brand} • ${group.model}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              children: group.variants
                  .take(5)
                  .map(
                    (variant) => CatalogColorDot(
                      value: variant.color.isEmpty ? 'Default' : variant.color,
                      size: 18,
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  priceLabel,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(width: 8),
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(
                    mrpLabel,
                    style: TextStyle(
                      color: AppTheme.textMuted.withValues(alpha: 0.8),
                      fontSize: 12,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 7),
              decoration: BoxDecoration(
                color: selectedQty > 0
                    ? AppTheme.primary.withValues(alpha: 0.14)
                    : AppTheme.warning.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(9),
                border: Border.all(
                  color: selectedQty > 0
                      ? AppTheme.primary.withValues(alpha: 0.35)
                      : AppTheme.warning.withValues(alpha: 0.35),
                ),
              ),
              child: Text(
                selectedQty > 0 ? 'In cart: $selectedQty' : 'Choose color',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: selectedQty > 0 ? AppTheme.primary : AppTheme.warning,
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QtyStepper extends StatelessWidget {
  const _QtyStepper({
    required this.qty,
    required this.maxQty,
    required this.onChanged,
  });

  final int qty;
  final int maxQty;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.surfaceLight),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(
            onTap: qty > 0 ? () => onChanged(qty - 1) : null,
            child: Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              child: Icon(
                Icons.remove,
                size: 16,
                color: qty > 0 ? AppTheme.textPrimary : AppTheme.textMuted,
              ),
            ),
          ),
          SizedBox(
            width: 24,
            child: Text(
              '$qty',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          InkWell(
            onTap: qty < maxQty ? () => onChanged(qty + 1) : null,
            child: Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              child: Icon(
                Icons.add,
                size: 16,
                color: qty < maxQty ? AppTheme.primary : AppTheme.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VariantCircleOption extends StatelessWidget {
  const _VariantCircleOption({
    required this.colorName,
    required this.label,
    required this.selected,
    required this.quantity,
    required this.enabled,
    required this.onTap,
  });

  final String colorName;
  final String label;
  final bool selected;
  final int quantity;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 56,
                height: 56,
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: selected ? AppTheme.primary : AppTheme.surfaceLight,
                    width: selected ? 2.2 : 1,
                  ),
                ),
                child: Center(
                  child: CatalogColorDot(
                    value: colorName,
                    size: 34,
                    selected: selected,
                  ),
                ),
              ),
              if (quantity > 0)
                Positioned(
                  right: -5,
                  top: -5,
                  child: Container(
                    width: 20,
                    height: 20,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.bgCard, width: 1.5),
                    ),
                    child: Text(
                      '$quantity',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              if (!enabled)
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.6),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          SizedBox(
            width: 64,
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: enabled ? AppTheme.textSecondary : AppTheme.textMuted,
                fontSize: 11,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductGroup {
  const _ProductGroup({
    required this.key,
    required this.title,
    required this.brand,
    required this.model,
    required this.imageUrl,
    required this.localImagePath,
    required this.variants,
    required this.unitPrice,
    required this.mrpPrice,
  });

  final String key;
  final String title;
  final String brand;
  final String model;
  final String? imageUrl;
  final String? localImagePath;
  final List<InventoryItem> variants;
  final int unitPrice;
  final int mrpPrice;

  int get availableStock =>
      variants.fold<int>(0, (sum, item) => sum + item.availableStock);
}

class _CartLine {
  const _CartLine({required this.item, required this.qty});

  final InventoryItem item;
  final int qty;
}

// ══════════════════════════════════════════════════════════════════════════════
// Orders Tab — Store Manager
// ══════════════════════════════════════════════════════════════════════════════

void _showReceiptDialog(
  BuildContext context,
  StoreOrder order,
  dynamic controller,
) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppTheme.bgCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      ),
      title: const Text(
        'Confirm Receipt?',
        style: TextStyle(color: AppTheme.textPrimary),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Please verify all items have been received:',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 12),
          ...order.items.map(
            (i) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_box_outline_blank_rounded,
                    size: 16,
                    color: AppTheme.textMuted,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${i.title}: qty ${i.quantity}',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppTheme.success),
          onPressed: () {
            Navigator.pop(ctx);
            controller.transitionOrder(order, OrderStatus.storeReceived);
          },
          child: const Text('Confirm'),
        ),
      ],
    ),
  );
}

class _OrdersTab extends StatefulWidget {
  const _OrdersTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  State<_OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<_OrdersTab>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  static const _tabs = ['All', 'Pending', 'Completed'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<StoreOrder> _filterOrders(int tabIndex) {
    final orders = widget.state.orders as List<StoreOrder>;
    return switch (tabIndex) {
      1 =>
        orders
            .where(
              (o) =>
                  o.status == OrderStatus.draft ||
                  o.status == OrderStatus.confirmed ||
                  o.status == OrderStatus.packed ||
                  o.status == OrderStatus.dispatched,
            )
            .toList(),
      2 =>
        orders
            .where(
              (o) =>
                  o.status == OrderStatus.storeReceived ||
                  o.status == OrderStatus.completed,
            )
            .toList(),
      _ => orders,
    };
  }

  @override
  Widget build(BuildContext context) {
    final syncQueue = widget.state.syncQueue as List;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'My Orders',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
              ),
              IconButton(
                onPressed: () => widget.controller.refreshForCurrentRole(),
                icon: const Icon(Icons.refresh_rounded),
                style: IconButton.styleFrom(backgroundColor: AppTheme.bgCard),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: () => widget.controller.syncPendingActions(),
                icon: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const Icon(Icons.sync_rounded),
                    if (syncQueue.isNotEmpty)
                      Positioned(
                        right: -4,
                        top: -4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 1,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.warning,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${syncQueue.length}',
                            style: const TextStyle(
                              color: Colors.black,
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                style: IconButton.styleFrom(backgroundColor: AppTheme.bgCard),
              ),
            ],
          ),
        ),
        // Tabs
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            color: AppTheme.bgCardLight,
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
          child: TabBar(
            controller: _tabController,
            onTap: (_) => setState(() {}),
            indicator: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(10),
            ),
            indicatorSize: TabBarIndicatorSize.tab,
            labelColor: Colors.white,
            unselectedLabelColor: AppTheme.textMuted,
            labelStyle: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
            dividerHeight: 0,
            tabs: _tabs.map((t) => Tab(text: t)).toList(),
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: AnimatedBuilder(
            animation: _tabController,
            builder: (context, _) {
              final orders = _filterOrders(_tabController.index);
              if (orders.isEmpty) {
                return const Center(
                  child: Text(
                    'No orders found',
                    style: TextStyle(color: AppTheme.textMuted),
                  ),
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: orders.length,
                itemBuilder: (context, index) {
                  final order = orders[index];
                  final canConfirm = order.status == OrderStatus.dispatched;
                  return GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    order.orderId,
                                    style: const TextStyle(
                                      color: AppTheme.textPrimary,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _orderSummary(order),
                                    style: const TextStyle(
                                      color: AppTheme.textSecondary,
                                      fontSize: 12,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    DateFormat(
                                      'MMM dd, yyyy • h:mm a',
                                    ).format(order.createdAt),
                                    style: const TextStyle(
                                      color: AppTheme.textMuted,
                                      fontSize: 11,
                                    ),
                                  ),
                                  if (order.warehouseName.isNotEmpty)
                                    Text(
                                      'Warehouse: ${order.warehouseName}',
                                      style: const TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 11,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            StatusBadge(status: order.status, compact: true),
                          ],
                        ),
                        if (canConfirm) ...[
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.centerRight,
                            child: GradientButton(
                              label: 'Confirm Receipt',
                              icon: Icons.check_circle_outline_rounded,
                              compact: true,
                              gradient: const LinearGradient(
                                colors: [Color(0xFF4ADE80), Color(0xFF22C55E)],
                              ),
                              onPressed: () {
                                _showReceiptDialog(
                                  context,
                                  order,
                                  widget.controller,
                                );
                              },
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Settings Tab — Store Manager
// ══════════════════════════════════════════════════════════════════════════════

class _SettingsTab extends StatelessWidget {
  const _SettingsTab({required this.controller, required this.state});
  final dynamic controller;
  final dynamic state;

  @override
  Widget build(BuildContext context) {
    final session = state.session as UserSession?;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Settings', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 24),
          GlassCard(
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: AppTheme.accentGradient,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.person_rounded,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session?.name ?? 'User',
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        session?.email ?? '',
                        style: const TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Store Mgr',
                    style: TextStyle(
                      color: AppTheme.accent,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          GlassCard(
            child: Row(
              children: [
                Icon(
                  (state.isOnline as bool)
                      ? Icons.wifi_rounded
                      : Icons.wifi_off_rounded,
                  color: (state.isOnline as bool)
                      ? AppTheme.success
                      : AppTheme.error,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Text(
                  (state.isOnline as bool) ? 'Online' : 'Offline',
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 14,
                  ),
                ),
                const Spacer(),
                Text(
                  'Location: ${session?.locationId ?? '—'}',
                  style: const TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          if ((state.syncQueue as List).isNotEmpty)
            GlassCard(
              child: Row(
                children: [
                  const Icon(
                    Icons.sync_rounded,
                    color: AppTheme.warning,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${(state.syncQueue as List).length} action(s) queued for sync',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          if ((state.attendanceRecords as List).isNotEmpty)
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Attendance',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...(state.attendanceRecords as List<AttendanceRecord>)
                      .take(3)
                      .map(
                        (record) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            '${DateFormat('dd MMM').format(record.attendanceDate)} • ${record.status.label}',
                            style: const TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                ],
              ),
            ),
          if ((state.salaryPayouts as List).isNotEmpty)
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Latest Salary',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...(state.salaryPayouts as List<SalaryPayoutRecord>)
                      .take(1)
                      .map(
                        (payout) => Text(
                          '${payout.monthKey} • ${payout.netAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ),
                ],
              ),
            ),
          if ((state.leaveRecords as List).isNotEmpty)
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Leaves Taken',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...(state.leaveRecords as List<LeaveRecord>)
                      .take(3)
                      .map(
                        (leave) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            '${leave.leaveType} • ${leave.daysCount} day(s) • ${leave.status}',
                            style: const TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                ],
              ),
            ),
          const Spacer(),
          GradientButton(
            label: 'Sign Out',
            icon: Icons.logout_rounded,
            gradient: const LinearGradient(
              colors: [Color(0xFFF87171), Color(0xFFEF4444)],
            ),
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppTheme.bgCard,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                  ),
                  title: const Text(
                    'Sign Out?',
                    style: TextStyle(color: AppTheme.textPrimary),
                  ),
                  content: const Text(
                    'Unsynced data will be lost.',
                    style: TextStyle(color: AppTheme.textSecondary),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Cancel'),
                    ),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppTheme.error,
                      ),
                      onPressed: () {
                        Navigator.pop(ctx);
                        controller.logout();
                      },
                      child: const Text('Sign Out'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
