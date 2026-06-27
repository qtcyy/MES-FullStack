package com.wangziyang.mes.technology.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName(value = "sp_oper_step")
public class SpOperStep extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String operId;       // 所属工序ID(sp_oper.id)
    private Integer stepNo;      // 步骤序号
    private String stepTitle;    // 步骤标题
    private String stepDesc;     // 详细说明
    private Integer estMinutes;  // 预计耗时(分钟),可空
    private String remark;       // 备注

    public String getOperId() { return operId; }
    public void setOperId(String operId) { this.operId = operId; }
    public Integer getStepNo() { return stepNo; }
    public void setStepNo(Integer stepNo) { this.stepNo = stepNo; }
    public String getStepTitle() { return stepTitle; }
    public void setStepTitle(String stepTitle) { this.stepTitle = stepTitle; }
    public String getStepDesc() { return stepDesc; }
    public void setStepDesc(String stepDesc) { this.stepDesc = stepDesc; }
    public Integer getEstMinutes() { return estMinutes; }
    public void setEstMinutes(Integer estMinutes) { this.estMinutes = estMinutes; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
}
