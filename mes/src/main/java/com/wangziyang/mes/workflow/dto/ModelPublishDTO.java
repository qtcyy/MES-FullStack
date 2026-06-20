package com.wangziyang.mes.workflow.dto;

/** 模型发布到分类请求体 */
public class ModelPublishDTO {
    private String id;
    private String categoryCode;
    private String categoryName;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
}
