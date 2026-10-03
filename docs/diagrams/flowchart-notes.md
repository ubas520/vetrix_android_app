# Vetrix mobile flowchart

Scope: pet-owner mobile application in `vet_clinic_client_mobile`, based on its current screens and navigation. Clinic actions are shown only as waits in the mobile user's workflow.

Generated with the built-in imagegen tool. Final edit prompt: Keep the seven workflow panels and academic styling; title the diagram "Vetrix Mobile App Flowchart"; show mobile-user waits for clinic approval, review and payment verification; label clinic payment "Payment due at pickup"; show optional signup and password reset paths and the login validation/retry flow.

Authoritative login sequence: Start -> restore session -> signed in? If yes, main navigation. If no, Login -> validate credentials -> success: main navigation; failure: show error -> retry Login. Signup and password reset are optional actions from Login. The generated raster's small login arrows may be ambiguous; use this sequence when redrawing that section.

Source checks: RootNavigator.js, MainStack.js, ClientTabs.js, MoreScreen.js, ChatScreen.js, AppointmentsScreen.js, ProfileScreen.js, SettingsScreen.js, ProductCheckoutScreen.js, ProductOrderDetailsScreen.js and NotificationContext.js; supplemented by VETRIX_CLIENT_USER_MANUAL.md.

The assistant is an on-device guide. Notifications are in-app updates. Online payment options depend on enabled clinic accounts. Password reset starts from Login, rather than Profile.
