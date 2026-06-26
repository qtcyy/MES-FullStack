package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.entity.SysDepartment;

/**
 * <p>
 * 服务类
 * </p>
 *
 * @author SongPeng
 * @since 2020-03-03
 */
public interface ISysDepartmentService extends IService<SysDepartment> {

    /**
     * 软删除部门（is_deleted = '1'）
     *
     * @param id 部门ID
     * @return 是否成功
     */
    boolean softDelete(String id);
}
