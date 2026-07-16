import Foundation
import ZingCoachSDK

enum AuthTokenBridgeError: Error {
  case rejected(String)
  case bridgeDestroyed
}

final class AuthTokenRequestStore: @unchecked Sendable {
  private let lock = NSLock()
  private var continuations: [String: CheckedContinuation<Result<String, Error>, Never>] = [:]

  func register(
    requestId: String,
    continuation: CheckedContinuation<Result<String, Error>, Never>
  ) {
    lock.lock()
    continuations[requestId] = continuation
    lock.unlock()
  }

  func resolve(requestId: String, with result: Result<String, Error>) {
    lock.lock()
    let continuation = continuations.removeValue(forKey: requestId)
    lock.unlock()
    continuation?.resume(returning: result)
  }

  func failAll(with error: Error) {
    lock.lock()
    let pending = continuations
    continuations.removeAll()
    lock.unlock()
    for continuation in pending.values {
      continuation.resume(returning: .failure(error))
    }
  }
}

/// Suspends the SDK's token request until JS answers the emitted
/// `onAuthTokenRequested` event via `provideAuthToken`/`rejectAuthToken`.
final class AuthAdapter: ZingSDK.AuthProvider {
  private let store: AuthTokenRequestStore
  private let requestToken: (String) -> Void

  init(store: AuthTokenRequestStore, requestToken: @escaping (String) -> Void) {
    self.store = store
    self.requestToken = requestToken
  }

  func didRequestAuthToken() async -> Result<String, Error> {
    let requestId = UUID().uuidString
    return await withCheckedContinuation { continuation in
      store.register(requestId: requestId, continuation: continuation)
      requestToken(requestId)
    }
  }
}

final class TokenErrorForwarder: ZingSDK.ErrorHandler {
  private let onTokenInvalid: () -> Void

  init(onTokenInvalid: @escaping () -> Void) {
    self.onTokenInvalid = onTokenInvalid
  }

  func didReceiveError(_ error: AuthError) {
    if case .badToken = error {
      DispatchQueue.main.async { [onTokenInvalid] in
        onTokenInvalid()
      }
    }
  }
}
