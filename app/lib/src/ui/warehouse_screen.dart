import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/glass_card.dart';
import 'widgets/gradient_button.dart';
import 'widgets/metric_card.dart';
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
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0D0D1A), Color(0xFF111128)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
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
              _StaffTab(state: state, controller: controller),
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
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppTheme.accent,
        unselectedItemColor: AppTheme.textMuted,
        selectedFontSize: 11,
        unselectedFontSize: 11,
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
            icon: Icon(Icons.group_rounded),
            label: 'Staff',
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

// ══════════════════════════════════════════════════════════════════════════════
// Dashboard Tab
// ══════════════════════════════════════════════════════════════════════════════

class _DashboardTab extends StatelessWidget {
  const _DashboardTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  Widget build(BuildContext context) {
    final pending = (state.orders as List<StoreOrder>)
        .where((o) => o.status == OrderStatus.confirmed)
        .toList();
    final packed = (state.orders as List<StoreOrder>)
        .where((o) => o.status == OrderStatus.packed)
        .toList();
    final lowStock = (state.inventory as List<InventoryItem>)
        .where((i) => i.isLowStock)
        .toList();

    return RefreshIndicator(
      onRefresh: () => controller.refreshData(),
      color: AppTheme.primary,
      backgroundColor: AppTheme.bgCard,
      child: CustomScrollView(
        slivers: [
          // ─── Header ──────────────────────────────────────────
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
                                ...(state.attendanceRecords
                                        as List<AttendanceRecord>)
                                    .take(3)
                                    .map(
                                      (record) => Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 4,
                                        ),
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
                                ...(state.salaryPayouts
                                        as List<SalaryPayoutRecord>)
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
                                        padding: const EdgeInsets.only(
                                          bottom: 4,
                                        ),
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
                      ],
                    ),
                  ),
                  // Sync indicator
                  if ((state.syncQueue as List).isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.warning.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.sync_rounded,
                            color: AppTheme.warning,
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${(state.syncQueue as List).length}',
                            style: const TextStyle(
                              color: AppTheme.warning,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => controller.refreshData(),
                    icon: const Icon(Icons.refresh_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: AppTheme.bgCard,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ─── Metric Cards ─────────────────────────────────────
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
                    icon: Icons.inventory_rounded,
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

          // ─── Pending Orders Section ────────────────────────────
          if (pending.isNotEmpty) ...[
            _sectionHeader('Pending Orders', Icons.access_time_rounded),
            SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final order = pending[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _OrderCard(
                    order: order,
                    actionLabel: 'Mark Packed',
                    actionIcon: Icons.check_circle_outline_rounded,
                    onAction: () {
                      _showConfirmDialog(
                        context,
                        'Mark as Packed?',
                        '${order.items.first.title} • Qty ${order.items.first.quantity}',
                        () => controller.transitionOrder(
                          order,
                          OrderStatus.packed,
                        ),
                      );
                    },
                  ),
                );
              }, childCount: pending.length),
            ),
          ],

          // ─── Dispatch Queue Section ────────────────────────────
          if (packed.isNotEmpty) ...[
            _sectionHeader('Dispatch Queue', Icons.local_shipping_rounded),
            SliverList(
              delegate: SliverChildBuilderDelegate((context, index) {
                final order = packed[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _OrderCard(
                    order: order,
                    actionLabel: 'Dispatch',
                    actionIcon: Icons.send_rounded,
                    actionGradient: AppTheme.accentGradient,
                    onAction: () {
                      _showConfirmDialog(
                        context,
                        'Mark as Dispatched?',
                        'Ship ${order.orderId} to store',
                        () => controller.transitionOrder(
                          order,
                          OrderStatus.dispatched,
                        ),
                      );
                    },
                  ),
                );
              }, childCount: packed.length),
            ),
          ],

          // ─── Low Stock Alerts ──────────────────────────────────
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
                                item.sku,
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

          // ─── Recent Orders ─────────────────────────────────────
          if ((state.orders as List<StoreOrder>).isNotEmpty) ...[
            _sectionHeader('Recent Orders', Icons.history_rounded),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final order = (state.orders as List<StoreOrder>)[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: GlassCard(
                      child: Row(
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
                                  order.items
                                      .map((i) => '${i.title} x${i.quantity}')
                                      .join(', '),
                                  style: const TextStyle(
                                    color: AppTheme.textSecondary,
                                    fontSize: 12,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          StatusBadge(status: order.status, compact: true),
                        ],
                      ),
                    ),
                  );
                },
                childCount: (state.orders as List<StoreOrder>).length.clamp(
                  0,
                  5,
                ),
              ),
            ),
          ],

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }

  static SliverToBoxAdapter _sectionHeader(String title, IconData icon) {
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

  static void _showConfirmDialog(
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
}

// ══════════════════════════════════════════════════════════════════════════════
// Order Card
// ══════════════════════════════════════════════════════════════════════════════

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.actionLabel,
    required this.actionIcon,
    required this.onAction,
    this.actionGradient,
  });

  final StoreOrder order;
  final String actionLabel;
  final IconData actionIcon;
  final VoidCallback onAction;
  final Gradient? actionGradient;

  @override
  Widget build(BuildContext context) {
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
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${order.items.first.title} • Qty ${order.items.first.quantity}',
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
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
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
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Orders Tab (full list)
// ══════════════════════════════════════════════════════════════════════════════

class _OrdersTab extends StatelessWidget {
  const _OrdersTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  Widget build(BuildContext context) {
    final orders = state.orders as List<StoreOrder>;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Text(
            'All Orders',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ),
        Expanded(
          child: orders.isEmpty
              ? const Center(
                  child: Text(
                    'No orders yet',
                    style: TextStyle(color: AppTheme.textMuted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: orders.length,
                  itemBuilder: (context, index) {
                    final order = orders[index];
                    return GlassCard(
                      child: Row(
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
                                  order.items
                                      .map((i) => '${i.title} x${i.quantity}')
                                      .join(', '),
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
                              ],
                            ),
                          ),
                          StatusBadge(status: order.status, compact: true),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Inventory Tab
// ══════════════════════════════════════════════════════════════════════════════

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
  final _picker = ImagePicker();

  @override
  Widget build(BuildContext context) {
    final inventory = (widget.state.inventory as List<InventoryItem>)
        .where(
          (i) =>
              _search.isEmpty ||
              i.title.toLowerCase().contains(_search.toLowerCase()) ||
              i.sku.toLowerCase().contains(_search.toLowerCase()) ||
              i.brand.toLowerCase().contains(_search.toLowerCase()),
        )
        .toList();

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
          child: TextField(
            onChanged: (v) => setState(() => _search = v),
            style: const TextStyle(color: AppTheme.textPrimary),
            decoration: const InputDecoration(
              hintText: 'Search products...',
              prefixIcon: Icon(Icons.search_rounded, color: AppTheme.textMuted),
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
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: inventory.length,
                  itemBuilder: (context, index) {
                    final item = inventory[index];
                    return GlassCard(
                      child: Row(
                        children: [
                          ProductImage(
                            imageUrl: item.imageUrl,
                            localPath: item.localImagePath,
                            size: 56,
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
                                if (item.model.isNotEmpty ||
                                    item.color.isNotEmpty)
                                  Text(
                                    '${item.model} ${item.color}'.trim(),
                                    style: const TextStyle(
                                      color: AppTheme.textMuted,
                                      fontSize: 11,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
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
                              const SizedBox(height: 2),
                              Text(
                                'Res ${item.reservedStock} / ${item.totalStock}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: AppTheme.textMuted,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(
                                      Icons.edit_rounded,
                                      size: 18,
                                      color: AppTheme.info,
                                    ),
                                    onPressed: () => _showUpdateDialog(item),
                                  ),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.delete_outline_rounded,
                                      size: 18,
                                      color: AppTheme.error,
                                    ),
                                    onPressed: () =>
                                        widget.controller.deleteInventoryItem(
                                          productRef: item.productId,
                                          locationId: item.locationId,
                                        ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Future<void> _showCreateDialog() async {
    final sku = TextEditingController();
    final title = TextEditingController();
    final brand = TextEditingController();
    final category = TextEditingController();
    final model = TextEditingController();
    final color = TextEditingController();
    final stock = TextEditingController(text: '0');
    List<int>? imageBytes;
    String? imageName;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          title: const Text('Create Inventory Item'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: sku,
                    decoration: const InputDecoration(labelText: 'SKU'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: title,
                    decoration: const InputDecoration(labelText: 'Title'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: brand,
                    decoration: const InputDecoration(labelText: 'Brand'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: category,
                    decoration: const InputDecoration(labelText: 'Category'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: model,
                    decoration: const InputDecoration(labelText: 'Model'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: color,
                    decoration: const InputDecoration(labelText: 'Color'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: stock,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Total Stock'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final file = await _picker.pickImage(
                        source: ImageSource.gallery,
                        imageQuality: 80,
                      );
                      if (file == null) return;
                      imageBytes = await file.readAsBytes();
                      imageName = file.name;
                      setStateDialog(() {});
                    },
                    icon: const Icon(Icons.image_outlined),
                    label: Text(imageName ?? 'Upload Item Image'),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                await widget.controller.createInventoryItem(
                  sku: sku.text.trim(),
                  title: title.text.trim(),
                  brand: brand.text.trim(),
                  category: category.text.trim().isEmpty
                      ? null
                      : category.text.trim(),
                  model: model.text.trim().isEmpty ? null : model.text.trim(),
                  color: color.text.trim().isEmpty ? null : color.text.trim(),
                  totalStock: int.tryParse(stock.text.trim()) ?? 0,
                  imageBytes: imageBytes,
                  imageFilename: imageName,
                );
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showUpdateDialog(InventoryItem item) async {
    final title = TextEditingController(text: item.title);
    final brand = TextEditingController(text: item.brand);
    final category = TextEditingController(text: item.category);
    final model = TextEditingController(text: item.model);
    final color = TextEditingController(text: item.color);
    final stock = TextEditingController(text: item.totalStock.toString());
    List<int>? imageBytes;
    String? imageName;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          title: const Text('Update Inventory Item'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: title,
                    decoration: const InputDecoration(labelText: 'Title'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: brand,
                    decoration: const InputDecoration(labelText: 'Brand'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: category,
                    decoration: const InputDecoration(labelText: 'Category'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: model,
                    decoration: const InputDecoration(labelText: 'Model'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: color,
                    decoration: const InputDecoration(labelText: 'Color'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: stock,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Total Stock'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final file = await _picker.pickImage(
                        source: ImageSource.gallery,
                        imageQuality: 80,
                      );
                      if (file == null) return;
                      imageBytes = await file.readAsBytes();
                      imageName = file.name;
                      setStateDialog(() {});
                    },
                    icon: const Icon(Icons.image_outlined),
                    label: Text(imageName ?? 'Replace Item Image'),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                await widget.controller.updateInventoryItem(
                  productRef: item.productId,
                  locationId: item.locationId,
                  title: title.text.trim(),
                  brand: brand.text.trim(),
                  category: category.text.trim(),
                  model: model.text.trim(),
                  color: color.text.trim(),
                  totalStock:
                      int.tryParse(stock.text.trim()) ?? item.totalStock,
                  imageBytes: imageBytes,
                  imageFilename: imageName,
                );
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Settings Tab
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

// ══════════════════════════════════════════════════════════════════════════════
// Staff Tab — Warehouse Manager
// ══════════════════════════════════════════════════════════════════════════════

class _StaffTab extends ConsumerWidget {
  const _StaffTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appState = ref.watch(appControllerProvider);
    final ctrl = ref.read(appControllerProvider.notifier);
    final members = appState.staffMembers;

    final checkedIn =
        members.where((m) => m.todayAttendance?.isCheckedIn == true).length;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Staff',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '$checkedIn / ${members.length} checked in today',
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: ctrl.refreshData,
                icon: Icon(Icons.refresh_rounded, color: AppTheme.textMuted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: members.isEmpty
              ? Center(
                  child: appState.loading
                      ? const CircularProgressIndicator()
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.group_outlined,
                              color: AppTheme.textMuted,
                              size: 48,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'No staff members',
                              style: TextStyle(color: AppTheme.textMuted),
                            ),
                          ],
                        ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: members.length,
                  itemBuilder: (context, i) => _StaffMemberCard(
                    member: members[i],
                    onCreateTask: () =>
                        _showTaskSheet(context, members[i], ctrl),
                    onViewDetail: () =>
                        _showDetailSheet(context, members[i], ctrl),
                  ),
                ),
        ),
      ],
    );
  }

  void _showTaskSheet(BuildContext context, StaffMember member, dynamic ctrl) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    TaskPriority selectedPriority = TaskPriority.medium;
    DateTime dueDate = DateTime.now().add(const Duration(days: 1));

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            16,
            16,
            MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Assign Task to ${member.name}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 14),
              _ModalField(controller: titleCtrl, label: 'Task Title'),
              const SizedBox(height: 10),
              _ModalField(
                controller: descCtrl,
                label: 'Description',
                maxLines: 3,
              ),
              const SizedBox(height: 10),
              // Priority
              Wrap(
                spacing: 8,
                children: TaskPriority.values.map((p) {
                  final color = _pColor(p);
                  final sel = selectedPriority == p;
                  return GestureDetector(
                    onTap: () => setModal(() => selectedPriority = p),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: sel
                            ? color.withValues(alpha: 0.25)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: sel
                              ? color
                              : AppTheme.surfaceLight.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        p.label,
                        style: TextStyle(
                          color: sel ? color : AppTheme.textMuted,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(
                    'Due: ${DateFormat('d MMM yyyy').format(dueDate)}',
                    style: TextStyle(color: AppTheme.textMuted),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        initialDate: dueDate,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(
                          const Duration(days: 365),
                        ),
                        builder: (c, child) =>
                            Theme(data: ThemeData.dark(), child: child!),
                      );
                      if (picked != null) setModal(() => dueDate = picked);
                    },
                    child: const Text('Pick Date'),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (titleCtrl.text.trim().isEmpty) return;
                    ctrl.createTask(
                      title: titleCtrl.text.trim(),
                      description: descCtrl.text.trim(),
                      assignedToId: member.userId,
                      priority: selectedPriority,
                      dueDate: dueDate,
                    );
                    Navigator.pop(ctx);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accent,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text(
                    'Create Task',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDetailSheet(
    BuildContext context,
    StaffMember member,
    dynamic ctrl,
  ) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.55,
        maxChildSize: 0.9,
        builder: (ctx, scroll) => ListView(
          controller: scroll,
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: AppTheme.accent.withValues(alpha: 0.2),
                  child: Text(
                    member.initials,
                    style: TextStyle(
                      color: AppTheme.accent,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        member.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        member.designation,
                        style: TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                _StaffBadge(status: member.status),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(color: Colors.white12),
            _DRow(label: 'Email', value: member.email),
            _DRow(label: 'Code', value: member.employeeCode),
            _DRow(label: 'Open Tasks', value: '${member.openTaskCount}'),
            const SizedBox(height: 12),
            const Text(
              'Today',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            if (member.todayAttendance == null)
              Text(
                'Not checked in',
                style: TextStyle(color: AppTheme.textMuted),
              )
            else
              Row(
                children: [
                  Icon(
                    Icons.check_circle_rounded,
                    color: AppTheme.success,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'In at ${member.todayAttendance!.checkInTime != null ? DateFormat("hh:mm a").format(member.todayAttendance!.checkInTime!) : "—"}',
                    style: TextStyle(color: AppTheme.success),
                  ),
                ],
              ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(ctx);
                _showTaskSheet(context, member, ctrl);
              },
              icon: const Icon(Icons.add_task_rounded),
              label: const Text('Assign Task'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.accent,
                side: BorderSide(color: AppTheme.accent),
                minimumSize: const Size(double.infinity, 46),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _pColor(TaskPriority p) => switch (p) {
    TaskPriority.urgent => AppTheme.error,
    TaskPriority.high => AppTheme.warning,
    TaskPriority.medium => AppTheme.accent,
    TaskPriority.low => AppTheme.success,
  };
}

// ── Shared staff helper widgets used by both warehouse & store tabs ───────────

class _StaffMemberCard extends StatelessWidget {
  const _StaffMemberCard({
    required this.member,
    required this.onCreateTask,
    required this.onViewDetail,
  });
  final StaffMember member;
  final VoidCallback onCreateTask;
  final VoidCallback onViewDetail;

  @override
  Widget build(BuildContext context) {
    final checkedIn = member.todayAttendance?.isCheckedIn ?? false;

    return GestureDetector(
      onTap: onViewDetail,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: AppTheme.surfaceLight.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: (checkedIn ? AppTheme.success : AppTheme.textMuted)
                  .withValues(alpha: 0.2),
              child: Text(
                member.initials,
                style: TextStyle(
                  color: checkedIn ? AppTheme.success : AppTheme.textMuted,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    member.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    member.designation,
                    style: TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _StaffBadge(status: member.status),
                if (member.openTaskCount > 0) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${member.openTaskCount} tasks',
                    style: TextStyle(color: AppTheme.warning, fontSize: 11),
                  ),
                ],
              ],
            ),
            const SizedBox(width: 6),
            IconButton(
              onPressed: onCreateTask,
              icon: Icon(
                Icons.add_task_rounded,
                color: AppTheme.accent,
                size: 20,
              ),
              tooltip: 'Assign Task',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
      ),
    );
  }
}

class _StaffBadge extends StatelessWidget {
  const _StaffBadge({required this.status});
  final StaffStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      StaffStatus.active => (AppTheme.success, 'Active'),
      StaffStatus.inactive => (AppTheme.error, 'Inactive'),
      StaffStatus.onLeave => (AppTheme.warning, 'Leave'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _DRow extends StatelessWidget {
  const _DRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(
            label,
            style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

class _ModalField extends StatelessWidget {
  const _ModalField({
    required this.controller,
    required this.label,
    this.maxLines = 1,
  });
  final TextEditingController controller;
  final String label;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      style: const TextStyle(color: Colors.white),
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: AppTheme.textMuted),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(
            color: AppTheme.surfaceLight.withValues(alpha: 0.3),
          ),
          borderRadius: BorderRadius.circular(10),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(color: AppTheme.accent),
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }
}
