package com.wangziyang.mes.system.service;

import com.wangziyang.mes.system.dto.AiMessage;

import java.util.List;
import java.util.function.Consumer;

/**
 * AI 对话服务
 */
public interface IAiChatService {

    /**
     * 流式聊天 — 每收到一个 token 回调 onChunk
     *
     * @param messages 用户消息列表
     * @param onChunk  每个 token 的回调
     */
    void streamChat(List<AiMessage> messages, Consumer<String> onChunk) throws Exception;
}
