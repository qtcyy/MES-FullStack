# 通知中心 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 MES 实现「发布 → 接收 → 查看」一体的通知中心：管理员定向发布（全员/用户/角色/部门），普通用户经顶部铃铛与通知中心页接收查看，每用户独立已读状态。

**Architecture:** 数据模型方案 A（发布即扇出）——`sp_sys_notice` 存通知主体，`sp_sys_notice_user` 存每用户收件箱行。后端 Java/MyBatis-Plus 单表 CRUD + 收件人解析 service；前端 Vue3/Element Plus 三页面 + Header 铃铛轮询。

**Tech Stack:** Java8 / Spring Boot 2.1.7 / MyBatis-Plus 3.1.2 / Shiro；Vue3 / Element Plus / Pinia / axios。

**验证策略说明：** 本仓库后端无单测脚手架、`./mvnw` 损坏，故后端用「系统 mvn（JDK11）编译通过」为主闸，并对纯逻辑（收件人解析）补一个不依赖 DB 的单测；前端用 `vue-tsc --noEmit` + `pnpm build` 为闸；最后做一次手动端到端冒烟。参考 [设计文档](../specs/2026-06-23-notification-center-design.md)。

**约定速查（落地必读）：**
- 后端模块根：`mes/src/main/java/com/wangziyang/mes/system/`
- 实体继承 `com.wangziyang.mes.common.BaseEntity`（雪花 id + 审计字段自动填充）
- Controller 继承 `BaseController`，`getSysUser()` 取当前登录用户；返回 `Result.success(data)` / `Result.failure(msg)`
- Request 继承 `BasePageReq`；分页用 `service.page(req, queryWrapper)`
- 前端路由 path 去 `/admin` 前缀、去 `/list-ui` 后缀对齐菜单 url；侧栏由 `sp_sys_menu` 驱动
- 前端 POST 默认 form-urlencoded（`api/request.ts` 已封装；数组会 append 多值）

---

## Task 1: 数据库表 + 菜单 seed

**Files:**
- Create: `scripts/sql/notice-center.sql`

- [ ] **Step 1: 写建表与菜单 seed 脚本**

```sql
-- ============================================================
-- 通知中心 (feat/system-funcs)
-- 方案 A：通知主体表 sp_sys_notice + 每用户收件箱表 sp_sys_notice_user
-- 菜单挂系统管理组(parent_id=10)；id 取 120/121 避开既有 101~108。
-- 幂等：表用 IF NOT EXISTS，菜单用 ON DUPLICATE KEY UPDATE。
-- 执行后请重新登录以重建前端权限集(含 notice:publish)。
-- ============================================================

CREATE TABLE IF NOT EXISTS `sp_sys_notice` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `title` varchar(255) NOT NULL COMMENT '标题',
  `content` text COMMENT '正文',
  `type` varchar(16) NOT NULL DEFAULT 'info' COMMENT 'info/success/warning/error',
  `target_type` varchar(16) NOT NULL DEFAULT 'all' COMMENT 'all/user/role/dept',
  `target_ids` varchar(1024) DEFAULT '' COMMENT '目标id列表(逗号分隔)',
  `target_desc` varchar(512) DEFAULT '' COMMENT '目标描述(展示用)',
  `sender` varchar(64) DEFAULT '' COMMENT '发布人username',
  `status` varchar(8) NOT NULL DEFAULT '1' COMMENT '1=已发布',
  `recipient_count` int NOT NULL DEFAULT 0 COMMENT '收件人数',
  `is_deleted` varchar(1) NOT NULL DEFAULT '0' COMMENT '软删 0/1',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知主体表';

CREATE TABLE IF NOT EXISTS `sp_sys_notice_user` (
  `id` varchar(64) NOT NULL COMMENT '主键id',
  `notice_id` varchar(64) NOT NULL COMMENT '关联 sp_sys_notice.id',
  `user_id` varchar(64) NOT NULL COMMENT '收件人id',
  `is_read` varchar(1) NOT NULL DEFAULT '0' COMMENT '0未读/1已读',
  `read_time` datetime DEFAULT NULL COMMENT '首次已读时间',
  `is_deleted` varchar(1) NOT NULL DEFAULT '0' COMMENT '软删 0/1',
  `create_time` datetime NOT NULL,
  `create_username` varchar(64) NOT NULL,
  `update_time` datetime NOT NULL,
  `update_username` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notice_user_uid` (`user_id`,`is_read`,`is_deleted`),
  KEY `idx_notice_user_nid` (`notice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知收件箱表';

INSERT INTO `sp_sys_menu`
  (`id`,`code`,`name`,`url`,`parent_id`,`grade`,`sort_num`,`type`,`permission`,`icon`,`descr`,`create_time`,`create_username`,`update_time`,`update_username`)
VALUES
  ('120','noticeInbox','通知中心','/admin/sys/notice/list-ui','10','3',9,'0','notice:view','bell','','2026-06-23 00:00:00','admin','2026-06-23 00:00:00','admin'),
  ('121','noticePublish','通知发布','/admin/sys/notice/admin-ui','10','3',10,'0','notice:publish','message','','2026-06-23 00:00:00','admin','2026-06-23 00:00:00','admin')
ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `url`=VALUES(`url`), `parent_id`=VALUES(`parent_id`),
  `permission`=VALUES(`permission`), `icon`=VALUES(`icon`);
```

- [ ] **Step 2: 执行脚本（落地时）**

Run（需 DB 可达，dev 库见 application-dev.yml）：
```bash
# 仅记录命令；执行交由有 DB 访问的环境。本任务以"脚本写好且语法正确"为完成标准。
mysql -h <host> -u <user> -p<pwd> <db> < scripts/sql/notice-center.sql
```
Expected: 两表创建、两菜单插入成功。

- [ ] **Step 3: Commit**

```bash
git add scripts/sql/notice-center.sql
git commit -m "🗃️ chore(sql): 通知中心建表+菜单种子(notice/notice_user)"
```

---

## Task 2: 后端实体 + Mapper

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/entity/SysNotice.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/entity/SysNoticeUser.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/mapper/SysNoticeMapper.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/mapper/SysNoticeUserMapper.java`
- Create: `mes/src/main/resources/mapper/system/SysNoticeUserMapper.xml`

- [ ] **Step 1: 写 SysNotice 实体**

```java
package com.wangziyang.mes.system.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

@TableName("sp_sys_notice")
public class SysNotice extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String title;
    private String content;
    private String type;          // info/success/warning/error
    private String targetType;    // all/user/role/dept
    private String targetIds;     // 逗号分隔
    private String targetDesc;
    private String sender;
    private String status;        // 1=已发布
    private Integer recipientCount;
    @TableField(value = "is_deleted")
    private String deleted;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public String getTargetIds() { return targetIds; }
    public void setTargetIds(String targetIds) { this.targetIds = targetIds; }
    public String getTargetDesc() { return targetDesc; }
    public void setTargetDesc(String targetDesc) { this.targetDesc = targetDesc; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getRecipientCount() { return recipientCount; }
    public void setRecipientCount(Integer recipientCount) { this.recipientCount = recipientCount; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
```

- [ ] **Step 2: 写 SysNoticeUser 实体**

```java
package com.wangziyang.mes.system.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.time.LocalDateTime;

@TableName("sp_sys_notice_user")
public class SysNoticeUser extends BaseEntity {
    private static final long serialVersionUID = 1L;

    private String noticeId;
    private String userId;
    private String isRead;          // 0未读/1已读
    private LocalDateTime readTime;
    @TableField(value = "is_deleted")
    private String deleted;

    public String getNoticeId() { return noticeId; }
    public void setNoticeId(String noticeId) { this.noticeId = noticeId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getIsRead() { return isRead; }
    public void setIsRead(String isRead) { this.isRead = isRead; }
    public LocalDateTime getReadTime() { return readTime; }
    public void setReadTime(LocalDateTime readTime) { this.readTime = readTime; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
```

- [ ] **Step 3: 写两个 Mapper 接口**

`SysNoticeMapper.java`：
```java
package com.wangziyang.mes.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.system.entity.SysNotice;

public interface SysNoticeMapper extends BaseMapper<SysNotice> {
}
```

`SysNoticeUserMapper.java`（含收件箱联表查询）：
```java
package com.wangziyang.mes.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.system.dto.SysNoticeInboxDTO;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.request.SysNoticeInboxPageReq;
import org.apache.ibatis.annotations.Param;

public interface SysNoticeUserMapper extends BaseMapper<SysNoticeUser> {

    IPage<SysNoticeInboxDTO> selectInboxPage(IPage<SysNoticeInboxDTO> page,
                                             @Param("req") SysNoticeInboxPageReq req,
                                             @Param("userId") String userId);
}
```

- [ ] **Step 4: 写 SysNoticeUserMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.wangziyang.mes.system.mapper.SysNoticeUserMapper">

    <resultMap id="inboxMap" type="com.wangziyang.mes.system.dto.SysNoticeInboxDTO">
        <id column="id" property="id"/>
        <result column="notice_id" property="noticeId"/>
        <result column="user_id" property="userId"/>
        <result column="is_read" property="isRead"/>
        <result column="read_time" property="readTime"/>
        <result column="title" property="title"/>
        <result column="content" property="content"/>
        <result column="type" property="type"/>
        <result column="sender" property="sender"/>
        <result column="notice_time" property="noticeTime"/>
    </resultMap>

    <select id="selectInboxPage" resultMap="inboxMap">
        SELECT nu.id, nu.notice_id, nu.user_id, nu.is_read, nu.read_time,
               n.title, n.content, n.type, n.sender, n.create_time AS notice_time
        FROM sp_sys_notice_user nu
        INNER JOIN sp_sys_notice n ON n.id = nu.notice_id AND n.is_deleted != '1'
        WHERE nu.user_id = #{userId}
          AND nu.is_deleted != '1'
        <if test="req.isRead != null and req.isRead != ''">
          AND nu.is_read = #{req.isRead}
        </if>
        <if test="req.titleLike != null and req.titleLike != ''">
          AND n.title LIKE CONCAT('%', #{req.titleLike}, '%')
        </if>
        ORDER BY n.create_time DESC
    </select>
</mapper>
```

- [ ] **Step 5: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/entity/SysNotice.java \
        mes/src/main/java/com/wangziyang/mes/system/entity/SysNoticeUser.java \
        mes/src/main/java/com/wangziyang/mes/system/mapper/SysNoticeMapper.java \
        mes/src/main/java/com/wangziyang/mes/system/mapper/SysNoticeUserMapper.java \
        mes/src/main/resources/mapper/system/SysNoticeUserMapper.xml
git commit -m "✨ feat(notice): 后端通知实体+Mapper(主体表/收件箱表)"
```

---

## Task 3: 后端 DTO / Request / VO

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/dto/SysNoticeInboxDTO.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/dto/NoticePublishReq.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/request/SysNoticePageReq.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/request/SysNoticeInboxPageReq.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/vo/NoticeReadStatVO.java`

- [ ] **Step 1: SysNoticeInboxDTO（收件箱行 + 展开 notice 字段）**

```java
package com.wangziyang.mes.system.dto;

import java.time.LocalDateTime;

public class SysNoticeInboxDTO {
    private String id;            // 收件箱行 id
    private String noticeId;
    private String userId;
    private String isRead;
    private LocalDateTime readTime;
    private String title;
    private String content;
    private String type;
    private String sender;
    private LocalDateTime noticeTime;   // notice.create_time

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getNoticeId() { return noticeId; }
    public void setNoticeId(String noticeId) { this.noticeId = noticeId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getIsRead() { return isRead; }
    public void setIsRead(String isRead) { this.isRead = isRead; }
    public LocalDateTime getReadTime() { return readTime; }
    public void setReadTime(LocalDateTime readTime) { this.readTime = readTime; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public LocalDateTime getNoticeTime() { return noticeTime; }
    public void setNoticeTime(LocalDateTime noticeTime) { this.noticeTime = noticeTime; }
}
```

- [ ] **Step 2: NoticePublishReq（发布入参）**

```java
package com.wangziyang.mes.system.dto;

import java.util.List;

public class NoticePublishReq {
    private String title;
    private String content;
    private String type;          // info/success/warning/error
    private String targetType;    // all/user/role/dept
    private List<String> targetIds;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public List<String> getTargetIds() { return targetIds; }
    public void setTargetIds(List<String> targetIds) { this.targetIds = targetIds; }
}
```

- [ ] **Step 3: 两个分页 Request**

`SysNoticePageReq.java`：
```java
package com.wangziyang.mes.system.request;

import com.wangziyang.mes.common.BasePageReq;

public class SysNoticePageReq extends BasePageReq {
    private String titleLike;
    public String getTitleLike() { return titleLike; }
    public void setTitleLike(String titleLike) { this.titleLike = titleLike; }
}
```

`SysNoticeInboxPageReq.java`：
```java
package com.wangziyang.mes.system.request;

import com.wangziyang.mes.common.BasePageReq;

public class SysNoticeInboxPageReq extends BasePageReq {
    private String titleLike;
    private String isRead;   // 0/1，空=全部
    public String getTitleLike() { return titleLike; }
    public void setTitleLike(String titleLike) { this.titleLike = titleLike; }
    public String getIsRead() { return isRead; }
    public void setIsRead(String isRead) { this.isRead = isRead; }
}
```

- [ ] **Step 4: NoticeReadStatVO（已读统计）**

```java
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
```

- [ ] **Step 5: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/dto/SysNoticeInboxDTO.java \
        mes/src/main/java/com/wangziyang/mes/system/dto/NoticePublishReq.java \
        mes/src/main/java/com/wangziyang/mes/system/request/SysNoticePageReq.java \
        mes/src/main/java/com/wangziyang/mes/system/request/SysNoticeInboxPageReq.java \
        mes/src/main/java/com/wangziyang/mes/system/vo/NoticeReadStatVO.java
git commit -m "✨ feat(notice): 后端通知 DTO/Request/VO"
```

---

## Task 4: 后端 Service（含收件人解析）

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/ISysNoticeUserService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SysNoticeUserServiceImpl.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/ISysNoticeService.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/service/impl/SysNoticeServiceImpl.java`
- Test: `mes/src/test/java/com/wangziyang/mes/system/NoticeRecipientResolveTest.java`

> 设计要点：收件人解析（all/user/role/dept → 去重 userId 列表）抽成 `SysNoticeServiceImpl.resolveRecipientIds(...)`，对其写不依赖 DB 的单测（mock 三个数据源）。

- [ ] **Step 1: ISysNoticeUserService**

```java
package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.dto.SysNoticeInboxDTO;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.request.SysNoticeInboxPageReq;

public interface ISysNoticeUserService extends IService<SysNoticeUser> {
    IPage<SysNoticeInboxDTO> inboxPage(SysNoticeInboxPageReq req, String userId);
    long unreadCount(String userId);
    SysNoticeInboxDTO detailAndMarkRead(String inboxId, String userId);
    boolean markRead(String inboxId, String userId);
    boolean markAllRead(String userId);
    boolean removeForUser(String inboxId, String userId);
}
```

- [ ] **Step 2: SysNoticeUserServiceImpl**

```java
package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.dto.SysNoticeInboxDTO;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.mapper.SysNoticeUserMapper;
import com.wangziyang.mes.system.request.SysNoticeInboxPageReq;
import com.wangziyang.mes.system.service.ISysNoticeUserService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class SysNoticeUserServiceImpl
        extends ServiceImpl<SysNoticeUserMapper, SysNoticeUser>
        implements ISysNoticeUserService {

    @Override
    public IPage<SysNoticeInboxDTO> inboxPage(SysNoticeInboxPageReq req, String userId) {
        Page<SysNoticeInboxDTO> page = new Page<>(req.getCurrent(), req.getSize());
        return baseMapper.selectInboxPage(page, req, userId);
    }

    @Override
    public long unreadCount(String userId) {
        QueryWrapper<SysNoticeUser> qw = new QueryWrapper<>();
        qw.eq("user_id", userId).eq("is_read", "0").ne("is_deleted", "1");
        return this.count(qw);
    }

    @Override
    public SysNoticeInboxDTO detailAndMarkRead(String inboxId, String userId) {
        markRead(inboxId, userId);
        // 复用分页查询取单行：用 isRead=null + 在内存里筛 id 不经济，这里直接按 id 取收件箱行并联 notice。
        // 简化：用一次 inboxPage 大小 1 不可行(无 id 过滤)，故走 mapper 自带 selectById + 单查 notice。
        SysNoticeUser nu = this.getById(inboxId);
        if (nu == null || !userId.equals(nu.getUserId())) {
            throw new RuntimeException("通知不存在或无权访问");
        }
        // 取 notice 内容
        SysNoticeInboxDTO dto = new SysNoticeInboxDTO();
        dto.setId(nu.getId());
        dto.setNoticeId(nu.getNoticeId());
        dto.setUserId(nu.getUserId());
        dto.setIsRead("1");
        dto.setReadTime(nu.getReadTime());
        // notice 字段由 controller 注入(controller 持有 noticeService)，见 Task 6。
        return dto;
    }

    @Override
    public boolean markRead(String inboxId, String userId) {
        UpdateWrapper<SysNoticeUser> uw = new UpdateWrapper<>();
        uw.eq("id", inboxId).eq("user_id", userId).eq("is_read", "0")
          .set("is_read", "1").set("read_time", LocalDateTime.now());
        // update 影响 0 行(已是已读)也算成功——幂等
        this.update(uw);
        return true;
    }

    @Override
    public boolean markAllRead(String userId) {
        UpdateWrapper<SysNoticeUser> uw = new UpdateWrapper<>();
        uw.eq("user_id", userId).eq("is_read", "0").ne("is_deleted", "1")
          .set("is_read", "1").set("read_time", LocalDateTime.now());
        this.update(uw);
        return true;
    }

    @Override
    public boolean removeForUser(String inboxId, String userId) {
        UpdateWrapper<SysNoticeUser> uw = new UpdateWrapper<>();
        uw.eq("id", inboxId).eq("user_id", userId).set("is_deleted", "1");
        return this.update(uw);
    }
}
```

> 注：`detailAndMarkRead` 的 notice 内容拼装放在 Controller 层（Controller 同时注入 notice、noticeUser 两个 service），避免 service 互相循环依赖。

- [ ] **Step 3: ISysNoticeService**

```java
package com.wangziyang.mes.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.system.dto.NoticePublishReq;
import com.wangziyang.mes.system.entity.SysNotice;
import com.wangziyang.mes.system.vo.NoticeReadStatVO;

import java.util.List;

public interface ISysNoticeService extends IService<SysNotice> {
    /** 解析收件人为去重 userId 列表 */
    List<String> resolveRecipientIds(String targetType, List<String> targetIds);
    /** 发布：建主体 + 扇出收件箱，返回 noticeId */
    String publish(NoticePublishReq req, String sender);
    /** 软删通知 + 其收件箱行 */
    boolean deleteNotice(String noticeId);
    /** 某条通知已读统计 */
    NoticeReadStatVO readStat(String noticeId);
}
```

- [ ] **Step 4: SysNoticeServiceImpl（含 resolveRecipientIds 纯逻辑 + publish 事务）**

```java
package com.wangziyang.mes.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.system.dto.NoticePublishReq;
import com.wangziyang.mes.system.entity.SysNotice;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.entity.SysUserRole;
import com.wangziyang.mes.system.mapper.SysNoticeMapper;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import com.wangziyang.mes.system.mapper.SysUserRoleMapper;
import com.wangziyang.mes.system.service.ISysNoticeService;
import com.wangziyang.mes.system.service.ISysNoticeUserService;
import com.wangziyang.mes.system.vo.NoticeReadStatVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SysNoticeServiceImpl
        extends ServiceImpl<SysNoticeMapper, SysNotice>
        implements ISysNoticeService {

    @Autowired private SysUserMapper sysUserMapper;
    @Autowired private SysUserRoleMapper sysUserRoleMapper;
    @Autowired private ISysNoticeUserService noticeUserService;

    @Override
    public List<String> resolveRecipientIds(String targetType, List<String> targetIds) {
        Set<String> ids = new LinkedHashSet<>();
        String t = targetType == null ? "all" : targetType;
        switch (t) {
            case "all": {
                QueryWrapper<SysUser> qw = new QueryWrapper<>();
                qw.select("id").ne("is_deleted", "1");
                sysUserMapper.selectList(qw).forEach(u -> ids.add(u.getId()));
                break;
            }
            case "user": {
                if (!CollectionUtils.isEmpty(targetIds)) ids.addAll(targetIds);
                break;
            }
            case "role": {
                if (!CollectionUtils.isEmpty(targetIds)) {
                    QueryWrapper<SysUserRole> qw = new QueryWrapper<>();
                    qw.in("role_id", targetIds);
                    sysUserRoleMapper.selectList(qw).forEach(ur -> ids.add(ur.getUserId()));
                }
                break;
            }
            case "dept": {
                if (!CollectionUtils.isEmpty(targetIds)) {
                    QueryWrapper<SysUser> qw = new QueryWrapper<>();
                    qw.select("id").in("dept_id", targetIds).ne("is_deleted", "1");
                    sysUserMapper.selectList(qw).forEach(u -> ids.add(u.getId()));
                }
                break;
            }
            default: break;
        }
        return new ArrayList<>(ids);
    }

    private String buildTargetDesc(String targetType, int count) {
        switch (targetType == null ? "all" : targetType) {
            case "all":  return "全体用户";
            case "user": return "指定用户(" + count + "人)";
            case "role": return "指定角色(" + count + "人)";
            case "dept": return "指定部门(" + count + "人)";
            default:     return "";
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String publish(NoticePublishReq req, String sender) {
        if (!StringUtils.hasText(req.getTitle())) throw new RuntimeException("标题不能为空");
        List<String> recipients = resolveRecipientIds(req.getTargetType(), req.getTargetIds());
        if (recipients.isEmpty()) throw new RuntimeException("收件人为空，请检查推送目标");

        SysNotice notice = new SysNotice();
        notice.setTitle(req.getTitle());
        notice.setContent(req.getContent());
        notice.setType(StringUtils.hasText(req.getType()) ? req.getType() : "info");
        notice.setTargetType(StringUtils.hasText(req.getTargetType()) ? req.getTargetType() : "all");
        notice.setTargetIds(CollectionUtils.isEmpty(req.getTargetIds()) ? "" :
                req.getTargetIds().stream().collect(Collectors.joining(",")));
        notice.setTargetDesc(buildTargetDesc(req.getTargetType(), recipients.size()));
        notice.setSender(sender);
        notice.setStatus("1");
        notice.setRecipientCount(recipients.size());
        notice.setDeleted("0");
        this.save(notice);

        List<SysNoticeUser> inbox = new ArrayList<>();
        for (String uid : recipients) {
            SysNoticeUser nu = new SysNoticeUser();
            nu.setNoticeId(notice.getId());
            nu.setUserId(uid);
            nu.setIsRead("0");
            nu.setDeleted("0");
            inbox.add(nu);
        }
        noticeUserService.saveBatch(inbox);
        return notice.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteNotice(String noticeId) {
        UpdateWrapper<SysNotice> uw = new UpdateWrapper<>();
        uw.eq("id", noticeId).set("is_deleted", "1");
        this.update(uw);
        UpdateWrapper<SysNoticeUser> uw2 = new UpdateWrapper<>();
        uw2.eq("notice_id", noticeId).set("is_deleted", "1");
        ((SysNoticeUserServiceImpl) noticeUserService).update(uw2);
        return true;
    }

    @Override
    public NoticeReadStatVO readStat(String noticeId) {
        QueryWrapper<SysNoticeUser> total = new QueryWrapper<>();
        total.eq("notice_id", noticeId).ne("is_deleted", "1");
        QueryWrapper<SysNoticeUser> read = new QueryWrapper<>();
        read.eq("notice_id", noticeId).eq("is_read", "1").ne("is_deleted", "1");
        int t = (int) noticeUserService.count(total);
        int r = (int) noticeUserService.count(read);
        return new NoticeReadStatVO(t, r);
    }
}
```

- [ ] **Step 5: 写收件人解析单测（不依赖 DB，mock mapper）**

```java
package com.wangziyang.mes.system;

import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.system.entity.SysUserRole;
import com.wangziyang.mes.system.mapper.SysUserMapper;
import com.wangziyang.mes.system.mapper.SysUserRoleMapper;
import com.wangziyang.mes.system.service.impl.SysNoticeServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.Silent.class)
public class NoticeRecipientResolveTest {

    @Mock private SysUserMapper sysUserMapper;
    @Mock private SysUserRoleMapper sysUserRoleMapper;
    @InjectMocks private SysNoticeServiceImpl service;

    private SysUser user(String id) { SysUser u = new SysUser(); u.setId(id); return u; }
    private SysUserRole ur(String uid) { SysUserRole r = new SysUserRole(); r.setUserId(uid); return r; }

    @Test
    public void all_returnsAllUsers() {
        when(sysUserMapper.selectList(any())).thenReturn(Arrays.asList(user("1"), user("2")));
        List<String> ids = service.resolveRecipientIds("all", null);
        assertEquals(2, ids.size());
        assertTrue(ids.contains("1") && ids.contains("2"));
    }

    @Test
    public void user_returnsGivenIds() {
        List<String> ids = service.resolveRecipientIds("user", Arrays.asList("7", "8"));
        assertEquals(Arrays.asList("7", "8"), ids);
    }

    @Test
    public void role_dedupesUsersAcrossRoles() {
        when(sysUserRoleMapper.selectList(any()))
            .thenReturn(Arrays.asList(ur("1"), ur("2"), ur("1")));
        List<String> ids = service.resolveRecipientIds("role", Arrays.asList("r1", "r2"));
        assertEquals(2, ids.size());   // 去重后 1、2
    }

    @Test
    public void emptyTargetIds_returnsEmpty() {
        assertTrue(service.resolveRecipientIds("user", null).isEmpty());
    }
}
```

- [ ] **Step 6: 运行单测**

Run（系统 mvn + JDK11，见记忆 backend-build-mvnw-broken）：
```bash
cd mes && mvn -q test -Dtest=NoticeRecipientResolveTest
```
Expected: 4 tests pass。若项目缺 mockito-junit 依赖，则降级为「编译通过即可」并在 Task 5 统一验证，删除本测试文件前先确认 pom 是否含 `mockito-core`。

- [ ] **Step 7: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/service/ \
        mes/src/test/java/com/wangziyang/mes/system/NoticeRecipientResolveTest.java
git commit -m "✨ feat(notice): 后端通知 Service(收件人解析+发布扇出+已读统计)+单测"
```

---

## Task 5: 后端 Controller（发布端 + 接收端）

**Files:**
- Create: `mes/src/main/java/com/wangziyang/mes/system/controller/admin/SysNoticeController.java`
- Create: `mes/src/main/java/com/wangziyang/mes/system/controller/admin/SysNoticeInboxController.java`

- [ ] **Step 1: SysNoticeController（发布端）**

```java
package com.wangziyang.mes.system.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.system.dto.NoticePublishReq;
import com.wangziyang.mes.system.entity.SysNotice;
import com.wangziyang.mes.system.request.SysNoticePageReq;
import com.wangziyang.mes.system.service.ISysNoticeService;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller("adminSysNoticeController")
@RequestMapping("/admin/sys/notice")
public class SysNoticeController extends BaseController {

    @Autowired private ISysNoticeService noticeService;

    @PostMapping("/publish")
    @ResponseBody
    @RequiresPermissions("notice:publish")
    public Result publish(@RequestBody NoticePublishReq req) {
        String id = noticeService.publish(req, getSysUser().getUsername());
        return Result.success(id);
    }

    @PostMapping("/page")
    @ResponseBody
    @RequiresPermissions("notice:publish")
    public Result page(SysNoticePageReq req) {
        QueryWrapper<SysNotice> qw = new QueryWrapper<>();
        qw.ne("is_deleted", "1");
        if (req.getTitleLike() != null && !req.getTitleLike().isEmpty()) {
            qw.like("title", req.getTitleLike());
        }
        qw.orderByDesc("create_time");
        IPage result = noticeService.page(req, qw);
        return Result.success(result);
    }

    @GetMapping("/get-by-id")
    @ResponseBody
    @RequiresPermissions("notice:publish")
    public Result getById(String id) {
        return Result.success(noticeService.getById(id));
    }

    @GetMapping("/read-stat")
    @ResponseBody
    @RequiresPermissions("notice:publish")
    public Result readStat(String id) {
        return Result.success(noticeService.readStat(id));
    }

    @PostMapping("/delete")
    @ResponseBody
    @RequiresPermissions("notice:publish")
    public Result delete(@RequestParam String id) {
        noticeService.deleteNotice(id);
        return Result.success(id);
    }
}
```

> 注意：`/publish` 用 `@RequestBody`（JSON）——前端对应 API 须显式发 JSON（见 Task 7）。其余沿用 form-urlencoded。`@RequiresPermissions` 是 Shiro 注解；若项目未启用注解鉴权（核对 ShiroConfig），可去掉注解，仅靠前端 `v-permission` + 菜单控制（落地时确认，保持与现有 controller 一致——参考 SysDictController 是否带该注解）。

- [ ] **Step 2: SysNoticeInboxController（接收端）**

```java
package com.wangziyang.mes.system.controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.system.dto.SysNoticeInboxDTO;
import com.wangziyang.mes.system.entity.SysNotice;
import com.wangziyang.mes.system.entity.SysNoticeUser;
import com.wangziyang.mes.system.request.SysNoticeInboxPageReq;
import com.wangziyang.mes.system.service.ISysNoticeService;
import com.wangziyang.mes.system.service.ISysNoticeUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller("adminSysNoticeInboxController")
@RequestMapping("/admin/sys/notice/inbox")
public class SysNoticeInboxController extends BaseController {

    @Autowired private ISysNoticeUserService inboxService;
    @Autowired private ISysNoticeService noticeService;

    @PostMapping("/page")
    @ResponseBody
    public Result page(SysNoticeInboxPageReq req) {
        String uid = getSysUser().getId();
        return Result.success(inboxService.inboxPage(req, uid));
    }

    @GetMapping("/unread-count")
    @ResponseBody
    public Result unreadCount() {
        return Result.success(inboxService.unreadCount(getSysUser().getId()));
    }

    @GetMapping("/recent")
    @ResponseBody
    public Result recent(@RequestParam(defaultValue = "10") Integer size) {
        SysNoticeInboxPageReq req = new SysNoticeInboxPageReq();
        req.setCurrent(1);
        req.setSize(size);
        return Result.success(inboxService.inboxPage(req, getSysUser().getId()).getRecords());
    }

    @GetMapping("/detail")
    @ResponseBody
    public Result detail(@RequestParam String inboxId) {
        String uid = getSysUser().getId();
        SysNoticeUser nu = inboxService.getById(inboxId);
        if (nu == null || !uid.equals(nu.getUserId()) || "1".equals(nu.getDeleted())) {
            return Result.failure("通知不存在或无权访问");
        }
        inboxService.markRead(inboxId, uid);
        SysNotice notice = noticeService.getById(nu.getNoticeId());
        SysNoticeInboxDTO dto = new SysNoticeInboxDTO();
        dto.setId(nu.getId());
        dto.setNoticeId(nu.getNoticeId());
        dto.setUserId(uid);
        dto.setIsRead("1");
        dto.setReadTime(nu.getReadTime());
        if (notice != null) {
            dto.setTitle(notice.getTitle());
            dto.setContent(notice.getContent());
            dto.setType(notice.getType());
            dto.setSender(notice.getSender());
            dto.setNoticeTime(notice.getCreateTime());
        }
        return Result.success(dto);
    }

    @PostMapping("/mark-read")
    @ResponseBody
    public Result markRead(@RequestParam String inboxId) {
        inboxService.markRead(inboxId, getSysUser().getId());
        return Result.success(inboxId);
    }

    @PostMapping("/mark-all-read")
    @ResponseBody
    public Result markAllRead() {
        inboxService.markAllRead(getSysUser().getId());
        return Result.success();
    }

    @PostMapping("/delete")
    @ResponseBody
    public Result delete(@RequestParam String inboxId) {
        inboxService.removeForUser(inboxId, getSysUser().getId());
        return Result.success(inboxId);
    }
}
```

> 落地核对项：`SysNotice.getCreateTime()` 来自 BaseEntity（确认 getter 名）；`getSysUser().getId()` 确认 SysUser 主键 getter。`detailAndMarkRead`（Task 4 Step 2）实际未被 Controller 调用——可保留接口或删除，删除时同步去掉接口声明。

- [ ] **Step 3: 核对 Shiro 注解一致性**

Run：
```bash
grep -rl "RequiresPermissions" mes/src/main/java/com/wangziyang/mes/system/controller/admin/ | head
```
Expected: 若现有 controller 普遍不用该注解，则从 SysNoticeController 移除 `@RequiresPermissions` 行（保持一致，避免 Shiro 未配注解拦截器导致 500）。

- [ ] **Step 4: Commit**

```bash
git add mes/src/main/java/com/wangziyang/mes/system/controller/admin/SysNoticeController.java \
        mes/src/main/java/com/wangziyang/mes/system/controller/admin/SysNoticeInboxController.java
git commit -m "✨ feat(notice): 后端通知 Controller(发布端+接收端收件箱)"
```

---

## Task 6: 后端整体编译验证

**Files:** （无新文件，验证闸）

- [ ] **Step 1: 编译整个后端**

Run（系统 mvn + JDK11）：
```bash
cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q -DskipTests clean compile
```
Expected: BUILD SUCCESS，无编译错误。若报 getter/字段不匹配，按报错修正实体或 DTO 调用处。

- [ ] **Step 2: （可选）跑单测**

Run：
```bash
cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q test -Dtest=NoticeRecipientResolveTest
```
Expected: PASS；若依赖缺失无法运行，记录跳过原因，不阻塞。

- [ ] **Step 3: 编译通过后无需额外 commit（前序任务已提交）**

---

## Task 7: 前端类型 + API

**Files:**
- Modify: `mes/vue3/src/types/system.ts`（追加通知类型）
- Create: `mes/vue3/src/api/system/notice.ts`

- [ ] **Step 1: 追加类型到 types/system.ts 末尾**

```typescript
// ─── 通知中心 ───────────────────────────────────────────────────────────────

export type NoticeType = 'info' | 'success' | 'warning' | 'error'
export type NoticeTargetType = 'all' | 'user' | 'role' | 'dept'

/** 发布端：通知主体 */
export interface SysNotice {
  id: string
  title: string
  content?: string
  type: NoticeType
  targetType: NoticeTargetType
  targetIds?: string
  targetDesc?: string
  sender?: string
  status?: string
  recipientCount?: number
  createTime?: string
}

/** 接收端：收件箱行(含展开的通知字段) */
export interface SysNoticeInbox {
  id: string            // 收件箱行 id
  noticeId: string
  userId?: string
  isRead: string        // '0'/'1'
  readTime?: string
  title: string
  content?: string
  type: NoticeType
  sender?: string
  noticeTime?: string
}

export interface NoticePublishReq {
  title: string
  content?: string
  type: NoticeType
  targetType: NoticeTargetType
  targetIds?: string[]
}

export interface SysNoticePageReq extends PageReq {
  titleLike?: string
}

export interface SysNoticeInboxPageReq extends PageReq {
  titleLike?: string
  isRead?: string
}

export interface NoticeReadStat {
  total: number
  readCount: number
  unreadCount: number
}
```

> 核对：`types/system.ts` 顶部是否已有 `export type PageReq = PageParams`、`export type IPage<T> = ...`（Explore 报告确认有）。若 `SysNotice` 名已被占用则改名 `SysNoticeVO`，同步 api/页面引用。

- [ ] **Step 2: 写 api/system/notice.ts**

```typescript
import { http } from '@/api/request'
import type {
  SysNotice, SysNoticeInbox, SysNoticePageReq, SysNoticeInboxPageReq,
  NoticePublishReq, NoticeReadStat, IPage,
} from '@/types/system'

// ── 发布端 (notice:publish) ──────────────────────────────
/** 发布通知：后端 @RequestBody JSON，须显式 json=true 跳过 form 编码 */
export const noticePublish = (req: NoticePublishReq) =>
  http.post<string>('/admin/sys/notice/publish', req, true)
export const noticePage = (req: SysNoticePageReq) =>
  http.post<IPage<SysNotice>>('/admin/sys/notice/page', req)
export const noticeGetById = (id: string) =>
  http.get<SysNotice>('/admin/sys/notice/get-by-id', { id })
export const noticeReadStat = (id: string) =>
  http.get<NoticeReadStat>('/admin/sys/notice/read-stat', { id })
export const noticeDelete = (id: string) =>
  http.post<string>('/admin/sys/notice/delete', { id })

// ── 接收端 (收件箱) ──────────────────────────────────────
export const inboxPage = (req: SysNoticeInboxPageReq) =>
  http.post<IPage<SysNoticeInbox>>('/admin/sys/notice/inbox/page', req)
export const inboxUnreadCount = () =>
  http.get<number>('/admin/sys/notice/inbox/unread-count')
export const inboxRecent = (size = 10) =>
  http.get<SysNoticeInbox[]>('/admin/sys/notice/inbox/recent', { size })
export const inboxDetail = (inboxId: string) =>
  http.get<SysNoticeInbox>('/admin/sys/notice/inbox/detail', { inboxId })
export const inboxMarkRead = (inboxId: string) =>
  http.post<string>('/admin/sys/notice/inbox/mark-read', { inboxId })
export const inboxMarkAllRead = () =>
  http.post<void>('/admin/sys/notice/inbox/mark-all-read', {})
export const inboxDelete = (inboxId: string) =>
  http.post<string>('/admin/sys/notice/inbox/delete', { inboxId })
```

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/types/system.ts mes/vue3/src/api/system/notice.ts
git commit -m "✨ feat(vue3): 通知中心前端类型+API"
```

---

## Task 8: 前端 notice store + 铃铛组件

**Files:**
- Create: `mes/vue3/src/stores/notice.ts`
- Create: `mes/vue3/src/components/NoticeBell.vue`
- Modify: `mes/vue3/src/layouts/AdminLayout.vue`（Header 挂铃铛）

- [ ] **Step 1: 写 stores/notice.ts**

```typescript
import { defineStore } from 'pinia'
import { inboxUnreadCount } from '@/api/system/notice'

export const useNoticeStore = defineStore('notice', {
  state: () => ({
    unreadCount: 0 as number,
  }),
  actions: {
    async refresh() {
      try {
        this.unreadCount = (await inboxUnreadCount()) ?? 0
      } catch {
        // 静默：未登录/网络错误由拦截器处理
      }
    },
    reset() {
      this.unreadCount = 0
    },
  },
})
```

- [ ] **Step 2: 写 components/NoticeBell.vue**

```vue
<template>
  <el-popover placement="bottom-end" :width="340" trigger="click" @show="loadRecent">
    <template #reference>
      <el-badge :value="store.unreadCount" :hidden="store.unreadCount === 0" :max="99" class="notice-bell">
        <el-icon :size="20"><Bell /></el-icon>
      </el-badge>
    </template>

    <div class="notice-pop">
      <div class="notice-pop__head">
        <span>通知</span>
        <el-button v-if="store.unreadCount > 0" link type="primary" size="small" @click="handleMarkAll">
          全部已读
        </el-button>
      </div>
      <el-scrollbar max-height="320px">
        <el-empty v-if="recent.length === 0" description="暂无通知" :image-size="60" />
        <div
          v-for="it in recent"
          :key="it.id"
          class="notice-item"
          :class="{ 'notice-item--unread': it.isRead === '0' }"
          @click="openDetail(it)"
        >
          <span class="notice-item__dot" v-if="it.isRead === '0'" />
          <div class="notice-item__body">
            <div class="notice-item__title">
              <el-tag :type="tagType(it.type)" size="small" effect="light">{{ typeLabel(it.type) }}</el-tag>
              <span class="notice-item__text">{{ it.title }}</span>
            </div>
            <div class="notice-item__time">{{ formatTime(it.noticeTime) }}</div>
          </div>
        </div>
      </el-scrollbar>
      <div class="notice-pop__foot">
        <el-button link type="primary" size="small" @click="goCenter">查看全部</el-button>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useIntervalFn } from '@vueuse/core'
import { Bell } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useNoticeStore } from '@/stores/notice'
import { inboxRecent } from '@/api/system/notice'
import type { SysNoticeInbox, NoticeType } from '@/types/system'

const router = useRouter()
const store = useNoticeStore()
const recent = ref<SysNoticeInbox[]>([])

function tagType(t: NoticeType) {
  return ({ info: 'info', success: 'success', warning: 'warning', error: 'danger' } as const)[t] ?? 'info'
}
function typeLabel(t: NoticeType) {
  return ({ info: '通知', success: '成功', warning: '提醒', error: '警告' } as const)[t] ?? '通知'
}
function formatTime(t?: string) {
  return t ? dayjs(t).format('MM-DD HH:mm') : ''
}

async function loadRecent() {
  recent.value = (await inboxRecent(10)) ?? []
}
function openDetail(it: SysNoticeInbox) {
  router.push({ path: '/system/notice', query: { open: it.id } })
}
function goCenter() {
  router.push('/system/notice')
}
async function handleMarkAll() {
  const { inboxMarkAllRead } = await import('@/api/system/notice')
  await inboxMarkAllRead()
  await Promise.all([store.refresh(), loadRecent()])
}

// 30s 轮询未读数；组件挂载即拉一次
const { pause } = useIntervalFn(() => store.refresh(), 30000, { immediate: false })
onMounted(() => { store.refresh() })
onBeforeUnmount(() => pause())
</script>

<style scoped>
.notice-bell { cursor: pointer; display: flex; align-items: center; }
.notice-pop__head { display: flex; justify-content: space-between; align-items: center; padding: 4px 4px 8px; font-weight: 600; border-bottom: 1px solid var(--el-border-color-lighter); }
.notice-item { display: flex; gap: 8px; padding: 10px 4px; cursor: pointer; border-bottom: 1px solid var(--el-border-color-lighter); }
.notice-item:hover { background: var(--el-fill-color-light); }
.notice-item--unread .notice-item__text { font-weight: 600; }
.notice-item__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--el-color-danger); margin-top: 7px; flex: 0 0 auto; }
.notice-item__body { flex: 1; min-width: 0; }
.notice-item__title { display: flex; align-items: center; gap: 6px; }
.notice-item__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notice-item__time { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px; }
.notice-pop__foot { text-align: center; padding-top: 6px; }
</style>
```

> `useIntervalFn` 的 `pause` 用于卸载时停轮询；初始 `immediate:false` 因 onMounted 已手动拉一次。

- [ ] **Step 3: 在 AdminLayout Header 挂铃铛**

先定位 Header 用户下拉区域：
```bash
grep -n "el-dropdown\|header\|user" mes/vue3/src/layouts/AdminLayout.vue | head
```
在用户头像/下拉前插入 `<NoticeBell />`，并补 import：
```vue
// <script setup> 顶部 import
import NoticeBell from '@/components/NoticeBell.vue'
```
```vue
<!-- template：用户下拉左侧 -->
<NoticeBell />
```
（精确插入点按实际模板结构，保持与现有 Header 间距样式一致。）

- [ ] **Step 4: Commit**

```bash
git add mes/vue3/src/stores/notice.ts mes/vue3/src/components/NoticeBell.vue mes/vue3/src/layouts/AdminLayout.vue
git commit -m "✨ feat(vue3): 通知铃铛(未读角标+下拉最近)+notice store"
```

---

## Task 9: 前端通知中心页 + 详情

**Files:**
- Create: `mes/vue3/src/views/system/notice/NoticeInbox.vue`
- Create: `mes/vue3/src/views/system/notice/NoticeDetailDialog.vue`

- [ ] **Step 1: 写 NoticeDetailDialog.vue（详情弹窗）**

```vue
<template>
  <el-dialog
    :model-value="modelValue"
    :title="data?.title || '通知详情'"
    width="560px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div v-if="data" class="notice-detail">
      <div class="notice-detail__meta">
        <el-tag :type="tagType(data.type)" size="small" effect="light">{{ typeLabel(data.type) }}</el-tag>
        <span class="notice-detail__sender">发布人：{{ data.sender || '系统' }}</span>
        <span class="notice-detail__time">{{ formatTime(data.noticeTime) }}</span>
      </div>
      <div class="notice-detail__content">{{ data.content || '（无正文）' }}</div>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { SysNoticeInbox, NoticeType } from '@/types/system'

defineProps<{ modelValue: boolean; data: SysNoticeInbox | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

function tagType(t: NoticeType) {
  return ({ info: 'info', success: 'success', warning: 'warning', error: 'danger' } as const)[t] ?? 'info'
}
function typeLabel(t: NoticeType) {
  return ({ info: '通知', success: '成功', warning: '提醒', error: '警告' } as const)[t] ?? '通知'
}
function formatTime(t?: string) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : ''
}
</script>

<style scoped>
.notice-detail__meta { display: flex; align-items: center; gap: 12px; color: var(--el-text-color-secondary); font-size: 13px; margin-bottom: 14px; }
.notice-detail__content { white-space: pre-wrap; line-height: 1.7; color: var(--el-text-color-primary); }
</style>
```

- [ ] **Step 2: 写 NoticeInbox.vue（通知中心页）**

```vue
<template>
  <PageContainer>
    <SearchForm :model="search" @search="handleSearch" @reset="handleReset">
      <el-form-item label="标题">
        <el-input v-model="search.titleLike" placeholder="按标题搜索" clearable />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="search.isRead" placeholder="全部" clearable style="width: 120px">
          <el-option label="未读" value="0" />
          <el-option label="已读" value="1" />
        </el-select>
      </el-form-item>
    </SearchForm>

    <div class="inbox-toolbar">
      <el-button type="primary" :icon="Check" :disabled="store.unreadCount === 0" @click="handleMarkAll">
        全部已读
      </el-button>
    </div>

    <DataTable
      :data="rows"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      :action-width="140"
      @page-change="(p: number) => { pager.current = p; load() }"
      @size-change="(s: number) => { pager.size = s; pager.current = 1; load() }"
    >
      <template #col-title="{ row }">
        <span :class="{ 'inbox-unread': (row as SysNoticeInbox).isRead === '0' }">
          <span v-if="(row as SysNoticeInbox).isRead === '0'" class="inbox-dot" />
          {{ (row as SysNoticeInbox).title }}
        </span>
      </template>
      <template #col-type="{ row }">
        <el-tag :type="tagType((row as SysNoticeInbox).type)" size="small" effect="light">
          {{ typeLabel((row as SysNoticeInbox).type) }}
        </el-tag>
      </template>
      <template #col-isRead="{ row }">
        <el-tag :type="(row as SysNoticeInbox).isRead === '1' ? 'info' : 'danger'" size="small">
          {{ (row as SysNoticeInbox).isRead === '1' ? '已读' : '未读' }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openDetail(row as SysNoticeInbox)">查看</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SysNoticeInbox)">删除</el-button>
      </template>
    </DataTable>

    <NoticeDetailDialog v-model="detailVisible" :data="detailData" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import NoticeDetailDialog from './NoticeDetailDialog.vue'
import { useNoticeStore } from '@/stores/notice'
import {
  inboxPage, inboxDetail, inboxMarkAllRead, inboxDelete,
} from '@/api/system/notice'
import type { SysNoticeInbox, NoticeType } from '@/types/system'

const route = useRoute()
const store = useNoticeStore()

const columns = [
  { prop: 'title', label: '标题', minWidth: 240 },
  { prop: 'type', label: '类型', width: 90 },
  { prop: 'sender', label: '发布人', width: 120 },
  { prop: 'noticeTime', label: '时间', width: 160 },
  { prop: 'isRead', label: '状态', width: 90 },
]

const search = reactive({ titleLike: '', isRead: '' })
const pager = reactive({ current: 1, size: 10, total: 0 })
const rows = ref<SysNoticeInbox[]>([])
const loading = ref(false)

function tagType(t: NoticeType) {
  return ({ info: 'info', success: 'success', warning: 'warning', error: 'danger' } as const)[t] ?? 'info'
}
function typeLabel(t: NoticeType) {
  return ({ info: '通知', success: '成功', warning: '提醒', error: '警告' } as const)[t] ?? '通知'
}

async function load() {
  loading.value = true
  try {
    const res = await inboxPage({
      current: pager.current, size: pager.size,
      titleLike: search.titleLike || undefined,
      isRead: search.isRead || undefined,
    })
    rows.value = res.records
    pager.total = res.total
  } finally {
    loading.value = false
  }
}
function handleSearch() { pager.current = 1; load() }
function handleReset() { search.titleLike = ''; search.isRead = ''; pager.current = 1; load() }

const detailVisible = ref(false)
const detailData = ref<SysNoticeInbox | null>(null)
async function openDetail(row: SysNoticeInbox) {
  detailData.value = await inboxDetail(row.id)   // 后端自动标记已读
  detailVisible.value = true
  await Promise.all([load(), store.refresh()])   // 刷新列表状态 + 铃铛角标
}

async function handleMarkAll() {
  await inboxMarkAllRead()
  ElMessage.success('已全部标记为已读')
  await Promise.all([load(), store.refresh()])
}

async function handleDelete(row: SysNoticeInbox) {
  try {
    await ElMessageBox.confirm(`确认删除通知「${row.title}」?`, '提示',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
  } catch { return }
  await inboxDelete(row.id)
  ElMessage.success('删除成功')
  await Promise.all([load(), store.refresh()])
}

onMounted(async () => {
  await load()
  // 支持铃铛「点条目」跳转后自动打开详情：?open=<inboxId>
  const openId = route.query.open as string | undefined
  if (openId) {
    const found = rows.value.find((r) => r.id === openId)
    if (found) await openDetail(found)
  }
})
</script>

<style scoped>
.inbox-toolbar { margin-bottom: 12px; }
.inbox-unread { font-weight: 600; }
.inbox-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--el-color-danger); margin-right: 6px; vertical-align: middle; }
</style>
```

> 核对：`DataTable` 的自定义列插槽命名是否为 `#col-<prop>`（Explore 报告里 DictList 用 `#col-type`，确认一致）；`SearchForm` 的 `@search/@reset` 事件名一致。

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/views/system/notice/NoticeInbox.vue \
        mes/vue3/src/views/system/notice/NoticeDetailDialog.vue
git commit -m "✨ feat(vue3): 通知中心页(列表/筛选/详情/已读/删除)"
```

---

## Task 10: 前端通知发布页

**Files:**
- Create: `mes/vue3/src/views/system/notice/NoticePublish.vue`

> 依赖：用户/角色/部门下拉数据。复用现有 api：`api/system/user`、`api/system/role`、`api/system/dept`（Explore 报告确认 dept 有 `deptAll`）。落地时核对 user/role 是否有等价的全量拉取函数；若无，用 `xxxPage({current:1,size:9999})`。

- [ ] **Step 1: 写 NoticePublish.vue**

```vue
<template>
  <PageContainer>
    <div class="pub-toolbar">
      <el-button v-permission="'notice:publish'" type="primary" :icon="Plus" @click="openPublish">
        发布通知
      </el-button>
    </div>

    <DataTable
      :data="rows"
      :loading="loading"
      :columns="columns"
      :pager="pager"
      :action-width="160"
      @page-change="(p: number) => { pager.current = p; load() }"
      @size-change="(s: number) => { pager.size = s; pager.current = 1; load() }"
    >
      <template #col-type="{ row }">
        <el-tag :type="tagType((row as SysNotice).type)" size="small" effect="light">
          {{ typeLabel((row as SysNotice).type) }}
        </el-tag>
      </template>
      <template #actions="{ row }">
        <el-button type="primary" link size="small" @click="openStat(row as SysNotice)">已读统计</el-button>
        <el-button type="danger" link size="small" @click="handleDelete(row as SysNotice)">删除</el-button>
      </template>
    </DataTable>

    <!-- 发布表单 -->
    <el-dialog v-model="dialogVisible" title="发布通知" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" clearable />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="通知" value="info" />
            <el-option label="成功" value="success" />
            <el-option label="提醒" value="warning" />
            <el-option label="警告" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item label="正文" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="请输入正文" />
        </el-form-item>
        <el-form-item label="推送目标" prop="targetType">
          <el-radio-group v-model="form.targetType" @change="form.targetIds = []">
            <el-radio value="all">全员</el-radio>
            <el-radio value="user">指定用户</el-radio>
            <el-radio value="role">指定角色</el-radio>
            <el-radio value="dept">指定部门</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.targetType === 'user'" label="选择用户" prop="targetIds">
          <el-select v-model="form.targetIds" multiple filterable placeholder="选择用户" style="width: 100%">
            <el-option v-for="u in users" :key="u.id" :label="u.name || u.username" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.targetType === 'role'" label="选择角色" prop="targetIds">
          <el-select v-model="form.targetIds" multiple filterable placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.targetType === 'dept'" label="选择部门" prop="targetIds">
          <el-tree-select
            v-model="form.targetIds" :data="deptTree" multiple :render-after-expand="false"
            node-key="id" :props="{ label: 'name', children: 'children' }"
            placeholder="选择部门" style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">发布</el-button>
      </template>
    </el-dialog>

    <!-- 已读统计 -->
    <el-dialog v-model="statVisible" title="已读统计" width="360px">
      <el-descriptions :column="1" border v-if="stat">
        <el-descriptions-item label="收件人数">{{ stat.total }}</el-descriptions-item>
        <el-descriptions-item label="已读">{{ stat.readCount }}</el-descriptions-item>
        <el-descriptions-item label="未读">{{ stat.unreadCount }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import DataTable from '@/components/DataTable.vue'
import { useNoticeStore } from '@/stores/notice'
import { noticePage, noticePublish, noticeReadStat, noticeDelete } from '@/api/system/notice'
import { deptAll } from '@/api/system/dept'
import { userPage } from '@/api/system/user'
import { rolePage } from '@/api/system/role'
import { buildTree } from '@/utils/systemTree'
import type { SysNotice, NoticeType, NoticeReadStat, NoticeTargetType } from '@/types/system'

const store = useNoticeStore()

const columns = [
  { prop: 'title', label: '标题', minWidth: 220 },
  { prop: 'type', label: '类型', width: 90 },
  { prop: 'targetDesc', label: '推送目标', width: 140 },
  { prop: 'recipientCount', label: '收件人', width: 90 },
  { prop: 'sender', label: '发布人', width: 110 },
  { prop: 'createTime', label: '发布时间', width: 160 },
]

function tagType(t: NoticeType) {
  return ({ info: 'info', success: 'success', warning: 'warning', error: 'danger' } as const)[t] ?? 'info'
}
function typeLabel(t: NoticeType) {
  return ({ info: '通知', success: '成功', warning: '提醒', error: '警告' } as const)[t] ?? '通知'
}

const pager = reactive({ current: 1, size: 10, total: 0 })
const rows = ref<SysNotice[]>([])
const loading = ref(false)
async function load() {
  loading.value = true
  try {
    const res = await noticePage({ current: pager.current, size: pager.size })
    rows.value = res.records
    pager.total = res.total
  } finally {
    loading.value = false
  }
}

// 目标下拉数据
const users = ref<{ id: string; name?: string; username?: string }[]>([])
const roles = ref<{ id: string; name: string }[]>([])
const deptTree = ref<unknown[]>([])
async function loadTargets() {
  const [u, r, d] = await Promise.all([
    userPage({ current: 1, size: 9999 }),
    rolePage({ current: 1, size: 9999 }),
    deptAll(),
  ])
  users.value = u.records as never
  roles.value = r.records as never
  deptTree.value = buildTree(d.records as never)
}

// 发布表单
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive<{
  title: string; content: string; type: NoticeType; targetType: NoticeTargetType; targetIds: string[]
}>({ title: '', content: '', type: 'info', targetType: 'all', targetIds: [] })

const rules = computed<FormRules>(() => ({
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  targetIds: form.targetType === 'all'
    ? []
    : [{ type: 'array', required: true, min: 1, message: '请选择推送目标', trigger: 'change' }],
}))

function openPublish() {
  form.title = ''; form.content = ''; form.type = 'info'; form.targetType = 'all'; form.targetIds = []
  dialogVisible.value = true
}
async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    await noticePublish({
      title: form.title, content: form.content, type: form.type,
      targetType: form.targetType,
      targetIds: form.targetType === 'all' ? undefined : form.targetIds,
    })
    ElMessage.success('发布成功')
    dialogVisible.value = false
    await Promise.all([load(), store.refresh()])  // 管理员自己也可能是收件人
  } finally {
    submitting.value = false
  }
}

// 已读统计
const statVisible = ref(false)
const stat = ref<NoticeReadStat | null>(null)
async function openStat(row: SysNotice) {
  stat.value = await noticeReadStat(row.id)
  statVisible.value = true
}

async function handleDelete(row: SysNotice) {
  try {
    await ElMessageBox.confirm(`确认删除通知「${row.title}」?该操作会同时撤回所有收件箱。`, '提示',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
  } catch { return }
  await noticeDelete(row.id)
  ElMessage.success('删除成功')
  await load()
}

onMounted(() => { load(); loadTargets() })
</script>

<style scoped>
.pub-toolbar { margin-bottom: 12px; }
</style>
```

> 核对项：`api/system/user` 导出名是否为 `userPage`、`api/system/role` 是否为 `rolePage`（落地时 `grep "export const" mes/vue3/src/api/system/user.ts role.ts` 确认，按实际改）；`el-tree-select` 多选 + `node-key` 用法在当前 Element Plus 2.14 可用；`v-permission` 指令已全局注册（Explore 报告确认）。

- [ ] **Step 2: Commit**

```bash
git add mes/vue3/src/views/system/notice/NoticePublish.vue
git commit -m "✨ feat(vue3): 通知发布页(目标选择/发布/已读统计/删除)"
```

---

## Task 11: 前端路由注册

**Files:**
- Modify: `mes/vue3/src/router/index.ts`

- [ ] **Step 1: 在 AdminLayout children 内加两条路由**

定位现有 system 路由块：
```bash
grep -n "system/" mes/vue3/src/router/index.ts | head
```
在其中追加：
```typescript
{
  path: 'system/notice',
  name: 'system-notice',
  component: () => import('@/views/system/notice/NoticeInbox.vue'),
  meta: { title: '通知中心' },
},
{
  path: 'system/notice/admin',
  name: 'system-notice-admin',
  component: () => import('@/views/system/notice/NoticePublish.vue'),
  meta: { title: '通知发布', perm: 'notice:publish' },
},
```

> 核对：路由 path 是否需带前导 `/`（看现有 system 路由写法，与之保持一致）。菜单 url `/admin/sys/notice/list-ui` → 前端 path `system/notice`；`/admin/sys/notice/admin-ui` → `system/notice/admin`（侧栏 url→path 映射规则按现有 menuStore/flattenMenu 逻辑，落地核对去前缀/后缀的转换函数）。

- [ ] **Step 2: 类型检查**

Run：
```bash
cd mes/vue3 && pnpm exec vue-tsc --noEmit
```
Expected: 无类型错误（若报错按提示修正，常见为 DataTable 插槽 prop 类型、api 导出名不符）。

- [ ] **Step 3: Commit**

```bash
git add mes/vue3/src/router/index.ts
git commit -m "✨ feat(vue3): 注册通知中心/通知发布路由"
```

---

## Task 12: 前端构建验证

**Files:** （验证闸）

- [ ] **Step 1: 构建前端**

Run：
```bash
cd mes/vue3 && pnpm build
```
Expected: 构建成功，无 TS/打包错误。若失败按报错修正后重跑。

- [ ] **Step 2: 构建通过后无需 commit**

---

## Task 13: 端到端冒烟 + 收尾

**Files:** （验证 + 收尾）

- [ ] **Step 1: 启动后端**

Run（JDK11 + 系统 mvn，dev 已关验证码）：
```bash
cd mes && JAVA_HOME=$(/usr/libexec/java_home -v 11) mvn -q spring-boot:run
```
Expected: 应用启动在 9090，无启动异常（重点看 Mapper XML 解析、Bean 注入）。

- [ ] **Step 2: 启动前端 dev**

Run：
```bash
cd mes/vue3 && pnpm dev
```
Expected: dev server 起在 4200，代理 /api → 9090。

- [ ] **Step 3: 手动冒烟（浏览器）**

清单（admin/123 登录）：
1. 执行 Task 1 的 SQL（建表 + 菜单），重新登录使权限集含 `notice:publish`。
2. 侧栏可见「通知中心」「通知发布」两项。
3. 「通知发布」→ 发布一条「全员」通知 → 提示成功，列表出现该条，收件人数>0。
4. 顶部铃铛角标出现未读数（或 30s 内/刷新后出现）。
5. 「通知中心」列表显示该通知为未读（加粗+红点）。
6. 点「查看」打开详情 → 关闭后该行变「已读」，铃铛角标 -1。
7. 「通知发布」→「已读统计」显示 已读1/未读N。
8. 测一条「指定角色」通知，确认仅该角色用户收到。

- [ ] **Step 4: 更新记忆（项目周期）**

更新 `/Users/chengyiyang/.claude/projects/-Users-chengyiyang-Desktop-Projects-class-work-MES-FullStack/memory/` 下周期记忆，记录「通知中心（发布/接收/查看）已完成」。

- [ ] **Step 5: 用 /commit 收尾（若仍有未提交变更）**

```bash
git status   # 确认全部已提交
```

---

## 自检对照（spec 覆盖）

- 数据模型方案 A：Task 1（表）+ Task 2（实体）✅
- 收件人解析 all/user/role/dept + 去重：Task 4 `resolveRecipientIds` + 单测 ✅
- 发布扇出 + 事务：Task 4 `publish` ✅
- 发布端接口 publish/page/get-by-id/read-stat/delete：Task 5 ✅
- 接收端接口 page/unread-count/recent/detail(自动已读)/mark-read/mark-all-read/delete：Task 5 ✅
- 越权过滤（user_id=当前用户）：Task 5 各接收端接口 ✅
- 前端类型 + API：Task 7 ✅
- 铃铛（30s 轮询 + 下拉 + store）：Task 8 ✅
- 通知中心页（列表/筛选/详情/已读/删除/未读强调）：Task 9 ✅
- 发布页（目标选择器/发布/已读统计/删除）：Task 10 ✅
- 路由对齐菜单 url：Task 11 ✅
- 验证闸（编译/类型/build/冒烟）：Task 6/12/13 ✅
- 菜单 seed：Task 1 ✅
