import html2canvas from 'html2canvas-pro'

export class ZigenExportService {
    /**
     * 生成文件名
     * @param schemeName 方案名称
     * @param isListView 是否为列表视图
     */
    static generateFileName(schemeName: string = '未命名方案', isListView: boolean = false): string {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const viewType = isListView ? '字根表' : '字根圖'
        return `${schemeName}輸入法${viewType}${today}.png`
    }

    /**
     * 動態添加水印文字到字根圖底部
     * @param containerElement 容器元素
     * @param watermarkText 水印文字
     * @returns 返回創建的水印元素，用於後續移除
     */
    static addTemporaryWatermark(containerElement: HTMLElement, watermarkText: string = '宇浩系列輸入法 · 官網: shurufa.app · QQ 討論群: 170510762'): HTMLElement {
        const watermarkDiv = document.createElement('div')
        watermarkDiv.className = 'zigen-export-watermark'

        // 统一使用亮色水印样式
        watermarkDiv.style.cssText = `
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 8px;
            text-align: center;
            margin-top: 16px;
            font-size: 0.9rem;
            color: #4f46e5;
            font-weight: 500;
            border: 1px solid #d1d5db;
            font-family: 'Noto Serif SC', serif;
            backdrop-filter: blur(4px);
        `

        watermarkDiv.textContent = watermarkText
        containerElement.appendChild(watermarkDiv)
        return watermarkDiv
    }    /**
     * 移除臨時水印
     * @param watermarkElement 水印元素
     */
    static removeTemporaryWatermark(watermarkElement: HTMLElement) {
        if (watermarkElement && watermarkElement.parentNode) {
            watermarkElement.parentNode.removeChild(watermarkElement)
        }
    }

    /**
     * 將字根圖DOM元素導出為PNG圖片
     * @param element 要導出的DOM元素
     * @param schemeName 方案名称
     * @param isListView 是否为列表视图
     * @param options 導出選項
     */
    static async exportZigenMapToPNG(
        element: HTMLElement,
        schemeName: string = '未命名方案',
        isListView: boolean = false,
        options: {
            copyToClipboard?: boolean
            download?: boolean
            scale?: number
            backgroundColor?: string
            addWatermark?: boolean
        } = {}
    ) {
        const {
            copyToClipboard = true,
            download = true,
            scale = 2,
            addWatermark = true
        } = options

        // 统一使用亮色背景
        const backgroundColor = '#ffffff'

        // 動態添加水印文字
        let watermarkElement: HTMLElement | null = null
        if (addWatermark) {
            watermarkElement = this.addTemporaryWatermark(element)
        }

        // 声明变量用于后续恢复
        let controlButtons: NodeListOf<Element>
        let originalDisplays: string[] = []
        let hintTexts: NodeListOf<Element>
        let originalHintDisplays: (string | undefined)[] = []
        let originalKeyStyles: { element: HTMLElement, originalStyle: string }[] = []
        let titleElement: HTMLElement | null = null
        let originalThemeClasses: { element: Element, hadDarkClass: boolean }[] = []

        try {
            // 1. 強制應用亮色主題樣式

            // 移除所有暗色類，確保亮色顯示
            const darkElements = document.querySelectorAll('.dark')
            darkElements.forEach(el => {
                const hadDarkClass = el.classList.contains('dark')
                originalThemeClasses.push({ element: el, hadDarkClass })
                if (hadDarkClass) {
                    el.classList.remove('dark')
                }
            })

            // 2. 暫時隱藏所有控制按鈕
            controlButtons = element.querySelectorAll('.layout-toggle-btn, .export-btn')
            controlButtons.forEach((btn, index) => {
                const htmlBtn = btn as HTMLElement
                originalDisplays[index] = htmlBtn.style.display
                htmlBtn.style.display = 'none'
            })

            // 3. 隱藏提示文字
            hintTexts = element.querySelectorAll('.text-sm.text-gray-500, .text-xs.text-gray-400')
            hintTexts.forEach((hint, index) => {
                const hintElement = hint as HTMLElement
                if (hintElement.textContent?.includes('點擊字根可查看例字') ||
                    hintElement.textContent?.includes('切換圖表形態') ||
                    hintElement.textContent?.includes('按鍵排序')) {
                    originalHintDisplays[index] = hintElement.style.display
                    hintElement.style.display = 'none'
                }
            })

            // 4. 添加標題欄
            titleElement = document.createElement('div')
            titleElement.className = 'export-title'
            titleElement.style.cssText = `
                text-align: center;
                font-size: 1.5rem;
                font-weight: bold;
                margin-bottom: 1.5rem;
                color: #5400a2ff;
                font-family: 'Noto Serif SC', serif;
            `

            // 根據顯示模式設置不同的標題
            const isListView = element.querySelector('.desktop-list-layout') !== null ||
                element.querySelector('.mobile-key-row') !== null
            const titleSuffix = isListView ? '字根表' : '字根圖'
            titleElement.textContent = `${schemeName}輸入法${titleSuffix}`
            element.insertBefore(titleElement, element.firstChild)

            // 5. 調整導出時的容器和元素尺寸
            // 5.1. 調整最外層容器
            originalKeyStyles.push({
                element: element,
                originalStyle: element.style.cssText
            })

            element.style.cssText += `
                min-width: 1028px !important;    /* 字根圖的最小寬度 */
                width: auto !important;          
                overflow: visible !important;    
                box-sizing: border-box !important; 
            `

            // 5.2. 調整鍵盤佈局容器
            const keyboardLayout = element.querySelector('.keyboard-layout') as HTMLElement
            if (keyboardLayout) {
                originalKeyStyles.push({
                    element: keyboardLayout,
                    originalStyle: keyboardLayout.style.cssText
                })

                keyboardLayout.style.cssText += `
                    min-width: 1028px !important;    
                    width: auto !important;          
                    overflow: visible !important;    
                    box-sizing: border-box !important; 
                `

                // 5.3. 設定按鍵卡片的固定寬度
                const keyboardKeys = keyboardLayout.querySelectorAll('.keyboard-key')
                keyboardKeys.forEach(keyElement => {
                    const htmlKeyElement = keyElement as HTMLElement
                    originalKeyStyles.push({
                        element: htmlKeyElement,
                        originalStyle: htmlKeyElement.style.cssText
                    })

                    htmlKeyElement.style.cssText += `
                        width: 96px !important;          /* 按鍵卡片固定寬度 */
                        flex: 0 0 96px !important;       /* 固定彈性佈局 */
                    `
                })

                // 5.4. 設定字根列表的網格佈局寬度
                const zigenLists = keyboardLayout.querySelectorAll('.zigen-list')
                zigenLists.forEach(listElement => {
                    const htmlListElement = listElement as HTMLElement
                    originalKeyStyles.push({
                        element: htmlListElement,
                        originalStyle: htmlListElement.style.cssText
                    })

                    htmlListElement.style.cssText += `
                        grid-template-columns: repeat(auto-fill, minmax(16px, max-content)) !important; /* 字根最小寬度 */
                    `
                })

                // 6. 修復字根編碼間距問題
                const zigenCodes = keyboardLayout.querySelectorAll('.zigen-code')
                zigenCodes.forEach(codeElement => {
                    const htmlCodeElement = codeElement as HTMLElement
                    originalKeyStyles.push({
                        element: htmlCodeElement,
                        originalStyle: htmlCodeElement.style.cssText
                    })

                    // 為導出設置更穩定的間距
                    htmlCodeElement.style.cssText += `
                        margin-top: 1px !important;
                        padding-top: 1px !important;
                        min-height: 8px !important;
                        line-height: 1.0 !important;
                    `
                })

                // 6.1. 修復垂直佈局字根項的間距
                const zigenItems = keyboardLayout.querySelectorAll('.zigen-item')
                zigenItems.forEach(item => {
                    const htmlItem = item as HTMLElement
                    originalKeyStyles.push({
                        element: htmlItem,
                        originalStyle: htmlItem.style.cssText
                    })

                    // 為導出設置更穩定的垂直間距
                    htmlItem.style.cssText += `
                        gap: 1px !important;
                        padding: 1px !important;
                    `

                    // 特别处理其中的编码元素
                    const codeInItem = item.querySelector('.zigen-code') as HTMLElement
                    if (codeInItem) {
                        originalKeyStyles.push({
                            element: codeInItem,
                            originalStyle: codeInItem.style.cssText
                        })

                        codeInItem.style.cssText += `
                            margin-top: 1px !important;
                            min-height: 2px !important;
                        `
                    }
                })

                // 7. 修復特定按鍵的文字佈局問題（導出時橫排處理）
                const specialKeys = keyboardLayout.querySelectorAll('.keyboard-key')
                specialKeys.forEach(keyElement => {
                    const keyLabel = keyElement.querySelector('.key-label')?.textContent?.toLowerCase()
                    if (['z', ';', ',', '.', '/'].includes(keyLabel || '')) {
                        const noZigenText = keyElement.querySelector('.no-zigen-text') as HTMLElement
                        if (noZigenText) {
                            originalKeyStyles.push({
                                element: noZigenText,
                                originalStyle: noZigenText.style.cssText
                            })

                            // 應用橫排佈局樣式，適合導出圖片
                            noZigenText.style.cssText = `
                                display: flex !important;
                                flex-direction: column !important;
                                align-items: center !important;
                                justify-content: center !important;
                                text-align: center !important;
                                font-size: 0.7rem !important;
                                height: 100% !important;
                                line-height: 1.3 !important;
                                padding: 0.2rem !important;
                            `

                            const textDivs = noZigenText.querySelectorAll('div')
                            textDivs.forEach(div => {
                                const htmlDiv = div as HTMLElement
                                htmlDiv.style.cssText = `
                                    writing-mode: horizontal-tb !important;
                                    text-orientation: mixed !important;
                                    white-space: nowrap !important;
                                    margin: 0.1rem 0 !important;
                                    text-align: center !important;
                                    font-size: 0.65rem !important;
                                `
                            })
                        }
                    }
                })
            }

            // 等待樣式應用
            await new Promise(resolve => setTimeout(resolve, 500))

            // 計算合適的尺寸
            const elementRect = element.getBoundingClientRect()
            const elementWidth = Math.max(elementRect.width, element.scrollWidth, 1028)  // 確保最小寬度1028px
            const elementHeight = Math.max(elementRect.height, element.scrollHeight)

            const canvas = await html2canvas(element, {
                backgroundColor,
                scale,
                useCORS: true,
                allowTaint: false,
                logging: true,                  /* 啟用日誌以便調試 */
                width: elementWidth,            /* 使用計算出的寬度 */
                height: elementHeight,          /* 使用計算出的高度 */
                windowWidth: elementWidth,      /* 設定窗口寬度 */
                windowHeight: elementHeight,    /* 設定窗口高度 */
                scrollX: 0,                     /* 重置橫向滾動 */
                scrollY: 0,                     /* 重置縱向滾動 */
                x: 0,                          /* 從左邊開始捕獲 */
                y: 0,                          /* 從頂部開始捕獲 */
                ignoreElements: (element) => {
                    // 忽略控制按鈕和彈窗
                    return element.classList.contains('export-btn') ||
                        element.classList.contains('layout-toggle-btn') ||
                        element.classList.contains('pinned-popup')
                },
                // html2canvas-pro 支持現代 CSS 特性包括 oklch
                foreignObjectRendering: false,
                removeContainer: false,
                imageTimeout: 15000
            })

            // 恢复所有修改
            this.restoreAllChanges(
                controlButtons, originalDisplays,
                hintTexts, originalHintDisplays,
                originalKeyStyles, titleElement, originalThemeClasses
            )

            // 獲取圖片數據
            const dataUrl = canvas.toDataURL('image/png', 1.0)
            const filename = this.generateFileName(schemeName, isListView)

            // 複製到剪貼板
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

                    console.log('字根圖已複製到剪貼板')
                    return { success: true, message: '字根圖已複製到剪貼板並下載', dataUrl, filename }
                } catch (clipboardError) {
                    console.warn('複製到剪貼板失敗，將僅進行下載:', clipboardError)
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
                console.log('字根圖已下載:', filename)
            }

            return {
                success: true,
                message: '字根圖已下載',
                dataUrl,
                filename
            }
        } catch (error) {
            console.error('導出字根圖失敗:', error)

            // 错误时也要恢复样式
            this.restoreAllChanges(
                controlButtons, originalDisplays,
                hintTexts, originalHintDisplays,
                originalKeyStyles, titleElement, originalThemeClasses
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
        controlButtons: NodeListOf<Element>,
        originalDisplays: string[],
        hintTexts: NodeListOf<Element>,
        originalHintDisplays: (string | undefined)[],
        originalKeyStyles: { element: HTMLElement, originalStyle: string }[],
        titleElement: HTMLElement | null,
        originalThemeClasses: { element: Element, hadDarkClass: boolean }[]
    ) {
        // 恢复主题类
        originalThemeClasses.forEach(({ element, hadDarkClass }) => {
            if (hadDarkClass) {
                element.classList.add('dark')
            }
        })

        // 恢复按钮显示
        controlButtons.forEach((btn, index) => {
            const htmlBtn = btn as HTMLElement
            htmlBtn.style.display = originalDisplays[index]
        })

        // 恢复提示文字显示
        hintTexts.forEach((hint, index) => {
            const hintElement = hint as HTMLElement
            if (originalHintDisplays[index] !== undefined) {
                hintElement.style.display = originalHintDisplays[index]!
            }
        })

        // 移除添加的标题
        if (titleElement && titleElement.parentNode) {
            titleElement.remove()
        }

        // 恢复键位样式
        originalKeyStyles.forEach(({ element, originalStyle }) => {
            element.style.cssText = originalStyle
            const textDivs = element.querySelectorAll('div')
            textDivs.forEach(div => {
                const htmlDiv = div as HTMLElement
                htmlDiv.style.cssText = ''
            })
        })
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

    /**
     * 獲取方案的中文名稱
     */
    static getSchemeDisplayName(schemeId: string): string {
        const schemeNames: Record<string, string> = {
            'joy': '卿雲',
            'light': '光華',
            'star': '星陳',
            'ming': '日月',
            'wafel': '吉旦餅',
            'tianma': '天碼',
        }
        return schemeNames[schemeId] || schemeId
    }
}
