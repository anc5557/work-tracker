# macOS 알림 버튼 설정 가이드

## 개요
현재 개발 환경에서는 macOS 시스템 알림에 액션 버튼이 표시되지 않습니다. 이는 macOS의 보안 정책 때문입니다.

## 프로덕션에서 알림 버튼을 표시하려면

### 1. 앱 코드 서명 필요
```bash
# 개발자 인증서로 앱 서명
codesign --force --deep --sign "Developer ID Application: Your Name" YourApp.app
```

### 2. Info.plist 설정
`Info.plist` 파일에 다음 키를 추가해야 합니다:

```xml
<dict>
  <!-- 기존 설정들... -->
  <key>NSUserNotificationAlertStyle</key>
  <string>alert</string>
</dict>
```

### 3. Electron Forge 설정 (권장)
`forge.config.js` 또는 `package.json`에서 설정:

```javascript
module.exports = {
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO'
      }
    }
  ],
  packagerConfig: {
    appBundleId: 'com.yourcompany.worktracker',
    osxSign: {
      identity: 'Developer ID Application: Your Name',
      'hardened-runtime': true,
      entitlements: 'entitlements.plist'
    },
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
    }
  }
}
```

### 4. 개발 환경에서의 동작
- **알림 클릭**: 새 작업 시작
- **알림 무시/닫기**: 현재 작업 계속

### 5. 프로덕션 환경에서의 동작
- **"새 작업 시작" 버튼**: 새 작업 시작
- **"계속 진행" 버튼**: 현재 작업 계속  
- **알림 클릭**: 앱을 포그라운드로 가져옴
- **알림 닫기**: 현재 작업 계속

## 참고 사항
- macOS 13+ 에서는 더 엄격한 보안 정책 적용
- 알림 권한은 처음 실행 시 자동으로 요청됨
- 시스템 환경설정 > 알림에서 수동으로 권한 조정 가능 