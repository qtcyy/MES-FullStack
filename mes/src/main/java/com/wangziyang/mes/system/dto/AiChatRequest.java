package com.wangziyang.mes.system.dto;

import java.io.Serializable;
import java.util.List;

/**
 * AI 对话请求
 */
public class AiChatRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<AiMessage> messages;

    public List<AiMessage> getMessages() {
        return messages;
    }

    public void setMessages(List<AiMessage> messages) {
        this.messages = messages;
    }
}
