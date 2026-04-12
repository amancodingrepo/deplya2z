import 'package:flutter/material.dart';

import '../../core/models.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final OrderStatus status;

  @override
  Widget build(BuildContext context) {
    final (bgColor, textColor) = switch (status) {
      OrderStatus.draft => (Colors.blue.shade50, Colors.blue.shade900),
      OrderStatus.confirmed => (Colors.cyan.shade50, Colors.cyan.shade900),
      OrderStatus.packed => (Colors.orange.shade50, Colors.orange.shade900),
      OrderStatus.dispatched => (Colors.indigo.shade50, Colors.indigo.shade900),
      OrderStatus.storeReceived => (
        Colors.green.shade50,
        Colors.green.shade900,
      ),
      OrderStatus.completed => (Colors.teal.shade50, Colors.teal.shade900),
      OrderStatus.cancelled => (Colors.red.shade50, Colors.red.shade900),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.name,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }
}
