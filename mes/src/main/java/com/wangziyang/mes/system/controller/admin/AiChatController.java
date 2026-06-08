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

import javax.servlet.http.HttpServletResponse;
import java.io.PrintWriter;

/**
 * AI 对话控制器 — SSE 流式端点
 * <p>
 * 直接写入 HttpServletResponse 输出流，避免 SseEmitter 异步分发
 * 导致 Shiro ThreadContext 丢失。
 * </p>
 */
@RestController
@RequestMapping("/admin/ai")
public class AiChatController {

    private static final Logger logger = LoggerFactory.getLogger(AiChatController.class);

    @Autowired
    private IAiChatService aiChatService;

    @PostMapping("/chat")
    public void chat(@RequestBody AiChatRequest request, HttpServletResponse response) {
        logger.info("AI chat request received, messages count: {}", request.getMessages() != null ? request.getMessages().size() : 0);

        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");

        try (PrintWriter writer = response.getWriter()) {
            logger.info("Starting DeepSeek stream...");
            aiChatService.streamChat(request.getMessages(), chunk -> {
                writer.write("data: " + chunk + "\n\n");
                writer.flush();
            });
            logger.info("DeepSeek stream completed");
            writer.write("data: [DONE]\n\n");
            writer.flush();
        } catch (Exception e) {
            logger.error("AI chat error", e);
            // 如果响应尚未提交，尝试写入错误信息
            if (!response.isCommitted()) {
                try (PrintWriter writer = response.getWriter()) {
                    writer.write("data: {\"error\":\"" + escapeJson(e.getMessage()) + "\"}\n\n");
                    writer.flush();
                } catch (Exception ignored) {
                    // 无法写入，忽略
                }
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
