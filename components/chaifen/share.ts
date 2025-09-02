/*
Name: share.ts
      Chaifen.vue

Purpose: 可視化漢字拆分
Version: 20240407
Author: 朱宇浩 (forFudan) <dr.yuhao.zhu@outlook.com>
Github: https://github.com/forFudan/

LICENSE 版權聲明：
專爲宇浩系列輸入法製作 <https://shurufa.com/>
轉載請保留作者名和出處
Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International
---------------------------------------
--
DESCRIPTION 介紹:
可視化漢字拆分并渲染爲SVG圖像
數據來源 Hanzi Writer v3.0.3 | https://chanind.github.io/hanzi-writer
使用時,在 md 中插入以下代碼:
  <script setup>
  import Chaifen from '@/chaifen/Chaifen.vue'
  </script>
渲染漢字時,使用以下代碼:
  <Chaifen char="部" :parts='[5,3,2]' :colors='[1,2,3]'/>
其中, char 爲想渲染的漢字, parts 爲該漢字每一個字根的筆畫數.
  colors 爲每個部件調用的顔色.

版本：
20240407: 初版.
20240408: 生成隨機 id.
20240901: 修正 SSR 報錯.
20240925: 將 HanziWriter 改為引用, 刪除本地代碼.
 */

// TypeScript declarations for HanziWriter library
import HanziWriter from 'hanzi-writer';

import { fetchCsvAsMap } from "../search/share";

export function genIdentifier(length: number): string {
  let randYu = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTVWXYUZbcdefghaoijklmnpqrstuvwxyz0123456789";
  const charsLen = chars.length;
  let counter = 0;
  while (counter < length) {
    randYu += chars.charAt(Math.floor(Math.random() * charsLen));
    counter += 1;
  }
  return randYu;
}

function renderFanningStrokesNew(
  target: HTMLElement,
  char: string,
  strokes: any,
  parts: Array<number>,
  colors: Array<number>,
  size: number,
) {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = char;
  svg.style.width = size + "px";
  svg.style.height = size + "px";
  //svg.style.border = '1px solid #EEE'
  //svg.style.marginRight = '5px'
  target.appendChild(svg);
  var group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  // set the transform property on the g element so the character renders at 75x75
  var transformData = HanziWriter.getScalingTransform(size, size);
  group.setAttributeNS(null, "transform", transformData.transform);
  svg.appendChild(group);

  var total = 0;
  let color = [
    "#CECECE", // smoke
    "#E53935", // red
    "#FFA000", // amber
    "#2C96FF", // blue
    "#689F38", // green
    "#F48FB1", // pink
    "#7E57C2", // purple
    "#BF360C", // brown
    "#00796B", // forest
  ];

  for (var i = 0; i < parts.length; i++) {
    strokes.slice(total, total + parts[i]).forEach(function (strokePath) {
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttributeNS(null, "d", strokePath);
      // Fill colors to Yuhao strokes
      path.style.fill = color[colors[i]];
      group.appendChild(path);
    });
    total += parts[i];
  }
}

export function getDivision(
  target: string,
  char: string,
  parts: Array<number> = [99],
  colors: Array<number> = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
  size: number = 75,
) {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Skip execution during SSR
    return;
  }

  HanziWriter.loadCharacterData(char).then(function (charData) {
    const targetElement = document.getElementById(target);
    if (targetElement && charData && 'strokes' in charData) {
      renderFanningStrokesNew(
        targetElement,
        char,
        charData.strokes,
        parts,
        colors,
        size,
      );
    }
  }).catch(function (error) {
    console.warn('Failed to load character data for:', char, error);
  });
}
