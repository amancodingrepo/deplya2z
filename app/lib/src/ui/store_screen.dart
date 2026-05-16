import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/glass_card.dart';
import 'widgets/metric_card.dart';
import 'widgets/notification_bell.dart';
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
            _CatalogueTab(state: state, controller: controller),
            _InventoryTab(state: state),
            _OrdersTab(state: state, controller: controller),
            _StaffTab(state: state, controller: controller),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(state),
    );
  }

  Widget _buildBottomNav(dynamic state) {
    final cartCount = state.cartItemCount as int;
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
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_rounded),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: cartCount > 0
                ? Badge.count(
                    count: cartCount,
                    child: const Icon(Icons.shopping_bag_rounded),
                  )
                : const Icon(Icons.shopping_bag_rounded),
            label: 'Catalogue',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.inventory_2_rounded),
            label: 'Inventory',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_rounded),
            label: 'My Orders',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.group_rounded),
            label: 'Staff',
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
    final orders = state.orders as List<StoreOrder>;
    final storeInventory = state.storeInventory as List<InventoryItem>;
    final pending = orders
        .where((o) =>
            o.status == OrderStatus.draft ||
            o.status == OrderStatus.confirmed ||
            o.status == OrderStatus.packed)
        .length;
    final dispatched = orders
        .where((o) => o.status == OrderStatus.dispatched)
        .toList();
    final lowStock = storeInventory.where((i) => i.isLowStock).toList();
    final session = state.session as UserSession?;

    return RefreshIndicator(
      onRefresh: () => controller.refreshData(),
      color: AppTheme.primary,
      child: CustomScrollView(
        slivers: [
          // Header
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
                          'Welcome back 👋',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          session?.name ?? 'Store Hub',
                          style: Theme.of(context).textTheme.headlineMedium,
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
                        backgroundColor: AppTheme.bgCardLight),
                  ),
                  const SizedBox(width: 4),
                  IconButton(
                    onPressed: () => _showLogoutDialog(context, controller),
                    icon: const Icon(Icons.logout_rounded),
                    style: IconButton.styleFrom(
                        backgroundColor: AppTheme.bgCardLight),
                  ),
                ],
              ),
            ),
          ),

          // Metrics
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  MetricCard(
                    icon: Icons.pending_actions_rounded,
                    label: 'Pending',
                    value: pending,
                    color: AppTheme.primary,
                  ),
                  const SizedBox(width: 10),
                  MetricCard(
                    icon: Icons.local_shipping_rounded,
                    label: 'In Transit',
                    value: dispatched.length,
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

          // Incoming Shipments (dispatched — ready to confirm receipt)
          if (dispatched.isNotEmpty) ...[
            _sectionHeader('Incoming Shipments', Icons.local_shipping_rounded,
                AppTheme.amber),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) => Padding(
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
                                    dispatched[i].orderId,
                                    style: const TextStyle(
                                      color: AppTheme.s900,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                  Text(
                                    dispatched[i]
                                        .items
                                        .map(
                                            (it) => '${it.title} ×${it.quantity}')
                                        .join(', '),
                                    style: const TextStyle(
                                      color: AppTheme.s500,
                                      fontSize: 12,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            StatusBadge(
                                status: dispatched[i].status, compact: true),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.icon(
                            onPressed: () => _showReceiptSheet(
                              context,
                              dispatched[i],
                              controller,
                            ),
                            icon:
                                const Icon(Icons.check_circle_outline_rounded, size: 14),
                            label: const Text('Confirm Receipt'),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppTheme.green,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              textStyle: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                childCount: dispatched.length,
              ),
            ),
          ],

          // Low Stock Alerts
          if (lowStock.isNotEmpty) ...[
            _sectionHeader(
                'Low Stock Alerts', Icons.warning_rounded, AppTheme.red),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: GlassCard(
                    child: Row(
                      children: [
                        ProductImage(
                          imageUrl: lowStock[i].imageUrl,
                          localPath: lowStock[i].localImagePath,
                          size: 44,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                lowStock[i].title,
                                style: const TextStyle(
                                  color: AppTheme.s900,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                lowStock[i].sku,
                                style: const TextStyle(
                                    color: AppTheme.s500, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppTheme.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${lowStock[i].availableStock} left',
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
                ),
                childCount: lowStock.length,
              ),
            ),
          ],

          // Recent Orders
          if (orders.isNotEmpty) ...[
            _sectionHeader(
                'Recent Orders', Icons.history_rounded, AppTheme.primary),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) {
                  final o = orders[i];
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
                                  o.orderId,
                                  style: const TextStyle(
                                    color: AppTheme.s900,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  o.items
                                      .map((it) => '${it.title} ×${it.quantity}')
                                      .join(', '),
                                  style: const TextStyle(
                                      color: AppTheme.s500, fontSize: 12),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  DateFormat('MMM dd, yyyy').format(o.createdAt),
                                  style: const TextStyle(
                                      color: AppTheme.s500, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          StatusBadge(status: o.status, compact: true),
                        ],
                      ),
                    ),
                  );
                },
                childCount: orders.length.clamp(0, 5),
              ),
            ),
          ],

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }

  static SliverToBoxAdapter _sectionHeader(
      String title, IconData icon, Color color) {
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
                  fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  static void _showLogoutDialog(BuildContext context, dynamic controller) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out?'),
        content: const Text('You will be signed out of the app.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.red),
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

  static void _showReceiptSheet(
      BuildContext context, StoreOrder order, dynamic controller) {
    final checked = <String, bool>{
      for (final item in order.items) item.productId: false,
    };

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          builder: (ctx, scroll) => ListView(
            controller: scroll,
            padding: const EdgeInsets.all(20),
            children: [
              const Text(
                'Confirm Receipt',
                style: TextStyle(
                    color: AppTheme.s900,
                    fontSize: 18,
                    fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                order.orderId,
                style: const TextStyle(color: AppTheme.s500, fontSize: 13),
              ),
              const SizedBox(height: 16),
              const Text(
                'Check off each item you received:',
                style: TextStyle(color: AppTheme.s500, fontSize: 13),
              ),
              const SizedBox(height: 12),
              ...order.items.map(
                (item) => CheckboxListTile(
                  value: checked[item.productId] ?? false,
                  onChanged: (v) =>
                      setSheet(() => checked[item.productId] = v ?? false),
                  title: Text(
                    item.title,
                    style: const TextStyle(
                        color: AppTheme.s900, fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    '${item.sku} • Qty ${item.quantity}',
                    style: const TextStyle(color: AppTheme.s500, fontSize: 12),
                  ),
                  activeColor: AppTheme.primary,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: checked.values.every((v) => v)
                    ? () {
                        Navigator.pop(ctx);
                        controller.transitionOrder(
                            order, OrderStatus.storeReceived);
                      }
                    : null,
                child: const Text('Confirm All Items Received'),
              ),
              const SizedBox(height: 8),
              Text(
                checked.values.every((v) => v)
                    ? ''
                    : 'Check all items to confirm receipt',
                style: const TextStyle(color: AppTheme.s500, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Catalogue Tab — browse products + add to cart
// ══════════════════════════════════════════════════════════════════════════════

class _CatalogueTab extends StatefulWidget {
  const _CatalogueTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  State<_CatalogueTab> createState() => _CatalogueTabState();
}

class _CatalogueTabState extends State<_CatalogueTab> {
  String _search = '';
  bool _showCart = false;

  @override
  Widget build(BuildContext context) {
    final products = widget.state.products as List<Product>;
    final cart = widget.state.cart as List<CartItem>;
    final cartCount = widget.state.cartItemCount as int;

    final filtered = products
        .where((p) =>
            _search.isEmpty ||
            p.title.toLowerCase().contains(_search.toLowerCase()) ||
            p.sku.toLowerCase().contains(_search.toLowerCase()) ||
            p.brand.toLowerCase().contains(_search.toLowerCase()))
        .toList();

    if (_showCart) {
      return _CartReviewView(
        cart: cart,
        controller: widget.controller,
        onBack: () => setState(() => _showCart = false),
      );
    }

    return Column(
      children: [
        Container(
          color: AppTheme.white,
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Catalogue',
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 10),
              TextField(
                onChanged: (v) => setState(() => _search = v),
                decoration: const InputDecoration(
                  hintText: 'Search products...',
                  prefixIcon: Icon(Icons.search_rounded),
                  isDense: true,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(
                  child: Text('No products found',
                      style: TextStyle(color: AppTheme.s500)))
              : ListView.builder(
                  padding: EdgeInsets.fromLTRB(
                      20, 12, 20, cartCount > 0 ? 80 : 12),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final p = filtered[i];
                    final cartItem = cart
                        .where((c) => c.productId == p.id)
                        .firstOrNull;
                    final inCart = cartItem?.quantity ?? 0;

                    return GlassCard(
                      child: Row(
                        children: [
                          ProductImage(
                            imageUrl: p.imageUrl,
                            localPath: p.localImagePath,
                            size: 56,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  p.title,
                                  style: const TextStyle(
                                    color: AppTheme.s900,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  '${p.brand} · ${p.sku}',
                                  style: const TextStyle(
                                      color: AppTheme.s500, fontSize: 12),
                                ),
                                if (p.model.isNotEmpty || p.color.isNotEmpty)
                                  Text(
                                    '${p.model} ${p.color}'.trim(),
                                    style: const TextStyle(
                                        color: AppTheme.s500, fontSize: 11),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          if (inCart > 0)
                            _QtyControl(
                              qty: inCart,
                              onDecrement: () => widget.controller
                                  .updateCartQty(p.id, inCart - 1),
                              onIncrement: () => widget.controller
                                  .updateCartQty(p.id, inCart + 1),
                            )
                          else
                            FilledButton(
                              onPressed: () =>
                                  widget.controller.addToCart(CartItem(
                                productId: p.id,
                                title: p.title,
                                sku: p.sku,
                                brand: p.brand,
                                quantity: 1,
                                availableStock: 0,
                                imageUrl: p.imageUrl,
                              )),
                              style: FilledButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 6),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                textStyle: const TextStyle(fontSize: 12),
                              ),
                              child: const Text('Add'),
                            ),
                        ],
                      ),
                    );
                  },
                ),
        ),
        // Sticky cart bar
        if (cartCount > 0)
          _CartBar(
            count: cartCount,
            onReview: () => setState(() => _showCart = true),
          ),
      ],
    );
  }
}

class _QtyControl extends StatelessWidget {
  const _QtyControl({
    required this.qty,
    required this.onDecrement,
    required this.onIncrement,
  });
  final int qty;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: onDecrement,
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppTheme.s200,
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Icon(Icons.remove_rounded, size: 14,
                color: AppTheme.s900),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text(
            '$qty',
            style: const TextStyle(
                color: AppTheme.s900,
                fontWeight: FontWeight.w700,
                fontSize: 14),
          ),
        ),
        GestureDetector(
          onTap: onIncrement,
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Icon(Icons.add_rounded, size: 14,
                color: AppTheme.white),
          ),
        ),
      ],
    );
  }
}

class _CartBar extends StatelessWidget {
  const _CartBar({required this.count, required this.onReview});
  final int count;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.primary,
        borderRadius: BorderRadius.circular(14),
        boxShadow: AppTheme.glowShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '$count item${count == 1 ? '' : 's'}',
              style: const TextStyle(
                  color: AppTheme.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 13),
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: onReview,
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Review & Submit',
                  style: TextStyle(
                      color: AppTheme.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 13),
                ),
                SizedBox(width: 6),
                Icon(Icons.arrow_forward_rounded,
                    color: AppTheme.white, size: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Cart Review View ──────────────────────────────────────────────────────────

class _CartReviewView extends StatelessWidget {
  const _CartReviewView({
    required this.cart,
    required this.controller,
    required this.onBack,
  });
  final List<CartItem> cart;
  final dynamic controller;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final totalUnits = cart.fold<int>(0, (s, c) => s + c.quantity);

    return Column(
      children: [
        Container(
          color: AppTheme.white,
          padding: const EdgeInsets.fromLTRB(4, 8, 20, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: onBack,
                icon: const Icon(Icons.arrow_back_rounded),
              ),
              Expanded(
                child: Text(
                  'Cart Review',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              TextButton(
                onPressed: () => controller.clearCart(),
                child: const Text('Clear',
                    style: TextStyle(color: AppTheme.red)),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: cart.length,
            itemBuilder: (_, i) {
              final item = cart[i];
              return GlassCard(
                child: Row(
                  children: [
                    ProductImage(
                      imageUrl: item.imageUrl,
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
                                color: AppTheme.s900,
                                fontWeight: FontWeight.w600,
                                fontSize: 14),
                          ),
                          Text(
                            '${item.brand} · ${item.sku}',
                            style: const TextStyle(
                                color: AppTheme.s500, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    _QtyControl(
                      qty: item.quantity,
                      onDecrement: () => controller.updateCartQty(
                          item.productId, item.quantity - 1),
                      onIncrement: () => controller.updateCartQty(
                          item.productId, item.quantity + 1),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          color: AppTheme.white,
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total units:',
                      style: TextStyle(color: AppTheme.s500, fontSize: 14)),
                  Text(
                    '$totalUnits',
                    style: const TextStyle(
                        color: AppTheme.s900,
                        fontWeight: FontWeight.w700,
                        fontSize: 16),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    controller.submitCart();
                    onBack();
                  },
                  icon: const Icon(Icons.send_rounded),
                  label: const Text('Submit Order Request'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Inventory Tab — store's own stock
// ══════════════════════════════════════════════════════════════════════════════

class _InventoryTab extends StatefulWidget {
  const _InventoryTab({required this.state});
  final dynamic state;

  @override
  State<_InventoryTab> createState() => _InventoryTabState();
}

class _InventoryTabState extends State<_InventoryTab> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final inventory = (widget.state.storeInventory as List<InventoryItem>)
        .where((i) =>
            _search.isEmpty ||
            i.title.toLowerCase().contains(_search.toLowerCase()) ||
            i.sku.toLowerCase().contains(_search.toLowerCase()))
        .toList();

    return Column(
      children: [
        Container(
          color: AppTheme.white,
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('My Inventory',
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 10),
              TextField(
                onChanged: (v) => setState(() => _search = v),
                decoration: const InputDecoration(
                  hintText: 'Search...',
                  prefixIcon: Icon(Icons.search_rounded),
                  isDense: true,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: inventory.isEmpty
              ? const Center(
                  child: Text(
                  'No inventory data',
                  style: TextStyle(color: AppTheme.s500),
                ))
              : ListView.builder(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
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
                                  '${item.sku} · ${item.brand}',
                                  style: const TextStyle(
                                      color: AppTheme.s500, fontSize: 12),
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
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: item.isLowStock
                                      ? AppTheme.red
                                      : AppTheme.green,
                                ),
                              ),
                              const Text(
                                'available',
                                style: TextStyle(
                                    color: AppTheme.s500, fontSize: 10),
                              ),
                              Text(
                                'Total ${item.totalStock}',
                                style: const TextStyle(
                                    color: AppTheme.s500, fontSize: 10),
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
}

// ══════════════════════════════════════════════════════════════════════════════
// Orders Tab — list + timeline detail
// ══════════════════════════════════════════════════════════════════════════════

class _OrdersTab extends StatefulWidget {
  const _OrdersTab({required this.state, required this.controller});
  final dynamic state;
  final dynamic controller;

  @override
  State<_OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<_OrdersTab> {
  StoreOrder? _selected;

  @override
  Widget build(BuildContext context) {
    final orders = widget.state.orders as List<StoreOrder>;

    if (_selected != null) {
      // Sync selected order with latest state
      final latest = orders
          .where((o) => o.id == _selected!.id)
          .firstOrNull ?? _selected!;
      return _OrderDetailView(
        order: latest,
        controller: widget.controller,
        onBack: () => setState(() => _selected = null),
      );
    }

    return Column(
      children: [
        Container(
          color: AppTheme.white,
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          child: Text('My Orders',
              style: Theme.of(context).textTheme.headlineMedium),
        ),
        Expanded(
          child: orders.isEmpty
              ? const Center(
                  child: Text('No orders yet',
                      style: TextStyle(color: AppTheme.s500)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: orders.length,
                  itemBuilder: (_, i) {
                    final o = orders[i];
                    return GestureDetector(
                      onTap: () => setState(() => _selected = o),
                      child: GlassCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    o.orderId,
                                    style: const TextStyle(
                                        color: AppTheme.s900,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14),
                                  ),
                                  Text(
                                    o.items
                                        .map((it) =>
                                            '${it.title} ×${it.quantity}')
                                        .join(', '),
                                    style: const TextStyle(
                                        color: AppTheme.s500, fontSize: 12),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    DateFormat('MMM dd, yyyy · h:mm a')
                                        .format(o.createdAt),
                                    style: const TextStyle(
                                        color: AppTheme.s500, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                StatusBadge(status: o.status, compact: true),
                                const SizedBox(height: 4),
                                const Icon(Icons.chevron_right_rounded,
                                    color: AppTheme.s500, size: 16),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

// ── Order Detail with 6-step Timeline ─────────────────────────────────────────

class _OrderDetailView extends StatelessWidget {
  const _OrderDetailView({
    required this.order,
    required this.controller,
    required this.onBack,
  });
  final StoreOrder order;
  final dynamic controller;
  final VoidCallback onBack;

  static const _steps = [
    (OrderStatus.draft, 'Draft', Icons.edit_note_rounded),
    (OrderStatus.confirmed, 'Confirmed', Icons.check_rounded),
    (OrderStatus.packed, 'Packed', Icons.inventory_rounded),
    (OrderStatus.dispatched, 'Dispatched', Icons.local_shipping_rounded),
    (OrderStatus.storeReceived, 'Received', Icons.store_rounded),
    (OrderStatus.completed, 'Completed', Icons.task_alt_rounded),
  ];

  int _stepIndex(OrderStatus s) {
    final idx = _steps.indexWhere((t) => t.$1 == s);
    return idx < 0 ? 0 : idx;
  }

  @override
  Widget build(BuildContext context) {
    final currentIdx = _stepIndex(order.status);
    final isCancelled = order.status == OrderStatus.cancelled;

    return Column(
      children: [
        Container(
          color: AppTheme.white,
          padding: const EdgeInsets.fromLTRB(4, 8, 20, 8),
          child: Row(
            children: [
              IconButton(
                onPressed: onBack,
                icon: const Icon(Icons.arrow_back_rounded),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(order.orderId,
                        style: Theme.of(context).textTheme.headlineSmall),
                    Text(
                      DateFormat('MMM dd, yyyy · h:mm a').format(order.createdAt),
                      style: const TextStyle(
                          color: AppTheme.s500, fontSize: 12),
                    ),
                  ],
                ),
              ),
              StatusBadge(status: order.status, compact: true),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Items
              const Text(
                'Items',
                style: TextStyle(
                    color: AppTheme.s900,
                    fontWeight: FontWeight.w700,
                    fontSize: 15),
              ),
              const SizedBox(height: 8),
              ...order.items.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: GlassCard(
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.title,
                                  style: const TextStyle(
                                      color: AppTheme.s900,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14)),
                              Text(item.sku,
                                  style: const TextStyle(
                                      color: AppTheme.s500, fontSize: 12)),
                            ],
                          ),
                        ),
                        Text(
                          '×${item.quantity}',
                          style: const TextStyle(
                              color: AppTheme.s900,
                              fontWeight: FontWeight.w700,
                              fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Timeline
              const Text(
                'Order Progress',
                style: TextStyle(
                    color: AppTheme.s900,
                    fontWeight: FontWeight.w700,
                    fontSize: 15),
              ),
              const SizedBox(height: 12),

              if (isCancelled)
                GlassCard(
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppTheme.red.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.cancel_rounded,
                            color: AppTheme.red, size: 20),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Order Cancelled',
                          style: TextStyle(
                              color: AppTheme.red, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                )
              else
                ..._steps.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final (status, label, icon) = entry.value;
                  final isDone = idx <= currentIdx;
                  final isActive = idx == currentIdx;
                  final color = isActive
                      ? AppTheme.primary
                      : isDone
                          ? AppTheme.green
                          : AppTheme.s200;
                  final textColor =
                      isDone ? AppTheme.s900 : AppTheme.s500;

                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: isDone ? 0.15 : 0.6),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isDone ? color : AppTheme.s200,
                                width: isActive ? 2 : 1,
                              ),
                            ),
                            child: Icon(icon, size: 15, color: color),
                          ),
                          if (idx < _steps.length - 1)
                            Container(
                              width: 2,
                              height: 28,
                              color: idx < currentIdx
                                  ? AppTheme.green.withValues(alpha: 0.4)
                                  : AppTheme.s200,
                            ),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          label,
                          style: TextStyle(
                            color: textColor,
                            fontWeight: isActive
                                ? FontWeight.w700
                                : FontWeight.normal,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  );
                }),

              // Rejection reason
              if (order.rejectionReason != null) ...[
                const SizedBox(height: 16),
                GlassCard(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.info_outline_rounded,
                          color: AppTheme.red, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Rejection Reason',
                                style: TextStyle(
                                    color: AppTheme.red,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13)),
                            Text(order.rejectionReason!,
                                style: const TextStyle(
                                    color: AppTheme.s500, fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Confirm Receipt action
              if (order.status == OrderStatus.dispatched) ...[
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: () {
                    onBack();
                    _DashboardTab._showReceiptSheet(
                        context, order, controller);
                  },
                  icon: const Icon(Icons.check_circle_outline_rounded),
                  label: const Text('Confirm Receipt'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.green,
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Staff Tab (reuses warehouse widget pattern)
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
        Container(
          color: AppTheme.white,
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Staff',
                        style: Theme.of(context).textTheme.headlineMedium),
                    Text(
                      '$checkedIn / ${members.length} checked in',
                      style: const TextStyle(
                          color: AppTheme.s500, fontSize: 13),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: ctrl.refreshData,
                icon: const Icon(Icons.refresh_rounded),
                style: IconButton.styleFrom(
                    backgroundColor: AppTheme.bgCardLight),
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
                            const Icon(Icons.group_outlined,
                                color: AppTheme.s200, size: 48),
                            const SizedBox(height: 8),
                            const Text('No staff members',
                                style: TextStyle(color: AppTheme.s500)),
                          ],
                        ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: members.length,
                  itemBuilder: (ctx, i) => _StaffCard(
                    member: members[i],
                    onAssignTask: () =>
                        _showTaskSheet(context, members[i], ctrl),
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
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Assign Task to ${member.name}',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Title *')),
              const SizedBox(height: 10),
              TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration:
                      const InputDecoration(labelText: 'Description')),
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
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: sel
                            ? color.withValues(alpha: 0.15)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: sel ? color : AppTheme.s200),
                      ),
                      child: Text(p.label,
                          style: TextStyle(
                              color: sel ? color : AppTheme.s500,
                              fontSize: 13,
                              fontWeight: sel
                                  ? FontWeight.w600
                                  : FontWeight.normal)),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(
                      'Due: ${DateFormat('d MMM yyyy').format(dueDate)}',
                      style: const TextStyle(color: AppTheme.s500)),
                  const Spacer(),
                  TextButton(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        initialDate: dueDate,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now()
                            .add(const Duration(days: 365)),
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

  Color _pColor(TaskPriority p) => switch (p) {
        TaskPriority.urgent => AppTheme.red,
        TaskPriority.high => AppTheme.amber,
        TaskPriority.medium => AppTheme.primary,
        TaskPriority.low => AppTheme.green,
      };
}

class _StaffCard extends StatelessWidget {
  const _StaffCard({required this.member, required this.onAssignTask});
  final StaffMember member;
  final VoidCallback onAssignTask;

  @override
  Widget build(BuildContext context) {
    final checkedIn = member.todayAttendance?.isCheckedIn ?? false;
    return Container(
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
            radius: 20,
            backgroundColor:
                (checkedIn ? AppTheme.green : AppTheme.s500)
                    .withValues(alpha: 0.12),
            child: Text(
              member.initials,
              style: TextStyle(
                  color: checkedIn ? AppTheme.green : AppTheme.s500,
                  fontWeight: FontWeight.bold,
                  fontSize: 13),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(member.name,
                    style: const TextStyle(
                        color: AppTheme.s900,
                        fontWeight: FontWeight.w600,
                        fontSize: 14)),
                Text(member.designation,
                    style: const TextStyle(
                        color: AppTheme.s500, fontSize: 12)),
              ],
            ),
          ),
          IconButton(
            onPressed: onAssignTask,
            icon: const Icon(Icons.add_task_rounded,
                color: AppTheme.primary, size: 20),
            tooltip: 'Assign Task',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}
