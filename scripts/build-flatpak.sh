#!/usr/bin/env bash
set -e

APP_ID="com.glass.music"
APP_NAME="Glass Music"
RELEASE_DIR="release"
UNPACKED_DIR="$RELEASE_DIR/linux-unpacked"
FLATPAK_DIR="$RELEASE_DIR/flatpak-build"
REPO_DIR="$RELEASE_DIR/flatpak-repo"
OUTPUT_BUNDLE="$RELEASE_DIR/GlassMusic.flatpak"

echo "=== 1. Проверка скомпилированного приложения ==="
if [ ! -d "$UNPACKED_DIR" ]; then
    echo "Директория $UNPACKED_DIR не найдена. Собираем Linux бинарники..."
    npm run build
    npx electron-builder --linux --dir
fi

echo "=== 2. Подготовка файловой структуры Flatpak ==="
rm -rf "$FLATPAK_DIR" "$REPO_DIR"
mkdir -p "$FLATPAK_DIR/files/lib/glass-music"
mkdir -p "$FLATPAK_DIR/files/bin"
mkdir -p "$FLATPAK_DIR/files/share/applications"
mkdir -p "$FLATPAK_DIR/files/share/icons/hicolor/512x512/apps"
mkdir -p "$FLATPAK_DIR/files/share/metainfo"

# Копируем бинарники приложения
cp -r "$UNPACKED_DIR"/* "$FLATPAK_DIR/files/lib/glass-music/"

# Создаем скрипт запуска
cat << 'EOF' > "$FLATPAK_DIR/files/bin/glass-music"
#!/bin/sh
exec /app/lib/glass-music/glass-music "$@"
EOF
chmod +x "$FLATPAK_DIR/files/bin/glass-music"

# Копируем оригинальную иконку приложения из build
if [ -f "build/icons/linux/icon.png" ]; then
    cp "build/icons/linux/icon.png" "$FLATPAK_DIR/files/share/icons/hicolor/512x512/apps/${APP_ID}.png"
elif [ -f "assets/icon.png" ]; then
    cp "assets/icon.png" "$FLATPAK_DIR/files/share/icons/hicolor/512x512/apps/${APP_ID}.png"
fi

# Создаем Desktop файл
cat << EOF > "$FLATPAK_DIR/files/share/applications/${APP_ID}.desktop"
[Desktop Entry]
Name=${APP_NAME}
Exec=glass-music %U
Terminal=false
Type=Application
Icon=${APP_ID}
StartupWMClass=${APP_NAME}
Comment=Modern Glassmorphism Music Player
Categories=AudioVideo;Audio;Player;Music;
MimeType=audio/mpeg;audio/ogg;audio/flac;audio/x-wav;
EOF

# Создаем AppStream метаданные
cat << EOF > "$FLATPAK_DIR/files/share/metainfo/${APP_ID}.metainfo.xml"
<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${APP_ID}</id>
  <name>${APP_NAME}</name>
  <summary>Modern Music Player</summary>
  <metadata_license>CC0-1.0</metadata_license>
  <project_license>MIT</project_license>
  <description>
    <p>Modern Glassmorphism Music Player with synced lyrics and offline support.</p>
  </description>
  <launchable type="desktop-id">${APP_ID}.desktop</launchable>
</component>
EOF

# Создаем метаданные для песочницы Flatpak
cat << EOF > "$FLATPAK_DIR/metadata"
[Application]
name=${APP_ID}
runtime=org.freedesktop.Platform/x86_64/25.08
sdk=org.freedesktop.Sdk/x86_64/25.08
command=glass-music

[Context]
shared=network;ipc;
sockets=x11;wayland;pulseaudio;fallback-x11;
devices=dri;all;
filesystems=host;xdg-music;xdg-download;xdg-run/pipewire-0;

[Environment]
ELECTRON_TRASH=gio
EOF

# Финализируем директорию приложения перед экспортом
echo "=== 3. Финализация песочницы Flatpak ==="
flatpak build-finish "$FLATPAK_DIR" \
    --command=glass-music \
    --share=ipc \
    --share=network \
    --socket=x11 \
    --socket=wayland \
    --socket=pulseaudio \
    --socket=fallback-x11 \
    --device=dri \
    --device=all \
    --filesystem=host \
    --filesystem=xdg-music \
    --filesystem=xdg-download \
    --filesystem=xdg-run/pipewire-0

echo "=== 4. Экспорт в локальный Flatpak репозиторий ==="
ostree init --mode=archive-z2 --repo="$REPO_DIR"
flatpak build-export "$REPO_DIR" "$FLATPAK_DIR"

echo "=== 5. Сборка автономного файла Flatpak (.flatpak bundle) ==="
flatpak build-bundle "$REPO_DIR" "$OUTPUT_BUNDLE" "$APP_ID"

# Очистка временных папок
rm -rf "$FLATPAK_DIR" "$REPO_DIR"

echo "=========================================================="
echo "УСПЕШНО! Файл создан: $OUTPUT_BUNDLE"
echo "Размер: $(ls -lh "$OUTPUT_BUNDLE" | awk '{print $5}')"
echo "Пользователи могут установить его командой: flatpak install $OUTPUT_BUNDLE"
echo "=========================================================="
