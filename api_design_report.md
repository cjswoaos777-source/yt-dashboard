# 유튜브 B2B API 엔드포인트 설계 보고서

## 파이프라인 구조 리뷰 요약

코드 전체([tracker.py](file:///c:/Users/USER/Desktop/project/utube_rank/agents/tracker.py), [tier0_video_tracker.py](file:///c:/Users/USER/Desktop/project/utube_rank/agents/tier0_video_tracker.py), [tier0_cache.py](file:///c:/Users/USER/Desktop/project/utube_rank/agents/tier0_cache.py), [bq_loader.py](file:///c:/Users/USER/Desktop/project/utube_rank/bq_loader.py), [schema_dump.json](file:///c:/Users/USER/Desktop/project/utube_rank/schema_dump.json), [main.py](file:///c:/Users/USER/Desktop/project/utube_rank/main.py))를 검토한 결과, 구출하신 시스템은 다음과 같은 고도화된 기반이 갖추어져 있습니다.

| 구성요소 | 실제 코드 확인 사항 |
|---|---|
| **시계열 로그** | `video_history_log` (view/like/comment + collected_at), `channel_history_log` (구독자/조회수/영상수 + collected_at)가 매 추적마다 분리 APPEND됨 |
| **0티어 실시간 추적** | `collected_videos.source_keyword='WeeklyScan'` → [tier0_targets.json](file:///c:/Users/USER/Desktop/project/utube_rank/tier0_targets.json) 캐시 → 1시간마다 [videos().list](file:///c:/Users/USER/Desktop/project/utube_rank/bq_loader.py#89-91) 직접 조회 → `v_tier0_ranking_master` BQ 뷰에서 [(curr_views - b_view_cnt)](file:///c:/Users/USER/Desktop/project/utube_rank/agents/tracker.py#323-486) AS **hourly_view_increase** 계산 완료 |
| **채널 분류** | `target_channels.origin_type` (DOMESTIC/IMPORTED), `channel_type` (쇼츠/롱폼), `shorts_ratio`, `tracking_tier` (0~3), `priority_score` — 4개 프로시저 체계로 자동 분류 |
| **콘텐츠 분류** | `is_shorts` (180초 기준), `category_id`, `default_audio_language`, `tags[]` — 영상 단위 세분화 가능 |
| **시간별 델타** | `v_tier0_ranking_master` 뷰에서 `hourly_view_increase`, `hourly_like_increase`, `hourly_comment_increase` 이미 계산됨 |
| **대시보드 스냅샷** | `dashboard_tier_channels` + `sparkline_data` (채널별 구독자 추이 배열) 매시간 GitHub JSON으로 동기화 |

---

## API 1 — Viral Velocity Detection API
**`GET /api/v1/videos/viral-velocity`**

> "지금 이 순간 폭발하고 있는 영상" — 유튜브 공식 API로는 절대 볼 수 없는 **시간당 조회수 증가량 실시간 랭킹**

### 구현 데이터 출처
`v_tier0_ranking_master` 뷰의 `hourly_view_increase`, `hourly_like_increase`, `hourly_comment_increase` + `is_shorts`, `origin_type`, `category_name`

### 쿼리 파라미터 예시
| 파라미터 | 설명 | 예시 |
|---|---|---|
| `type` | 영상 타입 필터 | `shorts`, `longform`, `all` |
| `origin` | 국산/해외 필터 | `domestic`, `imported`, `all` |
| `category` | 카테고리 필터 | `22` (People & Blogs) |
| `limit` | 반환 개수 | `20` (max: 100) |

### 응답 예시
```json
{
  "rank": 1,
  "video_id": "abc123",
  "title": "...",
  "video_type": "Shorts 📱",
  "origin_type": "DOMESTIC",
  "hourly_view_increase": 1820000,
  "hourly_like_increase": 43000,
  "total_views": 9200000,
  "updated_at": "2026-04-08T09:00:00+09:00"
}
```

### 1) 예상 타겟 고객
- **MCN/콘텐츠 스튜디오**: 경쟁사 대비 1~2시간 먼저 트렌드를 캐치해 동일 포맷 영상을 빠르게 제작
- **숏폼 마케팅 에이전시**: 클라이언트 광고를 터진 영상 코멘트/관련 섹션에 선점 노출
- **트렌드 뉴스레터/미디어**: "오늘의 폭발 영상" 큐레이션 자동화

### 2) 판매 소구점
- 유튜브 공식 API는 **누적 조회수**만 줍니다. 이 API는 **1시간 내 증가분**을 줍니다.
- "1주일 전 영상으로 1000만 조회수"가 아닌 **"지금 막 30분만에 100만 터진 영상"**을 제공
- DOMESTIC/IMPORTED 필터로 "한국 시장에서 국산 채널 대비 외국 채널이 더 빠르게 성장하는 카테고리"를 즉시 파악 가능

### 3) 쿼리 최적화 구현 조언

> **문제**: `video_history_log`에 LAG 윈도우 함수를 API 호출마다 실행하면 매번 전 테이블을 스캔해야 함.

**권장 구조**: 기존 `sp_process_staging_data` 프로시저 실행 후 결과를 이미 집계하는 `v_tier0_ranking_master` 뷰를 직접 캐싱하는 방식 활용.

```sql
-- 별도 materialized 스냅샷 테이블 생성 (1시간마다 OVERWRITE)
CREATE OR REPLACE TABLE utube_hist.viral_velocity_snapshot AS
SELECT
  video_id, title, channel_title, is_shorts, origin_type, category_name,
  hourly_view_increase, hourly_like_increase, total_views, updated_at
FROM utube_hist.v_tier0_ranking_master
ORDER BY hourly_view_increase DESC;
```

API 서버는 이 스냅샷 테이블에서 `WHERE type = ? LIMIT 100`만 조회하면 되어 응답 속도 < 200ms 달성 가능.

---

## API 2 — Korean Market IMPORTED Channel Gap Finder API
**`GET /api/v1/channels/imported-rising`**

> "한국 시장에서 이미 국산 채널보다 빠르게 성장 중인 외국 채널" — `origin_type + category + growth delta`로 발굴하는 **콘텐츠 공백 탐지 API**

> [!NOTE]
> 이 파이프라인의 데이터 수집 범위는 **한국 YouTube 마켓 기준**입니다. IMPORTED 채널이란 '해외에서 더 좋은 것'이 아니라, **한국 YouTube에 이미 침투해 국산 채널보다 빠른 성장세를 보이는 외국 채널**을 의미합니다. "아직 한국 크리에이터가 따라하지 않은 포맷"을 국내 시장 안에서 발굴하는 것이 이 API의 핵심입니다.

### 구현 데이터 출처
`dashboard_tier_channels` (sparkline_data 포함) + `target_channels.origin_type`, `shorts_ratio`, `priority_score` + `channel_history_log` (구독자 증가 추이)

### 쿼리 파라미터 예시
| 파라미터 | 설명 | 예시 |
|---|---|---|
| `category_id` | 카테고리 필터 | `28` (Science & Tech) |
| `min_subscriber` | 최소 구독자 | `100000` |
| `growth_window` | 분석 기간 (일) | `30` |
| `compare_domestic` | 동일 카테고리 국산 채널 평균 성장률과 비교 포함 | `true` |

### 응답 예시
```json
{
  "channel_id": "UC...",
  "title": "TechExplained",
  "origin_type": "IMPORTED",
  "category": "Science & Technology",
  "subscriber_growth_30d": 280000,
  "domestic_avg_growth_30d": 41000,
  "growth_gap_ratio": 6.8,
  "shorts_ratio": 0.12,
  "channel_type": "long-form",
  "priority_score": 87.4,
  "sparkline_data": [120000, 130000, 145000, 160000, 190000, 200000, 220000],
  "insight": "동일 카테고리 국산 채널 대비 6.8배 성장 중. 롱폼 포맷 공백 가능성."
}
```

### 1) 예상 타겟 고객
- **국내 MCN/크리에이터**: "국산 채널이 아직 치열하게 경쟁하지 않는데 외국 채널이 치고 올라오는 카테고리"를 선점하려는 팀
- **광고 대행사**: IMPORTED 채널 광고 단가가 낮고 경쟁이 적은 타이밍을 포착해 클라이언트 예산 효율화
- **콘텐츠 포맷 리서처**: "이 카테고리에서 어떤 영상 스타일(쇼츠 vs 롱폼)이 이미 검증됐는지" 데이터 기반으로 파악

### 2) 판매 소구점
- `origin_type` 분류는 **이 시스템만의 독자 데이터**입니다. 유튜브 공식 API에는 채널의 DOMESTIC/IMPORTED 여부를 판별하는 필드가 없음.
- **`growth_gap_ratio`**: 동일 카테고리 국산 채널 평균 성장률 대비 배율 — "경쟁자가 아직 없는 빈틈"을 수치로 제공
- `sparkline_data`로 최근 성장 궤적(가속/감속)까지 시각화하여 "이미 꺾인 채널"은 제외하고 "지금 막 이륙 중"인 채널만 필터링 가능
- `shorts_ratio` + `channel_type` 조합 → "해당 카테고리에서 롱폼 포맷이 아직 공백인가"를 체크해 채널 방향성 기획에 바로 활용

### 3) 쿼리 최적화 구현 조언

> **문제**: `channel_history_log`에서 30일 구독자 증가 + 카테고리별 국산 평균을 매번 집계하면 이중 대규모 스캔 발생.

**권장 구조**: `sp_process_channel_data` 프로시저에 `subscriber_growth_30d`와 카테고리별 국산 평균을 `target_channels`에 UPSERT하는 로직 추가.

```sql
-- 카테고리별 국산 채널 평균 성장률을 별도 summary 테이블로 매일 갱신
CREATE OR REPLACE TABLE utube_hist.domestic_growth_summary AS
SELECT
  main_category_id,
  AVG(subscriber_growth_30d) AS avg_growth_30d,
  COUNT(*) AS domestic_channel_count
FROM utube_hist.target_channels
WHERE origin_type = 'DOMESTIC'
  AND subscriber_growth_30d IS NOT NULL
GROUP BY main_category_id;
```

API 서버는 `target_channels` (IMPORTED 필터) JOIN `domestic_growth_summary`만 조회하면 되어 실시간 집계 없이 빠른 응답 가능.

---

## API 3 — Channel Lifecycle & Momentum Score API
**`GET /api/v1/channels/{channel_id}/momentum`**

> "이 채널, 지금 올라타도 되는가?" — `priority_score` 변화 추이 + `tracking_tier` 변동 이력으로 판단하는 **채널 생애주기 진단 API**

### 구현 데이터 출처
`channel_history_log` (시계열 구독자/조회수) + `target_channels.priority_score`, `tracking_tier`, `shorts_ratio`, `channel_type`, `last_classified_at`

### 엔드포인트 세트
| 엔드포인트 | 설명 |
|---|---|
| `GET /channels/{id}/momentum` | 단건 채널 모멘텀 분석 |
| `GET /channels/momentum/bulk` | 채널 목록 일괄 분석 (max 50개) |
| `GET /channels/tier-movers` | 이번 주 tier 상승/하락 채널 목록 |

### 응답 예시
```json
{
  "channel_id": "UC...",
  "title": "쿠킹클래스",
  "tracking_tier": 0,
  "priority_score": 91.2,
  "lifecycle_stage": "INFLECTION",
  "shorts_ratio": 0.08,
  "channel_type": "long-form",
  "subscriber_history": [
    {"date": "2026-03-08", "count": 320000},
    {"date": "2026-03-15", "count": 398000},
    {"date": "2026-03-22", "count": 510000},
    {"date": "2026-03-29", "count": 680000},
    {"date": "2026-04-05", "count": 890000}
  ],
  "risk_flags": [],
  "recommendation": "광고 집행 최적 타이밍. 팔로워 대비 관여율 상승 중."
}
```

### 1) 예상 타겟 고객
- **인플루언서 마케팅 플랫폼**: 광고주가 의뢰하는 채널의 "거품 여부"를 정량적으로 리포팅
- **MCN/투자사**: 채널 인수-합병(M&A) 실사 시 성장 둔화 구간을 데이터로 증명
- **브랜드 광고주 (대행사)**: 동일 예산으로 Tier 0 상향 임박 채널에 선제 투자하여 CPM 절감

### 2) 판매 소구점
- `tracking_tier` 변동 이력은 **이 시스템이 우선순위 배정 알고리즘(`sp_assign_tiers_optimized`)으로 자동 분류**하므로 인간의 편견 없이 데이터 기반으로 산출됨.
- `priority_score` 값 자체가 이미 구독자 + 조회수 + 영상 활동성을 복합 계산한 **독자 지표**이므로 단순 구독자 수만 파는 API와 차별화 가능.
- `lifecycle_stage` 판단(`INFLECTION` / `PLATEAU` / `DECLINING` / `EMERGING`) 을 추가하면 비전문가 광고주도 즉각 해석 가능한 프리미엄 상품이 됨.

### 3) 쿼리 최적화 구현 조언

> **문제**: `channel_history_log`가 대용량으로 누적되면 특정 `channel_id`를 스캔하는 비용이 증가.

**필수 조치: 클러스터링(Clustering) 적용**

```sql
-- 테이블 재생성 시 클러스터링 적용 (DDL)
CREATE OR REPLACE TABLE utube_hist.channel_history_log
PARTITION BY DATE(collected_at)
CLUSTER BY channel_id
AS SELECT * FROM utube_hist.channel_history_log_old;
```

- `PARTITION BY DATE(collected_at)`: 날짜 기반 파티셔닝으로 오래된 데이터 자동 정리(만료 정책 설정 가능)
- `CLUSTER BY channel_id`: 특정 채널 조회 시 스캔 범위를 해당 블록으로 한정 → 쿼리 비용 90% 절감 가능
- API 응답의 `subscriber_history`는 `GROUP BY DATE(collected_at)`으로 일별 평균만 반환하여 payload 크기 최소화

---

## 요약 비교표

| | API 1 | API 2 | API 3 |
|---|---|---|---|
| **핵심 차별화** | 시간당 조회수 델타 | 한국 시장 내 IMPORTED 채널 공백 탐지 | priority_score + tier 변동 이력 |
| **주 데이터 소스** | `v_tier0_ranking_master` | `dashboard_tier_channels` + `target_channels` | `channel_history_log` + `target_channels` |
| **주 고객** | 마케터/MCN | 국내 크리에이터/광고대행사 | 브랜드/투자사/광고대행사 |
| **권장 요금제** | 분당 100건 (Pro: $49/월) | 일 500건 (Business: $199/월) | 건별 과금 $0.05 + 기업 계약 |
| **추가 BQ 작업** | materialized 스냅샷 | `sp_process_channel_data` 확장 | 클러스터링 테이블 재생성 |
