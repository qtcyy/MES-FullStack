import client from '../client'

export function getBomFlowList(productBomRootId: string) {
  return client.get(`/technology/bom-flow/list/${productBomRootId}`)
}

export function getProducts() {
  return client.get('/technology/bom-flow/products')
}

export function getFlows() {
  return client.get('/technology/bom-flow/flows')
}

export function getOpersByFlow(flowId: string) {
  return client.get(`/technology/bom-flow/opers/${flowId}`)
}

export function bind(params: Record<string, unknown>) {
  return client.post('/technology/bom-flow/bind', params, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function unbind(bomId: string) {
  return client.post('/technology/bom-flow/unbind', { bomId }, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function lock(productBomRootId: string) {
  return client.post(`/technology/bom-flow/lock/${productBomRootId}`)
}

export function updateRemark(params: Record<string, unknown>) {
  return client.post('/technology/bom-flow/update-remark', params, {
    headers: { 'Content-Type': 'application/json' },
  })
}
