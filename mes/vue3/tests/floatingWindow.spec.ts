import { describe, it, expect } from 'vitest'
import { clampToViewport, resizeGeometry, type SizeConstraints } from '@/utils/floatingWindow'

const C: SizeConstraints = { minW: 320, minH: 360, maxW: 2000, maxH: 2000 }
const START = { x: 100, y: 100, w: 380, h: 560 }
const VW = 5000
const VH = 5000 // 足够大，使 clampToViewport 不干扰 resize 断言

describe('resizeGeometry', () => {
  it('东边：从固定左边生长', () => {
    expect(resizeGeometry(START, 'e', 50, 0, C, VW, VH)).toMatchObject({ x: 100, w: 430 })
  })
  it('南边：从固定上边生长', () => {
    expect(resizeGeometry(START, 's', 40, 0 + 40, C, VW, VH)).toMatchObject({ y: 100, h: 600 })
  })
  it('西边：右边锚定，x 随之移动', () => {
    // right = 480；w = 380-50 = 330；x = 480-330 = 150
    expect(resizeGeometry(START, 'w', 50, 0, C, VW, VH)).toMatchObject({ x: 150, w: 330 })
  })
  it('北边：底边锚定，y 随之移动', () => {
    // bottom = 660；h = 560-40 = 520；y = 660-520 = 140
    expect(resizeGeometry(START, 'n', 0, 40, C, VW, VH)).toMatchObject({ y: 140, h: 520 })
  })
  it('西边触底 minW 时右边仍锚定', () => {
    // w = clamp(380-100,320,2000)=320；x = 480-320 = 160
    expect(resizeGeometry(START, 'w', 100, 0, C, VW, VH)).toMatchObject({ x: 160, w: 320 })
  })
  it('北边触底 minH 时底边仍锚定', () => {
    // h = clamp(560-300,360,2000)=360；y = 660-360 = 300
    expect(resizeGeometry(START, 'n', 0, 300, C, VW, VH)).toMatchObject({ y: 300, h: 360 })
  })
  it('东边触顶 maxW', () => {
    const c2: SizeConstraints = { ...C, maxW: 400 }
    expect(resizeGeometry(START, 'e', 100, 0, c2, VW, VH)).toMatchObject({ w: 400 })
  })
  it('右下角同时作用两轴', () => {
    expect(resizeGeometry(START, 'se', 40, 40, C, VW, VH)).toMatchObject({ x: 100, y: 100, w: 420, h: 600 })
  })
  it('左上角同时作用两轴，对侧锚定', () => {
    // w=340,x=480-340=140；h=520,y=660-520=140
    expect(resizeGeometry(START, 'nw', 40, 40, C, VW, VH)).toMatchObject({ x: 140, y: 140, w: 340, h: 520 })
  })
})

describe('clampToViewport', () => {
  it('超出右边界回拉', () => {
    expect(clampToViewport({ x: 1900, y: 10, w: 380, h: 560 }, 2000, 2000)).toMatchObject({ x: 1620, y: 10 })
  })
  it('超出下边界回拉', () => {
    expect(clampToViewport({ x: 10, y: 1900, w: 380, h: 560 }, 2000, 2000)).toMatchObject({ y: 1440 })
  })
  it('负坐标归零', () => {
    expect(clampToViewport({ x: -50, y: -50, w: 380, h: 560 }, 2000, 2000)).toMatchObject({ x: 0, y: 0 })
  })
  it('宽高超视口被夹且 x 归零', () => {
    expect(clampToViewport({ x: 100, y: 100, w: 3000, h: 3000 }, 2000, 2000)).toMatchObject({ x: 0, y: 0, w: 2000, h: 2000 })
  })
})
