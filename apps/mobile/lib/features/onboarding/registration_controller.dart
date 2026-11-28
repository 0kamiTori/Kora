import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_config.dart';
import 'registration_models.dart';
import 'registration_repository.dart';

final apiConfigProvider = Provider<ApiConfig>((ref) => ApiConfig.environment());
final registrationRepositoryProvider = Provider<RegistrationRepository>((ref) {
  final repository = HttpRegistrationRepository(ref.watch(apiConfigProvider));
  ref.onDispose(repository.close);
  return repository;
});

class RegistrationState {
  const RegistrationState({
    this.policy,
    this.loading = true,
    this.submitting = false,
    this.failure,
    this.created,
    this.pending = false,
    this.consentRevision = 0,
    this.retryAt,
  });
  final RegistrationPolicy? policy;
  final bool loading, submitting, pending;
  final RegistrationFailure? failure;
  final CreatedAccount? created;
  final int consentRevision;
  final DateTime? retryAt;
}

final registrationControllerProvider =
    NotifierProvider.autoDispose<RegistrationController, RegistrationState>(
      RegistrationController.new,
    );

class RegistrationController extends Notifier<RegistrationState> {
  RegistrationRequest? _pending;
  String? _key;
  @override
  RegistrationState build() {
    ref.onDispose(() {
      _pending = null;
      _key = null;
    });
    Future.microtask(() {
      if (ref.mounted) loadPolicy();
    });
    return const RegistrationState();
  }

  Future<void> loadPolicy() async {
    if (state.submitting || state.pending || state.created != null) return;
    final before = state;
    state = RegistrationState(
      policy: before.policy,
      consentRevision: before.consentRevision,
    );
    try {
      final policy = await ref
          .read(registrationRepositoryProvider)
          .fetchPolicy();
      if (!ref.mounted) return;
      state = RegistrationState(
        policy: policy,
        loading: false,
        consentRevision: before.consentRevision + 1,
      );
    } on RegistrationFailure catch (failure) {
      if (ref.mounted) {
        state = RegistrationState(
          loading: false,
          failure: failure,
          consentRevision: before.consentRevision + 1,
        );
      }
    } catch (_) {
      if (ref.mounted) {
        state = RegistrationState(
          loading: false,
          failure: const RegistrationFailure('RESPONSE_INVALID'),
          consentRevision: before.consentRevision + 1,
        );
      }
    }
  }

  Future<void> submit(RegistrationRequest request) async {
    if (state.submitting || state.created != null) return;
    if (state.retryAt != null && DateTime.now().isBefore(state.retryAt!)) {
      return;
    }
    final old = state;
    state = RegistrationState(
      policy: old.policy,
      loading: false,
      submitting: true,
      pending: _pending != null,
      consentRevision: old.consentRevision,
    );
    try {
      if (_pending == null) {
        final policy = await ref
            .read(registrationRepositoryProvider)
            .fetchPolicy();
        if (!ref.mounted) return;
        if (!policy.enabled) {
          state = RegistrationState(
            policy: policy,
            loading: false,
            failure: const RegistrationFailure('REGISTRATION_DISABLED'),
            consentRevision: old.consentRevision + 1,
          );
          return;
        }
        if (policy.version != request.consentVersion) {
          state = RegistrationState(
            policy: policy,
            loading: false,
            failure: const RegistrationFailure('CONSENT_VERSION_CHANGED'),
            consentRevision: old.consentRevision + 1,
          );
          return;
        }
        _pending = request;
        _key = registrationKey();
      }
      final account = await ref
          .read(registrationRepositoryProvider)
          .register(_pending!, _key!);
      if (_pending != null &&
          account.consentVersion != _pending!.consentVersion) {
        throw const RegistrationFailure('RESPONSE_INVALID', retryable: true);
      }
      _pending = null;
      _key = null;
      if (ref.mounted) {
        state = RegistrationState(
          policy: old.policy,
          loading: false,
          created: account,
          consentRevision: old.consentRevision,
        );
      }
    } on RegistrationFailure catch (failure) {
      final uncertain =
          _pending != null &&
          (old.pending ||
              failure.retryable ||
              failure.code == 'IDEMPOTENCY_CONFLICT');
      final reportedFailure =
          old.pending && failure.code == 'REGISTRATION_DISABLED'
          ? RegistrationFailure(
              failure.code,
              retryable: true,
              fields: failure.fields,
              retryAfter: failure.retryAfter,
            )
          : failure;
      if (!uncertain) {
        _pending = null;
        _key = null;
      }
      if (!ref.mounted) return;
      state = RegistrationState(
        policy: old.policy,
        loading: false,
        failure: reportedFailure,
        pending: uncertain,
        consentRevision: old.consentRevision,
        retryAt: failure.retryAfter > Duration.zero
            ? DateTime.now().add(failure.retryAfter)
            : null,
      );
      if (failure.code == 'CONSENT_VERSION_CHANGED') {
        state = RegistrationState(
          loading: true,
          failure: failure,
          consentRevision: old.consentRevision + 1,
        );
        try {
          final policy = await ref
              .read(registrationRepositoryProvider)
              .fetchPolicy();
          if (ref.mounted) {
            state = RegistrationState(
              policy: policy,
              loading: false,
              failure: failure,
              consentRevision: old.consentRevision + 1,
            );
          }
        } catch (_) {
          if (ref.mounted) {
            state = RegistrationState(
              loading: false,
              failure: failure,
              consentRevision: old.consentRevision + 1,
            );
          }
        }
      }
    } catch (_) {
      if (ref.mounted) {
        state = RegistrationState(
          policy: old.policy,
          loading: false,
          failure: const RegistrationFailure(
            'RESPONSE_INVALID',
            retryable: true,
          ),
          pending: _pending != null,
          consentRevision: old.consentRevision,
        );
      }
    }
  }

  Future<void> retry() async {
    final request = _pending;
    if (request != null) await submit(request);
  }

  void clearFailure() {
    if (!state.submitting &&
        !state.pending &&
        state.created == null &&
        state.failure != null) {
      state = RegistrationState(
        policy: state.policy,
        loading: state.loading,
        consentRevision: state.consentRevision,
      );
    }
  }
}
