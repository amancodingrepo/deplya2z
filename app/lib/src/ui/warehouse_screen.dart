import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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

class WarehouseScreen extends ConsumerStatefulWidget {
  const WarehouseScreen({super.key});

  @override
  ConsumerState<WarehouseScreen> createState() => _WarehouseScreenState();
}

class _WarehouseScreenState extends ConsumerState<WarehouseScreen> {
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
              _OrdersTab(state: state, controller: controller),
              _InventoryTab(
                state: state,
                controller: controller,
                onViewAll: () => context.go('/inventory'),
              ),
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
            icon: Icon(Icons.receipt_long_rounded),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inventory_2_rounded),
            label: 'Inventory',
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

SliverToBoxAdapter _sectionHeader(String title, IconData icon) {
  return SliverToBoxAdapter(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primary, size: 18),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    ),
  );
}

class _DashboardTab extends StatelessWidget {
  const _DashboardTab({required this.state, required this.controller});

  final dynamic state;
  final dynamic controller;

  @override
  Widget build(BuildContext context) {
    final orders = (state.orders as List<StoreOrder>);
    final inventory = (state.inventory as List<InventoryItem>);
    final pending = orders
        .where(
          (o) =>
              o.status == OrderStatus.draft ||
              o.status == OrderStatus.confirmed ||
              o.status == OrderStatus.pendingWarehouseApproval,
        )
        .toList(growable: false);
    final packed = orders
        .where(
          (o) =>
              o.status == OrderStatus.warehouseApproved ||
              o.status == OrderStatus.packed,
        )
        .toList(growable: false);
    final lowStock = inventory
        .where((i) => i.isLowStock)
        .toList(growable: false);

    return RefreshIndicator(
      onRefresh: () => controller.refreshForCurrentRole(),
      color: AppTheme.primary,
      backgroundColor: AppTheme.bgCard,
      child: CustomScrollView(
        slivers: [
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
                          'Warehouse Hub',
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
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Row(
                children: [
                  MetricCard(
                    icon: Icons.pending_actions_rounded,
                    label: 'Pending',
                    value: pending.length,
                    color: AppTheme.info,
                  ),
                  const SizedBox(width: 10),
                  MetricCard(
                    icon: Icons.inventory_2_rounded,
                    label: 'Packed',
                    value: packed.length,
                    color: AppTheme.warning,
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
          if (pending.isNotEmpty) ...[
            _sectionHeader('Pending Orders', Icons.access_time_rounded),
            SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final order = pending[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _OrderCard(
                    order: order,
                    actionLabel: 'Accept',
                    actionIcon: Icons.verified_rounded,
                    secondaryActionLabel: 'Deny',
                    secondaryActionIcon: Icons.cancel_outlined,
                    onAction: () => _showConfirmDialog(
                      context,
                      'Accept Order?',
                      _orderSummary(order),
                      () => controller.transitionOrder(
                        order,
                        OrderStatus.warehouseApproved,
                      ),
                    ),
                    onSecondaryAction: () => _showConfirmDialog(
                      context,
                      'Reject Order?',
                      'This order will be sent back to the store.',
                      () => controller.transitionOrder(
                        order,
                        OrderStatus.warehouseRejected,
                      ),
                    ),
                    onTap: () => _showOrderDetails(context, controller, order),
                  ),
                );
              }, childCount: pending.length),
            ),
          ],
          if (packed.isNotEmpty) ...[
            _sectionHeader('Dispatch Queue', Icons.local_shipping_rounded),
            SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final order = packed[index];
                final isPacked = order.status == OrderStatus.packed;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _OrderCard(
                    order: order,
                    actionLabel: isPacked ? 'Dispatch' : 'Pack',
                    actionIcon: isPacked
                        ? Icons.send_rounded
                        : Icons.inventory_2_rounded,
                    actionGradient: isPacked ? AppTheme.accentGradient : null,
                    onAction: () => _showConfirmDialog(
                      context,
                      isPacked ? 'Mark as Dispatched?' : 'Mark as Packed?',
                      isPacked
                          ? 'Ship ${order.orderId} to the store.'
                          : 'Pack ${order.orderId} for dispatch.',
                      () => controller.transitionOrder(
                        order,
                        isPacked ? OrderStatus.dispatched : OrderStatus.packed,
                      ),
                    ),
                    onTap: () => _showOrderDetails(context, controller, order),
                  ),
                );
              }, childCount: packed.length),
            ),
          ],
          if (lowStock.isNotEmpty) ...[
            _sectionHeader('Low Stock Alerts', Icons.warning_rounded),
            SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final item = lowStock[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: GlassCard(
                    child: Row(
                      children: [
                        ProductImage(
                          imageUrl: item.imageUrl,
                          localPath: item.localImagePath,
                          size: 48,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.title,
                                style: const TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${item.sku} • ${item.brand}',
                                style: const TextStyle(
                                  color: AppTheme.textMuted,
                                  fontSize: 12,
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
                            color: AppTheme.error.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${item.availableStock} left',
                            style: const TextStyle(
                              color: AppTheme.error,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }, childCount: lowStock.length),
            ),
          ],
          if (orders.isNotEmpty) ...[
            _sectionHeader('Recent Orders', Icons.history_rounded),
            SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final order = orders[index];
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
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _orderSummary(order),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppTheme.textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            StatusBadge(status: order.status, compact: true),
                          ],
                        ),
                        const SizedBox(height: 10),
                        OrderJourneyStrip(status: order.status, compact: true),
                      ],
                    ),
                  ),
                );
              }, childCount: orders.length.clamp(0, 5)),
            ),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.actionLabel,
    required this.actionIcon,
    required this.onAction,
    this.secondaryActionLabel,
    this.secondaryActionIcon,
    this.onSecondaryAction,
    this.onTap,
    this.actionGradient,
  });

  final StoreOrder order;
  final String actionLabel;
  final IconData actionIcon;
  final VoidCallback onAction;
  final String? secondaryActionLabel;
  final IconData? secondaryActionIcon;
  final VoidCallback? onSecondaryAction;
  final VoidCallback? onTap;
  final Gradient? actionGradient;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        onTap: onTap,
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
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${order.storeName} → ${order.warehouseName}',
                          style: const TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _orderSummary(order),
                          style: const TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Updated ${DateFormat('MMM dd, h:mm a').format(order.updatedAt)}',
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
              const SizedBox(height: 10),
              OrderJourneyStrip(status: order.status, compact: true),
              const SizedBox(height: 12),
              Row(
                children: [
                  if (secondaryActionLabel != null && onSecondaryAction != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onSecondaryAction,
                        icon: Icon(secondaryActionIcon ?? Icons.close),
                        label: Text(secondaryActionLabel!),
                      ),
                    ),
                  if (secondaryActionLabel != null && onSecondaryAction != null)
                    const SizedBox(width: 10),
                  Expanded(
                    child: GradientButton(
                      label: actionLabel,
                      icon: actionIcon,
                      compact: true,
                      gradient: actionGradient,
                      onPressed: onAction,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InventoryTab extends StatefulWidget {
  const _InventoryTab({
    required this.state,
    required this.onViewAll,
    required this.controller,
  });

  final dynamic state;
  final VoidCallback onViewAll;
  final dynamic controller;

  @override
  State<_InventoryTab> createState() => _InventoryTabState();
}

class _InventoryTabState extends State<_InventoryTab> {
  String _search = '';
  String _selectedCategory = '';
  String _selectedDevice = '';
  String _selectedBrand = '';
  String _selectedModel = '';
  String _selectedColor = '';
  InventoryStockFilter _stockFilter = InventoryStockFilter.all;
  InventorySortOption _sortOption = InventorySortOption.relevance;

  @override
  Widget build(BuildContext context) {
    final source = widget.state.inventory as List<InventoryItem>;
    final inventory = filterInventoryItems(
      source,
      search: _search,
      category: _selectedCategory,
      device: _selectedDevice,
      brand: _selectedBrand,
      model: _selectedModel,
      color: _selectedColor,
      stockFilter: _stockFilter,
      sort: _sortOption,
    );
    final catalog = widget.state.inventoryCatalog as InventoryCatalog;
    final categoryOptions = catalog.categories;
    final deviceOptions = catalog.devices;
    final brandOptions = inventoryFilterValues(source, (item) => item.brand);
    final modelOptions = catalog.models;
    final colorOptions = catalog.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Inventory',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
              ),
              OutlinedButton.icon(
                onPressed: () => showInventoryCatalogManager(
                  context: context,
                  catalog: widget.state.inventoryCatalog as InventoryCatalog,
                  onAdd: widget.controller.addInventoryCatalogValue,
                ),
                icon: const Icon(Icons.library_add_rounded),
                label: const Text('Catalog'),
              ),
              const SizedBox(width: 10),
              FilledButton.icon(
                onPressed: _showCreateDialog,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Add Item'),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
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
            onManageCatalog: () => showInventoryCatalogManager(
              context: context,
              catalog: widget.state.inventoryCatalog as InventoryCatalog,
              onAdd: widget.controller.addInventoryCatalogValue,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: inventory.isEmpty
              ? const Center(
                  child: Text(
                    'No products found',
                    style: TextStyle(color: AppTheme.textMuted),
                  ),
                )
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final width = constraints.maxWidth;
                    final crossAxisCount = width > 980
                        ? 4
                        : width > 720
                        ? 3
                        : width > 480
                        ? 2
                        : 1;

                    return GridView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 0.92,
                      ),
                      itemCount: inventory.length,
                      itemBuilder: (context, index) {
                        final item = inventory[index];
                        return _WarehouseInventoryCard(
                          item: item,
                          onEdit: () => _showUpdateDialog(item),
                          onDelete: () => widget.controller.deleteInventoryItem(
                            productRef: item.productId,
                            locationId: item.locationId,
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

  Future<void> _showCreateDialog() async {
    await showInventoryEditorDialog(
      context: context,
      title: 'Create Inventory Item',
      actionLabel: 'Create',
      catalog: widget.state.inventoryCatalog as InventoryCatalog,
      onSubmit: (values) => widget.controller.createInventoryItem(
        sku: values.sku,
        title: values.title,
        brand: values.brand,
        category: values.category.isEmpty ? null : values.category,
        model: values.model.isEmpty ? null : values.model,
        color: values.color.isEmpty ? null : values.color,
        totalStock: values.totalStock,
      ),
    );
  }

  Future<void> _showUpdateDialog(InventoryItem item) async {
    await showInventoryEditorDialog(
      context: context,
      title: 'Update Inventory Item',
      actionLabel: 'Save',
      catalog: widget.state.inventoryCatalog as InventoryCatalog,
      initialValues: InventoryEditorValues(
        sku: item.sku,
        title: item.title,
        brand: item.brand,
        category: item.category,
        model: item.model,
        color: item.color,
        totalStock: item.totalStock,
        locationId: item.locationId,
      ),
      onSubmit: (values) => widget.controller.updateInventoryItem(
        productRef: item.productId,
        locationId: item.locationId,
        title: values.title,
        brand: values.brand,
        category: values.category,
        model: values.model,
        color: values.color,
        totalStock: values.totalStock,
      ),
    );
  }
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
            .toList(growable: false),
      2 =>
        orders
            .where(
              (o) =>
                  o.status == OrderStatus.storeReceived ||
                  o.status == OrderStatus.completed,
            )
            .toList(growable: false),
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
                  'All Orders',
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
                        const SizedBox(height: 10),
                        OrderJourneyStrip(status: order.status, compact: true),
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
                              onPressed: () => _showReceiptDialog(
                                context,
                                order,
                                widget.controller,
                              ),
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
                    gradient: AppTheme.primaryGradient,
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
                    color: AppTheme.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    session?.role == UserRole.warehouseManager
                        ? 'Warehouse'
                        : 'Store',
                    style: const TextStyle(
                      color: AppTheme.primary,
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

class _WarehouseInventoryCard extends StatelessWidget {
  const _WarehouseInventoryCard({
    required this.item,
    required this.onEdit,
    required this.onDelete,
  });

  final InventoryItem item;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ProductImage(
                imageUrl: item.imageUrl,
                localPath: item.localImagePath,
                size: 60,
                borderRadius: 12,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${item.sku} • ${item.brand}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                      ),
                    ),
                    if (item.model.isNotEmpty || item.color.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        [
                          item.model,
                          item.color,
                        ].where((part) => part.trim().isNotEmpty).join(' • '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: item.isLowStock
                        ? AppTheme.error.withValues(alpha: 0.1)
                        : AppTheme.success.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${item.availableStock}',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: item.isLowStock
                              ? AppTheme.error
                              : AppTheme.success,
                        ),
                      ),
                      Text(
                        'available',
                        style: TextStyle(
                          fontSize: 10,
                          color: item.isLowStock
                              ? AppTheme.error.withValues(alpha: 0.7)
                              : AppTheme.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.warning.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'R${item.reservedStock}',
                      style: const TextStyle(
                        color: AppTheme.warning,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.info.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'T${item.totalStock}',
                      style: const TextStyle(
                        color: AppTheme.info,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              IconButton(
                icon: const Icon(
                  Icons.edit_rounded,
                  size: 18,
                  color: AppTheme.info,
                ),
                onPressed: onEdit,
              ),
              IconButton(
                icon: const Icon(
                  Icons.delete_outline_rounded,
                  size: 18,
                  color: AppTheme.error,
                ),
                onPressed: onDelete,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

void _showConfirmDialog(
  BuildContext context,
  String title,
  String subtitle,
  VoidCallback onConfirm,
) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppTheme.bgCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      ),
      title: Text(title, style: const TextStyle(color: AppTheme.textPrimary)),
      content: Text(
        subtitle,
        style: const TextStyle(color: AppTheme.textSecondary),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            Navigator.pop(ctx);
            onConfirm();
          },
          child: const Text('Confirm'),
        ),
      ],
    ),
  );
}

void _showOrderDetails(
  BuildContext context,
  dynamic controller,
  StoreOrder order,
) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      final canApprove =
          order.status == OrderStatus.draft ||
          order.status == OrderStatus.confirmed ||
          order.status == OrderStatus.pendingWarehouseApproval;
      final canPack =
          order.status == OrderStatus.confirmed ||
          order.status == OrderStatus.warehouseApproved;
      final canDispatch = order.status == OrderStatus.packed;

      return DraggableScrollableSheet(
        initialChildSize: 0.76,
        minChildSize: 0.55,
        maxChildSize: 0.95,
        builder: (context, scrollController) {
          return Container(
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(28),
              ),
              border: Border.all(
                color: AppTheme.surfaceLight.withValues(alpha: 0.22),
              ),
            ),
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceLight.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  order.orderId,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 6),
                Text(
                  '${order.storeName} → ${order.warehouseName}',
                  style: const TextStyle(color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 12),
                StatusBadge(status: order.status),
                const SizedBox(height: 12),
                OrderJourneyStrip(status: order.status),
                const SizedBox(height: 16),
                GlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Item Details',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Created: ${DateFormat('MMM dd, yyyy • h:mm a').format(order.createdAt)}',
                        style: const TextStyle(color: AppTheme.textMuted),
                      ),
                      Text(
                        'Updated: ${DateFormat('MMM dd, yyyy • h:mm a').format(order.updatedAt)}',
                        style: const TextStyle(color: AppTheme.textMuted),
                      ),
                      const SizedBox(height: 10),
                      ...order.items.map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppTheme.bgCardLight,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.surfaceLight),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.inventory_2_rounded,
                                  size: 16,
                                  color: AppTheme.textMuted,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '${item.title} • ${item.sku}',
                                    style: const TextStyle(
                                      color: AppTheme.textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                Text(
                                  'Qty ${item.quantity}',
                                  style: const TextStyle(
                                    color: AppTheme.textPrimary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (canApprove)
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            _showConfirmDialog(
                              context,
                              'Reject Order?',
                              'Send this order back to the store.',
                              () => controller.transitionOrder(
                                order,
                                OrderStatus.warehouseRejected,
                              ),
                            );
                          },
                          child: const Text('Deny'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GradientButton(
                          label: 'Accept',
                          icon: Icons.verified_rounded,
                          onPressed: () {
                            Navigator.pop(context);
                            controller.transitionOrder(
                              order,
                              OrderStatus.warehouseApproved,
                            );
                          },
                        ),
                      ),
                    ],
                  )
                else if (canPack)
                  GradientButton(
                    label: 'Mark Packed',
                    icon: Icons.inventory_2_rounded,
                    onPressed: () {
                      Navigator.pop(context);
                      controller.transitionOrder(order, OrderStatus.packed);
                    },
                  )
                else if (canDispatch)
                  GradientButton(
                    label: 'Dispatch',
                    icon: Icons.local_shipping_rounded,
                    gradient: AppTheme.accentGradient,
                    onPressed: () {
                      Navigator.pop(context);
                      controller.transitionOrder(order, OrderStatus.dispatched);
                    },
                  )
                else
                  Text(
                    'No action required right now.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
              ],
            ),
          );
        },
      );
    },
  );
}

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
                  Expanded(
                    child: Text(
                      '${i.title}: qty ${i.quantity}',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 13,
                      ),
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
