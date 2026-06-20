/**
 * 首页图表配置构建器。配色随主题(浅/深)切换,
 * 由调用方传入 dark 标志,保证图表与站点主题一致。
 */
import type { EChartsOption } from 'echarts'
import { trend, orderStatus, workshopOee } from './mock'

function palette(dark: boolean) {
  return {
    brand: dark ? '#36e0ff' : '#2f7cff',
    text2: dark ? '#8aa0c4' : '#5b6675',
    split: dark ? 'rgba(120,160,220,0.14)' : '#eef1f6',
    axis: dark ? 'rgba(120,160,220,0.25)' : '#dfe4ee',
    tooltipBg: dark ? '#0d1530' : '#ffffff',
    tooltipBorder: dark ? 'rgba(120,160,220,0.25)' : '#e6e9f0',
  }
}

function baseTooltip(dark: boolean) {
  const p = palette(dark)
  return {
    backgroundColor: p.tooltipBg,
    borderColor: p.tooltipBorder,
    textStyle: { color: dark ? '#e6f0ff' : '#1f2733' },
  }
}

/** 迷你 sparkline(用于 KPI 卡角落) */
export function sparkOption(data: number[], color: string): EChartsOption {
  return {
    grid: { top: 4, bottom: 4, left: 2, right: 2 },
    xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    series: [
      {
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: color + '55' },
              { offset: 1, color: color + '00' },
            ],
          },
        },
      },
    ],
  }
}

/** 近 7 天产量趋势(面积折线:产量 vs 计划) */
export function trendOption(dark: boolean): EChartsOption {
  const p = palette(dark)
  return {
    tooltip: { trigger: 'axis', ...baseTooltip(dark) },
    legend: {
      data: ['实际产量', '计划产量'],
      right: 0,
      top: 0,
      textStyle: { color: p.text2 },
      icon: 'roundRect',
    },
    grid: { top: 36, left: 8, right: 8, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: trend.days,
      boundaryGap: false,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { color: p.text2 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: p.split } },
      axisLabel: { color: p.text2 },
    },
    series: [
      {
        name: '实际产量',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: trend.output,
        lineStyle: { width: 3, color: p.brand },
        itemStyle: { color: p.brand },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: p.brand + '40' },
              { offset: 1, color: p.brand + '00' },
            ],
          },
        },
      },
      {
        name: '计划产量',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: trend.plan,
        lineStyle: { width: 2, type: 'dashed', color: '#fa8c16' },
        itemStyle: { color: '#fa8c16' },
      },
    ],
  }
}

/** 工单状态分布(环形图) */
export function orderStatusOption(dark: boolean): EChartsOption {
  const p = palette(dark)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', ...baseTooltip(dark) },
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'center',
      textStyle: { color: p.text2 },
      icon: 'circle',
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderColor: p.tooltipBg, borderWidth: 2, borderRadius: 4 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 18, fontWeight: 'bold', color: dark ? '#e6f0ff' : '#1f2733' },
        },
        data: orderStatus.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.color },
        })),
      },
    ],
  }
}

/** 各车间设备稼动率(横向柱状) */
export function workshopOeeOption(dark: boolean): EChartsOption {
  const p = palette(dark)
  const names = workshopOee.map((d) => d.name)
  const values = workshopOee.map((d) => d.value)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c}%', ...baseTooltip(dark) },
    grid: { top: 8, left: 8, right: 24, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: p.split } },
      axisLabel: { color: p.text2, formatter: '{value}%' },
    },
    yAxis: {
      type: 'category',
      data: names,
      inverse: true,
      axisLine: { lineStyle: { color: p.axis } },
      axisTick: { show: false },
      axisLabel: { color: p.text2 },
    },
    series: [
      {
        type: 'bar',
        data: values,
        barWidth: 14,
        label: { show: true, position: 'right', formatter: '{c}%', color: p.text2 },
        itemStyle: {
          borderRadius: [0, 7, 7, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: p.brand + '88' },
              { offset: 1, color: p.brand },
            ],
          },
        },
      },
    ],
  }
}
