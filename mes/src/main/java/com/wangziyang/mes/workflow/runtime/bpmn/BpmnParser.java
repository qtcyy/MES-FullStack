package com.wangziyang.mes.workflow.runtime.bpmn;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

/** 解析标准 BPMN 2.0 XML 为 ProcessGraph。忽略命名空间前缀,按元素 localName 识别。 */
public final class BpmnParser {

    private BpmnParser() {}

    public static ProcessGraph parse(String bpmnXml) {
        if (bpmnXml == null || bpmnXml.trim().isEmpty()) {
            throw new IllegalArgumentException("BPMN XML 为空");
        }
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(
                new ByteArrayInputStream(bpmnXml.getBytes(StandardCharsets.UTF_8)));

            ProcessGraph graph = new ProcessGraph();
            NodeList all = doc.getElementsByTagName("*");
            for (int i = 0; i < all.getLength(); i++) {
                Node n = all.item(i);
                if (n.getNodeType() != Node.ELEMENT_NODE) continue;
                Element el = (Element) n;
                String local = localName(el);
                switch (local) {
                    case "startEvent":
                        graph.putNode(el.getAttribute("id"), NodeType.START);
                        break;
                    case "endEvent":
                        graph.putNode(el.getAttribute("id"), NodeType.END);
                        break;
                    case "userTask": {
                        String id = el.getAttribute("id");
                        graph.putNode(id, NodeType.USER_TASK);
                        graph.putUserTask(new UserTaskDef(
                            id,
                            el.getAttribute("name"),
                            attrByLocalName(el, "candidateGroups"),
                            attrByLocalName(el, "assignee")));
                        break;
                    }
                    case "sequenceFlow":
                        graph.putFlow(el.getAttribute("sourceRef"), el.getAttribute("targetRef"));
                        break;
                    default:
                        // 网关/服务任务等本期不支持,忽略
                }
            }
            if (graph.getStartEventId() == null) {
                throw new IllegalStateException("BPMN 缺少 startEvent");
            }
            return graph;
        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            throw new IllegalStateException("解析 BPMN 失败: " + e.getMessage(), e);
        }
    }

    private static String localName(Element el) {
        String ln = el.getLocalName();
        if (ln != null) return ln;
        String tag = el.getTagName();
        int idx = tag.indexOf(':');
        return idx >= 0 ? tag.substring(idx + 1) : tag;
    }

    /** 按属性 localName 取值(忽略 flowable:/activiti: 前缀差异);无则空串 */
    private static String attrByLocalName(Element el, String wanted) {
        NamedNodeMap attrs = el.getAttributes();
        for (int i = 0; i < attrs.getLength(); i++) {
            Node a = attrs.item(i);
            String ln = a.getLocalName();
            if (ln == null) {
                String name = a.getNodeName();
                int idx = name.indexOf(':');
                ln = idx >= 0 ? name.substring(idx + 1) : name;
            }
            if (wanted.equals(ln)) return a.getNodeValue();
        }
        return "";
    }
}
