import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/models.dart';

/// Status badge with dot indicator — matches SupplyOS STATUS_MAP design.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status, this.compact = false});

  final OrderStatus status;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final (color, label) = _resolve(status);
    return _Badge(color: color, label: label, compact: compact);
  }

  static (Color, String) _resolve(OrderStatus status) => switch (status) {
    OrderStatus.draft => (AppTheme.s500, 'Draft'),
    OrderStatus.confirmed => (AppTheme.primary, 'Confirmed'),
    OrderStatus.packed => (AppTheme.amber, 'Packed'),
    OrderStatus.dispatched => (AppTheme.purple, 'Dispatched'),
    OrderStatus.storeReceived => (AppTheme.green, 'Received'),
    OrderStatus.completed => (AppTheme.green, 'Completed'),
    OrderStatus.cancelled => (AppTheme.red, 'Cancelled'),
  };
}

/// Generic badge that accepts any color + label — for stock, attendance, etc.
class StatusLabel extends StatelessWidget {
  const StatusLabel({
    super.key,
    required this.label,
    required this.color,
    this.compact = false,
  });

  final String label;
  final Color color;
  final bool compact;

  @override
  Widget build(BuildContext context) =>
      _Badge(color: color, label: label, compact: compact);
}

class _Badge extends StatelessWidget {
  const _Badge({
    required this.color,
    required this.label,
    required this.compact,
  });

  final Color color;
  final String label;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 10,
        vertical: compact ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.25), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
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
