import AuthenticationServices
import Capacitor
import CryptoKit

// Sign in with Apple, the system sheet (Face ID / Touch ID / password) on
// iPhone and iPad. Returns Apple's identity token, which the app gives to
// Supabase (signInWithIdToken). The app passes a random nonce; Apple gets its
// SHA-256 and puts it in the token, and Supabase checks it against the nonce.
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var pending: CAPPluginCall?
    private var controller: ASAuthorizationController?

    @objc func signIn(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), !nonce.isEmpty else {
            call.reject("missing nonce", "failed")
            return
        }
        DispatchQueue.main.async {
            self.pending?.reject("canceled", "canceled")
            self.pending = call
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.controller = controller
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pending else { return }
        pending = nil
        self.controller = nil
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken,
              let token = String(data: data, encoding: .utf8) else {
            call.reject("no identity token", "failed")
            return
        }
        // Apple gives the name only the first time someone signs in to the app.
        call.resolve([
            "identityToken": token,
            "givenName": credential.fullName?.givenName ?? "",
            "familyName": credential.fullName?.familyName ?? ""
        ])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = pending else { return }
        pending = nil
        self.controller = nil
        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            call.reject("canceled", "canceled")
            return
        }
        call.reject(error.localizedDescription, "failed")
    }
}
