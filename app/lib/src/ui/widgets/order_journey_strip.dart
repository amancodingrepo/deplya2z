import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/models.dart';

class OrderJourneyStrip extends StatelessWidget {
  const OrderJourneyStrip({
    super.key,
    required this.status,
    this.compact = false,
  });

  final OrderStatus status;
  final bool compact;

  static const _steps = [
    (OrderStatus.draft, 'Requested', Icons.edit_note_rounded),
    (
      OrderStatus.pendingWarehouseApproval,
      'Waiting Approval',
      Icons.hourglass_top_rounded,
    ),
    (OrderStatus.confirmed, 'Accepted', Icons.verified_rounded),
    (
      OrderStatus.warehouseApproved,
      'Warehouse Approved',
      Icons.verified_rounded,
    ),
    (OrderStatus.packed, 'Packed', Icons.inventory_2_rounded),
    (OrderStatus.dispatched, 'Dispatched', Icons.local_shipping_rounded),
    (OrderStatus.storeReceived, 'Received', Icons.check_circle_rounded),
    (OrderStatus.completed, 'Closed', Icons.flag_rounded),
  ];

  int _currentIndex() {
    return switch (status) {
      OrderStatus.draft => 0,
      OrderStatus.pendingWarehouseApproval => 1,
      OrderStatus.confirmed => 2,
      OrderStatus.warehouseApproved => 3,
      OrderStatus.packed => 4,
      OrderStatus.dispatched => 5,
      OrderStatus.storeReceived => 6,
      OrderStatus.completed => 7,
      OrderStatus.cancelled => -1,
      OrderStatus.warehouseRejected => -1,
    };
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _currentIndex();

    if (currentIndex < 0) {
      return Container(
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 10 : 12,
          vertical: compact ? 8 : 10,
        ),
        decoration: BoxDecoration(
          color: AppTheme.error.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.error.withValues(alpha: 0.25)),
        ),
        child: const Row(
          children: [
            Icon(Icons.block_rounded, color: AppTheme.error, size: 16),
            SizedBox(width: 8),
            Text(
              'Order cancelled',
              style: TextStyle(
                color: AppTheme.error,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 10 : 12,
        vertical: compact ? 10 : 12,
      ),
      decoration: BoxDecoration(
        color: AppTheme.bgCardLight.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.surfaceLight.withValues(alpha: 0.9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: List.generate(_steps.length * 2 - 1, (index) {
              if (index.isEven) {
                final stepIndex = index ~/ 2;
                final step = _steps[stepIndex];
                final isDone = stepIndex <= currentIndex;
                final isActive = stepIndex == currentIndex;
                final color = isDone
                    ? AppTheme.primaryLight
                    : AppTheme.textMuted;

                return Expanded(
                  child: Column(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        curve: Curves.easeOut,
                        width: isActive ? 30 : 24,
                        height: isActive ? 30 : 24,
                        decoration: BoxDecoration(
                          color: isDone
                              ? AppTheme.primary.withValues(alpha: 0.18)
                              : AppTheme.bgCard.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: isDone
                                ? AppTheme.primaryLight
                                : AppTheme.surfaceLight.withValues(alpha: 0.45),
                            width: isActive ? 1.6 : 1,
                          ),
                        ),
                        child: Icon(
                          step.$3,
                          size: isActive ? 16 : 13,
                          color: color,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        step.$2,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isDone
                              ? AppTheme.textPrimary
                              : AppTheme.textMuted,
                          fontSize: compact ? 10 : 11,
                          fontWeight: isActive
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                );
              }

              final connectorIndex = index ~/ 2;
              final filled = connectorIndex < currentIndex;
              return Expanded(
                child: Container(
                  margin: const EdgeInsets.only(bottom: 18),
                  height: 2,
                  color: filled
                      ? AppTheme.primaryLight.withValues(alpha: 0.8)
                      : AppTheme.surfaceLight.withValues(alpha: 0.45),
                ),
              );
            }),
          ),
          if (!compact) ...[
            const SizedBox(height: 10),
            Text(
              'Stage ${currentIndex + 1} of ${_steps.length}',
              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }
}
