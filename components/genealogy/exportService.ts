import html2canvas from 'html2canvas-pro'

export class GenealogyExportService {
    /**
     * 生成文件名
     */
    static generateFileName(title: string = '漢字字形輸入法繫絡圖'): string {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
        return `${title}${today}.png`
    }

    /**
     * 動態添加水印文字到繫絡圖底部（兩欄布局）
     * @param containerElement 容器元素
     * @param focusedSchemaDetails 當前關注的輸入法詳情
     * @returns 返回創建的水印元素，用於後續移除
     */
    static addTemporaryWatermark(
        containerElement: HTMLElement,
        focusedSchemaDetails: any = null
    ): HTMLElement {
        const watermarkDiv = document.createElement('div')
        watermarkDiv.className = 'genealogy-export-watermark'

        // 根據當前主題設置水印樣式（使用透明背景，讓畫布背景透過）
        const isDarkMode = document.documentElement.classList.contains('dark')
        const textColor = isDarkMode ? 'rgb(165, 180, 252)' : '#4f46e5'

        // 根據是否有關注節點調整布局方式
        const justifyContent = focusedSchemaDetails ? 'space-between' : 'center'

        // 獲取 SVG 的實際寬度
        const svgElement = containerElement.querySelector('svg') as SVGElement
        const svgWidth = svgElement ? svgElement.getAttribute('width') : '840'

        watermarkDiv.style.cssText = `
            width: ${svgWidth}px;   // 使用 SVG 的實際寬度
            padding: 4px 32px;      // 上下、左右（控制到兩側邊緣的距離）
            background: transparent;
            margin-top: 4px;        // 頁腳（底部信息）上方到畫布的距離
            font-family: 'Noto Serif SC', serif;
            display: flex;
            justify-content: ${justifyContent};
            align-items: center;
            gap: 2rem;
            box-sizing: border-box; // 確保 padding 包含在寬度內
        `

        // 如果有關注的輸入法，使用兩欄布局；否則使用單行布局
        if (focusedSchemaDetails) {
            // 左側：水印信息（三行）
            const leftDiv = document.createElement('div')
            leftDiv.style.cssText = `
                flex: 0.75;               // 左側寬度和右側寬度之比（左右比）
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                font-family: 'Noto Serif SC', serif;
                font-size: 0.85rem;
                color: ${textColor};
                font-weight: 400;
                justify-content: center;
            `
            leftDiv.innerHTML = `
                <div style="font-weight: 600;">宇浩系列輸入法·雜談</div>
                <div>網址：shurufa.app/ime/gene</div>
                <div>QQ 討論群：170510762</div>
            `
            // 右側：懸浮信息窗
            const rightDiv = document.createElement('div')
            // 使用與網頁完全一致的浮動提示樣式
            // 深色模式：浅蓝背景 + 深色文字；亮色模式：深蓝背景 + 白色文字
            const bgColor = isDarkMode ? 'rgba(99, 102, 241, 0.95)' : 'rgba(99, 102, 241, 0.95)'
            const textColorInBox = isDarkMode ? 'white' : 'white'
            const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.3)'

            rightDiv.style.cssText = `
                flex: 1;
                padding: 0.75rem 1.25rem;
                background: ${bgColor};
                color: ${textColorInBox};
                border-radius: 0.5rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            `

            // 輸入法名稱和鏈接
            let nameHtml = `<div style="font-family: 'Noto Serif SC'; font-size: 1.2rem; font-weight: 900; line-height: 1.2; display: flex; align-items: center; gap: 0.5rem;">${focusedSchemaDetails.name}`
            if (focusedSchemaDetails.url) {
                nameHtml += ` <a href="${focusedSchemaDetails.url}" target="_blank" style="color: inherit; text-decoration: none; opacity: 0.7; font-size: 0.875rem;">🔗</a>`
            }
            nameHtml += `</div>`

            // 維護者
            let maintainersHtml = ''
            if (focusedSchemaDetails.maintainers && focusedSchemaDetails.maintainers.length > 0) {
                maintainersHtml = `<div style="font-size: 0.875rem; opacity: 0.9;">${focusedSchemaDetails.maintainers.join('、')} (修訂維護)</div>`
            }

            // 作者
            const authorsHtml = `<div style="font-size: 0.875rem; opacity: 0.9;">${focusedSchemaDetails.authors.join('、')}</div>`

            // 日期
            const dateHtml = `<div style="font-size: 0.875rem; opacity: 0.8;">${focusedSchemaDetails.date}</div>`

            // 特徵標籤
            let featuresHtml = ''
            if (focusedSchemaDetails.features && focusedSchemaDetails.features.length > 0) {
                const tagBgColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.2)'
                const tagsHtml = focusedSchemaDetails.features.map((f: string) =>
                    `<span style="display: inline-block; padding: 0.125rem 0.5rem; background: ${tagBgColor}; border-radius: 0.25rem; font-size: 0.75rem; white-space: nowrap;">${f}</span>`
                ).join('')
                featuresHtml = `<div style="display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.25rem;">${tagsHtml}</div>`
            }

            // 描述
            let descriptionHtml = ''
            if (focusedSchemaDetails.description) {
                descriptionHtml = `<div style="font-size: 0.875rem; opacity: 0.9; margin-top: 0.25rem; padding-top: 0.5rem; border-top: 1px solid ${borderColor};">${focusedSchemaDetails.description}</div>`
            }

            rightDiv.innerHTML = nameHtml + maintainersHtml + authorsHtml + dateHtml + featuresHtml + descriptionHtml
            watermarkDiv.appendChild(leftDiv)
            watermarkDiv.appendChild(rightDiv)
        } else {
            // 沒有關注節點時，單行顯示水印信息
            const singleLineDiv = document.createElement('div')
            singleLineDiv.style.cssText = `
                text-align: center;
                font-family: 'Noto Serif SC', serif;
                font-size: 0.85rem;
                color: ${textColor};
                font-weight: 400;
            `
            singleLineDiv.textContent = '宇浩系列輸入法 · 網址: shurufa.app/ime/gene · QQ 討論群: 170510762'
            watermarkDiv.appendChild(singleLineDiv)
        }

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
            focusedSchemaDetails?: any
            title?: string
        } = {}
    ) {
        const {
            copyToClipboard = false,
            download = true,
            scale = 2,
            addWatermark = true,
            focusedSchemaDetails = null,
            title = '漢字字形輸入法繫絡圖'
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
            watermarkElement = this.addTemporaryWatermark(contentElement, focusedSchemaDetails)
        }

        // 声明变量用于后续恢复
        let toolbarElement: HTMLElement | null = null
        let originalToolbarDisplay: string = ''
        let floatingHintElement: HTMLElement | null = null
        let originalFloatingHintDisplay: string = ''
        let originalContentWidth: string = ''
        let originalContentMaxWidth: string = ''

        try {
            // 0. 获取 SVG 的实际宽度
            const svgWidth = svgElement.getAttribute('width') || '840'

            // 临时限制 contentElement 的宽度，防止右侧出现空白
            originalContentWidth = contentElement.style.width
            originalContentMaxWidth = contentElement.style.maxWidth
            contentElement.style.width = `${svgWidth}px`
            contentElement.style.maxWidth = `${svgWidth}px`

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

            // 3. 添加標題欄（根據當前主題設置顏色）
            const titleElement = document.createElement('div')
            titleElement.className = 'export-title'
            const isDarkMode = document.documentElement.classList.contains('dark')

            titleElement.style.cssText = `
                width: ${svgWidth}px;
                max-width: 100%;
                text-align: center;
                font-size: 1.8rem;
                font-weight: bold;
                margin-bottom: 0.25rem;  // 標題下方到畫布的距離
                padding: 0.25rem;        // 標題內部的上下內邊距
                color: ${isDarkMode ? 'rgb(165, 180, 252)' : '#5400a2ff'};
                background: transparent;
                font-family: 'Noto Serif SC', serif;
                box-sizing: border-box;
            `
            titleElement.textContent = title
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
                contentElement.querySelector('.export-title') as HTMLElement,
                contentElement,
                originalContentWidth,
                originalContentMaxWidth
            )

            // 獲取圖片數據
            const dataUrl = canvas.toDataURL('image/png', 1.0)
            const filename = this.generateFileName(title)

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
                contentElement?.querySelector('.export-title') as HTMLElement,
                contentElement,
                originalContentWidth,
                originalContentMaxWidth
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
        titleElement: HTMLElement | null,
        contentElement: HTMLElement | null = null,
        originalContentWidth: string = '',
        originalContentMaxWidth: string = ''
    ) {
        // 恢复容器宽度
        if (contentElement) {
            contentElement.style.width = originalContentWidth
            contentElement.style.maxWidth = originalContentMaxWidth
        }

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
