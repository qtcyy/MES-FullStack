package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.entity.SysDict;

/**
 * <p>
 * 系统字典表 服务类
 * </p>
 *
 * @author SongPeng
 * @since 2019-08-26
 */
public interface ISysDictService extends IService<SysDict> {

    /**
     * 软删除字典（is_deleted = '1'）
     *
     * @param id 字典ID
     * @return 是否成功
     */
    boolean softDelete(String id);
}
