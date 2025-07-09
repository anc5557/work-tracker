# Work Tracker - 업무 자동화 서비스

> 생산적인 업무를 위한 스마트한 시간 관리 도구

업무 시작 버튼으로 자동 스크린샷 캡처 및 업무 기록을 관리하는 macOS 데스크톱 애플리케이션입니다.

## 📊 현재 구현 상태

**전체 진행도**: 70-80% 완료

### ✅ 완료된 기능
- Electron Main Process (윈도우, 트레이, 메뉴)
- 스크린샷 서비스 (macOS 권한 처리 및 캡처)
- 데이터 서비스 (JSON 기반 로컬 저장)
- IPC 통신 시스템
- 기본 대시보드 UI (업무 시작/종료, 타이머)
- shadcn/ui 기반 UI 컴포넌트

### 🚧 진행 중인 기능
- Work Record Card 컴포넌트
- App Layout 네비게이션
- 자동 스크린샷 캡처 시스템

### 📋 TODO
상세한 TODO 목록은 `.cursor/rules/work-tracker-todo.mdc` 파일을 참조하세요.

## 📋 목차

- [현재 구현 상태](#-현재-구현-상태)
- [프로젝트 개요](#-프로젝트-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [사용법](#-사용법)
- [개발 가이드](#-개발-가이드)
- [API 문서](#-api-문서)
- [라이선스](#-라이선스)

## 🎯 프로젝트 개요

Work Tracker는 업무 생산성 향상을 위한 데스크톱 애플리케이션으로, 다음과 같은 핵심 가치를 제공합니다:

- **자동화된 업무 기록**: 클릭 한 번으로 업무 시작/종료 및 스크린샷 자동 캡처
- **직관적인 시간 관리**: 실시간 타이머와 업무 진행 상황 모니터링
- **로컬 데이터 저장**: 개인정보 보호를 위한 완전한 로컬 데이터 관리
- **아름다운 UI/UX**: shadcn/ui와 Tailwind CSS 기반의 모던하고 접근성 높은 인터페이스

### 주요 특징

- 🖥️ **macOS 네이티브 지원** - Electron을 통한 최적화된 데스크톱 환경
- 📸 **자동 스크린샷** - 설정 가능한 간격으로 자동 화면 캡처
- ⏱️ **실시간 타이머** - 정확한 업무 시간 추적 및 관리
- 📊 **일일 업무 리스트** - 시간순 정렬된 업무 기록 및 통계
- 🎨 **모던 UI** - 다크/라이트 테마 지원 및 반응형 디자인
- 🔒 **프라이버시 보호** - 모든 데이터는 로컬에 저장

## ✨ 주요 기능

### 1. 업무 타이머
- **원클릭 시작/종료**: 간단한 버튼으로 업무 시작 및 종료
- **실시간 추적**: 업무 진행 시간 실시간 모니터링
- **작업 설명**: 업무 제목과 상세 설명 입력 지원

### 2. 자동 스크린샷 캡처
- **권한 관리**: macOS 화면 녹화 권한 자동 요청 및 관리
- **고해상도 캡처**: 전체 화면 또는 특정 영역 캡처
- **자동 저장**: 설정된 경로에 자동으로 스크린샷 저장

### 3. 업무 기록 관리
- **일일 요약**: 날짜별 업무 기록 및 통계
- **데이터 영속성**: JSON 파일 기반 로컬 데이터 저장
- **검색 및 필터**: 날짜별, 기간별 업무 기록 조회

### 4. 시스템 통합
- **트레이 지원**: 시스템 트레이에서 빠른 접근
- **메뉴바 통합**: macOS 메뉴바 네이티브 지원
- **백그라운드 실행**: 화면 최소화 시에도 지속적인 작업

## 🛠 기술 스택

### 프론트엔드
- **React 18.3** - 컴포넌트 기반 UI 프레임워크
- **TypeScript 5.8** - 타입 안전성과 개발자 경험 향상
- **Tailwind CSS 3.4** - 유틸리티 퍼스트 CSS 프레임워크
- **shadcn/ui** - 접근성 높은 React 컴포넌트 라이브러리
- **Radix UI** - 접근성과 커스터마이징에 최적화된 프리미티브

### 백엔드/데스크톱
- **Electron 37.2** - 크로스 플랫폼 데스크톱 애플리케이션 프레임워크
- **Node.js** - 메인 프로세스 백엔드 로직
- **IPC (Inter-Process Communication)** - 메인-렌더러 프로세스 간 통신

### 개발 도구
- **Webpack 5** - 모듈 번들러 및 개발 서버
- **PostCSS** - CSS 후처리 및 최적화
- **Concurrently** - 병렬 개발 서버 실행

### 유틸리티 라이브러리
- **date-fns** - 날짜 처리 및 포맷팅
- **lucide-react** - 아이콘 라이브러리
- **uuid** - 고유 ID 생성
- **class-variance-authority** - 조건부 스타일링

## 📁 프로젝트 구조

```
work-tracker/
├── src/
│   ├── main/                    # Electron 메인 프로세스
│   │   ├── index.ts            # 앱 진입점 및 윈도우 관리
│   │   ├── ipc/
│   │   │   └── handlers.ts     # IPC 이벤트 핸들러
│   │   └── services/
│   │       ├── data.service.ts      # 데이터 관리 서비스
│   │       └── screenshot.service.ts # 스크린샷 캡처 서비스
│   │
│   ├── preload/                # Preload 스크립트
│   │   └── index.ts           # 컨텍스트 브리지 설정
│   │
│   ├── renderer/              # React 렌더러 프로세스
│   │   ├── App.tsx           # 메인 애플리케이션 컴포넌트
│   │   ├── components/
│   │   │   ├── layout/       # 레이아웃 컴포넌트
│   │   │   │   ├── app-header.tsx
│   │   │   │   └── app-layout.tsx
│   │   │   ├── work/         # 업무 관련 컴포넌트
│   │   │   │   ├── work-timer.tsx      # 메인 타이머
│   │   │   │   └── task-input-dialog.tsx # 작업 입력 다이얼로그
│   │   │   ├── history/      # 업무 기록 컴포넌트
│   │   │   │   ├── daily-work-list.tsx
│   │   │   │   └── work-record-card.tsx
│   │   │   └── ui/           # shadcn/ui 컴포넌트
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── dialog.tsx
│   │   │       └── ...
│   │   ├── hooks/            # 커스텀 훅
│   │   │   └── use-toast.ts
│   │   ├── lib/              # 유틸리티 함수
│   │   │   └── utils.ts
│   │   └── styles/           # 스타일 파일
│   │       └── globals.css
│   │
│   └── shared/               # 공통 타입 및 인터페이스
│       └── types.ts
│
├── data/                     # 애플리케이션 데이터
│   ├── records/              # 업무 기록 JSON 파일
│   └── screenshots/          # 캡처된 스크린샷
│
├── public/                   # 정적 리소스
│   └── index.html
│
└── config files              # 설정 파일들
    ├── package.json
    ├── webpack.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── postcss.config.js
    └── components.json       # shadcn/ui 설정
```

## 🚀 시작하기

### 사전 요구사항

- **Node.js 18+** - JavaScript 런타임
- **npm 또는 yarn** - 패키지 매니저
- **macOS 10.15+** - 운영체제 (현재 macOS만 지원)

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd work-tracker
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   - 렌더러 프로세스: `http://localhost:3000`
   - 메인 프로세스: 자동 컴파일 및 재시작

4. **Electron 앱 실행**
   ```bash
   npm run electron:dev
   ```

### 프로덕션 빌드

```bash
# 전체 빌드
npm run build

# 프로덕션 모드로 실행
npm start
```

## 📱 사용법

### 1. 앱 시작
- 애플리케이션을 실행하면 메인 대시보드가 표시됩니다
- 트레이 아이콘을 통해 백그라운드에서도 접근 가능합니다

### 2. 업무 시작
1. **"새로운 업무 시작"** 버튼 클릭
2. 작업 제목과 설명 입력 (선택 사항)
3. **"시작"** 버튼으로 타이머 시작
4. 실시간으로 경과 시간 확인

### 3. 스크린샷 캡처
- 자동 캡처: 설정된 간격으로 자동 실행
- 수동 캡처: **"스크린샷 캡처"** 버튼 클릭
- 권한 요청: 최초 실행 시 macOS 화면 녹화 권한 자동 요청

### 4. 업무 종료
- **"업무 완료"** 버튼으로 현재 작업 종료
- 자동으로 총 작업 시간 계산 및 저장
- 일일 업무 리스트에 기록 추가

### 5. 기록 조회
- 메인 화면 하단의 **"일일 업무 리스트"**에서 확인
- 날짜별로 분류된 업무 기록
- 각 기록의 제목, 시간, 스크린샷 확인 가능

## 🔧 개발 가이드

### 개발 환경 설정

1. **코드 에디터 확장**
   - TypeScript 지원
   - Tailwind CSS IntelliSense
   - ESLint/Prettier (권장)

2. **디버깅**
   ```bash
   # 렌더러 프로세스 디버깅
   npm run dev:renderer  # 개발자 도구 자동 열림
   
   # 메인 프로세스 디버깅
   npm run dev:main  # VS Code 디버거 연결 가능
   ```

### 주요 개발 패턴

#### 1. IPC 통신
```typescript
// 렌더러 → 메인
const result = await window.electronAPI.invoke('start-work', { title, description });

// 메인 → 렌더러
window.electronAPI.on('screenshot-captured', (data) => {
  // 스크린샷 캡처 완료 처리
});
```

#### 2. 컴포넌트 구조
```typescript
// shadcn/ui 기반 컴포넌트
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function MyComponent() {
  const { toast } = useToast();
  // 컴포넌트 로직
}
```

#### 3. 데이터 관리
```typescript
// 타입 안전성을 위한 인터페이스 활용
interface WorkRecord {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  // ...
}
```

### 새 컴포넌트 추가

1. **shadcn/ui 컴포넌트 추가**
   ```bash
   npx shadcn-ui@latest add [component-name]
   ```

2. **커스텀 컴포넌트 생성**
   - `src/renderer/components/` 하위에 카테고리별 폴더 생성
   - TypeScript + React 패턴 준수
   - 접근성 고려한 개발

### 빌드 및 배포

```bash
# 개발 빌드
npm run build

# 클린 빌드
npm run clean && npm run build

# Electron 앱 패키징 (추후 추가 예정)
# npm run package
```

## 📚 API 문서

### IPC 이벤트

#### 렌더러 → 메인 요청

| 이벤트명 | 매개변수 | 반환값 | 설명 |
|---------|---------|--------|------|
| `start-work` | `{ title: string, description?: string }` | `{ success: boolean, data?: WorkRecord, error?: string }` | 새 업무 시작 |
| `stop-work` | `{ id: string }` | `{ success: boolean, data?: WorkRecord, error?: string }` | 업무 종료 |
| `capture-screenshot` | `void` | `{ success: boolean, data?: ScreenshotData, error?: string }` | 스크린샷 캡처 |
| `get-work-records` | `{ date?: string }` | `{ success: boolean, data?: DayWorkSummary, error?: string }` | 업무 기록 조회 |

#### 메인 → 렌더러 이벤트

| 이벤트명 | 데이터 타입 | 설명 |
|---------|-------------|------|
| `screenshot-captured` | `ScreenshotData` | 스크린샷 캡처 완료 |
| `work-record-updated` | `WorkRecord` | 업무 기록 업데이트 |
| `error-occurred` | `{ message: string, details?: any }` | 오류 발생 |

### 데이터 타입

```typescript
interface WorkRecord {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  screenshotPath?: string;
  tags: string[];
  isActive: boolean;
  duration?: number; // milliseconds
}

interface DayWorkSummary {
  date: string; // YYYY-MM-DD
  records: WorkRecord[];
  totalDuration: number;
  totalRecords: number;
}

interface ScreenshotData {
  id: string;
  timestamp: Date;
  filePath: string;
  workRecordId?: string;
}
```

## 🎨 UI 컴포넌트

### 디자인 시스템

- **색상**: HSL 기반 CSS 변수로 테마 지원
- **타이포그래피**: 반응형 텍스트 스케일
- **간격**: Tailwind CSS 스페이싱 시스템
- **애니메이션**: 부드러운 전환 효과

### 주요 컴포넌트

- **WorkTimer**: 메인 업무 타이머 및 제어
- **TaskInputDialog**: 업무 정보 입력 모달
- **DailyWorkList**: 일일 업무 기록 리스트
- **WorkRecordCard**: 개별 업무 기록 카드

## 📊 데이터 저장

### 파일 구조

```
data/
├── records/
│   ├── 2024-01-15.json     # 일별 업무 기록
│   ├── 2024-01-16.json
│   └── ...
├── screenshots/
│   ├── screenshot_2024-01-15T09-30-00.png
│   └── ...
└── config.json            # 앱 설정
```

### 데이터 백업

- **자동 백업**: 모든 데이터는 로컬 파일시스템에 자동 저장
- **수동 백업**: 사용자가 `data/` 폴더를 직접 복사하여 백업 가능
- **클라우드 동기화**: 추후 지원 예정

## 🔒 보안 및 프라이버시

- **로컬 저장**: 모든 데이터는 사용자 디바이스에만 저장
- **권한 최소화**: 필요한 시스템 권한만 요청
- **데이터 암호화**: 민감한 정보의 경우 추후 암호화 지원 예정
- **네트워크 통신 없음**: 외부 서버로 데이터 전송하지 않음

## 🐛 알려진 이슈

- macOS 외 플랫폼 지원 필요
- 장시간 실행 시 메모리 최적화 필요
- 대용량 스크린샷 파일 관리 개선 필요

## 🔄 향후 계획

- [ ] Windows/Linux 플랫폼 지원
- [ ] 클라우드 동기화 기능
- [ ] 팀 협업 기능
- [ ] 더 상세한 통계 및 리포트
- [ ] 업무 카테고리 및 태그 시스템
- [ ] 자동 백업 및 복원 기능

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

**Work Tracker** - 생산적인 업무를 위한 스마트한 도구 🚀 