# Backend A — WebDriverAgent (this plugin's own tool)

Use this backend when the audit must answer questions about **element grouping** or about **multiple accessibility traits on one element**. It is the higher-fidelity of the two backends and the only one that preserves the nesting of the accessibility tree.

Cost: a one-time Appium + `xcodebuild` build of WebDriverAgent (~10 min), repeated after Xcode upgrades, plus a WDA process (and `iproxy` on physical devices) that must stay running during the audit.

Android needs none of this — `get_accessibility_tree_android` only needs `adb`.

---

## If the target is a simulator

**Check if WDA is installed**:
```bash
xcrun simctl listapps booted | grep -i "WebDriverAgentRunner"
```
If not installed, check Appium and the XCUITest driver are available:
```bash
appium driver list --installed | grep xcuitest
```
If not, install them:
```bash
npm install -g appium && appium driver install xcuitest
```
Then build WDA (no code signing needed for simulator) and install it:
```bash
xcodebuild \
  -project "$(find ~/.appium -name WebDriverAgent.xcodeproj | head -1)" \
  -scheme WebDriverAgentRunner \
  -destination "id=<UDID>" \
  build-for-testing && \
xcrun simctl install booted "$(find ~/Library/Developer/Xcode/DerivedData -path "*/Debug-iphonesimulator/WebDriverAgentRunner-Runner.app" | grep -v "Index.noindex" | head -1)"
# grep -v "Index.noindex" excludes Xcode's internal indexing folder which contains incomplete binaries (no bundle ID) — we want the real build output
```

**Check if WDA is running**:
```bash
curl -s http://localhost:8100/status
```
If not running, launch it:
```bash
xcrun simctl launch <UDID> com.facebook.WebDriverAgentRunner.xctrunner
```

---

## If the target is a physical device

**Check if WDA is installed** (use the UDID from the device detection step):
```bash
xcrun devicectl device info apps --device <UDID> 2>&1 | grep -i "WebDriverAgentRunner"
```
If not installed, check Appium and the XCUITest driver are available:
```bash
appium driver list --installed | grep xcuitest
```
If not, install them:
```bash
npm install -g appium && appium driver install xcuitest
```

Then build WDA and install it on the device (a `DEVELOPMENT_TEAM` is required for physical devices — ask the user for their Team ID, visible in Xcode under Signing & Capabilities):
```bash
xcodebuild \
  -project "$(find ~/.appium -name WebDriverAgent.xcodeproj | head -1)" \
  -scheme WebDriverAgentRunner \
  -destination "id=<UDID>" \
  DEVELOPMENT_TEAM=<TEAM_ID> \
  build-for-testing && \
xcrun devicectl device install app --device <UDID> \
  "$(find ~/Library/Developer/Xcode/DerivedData -path "*/Debug-iphoneos/WebDriverAgentRunner-Runner.app" | grep -v "Index.noindex" | head -1)"
# grep -v "Index.noindex" excludes Xcode's internal indexing folder which contains incomplete binaries (no bundle ID) — we want the real build output
```
If Xcode shows a certificate trust error, the user must go to **Settings → General → VPN & Device Management** on the device and trust their developer certificate, then re-run.

**Forward the WDA port** — WDA runs on the device and must be tunnelled to localhost. Ask the user to run this in a separate terminal and leave it running:
```bash
iproxy 8100 8100
```

**Check if WDA is running**:
```bash
curl -s http://localhost:8100/status
```
If not running, launch it:
```bash
xcrun devicectl device process launch --device <UDID> com.facebook.WebDriverAgentRunner.xctrunner
```

---

## Fetch the tree

Call `get_accessibility_tree_ios` (optionally `appId`, `wdaPort`, `deviceId`).

It returns a nested tree of `{type, label, value, traits, children}` straight from WebDriverAgent's `/source`. Both the **full traits string** and the **parent/child nesting** are preserved, so grouping (`accessible={true}` wrappers) and multi-trait elements are directly readable.

## Limits to keep in mind

- The tree reflects the **foreground app only**; pass `appId` to bring a specific app forward first.
- Port 8100 is shared. If a simulator already holds it and you are targeting a physical device, pass a different `wdaPort` (e.g. 8101) and forward with `iproxy 8101 8100`.
- The plugin cannot drive the UI. To audit another screen, ask the user to navigate there by hand, then fetch the tree again.
