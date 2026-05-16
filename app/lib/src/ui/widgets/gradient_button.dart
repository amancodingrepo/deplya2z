import 'package:flutter/material.dart';

import '../../core/app_theme.dart';

/// Primary action button — solid blue per SupplyOS design.
class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.compact = false,
    this.gradient,
    this.color,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final bool compact;
  final Gradient? gradient;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final bool enabled = onPressed != null && !loading;
    final bgColor = color ?? AppTheme.primary;

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      child: InkWell(
        onTap: enabled ? onPressed : null,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        child: Ink(
          decoration: BoxDecoration(
            gradient: enabled ? gradient : null,
            color: gradient == null
                ? (enabled ? bgColor : AppTheme.s200)
                : null,
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
          padding: EdgeInsets.symmetric(
            horizontal: compact ? 16 : 24,
            vertical: compact ? 10 : 14,
          ),
          child: Row(
            mainAxisSize: compact ? MainAxisSize.min : MainAxisSize.max,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (loading) ...[
                SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: enabled ? Colors.white : AppTheme.s500,
                  ),
                ),
              ] else ...[
                if (icon != null) ...[
                  Icon(
                    icon,
                    color: enabled ? Colors.white : AppTheme.s500,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                ],
                Text(
                  label,
                  style: TextStyle(
                    color: enabled ? Colors.white : AppTheme.s500,
                    fontWeight: FontWeight.w600,
                    fontSize: compact ? 12 : 14,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
