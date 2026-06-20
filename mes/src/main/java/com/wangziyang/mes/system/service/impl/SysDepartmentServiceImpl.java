package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.entity.SysDepartment;
import com.wangziyang.mes.system.mapper.SysDepartmentMapper;
import com.wangziyang.mes.system.service.ISysDepartmentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * @author SongPeng
 * @since 2020-03-03
 */
@Service
public class SysDepartmentServiceImpl extends ServiceImpl<SysDepartmentMapper, SysDepartment> implements ISysDepartmentService {

    /**
     * 软删除部门（is_deleted = '1'）
     *
     * @param id 部门ID
     * @return 是否成功
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean softDelete(String id) {
        if (id == null || id.trim().isEmpty()) throw new RuntimeException("id 不能为空");
        UpdateWrapper<SysDepartment> uw = new UpdateWrapper<>();
        uw.eq("id", id).set("is_deleted", "1");
        return this.update(uw);
    }
}
