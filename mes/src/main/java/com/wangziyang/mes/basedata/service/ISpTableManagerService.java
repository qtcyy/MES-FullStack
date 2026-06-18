package com.wangziyang.mes.basedata.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.basedata.dto.SpTableManagerDto;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import com.wangziyang.mes.basedata.request.SpTableManagerReq;

import java.util.List;

/**
 * <p>
 * 主数据表头服务类
 * </p>
 *
 * @author WangZiYang
 * @since 2020-03-06
 */
public interface ISpTableManagerService extends IService<SpTableManager> {
    /**
     * 查询表对应的字段
     *
     * @param req 表信息
     * @return 字段信息
     */
    List<SpTableManagerItem> queryTableFieldByName(SpTableManager req) throws Exception;

    /**
     * 表头分页(支持表名/表描述模糊查询,按更新时间倒序)
     *
     * @param req 分页 + 查询条件
     * @return 分页结果
     */
    IPage<SpTableManager> pageList(SpTableManagerReq req);

    /**
     * 整体新增/更新表头 + 字段明细(事务):
     * 更新时先删旧明细;明细统一清 id 并挂表头 id 后批量插入;返回表头 id。
     *
     * @param dto 表头 + 明细集合
     * @return 表头 id
     */
    String saveOrUpdateWithItems(SpTableManagerDto dto);

    /**
     * 级联删除表头 + 字段明细(事务):保证两次删除原子性,
     * 避免删头成功、删明细失败产生孤儿明细。
     *
     * @param id 表头 id
     */
    void removeWithItems(String id);
}
