import html2canvas from 'html2canvas-pro'

export class GenealogyExportService {
    /**
     * 生成文件名
     */
    static generateFileName(): string {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
        return `漢字字形輸入法繫絡圖${today}.png`
    }

    /**
     * 動態添加水印文字到繫絡圖底部
     * @param containerElement 容器元素
     * @param watermarkText 水印文字
     * @returns 返回創建的水印元素，用於後續移除
     */
    static addTemporaryWatermark(
        containerElement: HTMLElement,
        watermarkText: string = '宇浩系列輸入法 · 官網: shurufa.app · QQ 討論群: 170510762'
    ): HTMLElement {
        const watermarkDiv = document.createElement('div')
        watermarkDiv.className = 'genealogy-export-watermark'

        // 根據當前主題設置水印樣式（使用透明背景，讓畫布背景透過）
        const isDarkMode = document.documentElement.classList.contains('dark')
        watermarkDiv.style.cssText = `
            padding: 12px 16px;
            background: transparent;
            border-radius: 8px;
            text-align: center;
            margin-top: 16px;
            font-size: 0.9rem;
            color: ${isDarkMode ? 'rgb(165, 180, 252)' : '#4f46e5'};
            font-weight: 500;
            border: none;
            font-family: 'Noto Serif SC', serif;
        `

        watermarkDiv.textContent = watermarkText
        containerElement.appendChild(watermarkDiv)
        return watermarkDiv
    }

    /**
     * 移除臨時水印
     * @param watermarkElement 水印元素
     */
    static removeTemporaryWatermark(watermarkElement: HTMLElement) {
        if (watermarkElement && watermarkElement.parentNode) {
            watermarkElement.parentNode.removeChild(watermarkElement)
        }
    }

    /**
     * 將繫絡圖DOM元素導出為PNG圖片
     * @param element 要導出的DOM元素（通常是 canvas-wrapper）
     * @param options 導出選項
     */
    static async exportGenealogyToPNG(
        element: HTMLElement,
        options: {
            copyToClipboard?: boolean
            download?: boolean
            scale?: number
            addWatermark?: boolean
        } = {}
    ) {
        const {
            copyToClipboard = false,
            download = true,
            scale = 2,
            addWatermark = true
        } = options

        // 找到實際的 SVG 容器
        const svgElement = element.querySelector('svg')
        if (!svgElement) {
            throw new Error('找不到 SVG 元素')
        }

        // 找到 genealogy-content 容器，這是我們要截圖的主要區域
        const contentElement = element.closest('.genealogy-content') as HTMLElement
        if (!contentElement) {
            throw new Error('找不到 genealogy-content 容器')
        }

        // 动态获取画布的实际背景色
        const computedStyle = window.getComputedStyle(element)
        const backgroundColor = computedStyle.backgroundColor || '#ffffff'
        const isDarkMode = document.documentElement.classList.contains('dark')

        // 動態添加水印文字
        let watermarkElement: HTMLElement | null = null
        if (addWatermark) {
            watermarkElement = this.addTemporaryWatermark(contentElement)
        }

        // 声明变量用于后续恢复
        let toolbarElement: HTMLElement | null = null
        let originalToolbarDisplay: string = ''
        let floatingHintElement: HTMLElement | null = null
        let originalFloatingHintDisplay: string = ''

        try {
            // 1. 暫時隱藏工具欄
            toolbarElement = contentElement.querySelector('.toolbar-compact') as HTMLElement
            if (toolbarElement) {
                originalToolbarDisplay = toolbarElement.style.display
                toolbarElement.style.display = 'none'
            }

            // 2. 暫時隱藏浮動提示
            floatingHintElement = contentElement.querySelector('.floating-hint') as HTMLElement
            if (floatingHintElement) {
                originalFloatingHintDisplay = floatingHintElement.style.display
                floatingHintElement.style.display = 'none'
            }

            // 3. 添加標題欄（根据当前主题设置颜色）
            const titleElement = document.createElement('div')
            titleElement.className = 'export-title'
            const isDarkMode = document.documentElement.classList.contains('dark')
            titleElement.style.cssText = `
                text-align: center;
                font-size: 1.8rem;
                font-weight: bold;
                margin-bottom: 1.5rem;
                padding: 1rem;
                color: ${isDarkMode ? 'rgb(165, 180, 252)' : '#5400a2ff'};
                background: transparent;
                font-family: 'Noto Serif SC', serif;
            `
            titleElement.textContent = '漢字字形輸入法繫絡圖'
            contentElement.insertBefore(titleElement, contentElement.firstChild)

            // 等待樣式應用
            await new Promise((resolve) => setTimeout(resolve, 500))

            // 計算合適的尺寸
            const elementRect = contentElement.getBoundingClientRect()
            const elementWidth = Math.max(elementRect.width, contentElement.scrollWidth)
            const elementHeight = Math.max(elementRect.height, contentElement.scrollHeight)

            const canvas = await html2canvas(contentElement, {
                backgroundColor,
                scale,
                useCORS: true,
                allowTaint: false,
                logging: true,
                width: elementWidth,
                height: elementHeight,
                windowWidth: elementWidth,
                windowHeight: elementHeight,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                ignoreElements: (element) => {
                    // 忽略控制按鈕、工具欄和浮動提示
                    return (
                        element.classList.contains('toolbar-compact') ||
                        element.classList.contains('floating-hint') ||
                        element.classList.contains('dropdown-menu')
                    )
                },
                foreignObjectRendering: false,
                removeContainer: false,
                imageTimeout: 15000
            })

            // 恢复所有修改
            this.restoreAllChanges(
                toolbarElement,
                originalToolbarDisplay,
                floatingHintElement,
                originalFloatingHintDisplay,
                contentElement.querySelector('.export-title') as HTMLElement
            )

            // 獲取圖片數據
            const dataUrl = canvas.toDataURL('image/png', 1.0)
            const filename = this.generateFileName()

            // 複製到剪貼板（如果启用）
            if (copyToClipboard && this.isClipboardSupported()) {
                try {
                    const blob = await new Promise<Blob>((resolve) => {
                        canvas.toBlob((blob) => {
                            if (blob) resolve(blob)
                        }, 'image/png', 1.0)
                    })

                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': blob
                        })
                    ])

                    console.log('繫絡圖已複製到剪貼板')
                } catch (clipboardError) {
                    console.warn('複製到剪貼板失敗:', clipboardError)
                }
            }

            // 下載文件
            if (download) {
                const link = document.createElement('a')
                link.download = filename
                link.href = dataUrl
                link.style.display = 'none'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                console.log('繫絡圖已下載:', filename)
            }

            const message = copyToClipboard && this.isClipboardSupported()
                ? '繫絡圖已複製到剪貼板並下載'
                : '繫絡圖已下載'

            return {
                success: true,
                message,
                dataUrl,
                filename
            }
        } catch (error) {
            console.error('導出繫絡圖失敗:', error)

            // 错误时也要恢复样式
            this.restoreAllChanges(
                toolbarElement,
                originalToolbarDisplay,
                floatingHintElement,
                originalFloatingHintDisplay,
                contentElement?.querySelector('.export-title') as HTMLElement
            )

            return {
                success: false,
                message: `導出失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
                dataUrl: '',
                filename: ''
            }
        } finally {
            // 移除臨時水印
            if (watermarkElement) {
                this.removeTemporaryWatermark(watermarkElement)
            }
        }
    }

    /**
     * 恢复所有样式修改
     */
    private static restoreAllChanges(
        toolbarElement: HTMLElement | null,
        originalToolbarDisplay: string,
        floatingHintElement: HTMLElement | null,
        originalFloatingHintDisplay: string,
        titleElement: HTMLElement | null
    ) {
        // 恢复工具栏显示
        if (toolbarElement) {
            toolbarElement.style.display = originalToolbarDisplay
        }

        // 恢复浮动提示显示
        if (floatingHintElement) {
            floatingHintElement.style.display = originalFloatingHintDisplay
        }

        // 移除添加的标题
        if (titleElement && titleElement.parentNode) {
            titleElement.remove()
        }
    }

    /**
     * 檢查瀏覽器是否支持剪貼板API
     */
    static isClipboardSupported(): boolean {
        return (
            typeof navigator !== 'undefined' &&
            'clipboard' in navigator &&
            'write' in navigator.clipboard
        )
    }
}
