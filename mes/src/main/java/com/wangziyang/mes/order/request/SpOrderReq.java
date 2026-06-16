package com.wangziyang.mes.order.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 生产订单分页请求
 */
public class SpOrderReq extends BasePageReq {
    /** 工单编号模糊查询 */
    private String orderCodeLike;
    /** 物料编码模糊查询 */
    private String materielLike;

    public String getOrderCodeLike() { return orderCodeLike; }
    public void setOrderCodeLike(String orderCodeLike) { this.orderCodeLike = orderCodeLike; }
    public String getMaterielLike() { return materielLike; }
    public void setMaterielLike(String materielLike) { this.materielLike = materielLike; }
}
