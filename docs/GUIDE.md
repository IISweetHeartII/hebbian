# hebbian Guide — AI 에이전트의 학습하는 뇌

> "Neurons that fire together, wire together." — Donald Hebb (1949)

---

## 1. 문제: 지금 AI 에이전트들은 어떻게 규칙을 관리하나?

### Claude Code
```
프로젝트 루트/CLAUDE.md (정적 텍스트 파일)
```
- 사용자가 직접 작성/수정
- 모든 규칙이 동등한 우선순위
- 세션 간 학습 없음 — 같은 실수를 반복해도 CLAUDE.md를 수동으로 고쳐야 함

### OpenClaw (Rosie Gateway)
```
config.json → system_prompt 필드 (하드코딩된 문자열)
```
- 게이트웨이 설정에 박혀있는 시스템 프롬프트
- 변경하려면 설정 파일 수정 + 서비스 재시작
- 에이전트가 학습한 것을 저장할 방법 없음

### Paperclip (CEO + Agent Team)
```
agents/*.json → persona + instructions (정적 JSON)
```
- 각 에이전트별 페르소나와 지시사항이 JSON으로 고정
- CEO가 새로운 판단 기준을 학습해도 다음 세션에서 리셋

### Cursor / Copilot
```
.cursorrules / .github/copilot-instructions.md (정적 텍스트)
```
- CLAUDE.md와 동일한 패턴. 수동 관리, 학습 없음.

### 공통 문제점

| 문제 | 설명 |
|------|------|
| **학습 없음** | AI가 실수를 교정받아도, 다음 세션에서 같은 실수 반복 |
| **우선순위 없음** | "절대 하지마"와 "가능하면 해봐"가 동등한 텍스트 |
| **감쇠 없음** | 6개월 전 규칙이 지금도 동일한 무게로 적용 |
| **중복 누적** | 비슷한 규칙이 여러 번 추가되어 프롬프트 비대화 |
| **수동 관리** | 누군가가 파일을 직접 편집해야 함 |
| **토큰 낭비** | 100개 규칙이 모두 컨텍스트에 들어감 (필요 없는 것도) |

---

## 2. hebbian이 뭘 바꾸나?

### 핵심 원리: 폴더 = 뉴런

```
brain/
├── brainstem/          ← P0: 절대 원칙 (양심)
│   ├── NO_fallback/
│   │   └── 103.neuron  ← 103번 강화됨 = 절대적 규칙
│   └── DO_execute_not_debate/
│       └── 100.neuron
├── cortex/             ← P4: 지식/기술
│   └── frontend/
│       └── NO_console_log/
│           ├── 40.neuron    ← 40번 강화됨
│           └── dopamine1.neuron  ← 보상 신호
├── ego/                ← P5: 성격/톤
│   └── tone/
│       └── concise/
│           └── 60.neuron
└── prefrontal/         ← P6: 목표/계획
    └── project/
        └── hebbian_release/
            └── 10.neuron
```

**5가지 공리(Axiom):**

1. **폴더 = 뉴런** — 이름이 곧 의미, 깊이가 곧 구체성
2. **파일 = 발화 흔적** — `N.neuron` = 카운터, `dopamineN` = 보상, `bomb` = 고통
3. **경로 = 문장** — `brain/cortex/frontend/NO_console_log` → "cortex > frontend > NO console log"
4. **카운터 = 활성화** — 높을수록 강한/수초화된 경로
5. **AI가 기록** — 카운터 증가 = 경험 성장

### 정적 파일 vs hebbian

| | CLAUDE.md (정적) | hebbian (동적) |
|---|---|---|
| 규칙 추가 | 사람이 파일 편집 | `hebbian grow cortex/rule_name` |
| 규칙 강화 | 불가능 | `hebbian fire cortex/rule_name` (카운터 +1) |
| 우선순위 | 없음 (모두 동등) | subsumption cascade (P0→P6) |
| 학습 | 없음 | 교정 → fire → 카운터 증가 → 다음 세션에 더 높은 우선순위 |
| 감쇠 | 수동 삭제 | 30일 미사용 → dormant 자동 마킹 |
| 중복 방지 | 수동 확인 | Jaccard 유사도로 자동 병합 |
| 토큰 효율 | 전체 텍스트 주입 | 3-tier emit (500토큰 bootstrap + 필요시 상세) |
| 출력 형식 | CLAUDE.md 하나 | claude/cursor/gemini/copilot/generic 동시 지원 |

---

## 3. Subsumption Cascade — 왜 brainstem이 cortex를 이기나?

Rodney Brooks의 subsumption architecture에서 차용:

```
brainstem (P0) ←→ limbic (P1) ←→ hippocampus (P2) ←→ sensors (P3) ←→ cortex (P4) ←→ ego (P5) ←→ prefrontal (P6)
  양심/본능        감정 필터       기록/기억          환경 제약       지식/기술      성향/톤       목표/계획
```

**규칙: 낮은 P가 항상 높은 P를 오버라이드한다.**

예시:
- brainstem에 `NO_fallback` (P0) + cortex에 `use_fallback_pattern` (P4) → **brainstem이 이김**
- 어떤 영역에 `bomb.neuron`이 있으면 → **하위 전체 영역 차단** (회로 차단기)

이걸 AI 에이전트에 적용하면:
- P0 brainstem = "어떤 상황에서도 절대" (예: 민감정보 노출 금지)
- P4 cortex = "이렇게 하면 좋아" (예: TypeScript strict mode 사용)
- P6 prefrontal = "이번 프로젝트에서는" (예: 이번 스프린트 목표)

brainstem 규칙이 cortex나 prefrontal과 충돌하면, brainstem이 자동으로 이긴다.

---

## 4. 실제 사용 시나리오

### 시나리오 A: Claude Code에서 hebbian 사용

**현재 (Phase 2):**
```bash
# 1. brain 초기화
hebbian init ./brain

# 2. 규칙 추가
hebbian grow brainstem/NO_expose_api_keys
hebbian grow cortex/typescript/MUST_strict_mode
hebbian grow ego/tone/DO_concise_responses

# 3. CLAUDE.md에 컴파일
hebbian emit claude --brain ./brain

# 4. AI가 실수할 때마다
hebbian fire brainstem/NO_expose_api_keys   # 규칙 강화

# 5. REST API로 외부 도구 연동
hebbian api --brain ./brain --port 9090
# n8n webhook → POST /api/fire 으로 자동 강화
```

**Phase 3 이후 (MCP):**
```jsonc
// ~/.claude/settings.json
{
  "mcpServers": {
    "hebbian": {
      "command": "npx",
      "args": ["hebbian", "mcp", "--brain", "./brain"]
    }
  }
}
```
이렇게 하면 Claude Code가 직접 hebbian을 tool로 호출:
- 대화 시작 → `read_region("brainstem")` → 핵심 규칙 로드
- 실수 교정 → `fire("cortex/rule")` → 자동 강화
- 새로운 패턴 발견 → `grow("cortex/new_pattern")` → 자동 생성

### 시나리오 B: OpenClaw + Paperclip 연동

```
[사용자 요청] → [OpenClaw Gateway]
                      ↓
              GET /api/read?region=brainstem  ← hebbian API
              GET /api/read?region=cortex
                      ↓
              시스템 프롬프트에 주입 (상위 N개 규칙만)
                      ↓
              [Claude/GPT API 호출]
                      ↓
              응답 품질 피드백
                      ↓
              POST /api/fire (좋은 규칙 강화)
              POST /api/grow (새 규칙 학습)
```

Paperclip CEO가 판단할 때:
1. hebbian에서 brainstem 규칙 읽기 → "절대 원칙" 확인
2. cortex 규칙 읽기 → "이전에 학습한 패턴" 확인
3. 판단 후 결과를 inbox에 기록 → 다음 판단에 반영

---

## 5. 3-Tier Emission — 토큰 효율

AI의 컨텍스트 윈도우는 유한하다. 100개 규칙을 전부 넣으면 토큰 낭비.

```
Tier 1: Bootstrap (~500 tokens)
├── 회로 차단기 상태
├── 페르소나 (ego 상위 규칙)
├── brainstem TOP 5
└── 영역별 활성 뉴런 수
    → CLAUDE.md / .cursorrules에 자동 주입

Tier 2: Brain Index (_index.md)
├── TOP 10 뉴런 (카운터 기준)
├── Spotlight (신규/수습 뉴런)
└── 영역별 요약
    → AI가 대화 시작 시 읽음

Tier 3: Region Rules ({region}/_rules.md)
├── 해당 영역의 전체 뉴런 트리
├── 강도 표시 ([ABSOLUTE] / [MUST])
└── 신호 표시 (dopamine / bomb / memory)
    → AI가 필요할 때만 읽음 (on-demand)
```

**결과**: 평소에는 ~500토큰만 사용. 필요하면 특정 영역만 추가 로드.

---

## 6. 영어 Prefix 규칙

폴더 이름이 곧 규칙이므로, prefix가 의미를 전달:

| Prefix | 의미 | 예시 |
|--------|------|------|
| `NO_` | 금지 (forbidden) | `NO_console_log`, `NO_expose_secrets` |
| `MUST_` | 필수 (required) | `MUST_test_before_merge`, `MUST_type_safety` |
| `DO_` | 권장 (recommended) | `DO_concise_responses`, `DO_plan_first` |
| `WARN_` | 경고 (alert) | `WARN_large_refactor`, `WARN_breaking_change` |

한자 prefix (禁, 必, 推, 警)도 여전히 작동 — scanner는 폴더 이름을 그대로 읽음.

---

## 7. 이게 진짜 작동하는지 어떻게 검증하나?

### 레벨 1: 단위 테스트 (완료)
- 171 tests passing
- Scanner, subsumption, emit, grow/fire/rollback, signal, decay, dedup
- REST API: 실제 HTTP 서버 기동 + 요청/응답 검증
- Inbox: path traversal 차단, dopamine inflation filter 검증

### 레벨 2: 통합 테스트 (다음 단계)
```bash
# brain 초기화 + 규칙 추가 + emit + 확인
hebbian init /tmp/test-brain
hebbian grow brainstem/NO_test_rule --brain /tmp/test-brain
hebbian fire brainstem/NO_test_rule --brain /tmp/test-brain
hebbian emit claude --brain /tmp/test-brain
cat CLAUDE.md  # 규칙이 포함되어 있는지 확인
```

### 레벨 3: 실사용 검증
1. 실제 프로젝트에 brain 세팅
2. 일주일간 사용하면서 fire/grow 기록
3. `hebbian stats`로 어떤 규칙이 가장 강화됐는지 확인
4. AI 실수율이 줄어드는지 관찰

### 레벨 4: A/B 비교
- 같은 프로젝트에서 정적 CLAUDE.md vs hebbian emit 결과를 비교
- hebbian이 자동으로 상위 규칙만 선별하므로 토큰 효율 측정 가능

---

## 8. Phase별 실용 가치

| Phase | 없어도 되나? | 있으면 뭐가 달라지나? |
|-------|------------|---------------------|
| 1 (Core) | 필수 | brain 구조 + emit으로 기본 동작 |
| 2 (API) | 선택 | 외부 도구 연동 가능 (n8n, webhook, dashboard) |
| **3 (MCP)** | **핵심** | **Claude Code/Cursor가 직접 brain을 읽고 쓸 수 있음** |
| 4 (Evolve) | 선택 | AI가 자동으로 brain을 진화시킴 (자율 학습) |
| 5 (Hook) | 선택 | IDE 수정 없이 모든 LLM 요청에 자동 주입 |
| 6 (Supervisor) | 운영용 | 장기 실행 서비스 관리 |

**최소 실용 제품 = Phase 1 + Phase 3 (MCP)**

Phase 2 API는 OpenClaw/Paperclip 같은 외부 서비스 연동에 유용.
Phase 3 MCP가 있어야 Claude Code가 "자연스럽게" brain을 사용할 수 있음.

---

## 9. Quick Start

```bash
# 설치
npm install -g hebbian

# brain 생성
hebbian init ./brain

# 규칙 추가
hebbian grow brainstem/NO_expose_secrets --brain ./brain
hebbian grow cortex/code/MUST_error_handling --brain ./brain
hebbian grow ego/tone/DO_be_direct --brain ./brain

# 규칙 강화 (AI가 이 규칙을 잘 따랐을 때)
hebbian fire cortex/code/MUST_error_handling --brain ./brain

# CLAUDE.md에 컴파일
hebbian emit claude --brain ./brain

# 모든 AI 도구에 동시 컴파일
hebbian emit all --brain ./brain

# brain 상태 확인
hebbian stats --brain ./brain

# REST API 시작
hebbian api --brain ./brain --port 9090
```
