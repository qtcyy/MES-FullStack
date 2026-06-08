package com.wangziyang.mes.system.dto;

import java.io.Serializable;

/**
 * AI 对话消息
 */
public class AiMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    private String role;
    private String content;

    public AiMessage() {
    }

    public AiMessage(String role, String content) {
        this.role = role;
        this.content = content;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
