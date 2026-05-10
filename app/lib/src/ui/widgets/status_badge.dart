import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/models.dart';

/// Modern status badge with dot indicator and label.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status, this.compact = false});

  final OrderStatus status;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      OrderStatus.draft => (AppTheme.textMuted, 'Draft'),
      OrderStatus.confirmed => (AppTheme.info, 'Confirmed'),
      OrderStatus.pendingWarehouseApproval => (AppTheme.warning, 'Pending'),
      OrderStatus.warehouseApproved => (AppTheme.info, 'Approved'),
      OrderStatus.warehouseRejected => (AppTheme.error, 'Rejected'),
      OrderStatus.packed => (AppTheme.warning, 'Packed'),
      OrderStatus.dispatched => (const Color(0xFF0EA5E9), 'Dispatched'),
      OrderStatus.storeReceived => (AppTheme.success, 'Received'),
      OrderStatus.completed => (const Color(0xFF059669), 'Completed'),
      OrderStatus.cancelled => (AppTheme.error, 'Cancelled'),
    };

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: compact ? 10 : 12,
            ),
          ),
        ],
      ),
    );
  }
}
