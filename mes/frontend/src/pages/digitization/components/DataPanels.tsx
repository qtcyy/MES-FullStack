// mes/frontend/src/pages/digitization/components/DataPanels.tsx
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import * as echarts from 'echarts'

interface Props {
  warehouses: { name: string; count: number }[]
  position?: [number, number, number]
}

export default function DataPanels({
  warehouses,
  position = [-100, 180, 0],
}: Props) {
  const { scene } = useThree()
  const added = useRef(false)

  useEffect(() => {
    if (added.current) return
    added.current = true

    // --- Pie chart ---
    const pieCanvas = document.createElement('canvas')
    pieCanvas.width = 512
    pieCanvas.height = 512
    const pieChart = echarts.init(pieCanvas)
    pieChart.setOption({
      title: {
        text: '黑科数字仿真数据',
        subtext: '库区分布',
        x: 'center',
        textStyle: { color: '#fff', fontSize: 20 },
      },
      tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: { color: '#ccc' },
        data: warehouses.map((w) => w.name),
      },
      series: [{
        name: '库区',
        type: 'pie',
        radius: '55%',
        center: ['50%', '60%'],
        data: warehouses.map((w) => ({ value: w.count, name: w.name })),
        itemStyle: {
          emphasis: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
        },
      }],
    })

    pieChart.on('finished', () => {
      const tex = new THREE.TextureLoader().load(pieChart.getDataURL())
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(150, 150, 1)
      sprite.position.set(position[0], position[1], position[2])
      sprite.name = '数据面板-饼图'
      scene.add(sprite)
    })

    // --- Bar chart ---
    const barCanvas = document.createElement('canvas')
    barCanvas.width = 512
    barCanvas.height = 512
    const barChart = echarts.init(barCanvas)
    barChart.setOption({
      color: ['#3398DB'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: [{
        type: 'category',
        data: warehouses.map((w) => w.name),
        axisTick: { alignWithLabel: true },
      }],
      yAxis: [{ type: 'value' }],
      series: [{
        name: '库位数',
        type: 'bar',
        barWidth: '60%',
        data: warehouses.map((w) => w.count),
      }],
    })

    barChart.on('finished', () => {
      const tex = new THREE.TextureLoader().load(barChart.getDataURL())
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(150, 150, 1)
      sprite.position.set(position[0] + 200, position[1], position[2])
      sprite.name = '数据面板-柱状图'
      scene.add(sprite)
    })

    return () => {
      pieChart.dispose()
      barChart.dispose()
    }
  }, [scene, warehouses, position])

  return null
}
