
<p align="center">
  <img width="256" height="256" alt="icon" src="https://github.com/user-attachments/assets/931a74fd-4177-4a0a-b962-53baebacb415" />
</p>

<h1 align="center">Glass Music</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Linux%20|%20Windows%20|%20macOS-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/UI-Liquid%20Glass-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Privacy-Local--First-green?style=for-the-badge" />
</p>

---

<img width="2559" height="1364" alt="Снимок экрана от 2026-05-30 19-17-06" src="https://github.com/user-attachments/assets/c21c598b-9489-44d8-af1f-45ec663bbb3e" />




## RU: О проекте

**Glass Music** — это не просто плеер, это визуальный эксперимент. Мы объединили эстетику будущего (MacOS 26.2 Concept) с мощными инструментами управления локальной медиатекой. Плеер доступен для **Linux**, **Windows** и **macOS**.

> **⚠️ Важно для пользователей macOS:** \
> Так как приложение собирается энтузиастами и не имеет платной подписи разработчика Apple ($99/год), встроенная защита (Gatekeeper) может заблокировать запуск или выдать ошибку "Приложение повреждено". 
> Чтобы открыть плеер: 
> 1. Кликните по приложению **правой кнопкой мыши** (или `Control` + клик).
> 2. В контекстном меню выберите **«Открыть»**.
> 3. В появившемся окне снова нажмите **«Открыть»**.
> Либо перейдите в *Системные настройки -> Конфиденциальность и безопасность* и разрешите запуск приложения.

### 💎 Liquid Glass Engine
Наша гордость — движок интерфейса, использующий глубокое многослойное размытие (24px+), динамическую сатурацию (180%) и аппаратное ускорение GPU. Интерфейс ощущается живым и "глубоким", подстраиваясь под обложку текущего трека.



<img width="2559" height="1364" alt="Снимок экрана от 2026-05-30 19-16-11" src="https://github.com/user-attachments/assets/2c2838b0-596a-4854-88e8-5510c57f1193" />




### ✨ Магия метаданных (Magic API)
Забудьте о ручном вводе тегов. Встроенный редактор оснащен кнопкой **"✨ Магия API"**, которая через интеграцию с Dezer API автоматически находит:
- Оригинальные обложки в высоком качестве.
- Правильные имена артистов и названия альбомов.
- Год выпуска и жанры.
- Текст песен (включая синхронизированный LRC формат).


<img width="2559" height="1364" alt="Снимок экрана от 2026-05-30 19-16-29" src="https://github.com/user-attachments/assets/c152c760-e9da-42eb-bba6-39d9579859f4" />



### 🛡️ Манифест приватности
Мы считаем, что ваши музыкальные вкусы — это ваше личное дело.
- **Никакой телеметрии:** Мы не знаем, что вы слушаете.
- **Offline-First:** Плеер не требует интернета для работы (кроме поиска метаданных).
- **Локальное хранение:** Ваши лайки, плейлисты и настройки хранятся в зашифрованном виде в `~/.config/glass-music`.

<img width="2559" height="1364" alt="Снимок экрана от 2026-05-30 19-17-23" src="https://github.com/user-attachments/assets/81c9626f-0cff-46aa-8b46-64819faf427b" />




### 🎨 Кастомизация без границ
- **Живые обои:** Поддержка видео (MP4) и изображений на фоне плеера.
- **Профили:** Настраиваемый баннер и аватар слушателя.
- **Сезонность:** Автоматический зимний режим (снег и гирлянды), который включается сам в декабре.

### 🚀 Установка

**🐧 Linux**
- **Arch, Manjaro, CachyOS (AUR):**
  ```bash
  yay -S glass-music-bin
  # или
  paru -S glass-music-bin
  ```
- **Ubuntu, Debian, Linux Mint (.deb):**
  Скачайте `.deb` пакет со [страницы релизов](https://github.com/dvytvs/Glass-Music/releases). Пользователи Ubuntu также могут установить плеер из [Snap Store](https://snapcraft.io/glass-music-player).
- **Fedora, ALT Linux, openSUSE, Nobara (.rpm):**
  Скачайте `.rpm` пакет из [наших релизов](https://github.com/dvytvs/Glass-Music/releases).
- **AppImage:**
  Универсальный формат, доступен в [релизах на GitHub](https://github.com/dvytvs/Glass-Music/releases) или на [AppImageHub](https://www.appimagehub.com/p/2358615).
- **Flatpak:**
  К сожалению, официальной публикации во Flathub **никогда не будет**. Платформа ввела очень строгие правила, сделав невозможной публикацию приложений, созданных с помощью ИИ. Это совсем не та открытость, о которой так много говорят. Но вы можете совершенно свободно скачать `.flatpak` пакет из наших [релизов](https://github.com/dvytvs/Glass-Music/releases) и установить его локально. Просим отнестись с пониманием.
- 🚫 **FreeBSD:** Поддержка не планируется вовсе.

**🪟 Windows**
Перейдите в [раздел релизов](https://github.com/dvytvs/Glass-Music/releases) и скачайте установочный файл `setup.exe` либо обычный `.exe`.

**🍏 macOS**
Скачайте готовый `.dmg` пакет из [релизов](https://github.com/dvytvs/Glass-Music/releases). *(Важные нюансы первого запуска на macOS описаны в самом начале).*

---

## EN: About the Project

**Glass Music** is more than just a player; it's a visual experiment. We've combined futuristic aesthetics (MacOS 26.2 Concept) with powerful local media management tools. The player is available on **Linux**, **Windows**, and **macOS**.

> **⚠️ Note for macOS users:** \
> Because the app is not signed with a paid Apple Developer account ($99/year), Gatekeeper may warn that the app is "damaged" or block it from opening.
> To run the app:
> 1. **Right-click** (or `Control`-click) the application.
> 2. Choose **"Open"** from the context menu.
> 3. Click **"Open"** again in the dialog.
> Alternatively, go to *System Settings -> Privacy & Security* and allow the app to launch.

### 💎 Liquid Glass Engine
Our pride is the UI engine featuring deep multi-layered blurring (24px+), dynamic saturation (180%), and GPU hardware acceleration. The interface feels alive and "deep," adapting to the current track's artwork.

### ✨ Metadata Magic (Magic API)
Forget about manual tag entry. The built-in editor features a **"✨ Magic API"** button that leverages Dezer API integration to automatically find:
- High-quality original cover art.
- Correct artist names and album titles.
- Release year and genres.
- Lyrics (including synchronized LRC format).

### 🛡️ Privacy Manifesto
We believe your music tastes are your private business.
- **Zero Telemetry:** We don't know what you're listening to.
- **Offline-First:** The player doesn't require an internet connection (except for metadata fetching).
- **Local Storage:** Your likes, playlists, and settings are stored locally in `~/.config/glass-music`.

### 🎨 Boundaryless Customization
- **Live Backgrounds:** Support for video (MP4) and images behind the player UI.
- **Profiles:** Customizable listener banners and avatars.
- **Seasonality:** An automatic winter mode (snow and lights) that activates itself in December.

### 🚀 Installation

**🐧 Linux**
- **Arch, Manjaro, CachyOS (AUR):** 
  ```bash
  yay -S glass-music-bin
  # or
  paru -S glass-music-bin
  ```
- **Ubuntu, Debian, Linux Mint (.deb):**
  Download the `.deb` package from the [releases page](https://github.com/dvytvs/Glass-Music/releases). Ubuntu users can also get it straight from the [Snap Store](https://snapcraft.io/glass-music-player).
- **Fedora, ALT Linux, openSUSE, Nobara (.rpm):**
  Download the `.rpm` package from [our releases](https://github.com/dvytvs/Glass-Music/releases).
- **AppImage:**
  Grab it from [GitHub Releases](https://github.com/dvytvs/Glass-Music/releases) or [AppImageHub](https://www.appimagehub.com/p/2358615).
- **Flatpak:**
  Unfortunately, there will **never** be an official Flathub release. They introduced extreme publishing restrictions—specifically banning apps made with AI. That is not the "openness" they constantly advertise. However, you can still easily download the ready-made `.flatpak` from our [releases](https://github.com/dvytvs/Glass-Music/releases) and manually install it. We hope you understand.
- 🚫 **FreeBSD:** Support is not planned and will never be provided.

**🪟 Windows**
Go to the [releases page](https://github.com/dvytvs/Glass-Music/releases) and download either the installer (`setup.exe`) or the portable executable (`.exe`).

**🍏 macOS**
Download the ready-to-use `.dmg` package from [our releases](https://github.com/dvytvs/Glass-Music/releases). *(Make sure to review the macOS Gatekeeper instructions at the top of this document).*

---

<p align="center">
  <i>Designed with ❤️. Keep your music local, keep your UI beautiful.</i>
</p>
