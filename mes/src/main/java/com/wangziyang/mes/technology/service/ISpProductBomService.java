package com.wangziyang.mes.technology.service;

import com.wangziyang.mes.technology.entity.SpProductBom;
import com.baomidou.mybatisplus.extension.service.IService;
import java.util.List;

public interface ISpProductBomService extends IService<SpProductBom> {
    void lockBom(String rootId, String username);
    SpProductBom createNewVersion(String rootId);
    List<SpProductBom> getTreeByRootId(String rootId);
    String generateBomCode();
    void cascadeDelete(String nodeId);
}
