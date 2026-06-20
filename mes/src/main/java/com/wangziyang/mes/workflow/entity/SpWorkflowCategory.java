package com.wangziyang.mes.workflow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 流程分类
 *
 * @since 周期 2n 后端补齐
 */
@TableName("sp_workflow_category")
public class SpWorkflowCategory extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 分类编码(唯一) */
    private String code;

    /** 分类名称 */
    private String name;

    /** 备注 */
    private String descr;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescr() { return descr; }
    public void setDescr(String descr) { this.descr = descr; }
}
