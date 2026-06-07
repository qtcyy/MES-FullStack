package com.wangziyang.mes.technology.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_process_content")
public class SpProcessContent extends BaseEntity {
    private String bomId;
    private String flowId;
    private String mainInfo;
    private String content;
    private String contentImages;
    private String requirements;
    private String inspectionRequired;
    private String inspectionImages;
    private String notes;
    private String status;

    public String getBomId() { return bomId; }
    public void setBomId(String bomId) { this.bomId = bomId; }
    public String getFlowId() { return flowId; }
    public void setFlowId(String flowId) { this.flowId = flowId; }
    public String getMainInfo() { return mainInfo; }
    public void setMainInfo(String mainInfo) { this.mainInfo = mainInfo; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getContentImages() { return contentImages; }
    public void setContentImages(String contentImages) { this.contentImages = contentImages; }
    public String getRequirements() { return requirements; }
    public void setRequirements(String requirements) { this.requirements = requirements; }
    public String getInspectionRequired() { return inspectionRequired; }
    public void setInspectionRequired(String inspectionRequired) { this.inspectionRequired = inspectionRequired; }
    public String getInspectionImages() { return inspectionImages; }
    public void setInspectionImages(String inspectionImages) { this.inspectionImages = inspectionImages; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
