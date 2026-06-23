package com.wangziyang.mes.workflow.runtime.bpmn;

import java.util.HashMap;
import java.util.Map;

/** 解析后的流程图:节点类型表 + 单出边表 + userTask 元数据。仅支持线性(单出边)流程。 */
public class ProcessGraph {
    private final Map<String, NodeType> nodeTypes = new HashMap<>();
    private final Map<String, String> outgoing = new HashMap<>();   // sourceId -> targetId
    private final Map<String, UserTaskDef> userTasks = new HashMap<>();
    private String startEventId;

    void putNode(String id, NodeType type) {
        nodeTypes.put(id, type);
        if (type == NodeType.START) startEventId = id;
    }
    void putFlow(String sourceId, String targetId) { outgoing.put(sourceId, targetId); }
    void putUserTask(UserTaskDef def) { userTasks.put(def.getId(), def); }

    public String getStartEventId() { return startEventId; }
    public NodeType typeOf(String nodeId) { return nodeTypes.getOrDefault(nodeId, NodeType.UNKNOWN); }
    public String nextNodeId(String fromId) { return outgoing.get(fromId); }
    public UserTaskDef userTask(String nodeId) { return userTasks.get(nodeId); }

    /** 从 startEvent 起沿出边找到的第一个 userTask;无则返回 null */
    public UserTaskDef firstUserTask() {
        String cur = startEventId;
        int guard = 0;
        while (cur != null && guard++ < 100) {
            if (typeOf(cur) == NodeType.USER_TASK) return userTasks.get(cur);
            cur = outgoing.get(cur);
        }
        return null;
    }

    /** 从某节点起,跳过非 userTask 节点,找到下一个 userTask;若先遇 END 或走到尽头返回 null(表示流程应结束) */
    public UserTaskDef nextUserTaskAfter(String fromNodeId) {
        String cur = outgoing.get(fromNodeId);
        int guard = 0;
        while (cur != null && guard++ < 100) {
            NodeType t = typeOf(cur);
            if (t == NodeType.USER_TASK) return userTasks.get(cur);
            if (t == NodeType.END) return null;
            cur = outgoing.get(cur);
        }
        return null;
    }
}
