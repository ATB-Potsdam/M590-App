#!/bin/bash
#
# Create a new *upload* keystore and the certificate that registers it with the
# Play Console.
#
# Usage:
#   scripts/createUploadKeystore.sh
#
# This is for the case where the old upload key's password is lost. It only works
# when Play App Signing is enabled for the app (the default for anything created
# in recent years): Google then holds the real *app signing* key, and the upload
# key is just what authenticates uploads to the Console. Resetting it does NOT
# change the signature users see, so existing installs keep updating normally.
#
# If Play App Signing is NOT enabled, stop — a new key cannot replace the
# original app signing key, and the app would have to ship under a new package
# name. Check first under:
#   Play Console > Release > Setup > App integrity > App signing
#
# The keystore is written inside the repository but is covered by *.jks in
# app/android/.gitignore, so it is never committed. It is still a secret: back it
# up somewhere durable, because losing this one means another reset.

set -euo pipefail

cd "$(dirname "$0")/.."

readonly KEYSTORE="${M590_KEYSTORE:-app/android/upload-keystore.jks}"
readonly KEY_ALIAS="${M590_KEY_ALIAS:-upload}"
readonly CERT_OUT="app/android/upload_certificate.pem"
readonly JAVA_HOME_21=/usr/lib/jvm/java-21-openjdk

# Google requires RSA 2048 and a validity ending after 2033-10-22 for upload
# keys; 10000 days (~27 years) clears that with room to spare.
readonly VALIDITY_DAYS=10000

fail() { echo "ABORTED: $*" >&2; exit 1; }
info() { echo "==> $*"; }

[ -d "$JAVA_HOME_21" ] || fail "JDK 21 not found at $JAVA_HOME_21."
keytool="$JAVA_HOME_21/bin/keytool"

# Never silently replace signing material: if the old keystore is still around,
# overwriting it would destroy the only copy of a key that might still be valid.
[ -e "$KEYSTORE" ] && fail "$KEYSTORE already exists. Move it aside first if you really want a new key."

# The keystore must not be committable. Verified rather than assumed, since the
# whole point is that it lives inside the working tree.
if ! git check-ignore -q "$KEYSTORE" 2>/dev/null; then
    fail "$KEYSTORE is NOT covered by .gitignore. Refusing to create a secret that could be committed."
fi

# --- Password ----------------------------------------------------------------

(: < /dev/tty) 2>/dev/null || fail "no terminal available to prompt for a password on."

printf 'Password for the new keystore (min. 6 characters): ' > /dev/tty
IFS= read -rs pw1 < /dev/tty; echo > /dev/tty
[ ${#pw1} -ge 6 ] || fail "password too short (keytool requires at least 6 characters)."

printf 'Repeat the password: ' > /dev/tty
IFS= read -rs pw2 < /dev/tty; echo > /dev/tty
[ "$pw1" = "$pw2" ] || fail "the passwords do not match."

# --- Generate ----------------------------------------------------------------

# CN is cosmetic for an upload key — Google identifies it by the public key, not
# the subject — but a descriptive value makes `keytool -list` output readable.
info "generating RSA-2048 key '$KEY_ALIAS' valid for $VALIDITY_DAYS days"
"$keytool" -genkeypair \
    -keystore "$KEYSTORE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity "$VALIDITY_DAYS" \
    -storepass "$pw1" \
    -keypass "$pw1" \
    -dname "CN=DWA M 590 Upload Key, O=ATB Potsdam, C=DE" \
    > /dev/null

chmod 600 "$KEYSTORE"

# The Play Console wants the certificate, never the keystore itself.
"$keytool" -export -rfc \
    -keystore "$KEYSTORE" \
    -alias "$KEY_ALIAS" \
    -storepass "$pw1" \
    -file "$CERT_OUT" \
    > /dev/null 2>&1

info "keystore:    $KEYSTORE"
info "certificate: $CERT_OUT"
echo
"$keytool" -list -v -keystore "$KEYSTORE" -alias "$KEY_ALIAS" -storepass "$pw1" 2>/dev/null \
    | grep -iE "Alias|Gültig|Valid|SHA1:|SHA256:" | sed 's/^/    /'

cat <<EOF

--------------------------------------------------------------------------------
Registering this key with the Play Console
--------------------------------------------------------------------------------

1. Confirm Play App Signing is enabled:
     Play Console > Release > Setup > App integrity > App signing
   If it is not, STOP: a new upload key cannot replace the app signing key.

2. Request the upload key reset:
     App integrity > App signing > "Request upload key reset"
   (or Help > Contact support if the self-service option is not offered)

   Reason: "Lost or compromised upload key".
   Attach: $CERT_OUT

3. Google confirms by email, usually within one to two business days. The change
   takes effect for uploads only — the signature users see does not change, so
   installed apps keep updating.

4. After confirmation, build with the new key:
     M590_KEYSTORE=$KEYSTORE M590_KEY_ALIAS=$KEY_ALIAS scripts/buildAndroid.sh

   To make that the default, update KEYSTORE_DEFAULT and KEY_ALIAS_DEFAULT in
   scripts/buildAndroid.sh.

Back up $KEYSTORE and its password somewhere durable — a password manager, not
this repository. Losing it means another reset.
--------------------------------------------------------------------------------
EOF
