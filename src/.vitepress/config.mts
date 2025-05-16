import { defineConfig } from 'vitepress'
import mdFootnote from "markdown-it-footnote"
import path from "node:path"
import tailwind from "tailwindcss"
import autoprefixer from "autoprefixer"

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "宇浩输入法",
  description: "情系汉字 沟通古今",
  lang: "zh-Hans-CN",
  outDir: "../dist",
  markdown: {
    math: true,
    theme: {
      light: "light-plus",
      dark: "material-theme-palenight",
    },
    config: (md) => {
      md.use(mdFootnote)
    }
  },
  head: [
    ['link', { rel: 'icon', href: '/logo_blue.png', type: 'image/png' }]
  ],
  vite: {
    css: {
      postcss: {
        plugins: [tailwind(), autoprefixer()],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '../../components'),
      }
    }
  },
  themeConfig: {
    logo: '/logo_blue.png',
    nav: [
      { text: '介绍', link: '/docs/' },
      { text: '教程', link: '/learn/' },
      { text: '拆分', link: '/chaifen/' },
      { text: '练习', link: '/practice/root' },
      { text: '安装', link: '/install' },
      { text: '跟打', link: 'https://yupad.pages.dev/' }
    ],
    sidebar: {
      '/docs': [
        {
          text: '介绍',
          items: [
            {
              text: '基本信息',
              link: '/docs/'
            },
            {
              text: '更新日志',
              link: '/docs/changelog'
            },
            {
              text: '展望未来',
              link: '/docs/developing'
            },
            {
              text: '背景故事',
              link: '/docs/background',
            },]
        },
        {
          text: '技术',
          items: [
            {
              text: '宇浩字根字体',
              link: '/docs/yuniversus',
            },
            {
              text: '设计哲学',
              link: '/docs/discussion',
            },
            {
              text: '技术文档',
              link: '/docs/technical'
            },
            {
              text: '字集覆盖',
              link: '/docs/coverage'
            },
          ]
        },
        {
          text: '杂谈',
          items: [
            {
              text: '常见输入法测评数据',
              link: '/docs/statistics',
            },
            {
              text: '字形输入法特性表和关系表',
              link: '/docs/characteristics',
            },
            {
              text: '常见形码输入方案编码规则',
              link: '/docs/coding',
            },
            {
              text: '古籍通规繁体标准',
              link: '/docs/guji',
            },
          ]
        },
        {
          text: '大观',
          items: [
            {
              text: '宇浩·光华',
              link: '/docs/light',
            },
            {
              text: '宇浩·日月',
              link: '/docs/sunmoon',
            },
            {
              text: '卿云输入法',
              link: '/docs/joy',
            },
            {
              text: '宇浩诗韵拼音',
              link: '/docs/sypy',
            },
            {
              text: '天码',
              link: '/sky/',
            },
            {
              text: '徐码',
              link: '/xuma/',
            },
            {
              text: '易码',
              link: '/docs/yima',
            },
          ]
        },
      ],
      '/learn': [
        {
          text: '前言',
          link: '/learn/'
        },
        {
          text: "教程",
          items: [{
            text: '单字拆分',
            link: '/learn/division'
          },
          {
            text: '字根编码',
            link: '/learn/roots'
          },
          {
            text: '字根速記',
            link: '/learn/star'
          },
          {
            text: '单字编码',
            link: '/learn/chars'
          },
          {
            text: '简码设置',
            link: '/learn/quick'
          },
          {
            text: '词语编码',
            link: '/learn/words'
          },
          {
            text: '极简词库',
            link: '/learn/lexicon'
          },
          ]
        },
        {
          text: "进阶",
          items: [
            {
              text: '宇浩拆分禁手',
              link: '/learn/prohibition'
            },
            {
              text: '字根内在属性',
              link: '/learn/intrinsic'
            },
            {
              text: '字形书体笔顺',
              link: '/learn/variation'
            },
            {
              text: '字根归并聚类',
              link: '/learn/grouping'
            },
            {
              text: '特殊部件拆分',
              link: '/learn/radicals'
            },
            {
              text: '拆分机器实现',
              link: '/learn/machine'
            },
          ]
        },
        {
          text: '附录',
          items: [
            {
              text: '字海拾珍——必拆字举隅',
              link: '/learn/examples'
            },
            {
              text: '高频字拆分图解——简化字',
              link: '/learn/frequent'
            },
            {
              text: '高频字拆分图解——传统字',
              link: '/learn/frequent_tc'
            },
          ]
        },
        {
          text: '光华',
          items: [
            {
              text: '光华方案字根图表',
              link: '/learn/light'
            },
          ]
        }
      ],
      '/practice': [
        {
          text: '烂然星陈',
          items: [
            {
              text: '星陈字根',
              link: '/practice/root'
            },
            {
              text: '星陈单字',
              link: '/practice/char'
            },
            {
              text: '星陈单字·台湾拆分',
              link: '/practice/char_tw'
            },
          ]
        },
        {
          text: '日月光华',
          items: [
            {
              text: '光华字根',
              link: '/practice/root_light'
            },
            {
              text: '光华单字',
              link: '/practice/char_light'
            },
          ]
        },
        {
          text: '卿云烂兮',
          items: [
            {
              text: '卿云字根',
              link: '/practice/root_joy'
            },
            {
              text: '卿云单字',
              link: '/practice/char_joy'
            },
            {
              text: '卿云·作品高频字',
              link: '/practice/char_joy_zhu'
            },
          ]
        },
        {
          text: '吉旦饼',
          items: [
            {
              text: '吉旦饼字根',
              link: '/practice/root_wafel'
            }
          ]
        },
        {
          text: '跟打器',
          items: [
            {
              text: '跟打器',
              link: 'https://yupad.pages.dev/'
            }
          ]
        }
      ],
      '/chaifen': [
        {
          text: '星陈',
          link: '/chaifen/'
        },
        {
          text: '光华',
          link: '/chaifen/light'
        },
        {
          text: '卿云',
          link: '/chaifen/joy'
        },
      ],
      '/sky': [
        {
          text: '天码',
          link: '/sky/'
        },
        {
          text: '拆分查询',
          link: '/sky/search'
        },
        {
          text: '在線練習',
          link: '/sky/practice'
        },
      ],
      '/xuma': [
        {
          text: '徐码',
          link: '/xuma/'
        },
        {
          text: '教程',
          link: '/xuma/learn'
        },
      ],

    },
    footer: {
      message: "宇浩输入法官网",
      copyright: "shurufa.app | yuhao.forfudan.com © 2024 Under CC BY-NC-ND 4.0 license.",
    },
    darkModeSwitchLabel: "黑暗模式",
    langMenuLabel: "选择语言",
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "全部頁面列表",
    outline: {
      level: "deep",
      label: "本页大纲"
    },
    search: {
      provider: "local",
      options: {
        translations: {
          button: {
            buttonAriaLabel: "搜索",
            buttonText: "搜索",
          },
          modal: {
            displayDetails: "展示详细内容",
            resetButtonTitle: "清空关键词",
            noResultsText: "搜索不到，请换个关键词",
            backButtonTitle: "返回",
            footer: {
              selectText: "进入网页",
              navigateText: "浏览",
              navigateDownKeyAriaLabel: "下键",
              navigateUpKeyAriaLabel: "上键",
              closeKeyAriaLabel: "关闭",
              closeText: "取消搜索",
            },
          },
        },
      },
    },
    socialLinks: [
      {
        icon: {
          svg: `<?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M23.1117 4.49449C23.4296 2.94472 21.9074 1.65683 20.4317 2.227L2.3425 9.21601C0.694517 9.85273 0.621087 12.1572 2.22518 12.8975L6.1645 14.7157L8.03849 21.2746C8.13583 21.6153 8.40618 21.8791 8.74917 21.968C9.09216 22.0568 9.45658 21.9576 9.70712 21.707L12.5938 18.8203L16.6375 21.8531C17.8113 22.7334 19.5019 22.0922 19.7967 20.6549L23.1117 4.49449ZM3.0633 11.0816L21.1525 4.0926L17.8375 20.2531L13.1 16.6999C12.7019 16.4013 12.1448 16.4409 11.7929 16.7928L10.5565 18.0292L10.928 15.9861L18.2071 8.70703C18.5614 8.35278 18.5988 7.79106 18.2947 7.39293C17.9906 6.99479 17.4389 6.88312 17.0039 7.13168L6.95124 12.876L3.0633 11.0816ZM8.17695 14.4791L8.78333 16.6015L9.01614 15.321C9.05253 15.1209 9.14908 14.9366 9.29291 14.7928L11.5128 12.573L8.17695 14.4791Z" fill="currentColor"/>
        </svg>`
        },
        link: 'https://t.me/yuhaoim'
      },
      { icon: 'github', link: 'https://github.com/forFudan/yuhao/releases' },
      {
        icon: {
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-tencent-qq" viewBox="0 0 16 16">
      <path d="M6.048 3.323c.022.277-.13.523-.338.55-.21.026-.397-.176-.419-.453-.022-.277.13-.523.338-.55.21-.026.397.176.42.453Zm2.265-.24c-.603-.146-.894.256-.936.333-.027.048-.008.117.037.15.045.035.092.025.119-.003.361-.39.751-.172.829-.129l.011.007c.053.024.147.028.193-.098.023-.063.017-.11-.006-.142-.016-.023-.089-.08-.247-.118Z"/>
      <path fill-rule="evenodd" d="M11.727 6.719c0-.022.01-.375.01-.557 0-3.07-1.45-6.156-5.015-6.156-3.564 0-5.014 3.086-5.014 6.156 0 .182.01.535.01.557l-.72 1.795a25.85 25.85 0 0 0-.534 1.508c-.68 2.187-.46 3.093-.292 3.113.36.044 1.401-1.647 1.401-1.647 0 .979.504 2.256 1.594 3.179-.408.126-.907.319-1.228.556-.29.213-.253.43-.201.518.228.386 3.92.246 4.985.126 1.065.12 4.756.26 4.984-.126.052-.088.088-.305-.2-.518-.322-.237-.822-.43-1.23-.557 1.09-.922 1.594-2.2 1.594-3.178 0 0 1.041 1.69 1.401 1.647.168-.02.388-.926-.292-3.113a25.78 25.78 0 0 0-.534-1.508l-.72-1.795ZM9.773 5.53c-.13-.286-1.431-.605-3.042-.605h-.017c-1.611 0-2.913.319-3.042.605a.096.096 0 0 0-.01.04c0 .022.008.04.018.056.11.159 1.554.943 3.034.943h.017c1.48 0 2.924-.784 3.033-.943a.095.095 0 0 0 .008-.096Zm-4.32-.989c-.483.022-.896-.529-.922-1.229-.026-.7.344-1.286.828-1.308.483-.022.896.529.922 1.23.027.7-.344 1.286-.827 1.307Zm2.538 0c.483.022.896-.529.922-1.229.026-.7-.344-1.286-.827-1.308-.484-.022-.896.529-.923 1.23-.026.7.344 1.285.828 1.307ZM2.928 8.99a10.674 10.674 0 0 0-.097 2.284c.146 2.45 1.6 3.99 3.846 4.012h.091c2.246-.023 3.7-1.562 3.846-4.011.054-.9 0-1.663-.097-2.285-1.312.26-2.669.41-3.786.396h-.017c-.297.003-.611-.005-.937-.023v2.148c-1.106.154-2.21-.068-2.21-.068V9.107a22.93 22.93 0 0 1-.639-.117Z"/>
    </svg>`,
        },
        link: "https://jq.qq.com/?_wv=1027&k=2OYDP4Tk",
      },
      {
        icon: {
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 56 56"><path fill="currentColor" fill-rule="evenodd" d="M31.8 36.237c-.917 3.427-.942 6.285-.074 8.574c1.595 4.208 7.2 5.419 7.464 6.522C39.454 52.437 31.726 53 27.358 53c-4.367 0-9.724-.833-9.724-1.667c0-.833 5.084-1.939 6.629-6.6c.9-2.717.802-5.838-.296-9.361a2.808 2.808 0 0 1-.845.128c-1.191 0-2.183-.73-2.397-1.694c-.822.54-1.852.86-2.969.86c-2.41 0-4.411-1.492-4.807-3.454a4.534 4.534 0 0 1-1.047.121C9.747 31.333 8 29.841 8 28c0-1.243.796-2.327 1.977-2.9c-.607-.379-1.001-.992-1.001-1.683c0-.24.047-.471.135-.686C8.442 22.434 8 21.92 8 21.333c0-.727.682-1.345 1.632-1.573C8.637 19.15 8 18.214 8 17.167c0-1.663 1.603-3.04 3.699-3.293a3.368 3.368 0 0 1-.772-2.124c0-2.071 1.965-3.75 4.39-3.75c.244 0 .484.017.718.05c.585-1.483 2.227-2.55 4.16-2.55c.537 0 1.051.082 1.527.233C22.052 4.179 23.646 3 25.56 3c1.958 0 3.58 1.232 3.86 2.837c.715-.716 1.78-1.17 2.97-1.17c2.155 0 3.902 1.492 3.902 3.333c0 .62-.199 1.201-.544 1.699c.177-.021.359-.032.544-.032c2.006 0 3.66 1.293 3.878 2.958a4.4 4.4 0 0 1 1.975-.458c2.156 0 3.903 1.492 3.903 3.333c0 1.255-.812 2.348-2.012 2.917c1.2.568 2.012 1.661 2.012 2.916c0 1.09-.613 2.059-1.56 2.667c.366.418.584.937.584 1.5c0 .216-.032.425-.092.624c1.8.853 3.019 2.493 3.019 4.376c0 2.761-2.62 5-5.854 5a6.68 6.68 0 0 1-2.362-.424c-.886.776-2.123 1.257-3.491 1.257a5.415 5.415 0 0 1-2.955-.85c-.42.357-.948.621-1.538.754"/></svg>`,
        },
        link: "http://zhuyuhao.ysepan.com/",
      },
    ]
  },
  locales: {
    root: {
      label: '简化汉字',
      lang: 'zh-Hans-CN'
    },
    zht: {
      label: "傳統漢字",
      lang: "zh-Hans-CN",
      title: "宇浩輸入法",
      description: "情繫漢字 溝通古今",
      themeConfig: {
        logo: '/logo_purple.png',
        nav: [
          { text: '介紹', link: '/zht/docs/' },
          { text: '教程', link: '/zht/learn/' },
          { text: '拆分', link: '/zht/chaifen/' },
          { text: '練習', link: '/zht/practice/root' },
          { text: '安裝', link: '/zht/install' },
          { text: '跟打', link: 'https://yupad.pages.dev/' }
        ],
        sidebar: {
          '/zht/docs': [
            {
              text: '介紹',
              items: [
                {
                  text: '基本信息',
                  link: '/zht/docs/'
                },
                {
                  text: '更新日誌',
                  link: '/zht/docs/changelog'
                },
                {
                  text: '展望未來',
                  link: '/zht/docs/developing'
                },
                {
                  text: '背景故事',
                  link: '/zht/docs/background',
                },]
            },
            {
              text: '技術',
              items: [
                {
                  text: '宇浩字根字體',
                  link: '/zht/docs/yuniversus',
                },
                {
                  text: '设计哲学',
                  link: '/zht/docs/discussion',
                },
                {
                  text: '技術文檔',
                  link: '/zht/docs/technical'
                },
                {
                  text: '字集覆蓋',
                  link: '/zht/docs/coverage'
                },
              ]
            },
            {
              text: '雜談',
              items: [
                {
                  text: '常見輸入法測評數據',
                  link: '/zht/docs/statistics',
                },
                {
                  text: '字形輸入法特性表和關係表',
                  link: '/zht/docs/characteristics',
                },
                {
                  text: '常見形碼輸入方案編碼規則',
                  link: '/zht/docs/coding',
                },
                {
                  text: '古籍通規繁體標準',
                  link: '/zht/docs/guji',
                },
              ]
            },
            {
              text: '大觀',
              items: [
                {
                  text: '宇浩·光華',
                  link: '/zht/docs/light',
                },
                {
                  text: '宇浩·日月',
                  link: '/zht/docs/sunmoon',
                },
                {
                  text: '卿雲輸入法',
                  link: '/zht/docs/joy',
                },
                {
                  text: '宇浩詩韻拼音',
                  link: '/zht/docs/sypy',
                },
                {
                  text: '天碼',
                  link: '/zht/sky/',
                },
                {
                  text: '徐碼',
                  link: '/zht/xuma/',
                },
                {
                  text: '易碼',
                  link: '/zht/docs/yima',
                },
              ]
            },
          ],
          '/zht/learn': [
            {
              text: '前言',
              link: '/zht/learn/'
            },
            {
              text: "教程",
              items: [
                {
                  text: '單字拆分',
                  link: '/zht/learn/division'
                },
                {
                  text: '字根編碼',
                  link: '/zht/learn/roots'
                },
                {
                  text: '字根速記',
                  link: '/zht/learn/star'
                },
                {
                  text: '單字編碼',
                  link: '/zht/learn/chars'
                },
                {
                  text: '簡碼設置',
                  link: '/zht/learn/quick'
                },
                {
                  text: '詞語編碼',
                  link: '/zht/learn/words'
                },
                {
                  text: '極簡詞庫',
                  link: '/zht/learn/lexicon'
                },
              ]
            },
            {
              text: "進階",
              items: [
                {
                  text: '宇浩拆分禁手',
                  link: '/zht/learn/prohibition'
                },
                {
                  text: '字根内在屬性',
                  link: '/zht/learn/intrinsic'
                },
                {
                  text: '字形書體筆順',
                  link: '/zht/learn/variation'
                },
                {
                  text: '字根歸併聚類',
                  link: '/zht/learn/grouping'
                },
                {
                  text: '特殊部件拆分',
                  link: '/zht/learn/radicals'
                },
                {
                  text: '拆分機器實現',
                  link: '/zht/learn/machine'
                }
              ]
            },
            {
              text: '附錄',
              items: [
                {
                  text: '字海拾珍——必拆字舉隅',
                  link: '/zht/learn/examples'
                },
                {
                  text: '高频字拆分图解——简化字',
                  link: '/zht/learn/frequent'
                },
                {
                  text: '高频字拆分图解——传统字',
                  link: '/zht/learn/frequent_tc'
                },
              ]
            },
            {
              text: '光華',
              items: [
                {
                  text: '光華方案字根圖表',
                  link: '/zht/learn/light'
                },
              ]
            }
          ],
          '/zht/practice': [
            {
              text: '爛然星陳',
              items: [
                {
                  text: '星陳字根',
                  link: '/zht/practice/root'
                },
                {
                  text: '星陳單字',
                  link: '/zht/practice/char'
                },
                {
                  text: '星陳單字·臺灣拆分',
                  link: '/zht/practice/char_tw'
                },
              ]
            },
            {
              text: '日月光華',
              items: [
                {
                  text: '光華字根',
                  link: '/zht/practice/root_light'
                },
                {
                  text: '光華單字',
                  link: '/zht/practice/char_light'
                },
              ]
            },
            {
              text: '卿雲爛兮',
              items: [
                {
                  text: '卿雲字根',
                  link: '/zht/practice/root_joy'
                },
                {
                  text: '卿雲單字',
                  link: '/zht/practice/char_joy'
                },
                {
                  text: '卿雲·作品高頻字',
                  link: '/zht/practice/char_joy_zhu'
                },
              ]
            },
            {
              text: '吉旦餅',
              items: [
                {
                  text: '吉旦餅字根',
                  link: '/zht/practice/root_wafel'
                }
              ]
            },
            {
              text: '跟打器',
              items: [
                {
                  text: '跟打器',
                  link: 'https://yupad.pages.dev/'
                }
              ]
            }
          ],
          '/zht/chaifen': [
            {
              text: '星陳',
              link: '/zht/chaifen/'
            },
            {
              text: '光華',
              link: '/zht/chaifen/light'
            },
            {
              text: '卿雲',
              link: '/zht/chaifen/joy'
            },
          ],
          '/zht/sky': [
            {
              text: '天碼',
              link: '/zht/sky/'
            },
            {
              text: '拆分查询',
              link: '/zht/sky/search'
            },
            {
              text: '在線練習',
              link: '/zht/sky/practice'
            },
          ],
          '/zht/xuma': [
            {
              text: '徐碼',
              link: '/zht/xuma/'
            },
            {
              text: '教程',
              link: '/zht/xuma/learn'
            },
          ],
        },
      }
    },
  },
})
