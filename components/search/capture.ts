/**
 * capture.ts - 把 DOM 節點拍成圖片，優先複製到剪貼板，失敗則下載
 *
 * 反查有三處要用：單張舊卡片、單張靈明卡片、以及一次截下整片結果，
 * 故而從 Card.vue 抽出來共用。
 *
 * Modification History:
 * - 2026-08-28: 從 Card.vue 抽出，增加裁切和畫布上限
 */

import html2canvas from "html2canvas-pro";

export interface CaptureOptions {
    /** 下載時的文件名，不含擴展名 */
    filename: string
    /** 圖片底色。省略為透明 */
    backgroundColor?: string | null
    /** 只截元素內的這一塊，坐標相對元素本身 */
    crop?: { x: number, y: number, width: number, height: number }
}

/** 畫布像素上限。查一整段話時結果很長，超過就自動降採樣，免得把瀏覽器撐爆 */
const MAX_PIXELS = 24_000_000

export async function captureElement(el: HTMLElement, opts: CaptureOptions) {
    // 按整個元素算採樣率：html2canvas 先渲染整塊，裁切是我們自己做的
    const scale = Math.min(2, Math.max(1,
        Math.sqrt(MAX_PIXELS / Math.max(el.offsetWidth * el.offsetHeight, 1))))

    const full = await html2canvas(el, {
        backgroundColor: opts.backgroundColor ?? null,
        scale,
        logging: false,
    })

    // 自己在畫布上裁，不用 html2canvas 的 x/y 選項：那組坐標要經過克隆文檔的佈局換算，
    // 這裏直接算就行——無裁切時畫布正好蓋住元素邊框盒，CSS 像素到畫布像素就是乘 scale。
    let canvas = full
    if (opts.crop) {
        const sx = Math.max(0, Math.round(opts.crop.x * scale))
        const sy = Math.max(0, Math.round(opts.crop.y * scale))
        const sw = Math.min(full.width - sx, Math.round(opts.crop.width * scale))
        const sh = Math.min(full.height - sy, Math.round(opts.crop.height * scale))
        if (sw > 0 && sh > 0) {
            canvas = document.createElement('canvas')
            canvas.width = sw
            canvas.height = sh
            const ctx = canvas.getContext('2d')!
            if (opts.backgroundColor) {
                ctx.fillStyle = opts.backgroundColor
                ctx.fillRect(0, 0, sw, sh)
            }
            ctx.drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh)
        }
    }

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('生成圖片失敗')

    try {
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ])
        console.log('已複製到剪貼板')
    } catch (err) {
        console.error('複製到剪貼板失敗，改為下載:', err)

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${opts.filename}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        console.log('圖片已下載')
    }
}
