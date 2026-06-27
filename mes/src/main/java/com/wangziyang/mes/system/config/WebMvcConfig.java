package com.wangziyang.mes.system.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.format.Formatter;
import org.springframework.format.FormatterRegistry;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.text.ParseException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.time.temporal.TemporalQuery;
import java.util.Locale;

/**
 * Spring MVC configuration for serving the React SPA alongside existing API.
 *
 * @author SongPeng
 * @date 2025
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Ensure React build output in classpath:/static/ is served
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true);
    }

    /**
     * 表单(application/x-www-form-urlencoded / query string)参数到 java.time 类型的全局解析。
     * <p>
     * 后端 JSON 输出(见 {@code JsonConfig})用 "yyyy-MM-dd HH:mm:ss" 等格式序列化 LocalDateTime,
     * 但 @ModelAttribute 表单绑定走 ConversionService,默认只认 ISO 格式(yyyy-MM-ddTHH:mm:ss)。
     * 这一进/出不对称导致前端把列表里的 createTime/updateTime 原样回传给写接口时报 typeMismatch
     * (例如角色编辑/旧版软删除)。这里注册与序列化一致的解析器消除该不对称,空白串解析为 null。
     */
    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addFormatterForFieldType(LocalDateTime.class,
                new TemporalFormatter<>(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"), LocalDateTime::from));
        registry.addFormatterForFieldType(LocalDate.class,
                new TemporalFormatter<>(DateTimeFormatter.ofPattern("yyyy-MM-dd"), LocalDate::from));
        registry.addFormatterForFieldType(LocalTime.class,
                new TemporalFormatter<>(DateTimeFormatter.ofPattern("HH:mm:ss"), LocalTime::from));
    }

    /**
     * 通用 java.time 表单格式化器:空白串解析为 null,避免空参数触发解析异常。
     */
    private static final class TemporalFormatter<T extends TemporalAccessor> implements Formatter<T> {

        private final DateTimeFormatter formatter;
        private final TemporalQuery<T> query;

        TemporalFormatter(DateTimeFormatter formatter, TemporalQuery<T> query) {
            this.formatter = formatter;
            this.query = query;
        }

        @Override
        public T parse(String text, Locale locale) throws ParseException {
            if (!StringUtils.hasText(text)) {
                return null;
            }
            return formatter.parse(text.trim(), query);
        }

        @Override
        public String print(T object, Locale locale) {
            return object == null ? "" : formatter.format(object);
        }
    }
}
