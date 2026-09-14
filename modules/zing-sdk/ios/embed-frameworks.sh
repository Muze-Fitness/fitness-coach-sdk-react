#!/bin/sh
set -e

DEST="$TARGET_BUILD_DIR/$FRAMEWORKS_FOLDER_PATH"
mkdir -p "$DEST"

for FRAMEWORK in "$BUILT_PRODUCTS_DIR"/PackageFrameworks/*.framework "$BUILT_PRODUCTS_DIR/ZingCoachSDK.framework"; do
  [ -d "$FRAMEWORK" ] || continue
  rsync -a --delete "$FRAMEWORK" "$DEST/"
  if [ -n "$EXPANDED_CODE_SIGN_IDENTITY" ]; then
    codesign --force --sign "$EXPANDED_CODE_SIGN_IDENTITY" --preserve-metadata=identifier,entitlements --timestamp=none "$DEST/$(basename "$FRAMEWORK")"
  fi
done
