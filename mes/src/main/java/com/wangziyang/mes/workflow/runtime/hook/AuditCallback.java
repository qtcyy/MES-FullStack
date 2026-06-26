package com.wangziyang.mes.workflow.runtime.hook;

/** 流程终态回调。按 businessType 分发(见引擎)。 */
public interface AuditCallback {
    String businessType();
    void onApproved(String businessId);
    void onRejected(String businessId);
}
