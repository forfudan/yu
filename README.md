# 宇浩系列輸入法·官方網站

宇浩系列輸入法·傳統漢字简化汉字通打混輸·兼容大陸台灣字形標準·全漢字覆蓋·八萬詞庫·科學高效

由 [yb6b](https://github.com/yb6b) 制作，采用[vitepress](https://vitepress.dev/zh/)框架。感谢[易码官网](yb6b.github.io/yima/)，[虎码官网](https://www.tiger-code.com/)和[声笔系列输入法](https://sbxlm.github.io/)。

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
```

## 构建系统

网站使用自动化构建系统，构建时自动生成优化的数据文件。

### 主要命令

```bash
npm run dev          # 开发模式（自动生成数据）
npm run dev:fast     # 快速开发（使用现有数据）
npm run build        # 生产构建
npm run prebuild     # 手动生成数据
```

### 数据优化

构建时自动将CSV文件转换为压缩的JSON：

- `chaifen.csv` → `chaifen.json` (减小69%)
- `chaifen-tianma.csv` → `chaifen-tianma.json` (减小68%)
- `mabiao-ming.txt` → `mabiao-ming.json` (减小37%)
- 执行繁简转换 (`translate/tc2sc.py`)

### 自动部署

GitHub Actions自动构建和部署到GitHub Pages。
