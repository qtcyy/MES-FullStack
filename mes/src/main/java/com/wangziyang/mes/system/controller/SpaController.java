package com.wangziyang.mes.system.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Catch-all controller for React SPA client-side routes.
 * <p>
 * When the user refreshes the browser on a SPA route (e.g., /system/user),
 * this controller forwards the request to index.html so React Router can
 * handle the client-side routing.
 * </p>
 *
 * @author SongPeng
 * @date 2025
 */
@Controller
public class SpaController {

    /**
     * Forward SPA client-side routes to index.html.
     * <p>
     * Add new React Router paths here as the SPA evolves.
     * Only matches paths without a file extension.
     * </p>
     */
    @GetMapping(value = {
        "/welcome",
        "/system/**",
        "/basedata/**",
        "/technology/**",
        "/order/**",
        "/digitization/**",
        "/403",
        "/404",
        "/500"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
