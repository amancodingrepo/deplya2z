import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/glass_card.dart';
import 'widgets/metric_card.dart';
import 'widgets/notification_bell.dart';
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

    // Show snackbar messages
    ref.listen(appControllerProvider, (prev, next) {
      if (next.message != null && next.message != prev?.message) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(next.message!),
              behavior: SnackBarBehavior.floating,
            ),
          );
        controller.clearMessage();
      }
    });

    return Scaffold(
      backgroundColor: AppTheme.s50,
      body: SafeArea(
        child: IndexedStack(
          index: _navIndex,
          children: [
            _DashboardTab(state: state, controller: controller),
            _OrdersTab(state: state, controller: controller),
            _InventoryTab(state: state, controller: controller),
            _BulkOrdersTab(state: state, controller: controller),
            _StaffTab(state: state, controller: controller),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.white,
        border: Border(top: BorderSide(color: AppTheme.s200)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex: _navIndex,
        onTap: (i) => setState(() => _navIndex = i),
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppTheme.primary,
        unselectedItemColor: AppTheme.s500,
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
            icon: Icon(Icons.business_center_rounded),
            label: 'Bulk',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.group_rounded),
            label: 'Staff',
          ),
        ],
      ),
    );
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Dashboard Tab
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class _DashboardTab extends StatelessWidget {
  const _DashboardTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  Widget build(BuildContext context) {
    final orders = state.orders as List<StoreOrder>;
    final awaitingApproval =
        orders.where((o) => o.status == OrderStatus.draft).toList();
    final toPack =
        orders.where((o) => o.status == OrderStatus.confirmed).toList();
    final packed =
        orders.where((o) => o.status == OrderStatus.packed).toList();
    final lowStock = (state.inventory as List<InventoryItem>)
        .where((i) => i.isLowStock)
        .toList();
    final session = state.session as UserSession?;

    return RefreshIndicator(
      onRefresh: () => controller.refreshData(),
      color: AppTheme.primary,
      child: CustomScrollView(
        slivers: [
          // â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          SliverToBoxAdapter(
            child: Container(
              color: AppTheme.white,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back ðŸ‘‹',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          session?.name ?? 'Warehouse Hub',
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ],
                    ),
                  ),
                  if ((state.syncQueue as List).isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.amber.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.sync_rounded,
                            color: AppTheme.amber,
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${(state.syncQueue as List).length}',
                            style: const TextStyle(
                              color: AppTheme.amber,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  const NotificationBell(),
                  const SizedBox(width: 4),
                  IconButton(
                    onPressed: () => controller.refreshData(),
                    icon: const Icon(Icons.refresh_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: AppTheme.bgCardLight,
                    ),
                  ),
                  const SizedBox(width: 4),
                  IconButton(
                    onPressed: () =>
                        _showLogoutDialog(context, controller),
                    icon: const Icon(Icons.logout_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: AppTheme.bgCardLight,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // â”€â”€â”€ Metric Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  MetricCard(
                    icon: Icons.hourglass_top_rounded,
                    label: 'For Approval',
                    value: awaitingApproval.length,
                    color: AppTheme.primary,
                  ),
                  const SizedBox(width: 10),
                  MetricCard(
                    icon: Icons.inventory_rounded,
                    label: 'To Pack',
                    value: toPack.length,
                    color: AppTheme.amber,
                  ),
                  const SizedBox(width: 10),
                  MetricCard(
                    icon: Icons.warning_amber_rounded,
                    label: 'Low Stock',
                    value: lowStock.length,
                    color: AppTheme.red,
                  ),
                ],
              ),
            ),
          ),

          // â”€â”€â”€ Awaiting Approval â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (awaitingApproval.isNotEmpty) ...[
            _sectionHeader(
              context,
              'Awaiting Approval',
              Icons.hourglass_top_rounded,
              AppTheme.primary,
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate((ctx, i) {
                final order = awaitingApproval[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _ApprovalOrderCard(
                    order: order,
                    onApprove: () => controller.transitionOrder(
                      order,
                      OrderStatus.confirmed,
                    ),
                    onReject: (reason) =>
                        controller.rejectOrder(order, reason),
                  ),
                );
              }, childCount: awaitingApproval.length),
            ),
          ],

          // â”€â”€â”€ To Pack â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (toPack.isNotEmpty) ...[
            _sectionHeader(
              context,
              'Ready to Pack',
              Icons.inventory_2_rounded,
              AppTheme.amber,
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate((ctx, i) {
                final order = toPack[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _ActionOrderCard(
                    order: order,
                    actionLabel: 'Mark Packed',
                    actionIcon: Icons.check_circle_outline_rounded,
                    actionColor: AppTheme.amber,
                    onAction: () => controller.transitionOrder(
                      order,
                      OrderStatus.packed,
                    ),
                  ),
                );
              }, childCount: toPack.length),
            ),
          ],

          // â”€â”€â”€ Dispatch Queue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (packed.isNotEmpty) ...[
            _sectionHeader(
              context,
              'Dispatch Queue',
              Icons.local_shipping_rounded,
              AppTheme.green,
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate((ctx, i) {
                final order = packed[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _ActionOrderCard(
                    order: order,
                    actionLabel: 'Dispatch',
                    actionIcon: Icons.send_rounded,
                    actionColor: AppTheme.green,
                    onAction: () => _showDispatchDialog(
                      context,
                      order,
                      controller,
                    ),
                  ),
                );
              }, childCount: packed.length),
            ),
          ],

          // â”€â”€â”€ Low Stock Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (lowStock.isNotEmpty) ...[
            _sectionHeader(
              context,
              'Low Stock Alerts',
              Icons.warning_rounded,
              AppTheme.red,
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate((ctx, i) {
                final item = lowStock[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: GlassCard(
                    child: Row(
                      children: [
                        ProductImage(
                          imageUrl: item.imageUrl,
                          localPath: item.localImagePath,
                          size: 44,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.title,
                                style: const TextStyle(
                                  color: AppTheme.s900,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                item.sku,
                                style: const TextStyle(
                                  color: AppTheme.s500,
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
                            color: AppTheme.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${item.availableStock} left',
                            style: const TextStyle(
                              color: AppTheme.red,
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

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }

  static SliverToBoxAdapter _sectionHeader(
    BuildContext context,
    String title,
    IconData icon,
    Color color,
  ) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
        child: Row(
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 6),
            Text(
              title,
              style: const TextStyle(
                color: AppTheme.s900,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static void _showDispatchDialog(
    BuildContext context,
    StoreOrder order,
    dynamic controller,
  ) {
    final notesCtrl = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        ),
        title: const Text('Dispatch Order'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              order.orderId,
              style: const TextStyle(
                color: AppTheme.s500,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: notesCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Dispatch notes (optional)',
                hintText: 'e.g. Driver name, vehicle number...',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            onPressed: () {
              Navigator.pop(ctx);
              controller.dispatchOrderWithNotes(
                order,
                notes: notesCtrl.text.trim().isEmpty
                    ? null
                    : notesCtrl.text.trim(),
              );
            },
            icon: const Icon(Icons.send_rounded, size: 16),
            label: const Text('Dispatch'),
          ),
        ],
      ),
    );
  }

  static void _showLogoutDialog(
    BuildContext context,
    dynamic controller,
  ) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out?'),
        content: const Text('You will be signed out of the app.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.red,
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
  }
}

// â”€â”€ Approval order card (draft â†’ approve / reject) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _ApprovalOrderCard extends StatelessWidget {
  const _ApprovalOrderCard({
    required this.order,
    required this.onApprove,
    required this.onReject,
  });
  final StoreOrder order;
  final VoidCallback onApprove;
  final void Function(String reason) onReject;

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
                        color: AppTheme.s900,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      order.items.map((i) => '${i.title} Ã—${i.quantity}').join(', '),
                      style: const TextStyle(
                        color: AppTheme.s500,
                        fontSize: 12,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      DateFormat('MMM dd, h:mm a').format(order.createdAt),
                      style: const TextStyle(color: AppTheme.s500, fontSize: 11),
                    ),
                  ],
                ),
              ),
              StatusBadge(status: order.status, compact: true),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                onPressed: () => _showRejectDialog(context),
                icon: const Icon(Icons.close_rounded, size: 14),
                label: const Text('Reject'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.red,
                  side: const BorderSide(color: AppTheme.red),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  textStyle: const TextStyle(fontSize: 12),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed: onApprove,
                icon: const Icon(Icons.check_rounded, size: 14),
                label: const Text('Approve'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  textStyle: const TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showRejectDialog(BuildContext context) {
    final reasonCtrl = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        ),
        title: const Text('Reject Order'),
        content: TextField(
          controller: reasonCtrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Reason for rejection',
            hintText: 'e.g. Insufficient stock, incorrect items...',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.red),
            onPressed: () {
              if (reasonCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              onReject(reasonCtrl.text.trim());
            },
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }
}

// â”€â”€ Action order card (pack / dispatch) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _ActionOrderCard extends StatelessWidget {
  const _ActionOrderCard({
    required this.order,
    required this.actionLabel,
    required this.actionIcon,
    required this.actionColor,
    required this.onAction,
  });
  final StoreOrder order;
  final String actionLabel;
  final IconData actionIcon;
  final Color actionColor;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
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
                    color: AppTheme.s900,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  order.items.map((i) => '${i.title} Ã—${i.quantity}').join(', '),
                  style: const TextStyle(color: AppTheme.s500, fontSize: 12),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  DateFormat('MMM dd, h:mm a').format(order.updatedAt),
                  style: const TextStyle(color: AppTheme.s500, fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton.icon(
            onPressed: onAction,
            icon: Icon(actionIcon, size: 14),
            label: Text(actionLabel),
            style: FilledButton.styleFrom(
              backgroundColor: actionColor,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              textStyle: const TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Orders Tab â€” sub-tabs: Pending Approval | To Pack | Dispatched | All
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class _OrdersTab extends StatefulWidget {
  const _OrdersTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  State<_OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<_OrdersTab>
    with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final all = widget.state.orders as List<StoreOrder>;
    final approval = all.where((o) => o.status == OrderStatus.draft).toList();
    final toPack = all.where((o) => o.status == OrderStatus.confirmed).toList();
    final dispatched = all
        .where((o) =>
            o.status == OrderStatus.dispatched ||
            o.status == OrderStatus.storeReceived ||
            o.status == OrderStatus.completed)
        .toList();

    return Column(
      children: [
        Container(
          color: AppTheme.white,
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Orders',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 12),
              TabBar(
                controller: _tab,
                tabs: [
                  Tab(text: 'Approval (${approval.length})'),
                  Tab(text: 'To Pack (${toPack.length})'),
                  Tab(text: 'Dispatched'),
                  const Tab(text: 'All'),
                ],
                labelColor: AppTheme.primary,
                unselectedLabelColor: AppTheme.s500,
                indicatorColor: AppTheme.primary,
                labelStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
                isScrollable: true,
                tabAlignment: TabAlignment.start,
              ),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tab,
            children: [
              // Awaiting Approval
              _buildOrderList(
                approval,
                empty: 'No orders awaiting approval',
                cardBuilder: (order) => _ApprovalOrderCard(
                  order: order,
                  onApprove: () => widget.controller.transitionOrder(
                    order,
                    OrderStatus.confirmed,
                  ),
                  onReject: (reason) =>
                      widget.controller.rejectOrder(order, reason),
                ),
              ),
              // To Pack
              _buildOrderList(
                toPack,
                empty: 'No orders to pack',
                cardBuilder: (order) => _ActionOrderCard(
                  order: order,
                  actionLabel: 'Mark Packed',
                  actionIcon: Icons.check_circle_outline_rounded,
                  actionColor: AppTheme.amber,
                  onAction: () => widget.controller.transitionOrder(
                    order,
                    OrderStatus.packed,
                  ),
                ),
              ),
              // Dispatched
              _buildOrderList(
                dispatched,
                empty: 'No dispatched orders',
                cardBuilder: (order) => _OrderListCard(order: order),
              ),
              // All
              _buildOrderList(
                all,
                empty: 'No orders yet',
                cardBuilder: (order) => _OrderListCard(
                  order: order,
                  showDispatch: order.status == OrderStatus.packed,
                  onDispatch: order.status == OrderStatus.packed
                      ? () => _showDispatchDialog(context, order, widget.controller)
                      : null,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOrderList(
    List<StoreOrder> orders, {
    required String empty,
    required Widget Function(StoreOrder) cardBuilder,
  }) {
    if (orders.isEmpty) {
      return Center(
        child: Text(
          empty,
          style: const TextStyle(color: AppTheme.s500),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: orders.length,
      itemBuilder: (_, i) => cardBuilder(orders[i]),
    );
  }

  void _showDispatchDialog(
    BuildContext context,
    StoreOrder order,
    dynamic controller,
  ) {
    final notesCtrl = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        ),
        title: const Text('Dispatch Order'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(order.orderId,
                style: const TextStyle(color: AppTheme.s500, fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: notesCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Dispatch notes (optional)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            onPressed: () {
              Navigator.pop(ctx);
              controller.dispatchOrderWithNotes(
                order,
                notes: notesCtrl.text.trim().isEmpty
                    ? null
                    : notesCtrl.text.trim(),
              );
            },
            icon: const Icon(Icons.send_rounded, size: 14),
            label: const Text('Dispatch'),
          ),
        ],
      ),
    );
  }
}

class _OrderListCard extends StatelessWidget {
  const _OrderListCard({
    required this.order,
    this.showDispatch = false,
    this.onDispatch,
  });
  final StoreOrder order;
  final bool showDispatch;
  final VoidCallback? onDispatch;

  @override
  Widget build(BuildContext context) {
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
                    color: AppTheme.s900,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  order.items.map((i) => '${i.title} Ã—${i.quantity}').join(', '),
                  style: const TextStyle(color: AppTheme.s500, fontSize: 12),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  DateFormat('MMM dd, yyyy â€¢ h:mm a').format(order.createdAt),
                  style: const TextStyle(color: AppTheme.s500, fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatusBadge(status: order.status, compact: true),
              if (showDispatch && onDispatch != null) ...[
                const SizedBox(height: 6),
                GestureDetector(
                  onTap: onDispatch,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Dispatch',
                      style: TextStyle(
                        color: AppTheme.green,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Inventory Tab
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class _InventoryTab extends StatefulWidget {
  const _InventoryTab({required this.state, required this.controller});
  final dynamic state;
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
      children: [
        Container(
          color: AppTheme.white,
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
                onPressed: () => _showTransferDialog(context),
                icon: const Icon(Icons.swap_horiz_rounded, size: 16),
                label: const Text('Transfer'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  textStyle: const TextStyle(fontSize: 12),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed: _showCreateDialog,
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Add'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  textStyle: const TextStyle(fontSize: 12),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
          child: TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: const InputDecoration(
              hintText: 'Search products...',
              prefixIcon: Icon(Icons.search_rounded),
              isDense: true,
            ),
          ),
        ),
        Expanded(
          child: inventory.isEmpty
              ? const Center(
                  child: Text(
                    'No products found',
                    style: TextStyle(color: AppTheme.s500),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: inventory.length,
                  itemBuilder: (_, i) {
                    final item = inventory[i];
                    return GlassCard(
                      child: Row(
                        children: [
                          ProductImage(
                            imageUrl: item.imageUrl,
                            localPath: item.localImagePath,
                            size: 52,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  style: const TextStyle(
                                    color: AppTheme.s900,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  '${item.sku} â€¢ ${item.brand}',
                                  style: const TextStyle(
                                    color: AppTheme.s500,
                                    fontSize: 12,
                                  ),
                                ),
                                if (item.model.isNotEmpty || item.color.isNotEmpty)
                                  Text(
                                    '${item.model} ${item.color}'.trim(),
                                    style: const TextStyle(
                                      color: AppTheme.s500,
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
                                      ? AppTheme.red
                                      : AppTheme.green,
                                ),
                              ),
                              Text(
                                'avail',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: item.isLowStock
                                      ? AppTheme.red.withValues(alpha: 0.7)
                                      : AppTheme.s500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Res ${item.reservedStock}/${item.totalStock}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: AppTheme.s500,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(
                                      Icons.tune_rounded,
                                      size: 16,
                                      color: AppTheme.amber,
                                    ),
                                    tooltip: 'Adjust Stock',
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () =>
                                        _showAdjustDialog(context, item),
                                  ),
                                  const SizedBox(width: 10),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.edit_rounded,
                                      size: 16,
                                      color: AppTheme.primary,
                                    ),
                                    tooltip: 'Edit',
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () =>
                                        _showUpdateDialog(context, item),
                                  ),
                                  const SizedBox(width: 10),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.delete_outline_rounded,
                                      size: 16,
                                      color: AppTheme.red,
                                    ),
                                    tooltip: 'Delete',
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
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

  void _showAdjustDialog(BuildContext context, InventoryItem item) {
    final qtyCtrl =
        TextEditingController(text: item.availableStock.toString());
    String selectedReason = 'Recount';
    final notesCtrl = TextEditingController();
    const reasons = [
      'Recount',
      'Damaged',
      'Received stock',
      'Returned stock',
      'Other',
    ];

    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          backgroundColor: AppTheme.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          ),
          title: const Text('Adjust Stock'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(
                    color: AppTheme.s500,
                    fontSize: 13,
                  ),
                ),
                Text(
                  'Current: ${item.availableStock} available',
                  style: const TextStyle(color: AppTheme.s500, fontSize: 12),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: qtyCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'New quantity (available)',
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: selectedReason,
                  decoration: const InputDecoration(labelText: 'Reason'),
                  items: reasons
                      .map(
                        (r) => DropdownMenuItem(value: r, child: Text(r)),
                      )
                      .toList(),
                  onChanged: (v) =>
                      setDlg(() => selectedReason = v ?? selectedReason),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: notesCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Notes (optional)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final qty = int.tryParse(qtyCtrl.text.trim());
                if (qty == null) return;
                Navigator.pop(ctx);
                widget.controller.adjustStock(
                  productRef: item.productId,
                  newQuantity: qty,
                  reason: selectedReason,
                  locationId: item.locationId,
                  notes: notesCtrl.text.trim().isEmpty
                      ? null
                      : notesCtrl.text.trim(),
                );
              },
              child: const Text('Apply'),
            ),
          ],
        ),
      ),
    );
  }

  void _showTransferDialog(BuildContext context) {
    final locations = widget.state.locations as List<AppLocation>;
    final inventory = widget.state.inventory as List<InventoryItem>;
    if (inventory.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No inventory to transfer')),
      );
      return;
    }

    String? fromLocationId =
        locations.isNotEmpty ? locations.first.id : null;
    String? toLocationId;
    String? productId = inventory.isNotEmpty ? inventory.first.productId : null;
    final qtyCtrl = TextEditingController(text: '1');
    final noteCtrl = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          backgroundColor: AppTheme.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          ),
          title: const Text('Transfer Stock'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 320,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: fromLocationId,
                    decoration: const InputDecoration(labelText: 'From Location'),
                    items: locations
                        .map(
                          (l) => DropdownMenuItem(
                            value: l.id,
                            child: Text(l.name),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setDlg(() => fromLocationId = v),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: toLocationId,
                    decoration: const InputDecoration(labelText: 'To Location'),
                    items: locations
                        .where((l) => l.id != fromLocationId)
                        .map(
                          (l) => DropdownMenuItem(
                            value: l.id,
                            child: Text(l.name),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setDlg(() => toLocationId = v),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: productId,
                    decoration: const InputDecoration(labelText: 'Product'),
                    items: inventory
                        .map(
                          (i) => DropdownMenuItem(
                            value: i.productId,
                            child: Text(
                              '${i.title} (${i.availableStock})',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setDlg(() => productId = v),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: qtyCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Quantity'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: noteCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Note (optional)',
                    ),
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
              onPressed: () {
                if (fromLocationId == null ||
                    toLocationId == null ||
                    productId == null) {
                  return;
                }
                final qty = int.tryParse(qtyCtrl.text.trim()) ?? 0;
                if (qty <= 0) return;
                Navigator.pop(ctx);
                widget.controller.transferStock(
                  fromLocationId: fromLocationId!,
                  toLocationId: toLocationId!,
                  productId: productId!,
                  quantity: qty,
                  note: noteCtrl.text.trim().isEmpty
                      ? null
                      : noteCtrl.text.trim(),
                );
              },
              child: const Text('Transfer'),
            ),
          ],
        ),
      ),
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
        builder: (ctx, setDlg) => AlertDialog(
          backgroundColor: AppTheme.white,
          title: const Text('Create Inventory Item'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: sku,
                    decoration: const InputDecoration(labelText: 'SKU *'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: title,
                    decoration: const InputDecoration(labelText: 'Title *'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: brand,
                    decoration: const InputDecoration(labelText: 'Brand *'),
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
                      setDlg(() {});
                    },
                    icon: const Icon(Icons.image_outlined),
                    label: Text(imageName ?? 'Upload Image'),
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
                if (sku.text.trim().isEmpty || title.text.trim().isEmpty) return;
                await widget.controller.createInventoryItem(
                  sku: sku.text.trim(),
                  title: title.text.trim(),
                  brand: brand.text.trim(),
                  category:
                      category.text.trim().isEmpty ? null : category.text.trim(),
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

  Future<void> _showUpdateDialog(BuildContext context, InventoryItem item) async {
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
        builder: (ctx, setDlg) => AlertDialog(
          backgroundColor: AppTheme.white,
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
                      setDlg(() {});
                    },
                    icon: const Icon(Icons.image_outlined),
                    label: Text(imageName ?? 'Replace Image'),
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
                  totalStock: int.tryParse(stock.text.trim()) ?? item.totalStock,
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Bulk Orders Tab
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class _BulkOrdersTab extends StatelessWidget {
  const _BulkOrdersTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  Widget build(BuildContext context) {
    final orders = state.bulkOrders as List<BulkOrder>;

    return Column(
      children: [
        Container(
          color: AppTheme.white,
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Bulk Orders',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
              ),
              IconButton(
                onPressed: () => controller.fetchAndStoreBulkOrders(),
                icon: const Icon(Icons.refresh_rounded),
                style: IconButton.styleFrom(backgroundColor: AppTheme.bgCardLight),
              ),
            ],
          ),
        ),
        Expanded(
          child: orders.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.business_center_outlined,
                        size: 48,
                        color: AppTheme.s200,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'No bulk orders',
                        style: TextStyle(color: AppTheme.s500),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(20),
                  itemCount: orders.length,
                  itemBuilder: (_, i) => _BulkOrderCard(
                    order: orders[i],
                    onPack: () => controller.transitionBulkOrder(
                      orders[i].id,
                      'pack',
                    ),
                    onDispatch: () => controller.transitionBulkOrder(
                      orders[i].id,
                      'dispatch',
                    ),
                    onCancel: () => controller.transitionBulkOrder(
                      orders[i].id,
                      'cancel',
                    ),
                  ),
                ),
        ),
      ],
    );
  }
}

class _BulkOrderCard extends StatelessWidget {
  const _BulkOrderCard({
    required this.order,
    required this.onPack,
    required this.onDispatch,
    required this.onCancel,
  });
  final BulkOrder order;
  final VoidCallback onPack;
  final VoidCallback onDispatch;
  final VoidCallback onCancel;

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
                        color: AppTheme.s900,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      order.clientName,
                      style: const TextStyle(
                        color: AppTheme.s500,
                        fontSize: 12,
                      ),
                    ),
                    Text(
                      '${order.totalUnits} units â€¢ ${order.items.length} product(s)',
                      style: const TextStyle(
                        color: AppTheme.s500,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              _BulkStatusBadge(status: order.status),
            ],
          ),
          const SizedBox(height: 10),
          // Items preview
          ...order.items.take(3).map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(
                    'â€¢ ${item.title} Ã—${item.quantity}',
                    style: const TextStyle(
                      color: AppTheme.s500,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
          if (order.items.length > 3)
            Text(
              '+${order.items.length - 3} more items',
              style: const TextStyle(color: AppTheme.s500, fontSize: 11),
            ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (order.status == BulkOrderStatus.confirmed) ...[
                OutlinedButton(
                  onPressed: onCancel,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.red,
                    side: const BorderSide(color: AppTheme.red),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: onPack,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.amber,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  child: const Text('Mark Packed'),
                ),
              ] else if (order.status == BulkOrderStatus.packed)
                FilledButton.icon(
                  onPressed: onDispatch,
                  icon: const Icon(Icons.local_shipping_rounded, size: 14),
                  label: const Text('Dispatch'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.green,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BulkStatusBadge extends StatelessWidget {
  const _BulkStatusBadge({required this.status});
  final BulkOrderStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      BulkOrderStatus.confirmed => (AppTheme.primary, 'Confirmed'),
      BulkOrderStatus.packed => (AppTheme.amber, 'Packed'),
      BulkOrderStatus.dispatched => (const Color(0xFF7C3AED), 'Dispatched'),
      BulkOrderStatus.completed => (AppTheme.green, 'Completed'),
      BulkOrderStatus.cancelled => (AppTheme.red, 'Cancelled'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Staff Tab
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
        Container(
          color: AppTheme.white,
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Staff',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    Text(
                      '$checkedIn / ${members.length} checked in today',
                      style: const TextStyle(
                        color: AppTheme.s500,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: ctrl.refreshData,
                icon: const Icon(Icons.refresh_rounded),
                style: IconButton.styleFrom(backgroundColor: AppTheme.bgCardLight),
              ),
            ],
          ),
        ),
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
                              color: AppTheme.s200,
                              size: 48,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'No staff members',
                              style: TextStyle(color: AppTheme.s500),
                            ),
                          ],
                        ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: members.length,
                  itemBuilder: (ctx, i) => _StaffMemberCard(
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
      backgroundColor: AppTheme.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Assign Task to ${member.name}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Task Title *'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: descCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Description'),
              ),
              const SizedBox(height: 10),
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
                            ? color.withValues(alpha: 0.15)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: sel ? color : AppTheme.s200,
                        ),
                      ),
                      child: Text(
                        p.label,
                        style: TextStyle(
                          color: sel ? color : AppTheme.s500,
                          fontSize: 13,
                          fontWeight: sel ? FontWeight.w600 : FontWeight.normal,
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
                    style: const TextStyle(color: AppTheme.s500),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        initialDate: dueDate,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
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
                child: FilledButton(
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
                  child: const Text('Create Task'),
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
      backgroundColor: AppTheme.white,
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
                  backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                  child: Text(
                    member.initials,
                    style: const TextStyle(
                      color: AppTheme.primary,
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
                          color: AppTheme.s900,
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        member.designation,
                        style: const TextStyle(
                          color: AppTheme.s500,
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
            const Divider(),
            _DRow(label: 'Email', value: member.email),
            _DRow(label: 'Code', value: member.employeeCode),
            _DRow(label: 'Open Tasks', value: '${member.openTaskCount}'),
            const SizedBox(height: 12),
            const Text(
              'Today',
              style: TextStyle(
                color: AppTheme.s900,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            if (member.todayAttendance == null)
              const Text(
                'Not checked in',
                style: TextStyle(color: AppTheme.s500),
              )
            else
              Row(
                children: [
                  const Icon(
                    Icons.check_circle_rounded,
                    color: AppTheme.green,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'In at ${member.todayAttendance!.checkInTime != null ? DateFormat("hh:mm a").format(member.todayAttendance!.checkInTime!) : "â€”"}',
                    style: const TextStyle(color: AppTheme.green),
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
                minimumSize: const Size(double.infinity, 46),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _pColor(TaskPriority p) => switch (p) {
        TaskPriority.urgent => AppTheme.red,
        TaskPriority.high => AppTheme.amber,
        TaskPriority.medium => AppTheme.primary,
        TaskPriority.low => AppTheme.green,
      };
}

// â”€â”€ Shared helper widgets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.s200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: (checkedIn ? AppTheme.green : AppTheme.s200)
                  .withValues(alpha: 0.15),
              child: Text(
                member.initials,
                style: TextStyle(
                  color: checkedIn ? AppTheme.green : AppTheme.s500,
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
                      color: AppTheme.s900,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    member.designation,
                    style: const TextStyle(
                      color: AppTheme.s500,
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
                    style: const TextStyle(
                      color: AppTheme.amber,
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(width: 6),
            IconButton(
              onPressed: onCreateTask,
              icon: const Icon(
                Icons.add_task_rounded,
                color: AppTheme.primary,
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
      StaffStatus.active => (AppTheme.green, 'Active'),
      StaffStatus.inactive => (AppTheme.red, 'Inactive'),
      StaffStatus.onLeave => (AppTheme.amber, 'Leave'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
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
            style: const TextStyle(color: AppTheme.s500, fontSize: 13),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: AppTheme.s900,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
