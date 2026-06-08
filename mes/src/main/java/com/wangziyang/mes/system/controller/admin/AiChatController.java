package com.wangziyang.mes.system.controller.admin;

import com.wangziyang.mes.system.dto.AiChatRequest;
import com.wangziyang.mes.system.service.IAiChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

/**
 * AI 对话控制器 — SSE 流式端点
 * <p>
 * streamChat 在请求线程中直接调用（需要 Shiro SecurityManager），
 * RestTemplate 每收到一个 DeepSeek chunk 就通过 SseEmitter.send() 推送给客户端。
 * </p>
 */
@RestController
@RequestMapping("/admin/ai")
public class AiChatController {

    private static final Logger logger = LoggerFactory.getLogger(AiChatController.class);

    @Autowired
    private IAiChatService aiChatService;

    @PostMapping("/chat")
    public SseEmitter chat(@RequestBody AiChatRequest request) {
        SseEmitter emitter = new SseEmitter(300_000L);

        try {
            aiChatService.streamChat(request.getMessages(), chunk -> {
                try {
                    emitter.send(SseEmitter.event().data(chunk));
                } catch (IOException e) {
                    // 客户端断开连接 — 取消发送
                    throw new RuntimeException("Client disconnected", e);
                }
            });
            emitter.send(SseEmitter.event().data("[DONE]"));
            emitter.complete();
        } catch (Exception e) {
            logger.error("AI chat error", e);
            emitter.completeWithError(e);
        }

        return emitter;
    }
}
