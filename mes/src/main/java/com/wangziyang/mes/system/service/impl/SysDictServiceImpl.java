package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.entity.SysDict;
import com.wangziyang.mes.system.mapper.SysDictMapper;
import com.wangziyang.mes.system.service.ISysDictService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * <p>
 * 系统字典表 服务实现类
 * </p>
 *
 * @author SongPeng
 * @since 2019-08-26
 */
@Service
public class SysDictServiceImpl extends ServiceImpl<SysDictMapper, SysDict> implements ISysDictService {

    /**
     * 软删除字典（is_deleted = '1'）
     *
     * @param id 字典ID
     * @return 是否成功
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean softDelete(String id) {
        if (id == null || id.trim().isEmpty()) throw new RuntimeException("id 不能为空");
        UpdateWrapper<SysDict> uw = new UpdateWrapper<>();
        uw.eq("id", id).set("is_deleted", "1");
        return this.update(uw);
    }
}
