# 宇浩系列輸入法·官方網站

宇浩系列輸入法·傳統漢字简化汉字通打混輸·兼容大陸台灣字形標準·全漢字覆蓋·八萬詞庫·科學高效

感謝 [yb6b](https://github.com/yb6b) 製作網站初版。網站採用了[vitepress](https://vitepress.dev/zh/)框架。

## 快速开始

```bash
# 安裝依賴
pnpm install

# 開發模式
pnpm dev

# 构建
pnpm build
```

## 構建系統

網站使用自動化構建系統，構建時自動生成優化的數據文件。

### 主要命令

```bash
npm run dev          # 开发模式（自动生成数据）
npm run dev:fast     # 快速开发（使用现有数据）
npm run build        # 生产构建
npm run prebuild     # 手动生成数据
```

### 數據優化

構建時自動將CSV文件轉換為壓縮的JSON：

- `chaifen.csv` → `chaifen.json` (减小69%)
- `chaifen-tianma.csv` → `chaifen-tianma.json` (减小68%)
- `mabiao-ming.txt` → `mabiao-ming.json` (减小37%)
- 執行繁簡轉換 (`translate/tc2sc.py`)

### 自動部署

GitHub Actions自動構建和部署到GitHub Pages。
