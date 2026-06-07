package com.wangziyang.mes.technology.request;

import com.wangziyang.mes.common.BasePageReq;

public class SpProductBomPageReq extends BasePageReq {
    private String productCodeLike;
    private String nodeNameLike;

    public String getProductCodeLike() { return productCodeLike; }
    public void setProductCodeLike(String productCodeLike) { this.productCodeLike = productCodeLike; }
    public String getNodeNameLike() { return nodeNameLike; }
    public void setNodeNameLike(String nodeNameLike) { this.nodeNameLike = nodeNameLike; }
}
