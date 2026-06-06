package com.wangziyang.mes.basedata.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 仓库实体
 *
 * @author wangziyang
 */
@TableName("sp_warehouse")
public class SpWarehouse extends BaseEntity {
    private static final long serialVersionUID = 1L;
    private String code;
    private String name;
    private String type;
    @TableField("`groups`")
    private Integer groups;
    @TableField("`rows`")
    private Integer rows;
    private Integer layers;
    @TableField("`columns`")
    private Integer columns;
    private String descr;
    @TableField(value = "is_deleted")
    private String deleted;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Integer getGroups() { return groups; }
    public void setGroups(Integer groups) { this.groups = groups; }
    public Integer getRows() { return rows; }
    public void setRows(Integer rows) { this.rows = rows; }
    public Integer getLayers() { return layers; }
    public void setLayers(Integer layers) { this.layers = layers; }
    public Integer getColumns() { return columns; }
    public void setColumns(Integer columns) { this.columns = columns; }
    public String getDescr() { return descr; }
    public void setDescr(String descr) { this.descr = descr; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
