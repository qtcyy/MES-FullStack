package com.wangziyang.mes.workflow.runtime.bpmn;

/** 一个 userTask 节点的元数据 */
public class UserTaskDef {
    private final String id;
    private final String name;
    private final String candidateGroups; // 角色编码(可空)
    private final String assignee;        // 指定人(可空)

    public UserTaskDef(String id, String name, String candidateGroups, String assignee) {
        this.id = id;
        this.name = name;
        this.candidateGroups = candidateGroups;
        this.assignee = assignee;
    }
    public String getId() { return id; }
    public String getName() { return name; }
    public String getCandidateGroups() { return candidateGroups; }
    public String getAssignee() { return assignee; }
}
