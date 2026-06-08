package com.wangziyang.mes.system.controller.admin;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.system.dto.AiChatRequest;
import com.wangziyang.mes.system.service.IAiChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * AI 对话控制器
 */
@Controller("adminAiChatController")
@RequestMapping("/admin/ai")
public class AiChatController extends BaseController {

    private static final Logger logger = LoggerFactory.getLogger(AiChatController.class);

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Autowired
    private IAiChatService aiChatService;

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @ResponseBody
    public SseEmitter chat(@RequestBody AiChatRequest request) {
        // 超时 5 分钟
        SseEmitter emitter = new SseEmitter(300_000L);

        executor.execute(() -> {
            try {
                aiChatService.streamChat(request.getMessages(), chunk -> {
                    try {
                        emitter.send(SseEmitter.event().data(chunk));
                    } catch (IOException e) {
                        logger.error("SSE send error", e);
                    }
                });
                emitter.send(SseEmitter.event().data("[DONE]"));
                emitter.complete();
            } catch (Exception e) {
                logger.error("AI chat error", e);
                try {
                    emitter.send(SseEmitter.event()
                        .data("{\"error\":\"" + e.getMessage() + "\"}"));
                    emitter.complete();
                } catch (IOException ex) {
                    emitter.completeWithError(ex);
                }
            }
        });

        emitter.onCompletion(() -> logger.debug("SSE completed"));
        emitter.onTimeout(() -> logger.debug("SSE timeout"));

        return emitter;
    }
}
