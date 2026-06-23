package com.wangziyang.mes.system.vo;

public class NoticeReadStatVO {
    private int total;
    private int readCount;
    private int unreadCount;

    public NoticeReadStatVO() {}
    public NoticeReadStatVO(int total, int readCount) {
        this.total = total;
        this.readCount = readCount;
        this.unreadCount = total - readCount;
    }
    public int getTotal() { return total; }
    public void setTotal(int total) { this.total = total; }
    public int getReadCount() { return readCount; }
    public void setReadCount(int readCount) { this.readCount = readCount; }
    public int getUnreadCount() { return unreadCount; }
    public void setUnreadCount(int unreadCount) { this.unreadCount = unreadCount; }
}
