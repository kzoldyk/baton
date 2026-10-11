#!/usr/bin/env bash
set -euo pipefail

# Scripts to package portable tmux binaries for Baton
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/bin/tmux"

mkdir -p "$BIN_DIR/darwin-arm64/lib"
mkdir -p "$BIN_DIR/linux-x64"

# 1. Download static Linux x64 tmux
echo "Downloading static Linux x64 tmux..."
curl -sL "https://github.com/mjakob-gh/build-static-tmux/releases/download/v3.7b/tmux.linux-amd64.gz" | gunzip > "$BIN_DIR/linux-x64/tmux"
chmod 755 "$BIN_DIR/linux-x64/tmux"
cp "$BIN_DIR/linux-x64/tmux" "$BIN_DIR/tmux-linux-x64"

# 2. On macOS arm64, assemble relocatable tmux if Homebrew tmux is available
if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
  if [[ -f "/opt/homebrew/bin/tmux" ]]; then
    echo "Assembling portable macOS arm64 tmux bundle..."
    cp /opt/homebrew/bin/tmux "$BIN_DIR/darwin-arm64/tmux"
    cp /opt/homebrew/opt/utf8proc/lib/libutf8proc.3.dylib "$BIN_DIR/darwin-arm64/lib/"
    cp /opt/homebrew/opt/ncurses/lib/libncursesw.6.dylib "$BIN_DIR/darwin-arm64/lib/"
    cp /opt/homebrew/opt/libevent/lib/libevent_core-2.1.7.dylib "$BIN_DIR/darwin-arm64/lib/"

    chmod 755 "$BIN_DIR/darwin-arm64/tmux" "$BIN_DIR/darwin-arm64/lib/"*

    install_name_tool -change /opt/homebrew/opt/utf8proc/lib/libutf8proc.3.dylib @executable_path/lib/libutf8proc.3.dylib "$BIN_DIR/darwin-arm64/tmux"
    install_name_tool -change /opt/homebrew/opt/ncurses/lib/libncursesw.6.dylib @executable_path/lib/libncursesw.6.dylib "$BIN_DIR/darwin-arm64/tmux"
    install_name_tool -change /opt/homebrew/opt/libevent/lib/libevent_core-2.1.7.dylib @executable_path/lib/libevent_core-2.1.7.dylib "$BIN_DIR/darwin-arm64/tmux"

    install_name_tool -id @loader_path/libutf8proc.3.dylib "$BIN_DIR/darwin-arm64/lib/libutf8proc.3.dylib"
    install_name_tool -id @loader_path/libncursesw.6.dylib "$BIN_DIR/darwin-arm64/lib/libncursesw.6.dylib"
    install_name_tool -id @loader_path/libevent_core-2.1.7.dylib "$BIN_DIR/darwin-arm64/lib/libevent_core-2.1.7.dylib"

    codesign -s - -f "$BIN_DIR/darwin-arm64/lib/"* "$BIN_DIR/darwin-arm64/tmux"
  fi
fi

echo "Portable tmux ready in $BIN_DIR"
