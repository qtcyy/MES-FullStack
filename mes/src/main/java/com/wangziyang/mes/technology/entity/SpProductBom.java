package com.wangziyang.mes.technology.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;
import java.time.LocalDateTime;

@TableName(value = "sp_product_bom")
public class SpProductBom extends BaseEntity {

    private static final long serialVersionUID = 1L;

    private String bomCode;
    private String productCode;
    private String nodeName;
    private String parentId;
    private Integer level;
    private String version;
    private String status;
    private String remark;
    private Integer sortOrder;
    private LocalDateTime lockedAt;
    private String lockedBy;

    public String getBomCode() { return bomCode; }
    public void setBomCode(String bomCode) { this.bomCode = bomCode; }
    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }
    public String getNodeName() { return nodeName; }
    public void setNodeName(String nodeName) { this.nodeName = nodeName; }
    public String getParentId() { return parentId; }
    public void setParentId(String parentId) { this.parentId = parentId; }
    public Integer getLevel() { return level; }
    public void setLevel(Integer level) { this.level = level; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }
    public String getLockedBy() { return lockedBy; }
    public void setLockedBy(String lockedBy) { this.lockedBy = lockedBy; }

    @Override
    public String toString() {
        return "SpProductBom{" +
                "bomCode=" + bomCode +
                ", productCode=" + productCode +
                ", nodeName=" + nodeName +
                ", parentId=" + parentId +
                ", level=" + level +
                ", version=" + version +
                ", status=" + status +
                "}";
    }
}
