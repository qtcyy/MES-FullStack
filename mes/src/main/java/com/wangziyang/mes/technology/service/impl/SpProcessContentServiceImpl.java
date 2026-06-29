package com.wangziyang.mes.technology.service.impl;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.technology.entity.SpProcessContent;
import com.wangziyang.mes.technology.entity.SpProcessDocument;
import com.wangziyang.mes.technology.entity.SpProcessEquipment;
import com.wangziyang.mes.technology.mapper.SpProcessContentMapper;
import com.wangziyang.mes.technology.service.ISpProcessContentService;
import com.wangziyang.mes.technology.service.ISpProcessDocumentService;
import com.wangziyang.mes.technology.service.ISpProcessEquipmentService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class SpProcessContentServiceImpl extends ServiceImpl<SpProcessContentMapper, SpProcessContent> implements ISpProcessContentService {

    @Autowired
    private ISpProcessEquipmentService equipmentService;

    @Autowired
    private ISpProcessDocumentService documentService;

    /** 级联删除工艺文件：先删其工装设备、技术文档子表，再删自身。MinIO 文件清理由 controller 在删除成功后处理 */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteCascade(String id) {
        equipmentService.remove(new QueryWrapper<SpProcessEquipment>().eq("content_id", id));
        documentService.remove(new QueryWrapper<SpProcessDocument>().eq("content_id", id));
        this.removeById(id);
    }
}
