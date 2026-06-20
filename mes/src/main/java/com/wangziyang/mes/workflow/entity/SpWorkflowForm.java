package com.wangziyang.mes.workflow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 流程表单
 *
 * @since 周期 2n 后端补齐
 */
@TableName("sp_workflow_form")
public class SpWorkflowForm extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 表单名称 */
    private String name;

    /** 表单key(字母开头,唯一) */
    private String formKey;

    /** 表单类型:目前仅 URL */
    private String formType;

    /** 流程标题生成脚本 */
    private String titleScript;

    /** PC 表单地址脚本 */
    private String pcUrlScript;

    /** 手机表单地址脚本 */
    private String mobileUrlScript;

    /** 是否跳过相同处理人 */
    private Boolean skipSameAssignee;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFormKey() { return formKey; }
    public void setFormKey(String formKey) { this.formKey = formKey; }

    public String getFormType() { return formType; }
    public void setFormType(String formType) { this.formType = formType; }

    public String getTitleScript() { return titleScript; }
    public void setTitleScript(String titleScript) { this.titleScript = titleScript; }

    public String getPcUrlScript() { return pcUrlScript; }
    public void setPcUrlScript(String pcUrlScript) { this.pcUrlScript = pcUrlScript; }

    public String getMobileUrlScript() { return mobileUrlScript; }
    public void setMobileUrlScript(String mobileUrlScript) { this.mobileUrlScript = mobileUrlScript; }

    public Boolean getSkipSameAssignee() { return skipSameAssignee; }
    public void setSkipSameAssignee(Boolean skipSameAssignee) { this.skipSameAssignee = skipSameAssignee; }
}
