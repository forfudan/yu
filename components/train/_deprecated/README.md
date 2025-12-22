# 已廢棄的文件

此目錄包含已被重構或合併的舊版文件，保留用於參考。

## 文件說明

### TrainCard.vue

- **廢棄日期**: 2025-12-22
- **原因**: 已合併到 `CharTrain.vue`
- **替代方案**: 直接使用 `CharTrain.vue`

### schedule.ts

- **廢棄日期**: 2025-12-22
- **原因**: 已升級為更先進的 `advancedSchedule.ts`（使用間隔重複算法）
- **替代方案**: 使用 `advancedSchedule.ts` (AdvancedSchedule 類)
- **改進點**:
  - 基於間隔重複（Spaced Repetition）算法
  - 更科學的復習間隔安排
  - 支持畢業機制（連續3次正確）
  - 更細緻的進度追蹤

## 重構歷史

- **2025-12-22**: 統一使用 `advancedSchedule.ts`，合併 `CharTrain.vue` 和 `TrainCard.vue`
