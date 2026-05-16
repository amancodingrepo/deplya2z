import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/app_theme.dart';
import '../../core/models.dart';
import '../../state/providers.dart';

// ── Bell icon with badge ───────────────────────────────────────────────────────

class NotificationBell extends ConsumerWidget {
  const NotificationBell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(
      appControllerProvider.select((s) => s.unreadNotificationCount),
    );

    return IconButton(
      onPressed: () => _openPanel(context, ref),
      style: IconButton.styleFrom(backgroundColor: AppTheme.bgCardLight),
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          const Icon(Icons.notifications_outlined, size: 22),
          if (unread > 0)
            Positioned(
              top: -3,
              right: -3,
              child: Container(
                padding: const EdgeInsets.all(2),
                constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                decoration: const BoxDecoration(
                  color: AppTheme.red,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  unread > 99 ? '99+' : '$unread',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    height: 1.1,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _openPanel(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ProviderScope(
        parent: ProviderScope.containerOf(context),
        child: const _NotificationsPanel(),
      ),
    );
  }
}

// ── Notifications panel (bottom sheet) ────────────────────────────────────────

class _NotificationsPanel extends ConsumerStatefulWidget {
  const _NotificationsPanel();

  @override
  ConsumerState<_NotificationsPanel> createState() => _NotificationsPanelState();
}

class _NotificationsPanelState extends ConsumerState<_NotificationsPanel> {
  @override
  void initState() {
    super.initState();
    // Refresh on open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(appControllerProvider.notifier).fetchNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifications = ref.watch(
      appControllerProvider.select((s) => s.notifications),
    );
    final unread = ref.watch(
      appControllerProvider.select((s) => s.unreadNotificationCount),
    );
    final controller = ref.read(appControllerProvider.notifier);

    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Handle
            const SizedBox(height: 10),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.s200,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 12),

            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  const Text(
                    'Notifications',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                  ),
                  if (unread > 0) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.red.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$unread unread',
                        style: const TextStyle(
                          color: AppTheme.red,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (unread > 0)
                    TextButton(
                      onPressed: () => controller.markAllNotificationsRead(),
                      child: const Text(
                        'Mark all read',
                        style: TextStyle(fontSize: 12, color: AppTheme.primary),
                      ),
                    ),
                ],
              ),
            ),

            const Divider(height: 1),

            // List
            Expanded(
              child: notifications.isEmpty
                  ? _emptyState()
                  : ListView.separated(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: notifications.length,
                      separatorBuilder: (_, __) => const Divider(height: 1, indent: 56),
                      itemBuilder: (_, i) => _NotificationTile(
                        notification: notifications[i],
                        onTap: () {
                          if (!notifications[i].isRead) {
                            controller.markNotificationRead(notifications[i].id);
                          }
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyState() => const Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.notifications_none_rounded, size: 48, color: AppTheme.s200),
        SizedBox(height: 12),
        Text(
          'No notifications yet',
          style: TextStyle(color: AppTheme.s500, fontSize: 14),
        ),
        SizedBox(height: 4),
        Text(
          'Order updates and alerts will appear here',
          style: TextStyle(color: AppTheme.s200, fontSize: 12),
        ),
      ],
    ),
  );
}

// ── Single notification tile ───────────────────────────────────────────────────

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  IconData _icon() => switch (notification.type) {
    'order_confirmed'       => Icons.check_circle_outline_rounded,
    'order_dispatched'      => Icons.local_shipping_outlined,
    'order_unconfirmed_24h' => Icons.warning_amber_rounded,
    'low_stock_alert'       => Icons.inventory_2_outlined,
    'bulk_order_created'    => Icons.business_center_outlined,
    _                       => Icons.notifications_outlined,
  };

  Color _iconColor() => switch (notification.type) {
    'order_confirmed'       => AppTheme.green,
    'order_dispatched'      => AppTheme.primary,
    'order_unconfirmed_24h' => AppTheme.amber,
    'low_stock_alert'       => AppTheme.red,
    'bulk_order_created'    => AppTheme.primary,
    _                       => AppTheme.s500,
  };

  @override
  Widget build(BuildContext context) {
    final timeAgo = _formatTime(notification.createdAt);

    return InkWell(
      onTap: onTap,
      child: Container(
        color: notification.isRead ? null : AppTheme.primary.withValues(alpha: 0.04),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: _iconColor().withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(_icon(), color: _iconColor(), size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: notification.isRead
                                ? FontWeight.w400
                                : FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (!notification.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          margin: const EdgeInsets.only(left: 6),
                          decoration: const BoxDecoration(
                            color: AppTheme.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    notification.message,
                    style: const TextStyle(fontSize: 12, color: AppTheme.s500),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    timeAgo,
                    style: const TextStyle(fontSize: 11, color: AppTheme.s200),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('d MMM').format(dt);
  }
}
