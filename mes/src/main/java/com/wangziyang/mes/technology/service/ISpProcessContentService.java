package com.wangziyang.mes.technology.service;
import com.wangziyang.mes.technology.entity.SpProcessContent;
import com.baomidou.mybatisplus.extension.service.IService;
public interface ISpProcessContentService extends IService<SpProcessContent> {

    /** 级联删除工艺文件：先删其工装设备、技术文档子表，再删自身（事务内，仅删 DB） */
    void deleteCascade(String id);
}
