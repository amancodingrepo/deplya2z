import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../core/models.dart';
import '../state/providers.dart';
import 'widgets/gradient_button.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController(
    text: 'warehouse@yourcompany.com',
  );
  final _passwordController = TextEditingController(text: 'Warehouse@123');
  UserRole _selectedRole = UserRole.warehouseManager;
  bool _obscurePassword = true;

  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOut),
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);

    return Scaffold(
      // Design: dark blue background (#0F172A)
      backgroundColor: AppTheme.s900,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SlideTransition(
                position: _slideAnim,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // ── Logo / Brand ────────────────────────────
                      Center(
                        child: Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppTheme.primary,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: AppTheme.glowShadow,
                          ),
                          child: const Icon(
                            Icons.hexagon_outlined,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'SupplyOS',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          fontFamily: 'Sora',
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Store & Warehouse Supply Management',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withValues(alpha: 0.55),
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      const SizedBox(height: 32),

                      // ── White Login Card ─────────────────────────
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.2),
                              blurRadius: 24,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Sign in',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.s900,
                                fontFamily: 'Sora',
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Enter your credentials to continue',
                              style: TextStyle(
                                color: AppTheme.s500,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Email
                            TextField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              style: const TextStyle(
                                color: AppTheme.s900,
                                fontSize: 14,
                              ),
                              decoration: InputDecoration(
                                labelText: 'Email',
                                prefixIcon: const Icon(
                                  Icons.mail_outline_rounded,
                                  size: 20,
                                  color: AppTheme.s500,
                                ),
                                fillColor: AppTheme.s50,
                                filled: true,
                                border: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                    color: AppTheme.s200,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                    color: AppTheme.s200,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                    color: AppTheme.primary,
                                    width: 1.5,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Password
                            TextField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              style: const TextStyle(
                                color: AppTheme.s900,
                                fontSize: 14,
                              ),
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(
                                  Icons.lock_outline_rounded,
                                  size: 20,
                                  color: AppTheme.s500,
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_off_rounded
                                        : Icons.visibility_rounded,
                                    size: 20,
                                    color: AppTheme.s500,
                                  ),
                                  onPressed: () => setState(
                                    () => _obscurePassword = !_obscurePassword,
                                  ),
                                ),
                                fillColor: AppTheme.s50,
                                filled: true,
                                border: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                    color: AppTheme.s200,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                    color: AppTheme.s200,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius:
                                      BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                    color: AppTheme.primary,
                                    width: 1.5,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Role Selector
                            _RoleSelector(
                              selected: _selectedRole,
                              onChanged: (role) =>
                                  setState(() => _selectedRole = role),
                            ),
                            const SizedBox(height: 20),

                            // Sign In Button
                            GradientButton(
                              label: state.loading ? '···' : 'Sign in',
                              icon: state.loading ? null : Icons.login_rounded,
                              loading: false,
                              onPressed: state.loading
                                  ? null
                                  : () {
                                      ref
                                          .read(
                                            appControllerProvider.notifier,
                                          )
                                          .login(
                                            email: _emailController.text.trim(),
                                            password:
                                                _passwordController.text,
                                            role: _selectedRole,
                                          );
                                    },
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Status messages
                      if (!state.isOnline)
                        _StatusMessage(
                          icon: Icons.wifi_off_rounded,
                          text: 'No internet. Login requires connectivity.',
                          color: AppTheme.red,
                          dark: true,
                        ),

                      if (state.message != null)
                        _StatusMessage(
                          icon: Icons.info_outline_rounded,
                          text: state.message!,
                          color: AppTheme.amber,
                          dark: true,
                        ),

                      const SizedBox(height: 16),

                      Text(
                        'admin@ · warehouse@ · store@yourcompany.com',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.white.withValues(alpha: 0.4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role segmented control
// ─────────────────────────────────────────────────────────────────────────────

class _RoleSelector extends StatelessWidget {
  const _RoleSelector({required this.selected, required this.onChanged});

  final UserRole selected;
  final ValueChanged<UserRole> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.s50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.s200),
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          _option(
            label: 'Admin',
            icon: Icons.admin_panel_settings_rounded,
            role: UserRole.superadmin,
          ),
          const SizedBox(width: 3),
          _option(
            label: 'WH',
            icon: Icons.warehouse_rounded,
            role: UserRole.warehouseManager,
          ),
          const SizedBox(width: 3),
          _option(
            label: 'Store',
            icon: Icons.store_rounded,
            role: UserRole.storeManager,
          ),
          const SizedBox(width: 3),
          _option(
            label: 'Staff',
            icon: Icons.badge_rounded,
            role: UserRole.staff,
          ),
        ],
      ),
    );
  }

  Widget _option({
    required String label,
    required IconData icon,
    required UserRole role,
  }) {
    final isActive = selected == role;
    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(role),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isActive ? AppTheme.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(7),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 15,
                color: isActive ? Colors.white : AppTheme.s500,
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight:
                      isActive ? FontWeight.w600 : FontWeight.w400,
                  color: isActive ? Colors.white : AppTheme.s500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline status message
// ─────────────────────────────────────────────────────────────────────────────

class _StatusMessage extends StatelessWidget {
  const _StatusMessage({
    required this.icon,
    required this.text,
    required this.color,
    this.dark = false,
  });

  final IconData icon;
  final String text;
  final Color color;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: dark ? 0.15 : 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: dark ? color.withValues(alpha: 0.9) : color,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
