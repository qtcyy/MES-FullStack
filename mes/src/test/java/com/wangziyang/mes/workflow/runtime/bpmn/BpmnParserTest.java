package com.wangziyang.mes.workflow.runtime.bpmn;

import org.junit.Assert;
import org.junit.Test;

public class BpmnParserTest {

    private static final String XML =
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
        "<bpmn:definitions xmlns:bpmn=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" " +
        "xmlns:flowable=\"http://flowable.org/bpmn\">" +
        "  <bpmn:process id=\"orderAudit\" name=\"订单审批\" isExecutable=\"true\">" +
        "    <bpmn:startEvent id=\"start\" name=\"开始\"/>" +
        "    <bpmn:userTask id=\"approve\" name=\"审批\" flowable:candidateGroups=\"prod_supervisor\"/>" +
        "    <bpmn:endEvent id=\"end\" name=\"结束\"/>" +
        "    <bpmn:sequenceFlow id=\"f1\" sourceRef=\"start\" targetRef=\"approve\"/>" +
        "    <bpmn:sequenceFlow id=\"f2\" sourceRef=\"approve\" targetRef=\"end\"/>" +
        "  </bpmn:process>" +
        "</bpmn:definitions>";

    @Test
    public void parsesStartUserTaskEnd() {
        ProcessGraph g = BpmnParser.parse(XML);
        Assert.assertEquals("start", g.getStartEventId());
        Assert.assertEquals(NodeType.USER_TASK, g.typeOf("approve"));
        Assert.assertEquals(NodeType.END, g.typeOf("end"));

        UserTaskDef first = g.firstUserTask();
        Assert.assertNotNull(first);
        Assert.assertEquals("approve", first.getId());
        Assert.assertEquals("审批", first.getName());
        Assert.assertEquals("prod_supervisor", first.getCandidateGroups());

        Assert.assertNull(g.nextUserTaskAfter("approve"));
    }
}
