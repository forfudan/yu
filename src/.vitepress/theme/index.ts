// https://vitepress.dev/guide/custom-theme
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'
import { useMediumZoomProvider } from '../hooks'
import './style.css'
import './fonts.css'
import './custom.css'

export default {
  extends: DefaultTheme,

  enhanceApp({ app, router, siteData }) {
    // 圖片放大
    useMediumZoomProvider(app, router)
  },

  setup() {
    // 在客戶端修改語言按鈕行為
    if (typeof window !== 'undefined') {
      const setupLangToggle = () => {
        // 查找語言選擇器按鈕
        const langButton = document.querySelector('.VPNavBarTranslations button') as HTMLElement
        if (!langButton) {
          setTimeout(setupLangToggle, 100)
          return
        }

        // 根據當前語言設置按鈕文本
        const isTraditional = window.location.pathname.startsWith('/zht/')
        const textSpan = langButton.querySelector('.VPNavBarTranslations .text')
        if (textSpan) {
          textSpan.textContent = isTraditional ? '简化汉字' : '傳統漢字'
        }

        // 移除原有的點擊事件監聽器，添加新的直接切換邏輯
        const newButton = langButton.cloneNode(true) as HTMLElement
        langButton.parentNode?.replaceChild(newButton, langButton)

        newButton.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()

          const currentPath = window.location.pathname
          let newPath: string

          if (currentPath.startsWith('/zht/')) {
            // 從繁體切換到簡體
            newPath = currentPath.replace(/^\/zht\//, '/')
          } else {
            // 從簡體切換到繁體
            newPath = currentPath === '/' ? '/zht/' : `/zht${currentPath}`
          }

          window.location.href = newPath
        })

        // 根據當前語言高亮按鈕
        if (isTraditional) {
          newButton.classList.add('lang-active')
        }
      }

      // 頁面加載和路由變化時都要設置
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupLangToggle)
      } else {
        setupLangToggle()
      }
    }
  }
} satisfies Theme