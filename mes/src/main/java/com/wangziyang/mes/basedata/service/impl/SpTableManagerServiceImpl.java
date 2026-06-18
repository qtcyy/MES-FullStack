package com.wangziyang.mes.basedata.service.impl;

import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.basedata.dto.SpTableManagerDto;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import com.wangziyang.mes.basedata.mapper.SpTableManagerMapper;
import com.wangziyang.mes.basedata.request.SpTableManagerReq;
import com.wangziyang.mes.basedata.service.ISpTableManagerItemService;
import com.wangziyang.mes.basedata.service.ISpTableManagerService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * <p>
 * 主数据表头服务实现类
 * </p>
 *
 * @author WangZiYang
 * @since 2020-03-06
 */
@Service
public class SpTableManagerServiceImpl extends ServiceImpl<SpTableManagerMapper, SpTableManager> implements ISpTableManagerService {
    /**
     * 基础管理表mapper
     */
    @Autowired
    private SpTableManagerMapper spTableManagerMapper;

    /**
     * 表字段明细服务
     */
    @Autowired
    private ISpTableManagerItemService iSpTableManagerItemService;

    /**
     * 查询表对应的字段
     *
     * @param req 表信息
     * @return 字段信息
     */
    @Override
    public List<SpTableManagerItem> queryTableFieldByName(SpTableManager req) throws Exception {
        List<SpTableManagerItem> spTableManagerItems = spTableManagerMapper.queryTableFieldByName(req);
        if (CollectionUtil.isEmpty(spTableManagerItems)) {
            throw new Exception("表不存在数据库中。请核对");
        }
        return spTableManagerItems;
    }

    /**
     * 表头分页(支持表名/表描述模糊查询,按更新时间倒序)
     */
    @Override
    public IPage<SpTableManager> pageList(SpTableManagerReq req) {
        LambdaQueryWrapper<SpTableManager> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.isNotBlank(req.getTableName())) {
            wrapper.like(SpTableManager::getTableName, req.getTableName());
        }
        if (StringUtils.isNotBlank(req.getTableDesc())) {
            wrapper.like(SpTableManager::getTableDesc, req.getTableDesc());
        }
        wrapper.orderByDesc(SpTableManager::getUpdateTime);
        return this.page(req, wrapper);
    }

    /**
     * 整体新增/更新表头 + 字段明细(事务)。修复原 controller 4 个缺陷:
     * 空明细抛异常(原缺 return 假成功)、加事务、更新先删旧明细、
     * 明细统一清 id + 挂表头 id(原更新分支不挂致丢失)、返回生成的表头 id(原返回 null)。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public String saveOrUpdateWithItems(SpTableManagerDto dto) {
        List<SpTableManagerItem> items = dto.getSpTableManagerItems();
        if (CollectionUtil.isEmpty(items)) {
            throw new RuntimeException("显示的，详细的字段不可以为空");
        }
        SpTableManager header = new SpTableManager();
        BeanUtils.copyProperties(dto, header);
        this.saveOrUpdate(header);
        // 更新场景:先删旧明细
        if (StringUtils.isNotEmpty(dto.getId())) {
            iSpTableManagerItemService.deleteItemBytableNameId(dto.getId());
        }
        // 明细统一清 id(强制插入) + 挂到表头 id(新增/更新一致)
        for (SpTableManagerItem item : items) {
            item.setId(null);
            item.setTableNameId(header.getId());
        }
        iSpTableManagerItemService.saveOrUpdateBatch(items);
        return header.getId();
    }

    /**
     * 级联删除表头 + 字段明细(事务)。修复原 controller deleteByTableNameId 无事务缺陷:
     * removeById(header) 与 deleteItemBytableNameId(items) 两次写无原子性,中途异常致孤儿明细。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void removeWithItems(String id) {
        this.removeById(id);
        iSpTableManagerItemService.deleteItemBytableNameId(id);
    }
}
