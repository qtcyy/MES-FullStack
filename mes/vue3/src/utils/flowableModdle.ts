/**
 * 最小 Flowable moddle 扩展:让 bpmn:UserTask 支持 flowable:assignee / candidateGroups
 * 属性,使导出的 BPMN XML 真带 flowable: 命名空间属性(将来真 Flowable 后端可直接消费)。
 */
const flowableModdle = {
  name: 'Flowable',
  uri: 'http://flowable.org/bpmn',
  prefix: 'flowable',
  xml: { tagAlias: 'lowerCase' },
  associations: [],
  types: [
    {
      name: 'AssignableUserTask',
      extends: ['bpmn:UserTask'],
      properties: [
        { name: 'assignee', isAttr: true, type: 'String' },
        { name: 'candidateGroups', isAttr: true, type: 'String' },
        { name: 'candidateUsers', isAttr: true, type: 'String' },
      ],
    },
  ],
}

export default flowableModdle
