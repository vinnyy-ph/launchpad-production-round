# auth (placeholder)

Google Sign-In (OAuth) is **not** implemented in the base skeleton. The shared-core
skill adds it here: the OAuth strategy/handler, the session or token issuance, and the
`authenticate` middleware that other modules import. The app spec requires Google as
the only sign-in method, and inactive/deactivated users must be blocked at this layer.
