# Centrat private license generator

The Centrat desktop app verifies licenses with an embedded **public** P-256 key only.

The self-contained signing generator is intentionally **not stored in this public repository** because it contains the private signing key. Publishing that file would let anyone mint valid Centrat licenses.

Current public contract:

- schema: `centrat-license`
- version: `1`
- key id: `centrat-license-v1`
- algorithm: `ECDSA_P256_SHA256`
- device prefix: `CTR-`
- license extension: `.centrat-license`
- public-key fingerprint (SHA-256 of SEC1 uncompressed key):
  `8B2E433B60CEAD0111EECC2E98B890EC15FBEEE9B05281D1485B0523EC2C081D`

The private generator is a single offline HTML file kept separately by the owner. It needs no PEM/key sidecar file and performs signing locally in the browser.
