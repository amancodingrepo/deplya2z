import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/glass_card.dart';
import 'widgets/gradient_button.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  late TextEditingController _emailController;
  late TextEditingController _passwordController;
  UserRole _selectedRole = UserRole.warehouseManager;
  bool _obscurePassword = true;

  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController();
    _passwordController = TextEditingController();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOut));
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _clearForm() {
    _emailController.clear();
    _passwordController.clear();
    _selectedRole = UserRole.warehouseManager;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);

    // Clear form after successful login
    ref.listen(appControllerProvider, (previous, next) {
      if (previous?.session == null && next.session != null) {
        _clearForm();
      }
    });

    return Scaffold(
      body: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: AppTheme.backgroundGradient,
            ),
          ),
          Positioned(
            top: -80,
            right: -40,
            child: _GlowOrb(color: AppTheme.primary, size: 220),
          ),
          Positioned(
            bottom: -100,
            left: -50,
            child: _GlowOrb(color: AppTheme.accent, size: 260),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 24,
                ),
                child: FadeTransition(
                  opacity: _fadeAnim,
                  child: SlideTransition(
                    position: _slideAnim,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          GlassCard(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 56,
                                      height: 56,
                                      decoration: BoxDecoration(
                                        gradient: AppTheme.primaryGradient,
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: const Icon(
                                        Icons.warehouse_rounded,
                                        color: Colors.white,
                                        size: 28,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'A2Z Supply Control Center',
                                            style: Theme.of(
                                              context,
                                            ).textTheme.headlineSmall,
                                          ),
                                          const SizedBox(height: 4),
                                          const Text(
                                            'Admin, warehouse, and store teams use one live workspace for stock, orders, and approvals.',
                                            style: TextStyle(
                                              color: AppTheme.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 18),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: const [
                                    _FeaturePill(
                                      icon: Icons.cloud_done_rounded,
                                      label: 'Live backend',
                                    ),
                                    _FeaturePill(
                                      icon: Icons.route_rounded,
                                      label: 'Order tracking',
                                    ),
                                    _FeaturePill(
                                      icon: Icons.inventory_2_rounded,
                                      label: 'Stock sync',
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          GlassCard(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  'Sign in',
                                  style: Theme.of(
                                    context,
                                  ).textTheme.headlineSmall,
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Choose your role, then access the live workspace.',
                                  style: TextStyle(
                                    color: AppTheme.textMuted,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 22),
                                TextField(
                                  controller: _emailController,
                                  keyboardType: TextInputType.emailAddress,
                                  style: const TextStyle(
                                    color: AppTheme.textPrimary,
                                  ),
                                  decoration: const InputDecoration(
                                    labelText: 'Work email',
                                    prefixIcon: Icon(
                                      Icons.mail_outline_rounded,
                                      size: 20,
                                      color: AppTheme.textMuted,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 14),
                                TextField(
                                  controller: _passwordController,
                                  obscureText: _obscurePassword,
                                  style: const TextStyle(
                                    color: AppTheme.textPrimary,
                                  ),
                                  decoration: InputDecoration(
                                    labelText: 'Password',
                                    prefixIcon: const Icon(
                                      Icons.lock_outline_rounded,
                                      size: 20,
                                      color: AppTheme.textMuted,
                                    ),
                                    suffixIcon: IconButton(
                                      tooltip: _obscurePassword
                                          ? 'Show password'
                                          : 'Hide password',
                                      icon: Icon(
                                        _obscurePassword
                                            ? Icons.visibility_off_rounded
                                            : Icons.visibility_rounded,
                                        size: 20,
                                        color: AppTheme.textMuted,
                                      ),
                                      onPressed: () => setState(
                                        () => _obscurePassword =
                                            !_obscurePassword,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 14),
                                _RoleSelector(
                                  selected: _selectedRole,
                                  onChanged: (role) => setState(() {
                                    _selectedRole = role;
                                  }),
                                ),
                                const SizedBox(height: 20),
                                GradientButton(
                                  label: 'Sign In',
                                  icon: Icons.login_rounded,
                                  loading: state.loading,
                                  onPressed: state.loading ? null : _tryLogin,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),
                          if (!state.isOnline)
                            _StatusMessage(
                              icon: Icons.wifi_off_rounded,
                              text:
                                  'No internet connection. Sign in needs a live backend.',
                              color: AppTheme.error,
                            ),
                          if (state.message != null)
                            _StatusMessage(
                              icon: Icons.info_outline_rounded,
                              text: state.message!,
                              color: AppTheme.warning,
                            ),
                          const SizedBox(height: 16),
                          Text(
                            'A2Z demo accounts: admin@storewarehouse.com, warehouse@storewarehouse.com, store1@storewarehouse.com',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _tryLogin() {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      _showError('Email and password are required.');
      return;
    }

    final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailRegex.hasMatch(email)) {
      _showError('Enter a valid work email address.');
      return;
    }

    ref
        .read(appControllerProvider.notifier)
        .login(email: email, password: password, role: _selectedRole);
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppTheme.error),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Role Toggle Selector
// ──────────────────────────────────────────────────────────────────────────────

class _RoleSelector extends StatelessWidget {
  const _RoleSelector({required this.selected, required this.onChanged});

  final UserRole selected;
  final ValueChanged<UserRole> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCardLight.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(color: AppTheme.surfaceLight.withValues(alpha: 0.4)),
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          _roleOption(
            label: 'Admin',
            subtitle: 'Users + reports',
            icon: Icons.admin_panel_settings_rounded,
            role: UserRole.superadmin,
          ),
          const SizedBox(width: 4),
          _roleOption(
            label: 'Warehouse',
            subtitle: 'Accept + dispatch',
            icon: Icons.warehouse_rounded,
            role: UserRole.warehouseManager,
          ),
          const SizedBox(width: 4),
          _roleOption(
            label: 'Store',
            subtitle: 'Track deliveries',
            icon: Icons.store_rounded,
            role: UserRole.storeManager,
          ),
        ],
      ),
    );
  }

  Widget _roleOption({
    required String label,
    required String subtitle,
    required IconData icon,
    required UserRole role,
  }) {
    final isActive = selected == role;
    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(role),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 8),
          decoration: BoxDecoration(
            gradient: isActive ? AppTheme.primaryGradient : null,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 17,
                color: isActive ? Colors.white : AppTheme.textMuted,
              ),
              const SizedBox(height: 5),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                  color: isActive ? Colors.white : AppTheme.textMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  color: isActive
                      ? Colors.white.withValues(alpha: 0.85)
                      : AppTheme.textMuted.withValues(alpha: 0.8),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Status message row
// ──────────────────────────────────────────────────────────────────────────────

class _StatusMessage extends StatelessWidget {
  const _StatusMessage({
    required this.icon,
    required this.text,
    required this.color,
  });

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: TextStyle(color: color, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color.withValues(alpha: 0.24), color.withValues(alpha: 0.0)],
        ),
      ),
    );
  }
}

class _FeaturePill extends StatelessWidget {
  const _FeaturePill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.surfaceLight.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.primaryLight),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
