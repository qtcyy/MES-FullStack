package com.wangziyang.mes.technology.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName(value = "sp_oper")
public class SpOper extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String oper;
    private String operCode;
    private String operDesc;
    private String processUnitId;
    private Integer laborHours;
    private Integer manufacturingCycle;
    private String generatePlan;
    private String remark;

    public String getOper() { return oper; }
    public void setOper(String oper) { this.oper = oper; }
    public String getOperCode() { return operCode; }
    public void setOperCode(String operCode) { this.operCode = operCode; }
    public String getOperDesc() { return operDesc; }
    public void setOperDesc(String operDesc) { this.operDesc = operDesc; }
    public String getProcessUnitId() { return processUnitId; }
    public void setProcessUnitId(String processUnitId) { this.processUnitId = processUnitId; }
    public Integer getLaborHours() { return laborHours; }
    public void setLaborHours(Integer laborHours) { this.laborHours = laborHours; }
    public Integer getManufacturingCycle() { return manufacturingCycle; }
    public void setManufacturingCycle(Integer manufacturingCycle) { this.manufacturingCycle = manufacturingCycle; }
    public String getGeneratePlan() { return generatePlan; }
    public void setGeneratePlan(String generatePlan) { this.generatePlan = generatePlan; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }

    @Override
    public String toString() {
        return "SpOper{" +
                "operCode=" + operCode +
                ", operDesc=" + operDesc +
                "}";
    }
}
