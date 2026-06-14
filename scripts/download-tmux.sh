#!/bin/bash

# Script to download static tmux binaries for bundling with Baton
set -e

BIN_DIR="bin/tmux"
mkdir -p "$BIN_DIR"

echo "Downloading static tmux binaries..."

# Linux x86_64 (Standard static build)
if [ ! -f "$BIN_DIR/tmux-linux-x64" ]; then
  echo "Fetching Linux x64..."
  curl -L https://github.com/mizage/static-binaries/raw/master/tmux-3.2a-x86_64 -o "$BIN_DIR/tmux-linux-x64"
  chmod +x "$BIN_DIR/tmux-linux-x64"
fi

# macOS (We'll look for reliable static builds or instructions)
# Note: macOS static binaries are tricky due to system library dependencies.
# We will use the system tmux as a fallback on macOS, or provide instructions.
# For now, let's focus on identifying the local path in the code.

echo "Done."
