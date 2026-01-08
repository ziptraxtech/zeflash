# Quick Start: Building Release Version

## 🚀 Build Release APK (for testing/direct distribution)

```bash
./build-release-apk.sh
```

**First time:** You'll be asked to create a keystore. Keep the password safe!

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

---

## 📦 Build App Bundle (for Google Play Store)

```bash
./build-app-bundle.sh
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

---

## 📋 Before Publishing to Play Store

1. **Test the release build thoroughly**
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

2. **Update version in `android/app/build.gradle`**
   ```groovy
   versionCode 2      // Increment each release
   versionName "1.1"  // User-visible version
   ```

3. **Build the App Bundle**
   ```bash
   ./build-app-bundle.sh
   ```

4. **Upload to Play Console**
   - Go to https://play.google.com/console
   - Upload `zeflash-release.aab`
   - Add release notes
   - Submit for review

---

## ⚠️ IMPORTANT: Keystore Security

**Backup these files securely:**
- `android/app/zeflash-release-key.keystore`
- `android/key.properties`

**If you lose these, you CANNOT update your app on Play Store!**

```bash
# Backup command
cp android/app/zeflash-release-key.keystore ~/secure-backup/
cp android/key.properties ~/secure-backup/
```

---

## 🔍 Troubleshooting

**Problem:** "Java 17 not found"
```bash
brew install openjdk@17
```

**Problem:** "key.properties not found"
Run `./build-release-apk.sh` first to generate keystore

**Problem:** Build fails
Check the detailed guide: `RELEASE_BUILD_GUIDE.md`

---

## 📖 Full Documentation

See `RELEASE_BUILD_GUIDE.md` for complete instructions and best practices.
