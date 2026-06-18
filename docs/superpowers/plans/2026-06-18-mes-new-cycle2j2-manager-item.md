# 动态表数据维护(Layer 2)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/mes-new` 交付动态表「数据维护」主从单页(完整 CRUD),并把后端动态 SQL 改造为「表名/列名白名单 + 值参数化」彻底消除注入。

**Architecture:** 后端 `basedata/common` 的 service/mapper 重写:写入路径用 `LinkedHashMap` + MyBatis `foreach` 把列名(白名单 `${col}`)与值(参数化 `#{val}`)分离;表名经 `sp_table_manager` 白名单校验;`is_deleted` 缺省自动补。前端新建主从单页:左 `DataTable` 选表(`managerPage`)、右按字段元数据(`managerItems`)动态渲染数据表与受控表单,对接 `common/page|add-or-update|delete`。

**Tech Stack:** 后端 Java 8 + MyBatis-Plus + JUnit4/Mockito;前端 React + TS + `@ngify/http`(RxJS) + 自研 `useQuery$`/`useMutation$` + `@workspace/ui`(shadcn/Radix) + vitest。

---

## 关键约定(全任务通用)

- **后端单测命令**(mvnw 已坏,用 JDK11 + 系统 mvn):
  ```bash
  JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home \
    /opt/homebrew/bin/mvn -f /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/pom.xml \
    test -Dtest=TableNameDataServiceImplTest
  ```
- **前端命令**(在 `mes/frontend/apps/mes-new` 内):`pnpm check-types` / `pnpm lint` / `pnpm test` / `pnpm build`。
- **前端写端点默认 form 编码**(`http.post(url, body)`),Layer2 的 `common/*` 全走 form,**不要加 JSON_HEADERS**。
- **动态字段名来自用户配置 → 全 useState 受控,不用 react-hook-form**(撞 DOM 属性名会崩,见记忆 `rhf-field-name-dom-clobbering`)。
- **`invalidate` 入参是序列化 key 的 JSON 前缀字符串**,如 `'["basedata","common","page"'`(注意前导 `[`、引号、无尾 `]`)。
- 提交均用中文 emoji conventional commit(可用 `/commit`);本计划内给出等价 `git commit -m`。

## File Structure

**后端(改 4 + 新建 1):**
- `mes/src/main/java/com/wangziyang/mes/basedata/common/mapper/QueryTableNameDataMapper.java` — 改:`commonSave/commonUpdate(CommonDto)` → `commonInsert/commonUpdateById(@Param Map)`
- `mes/src/main/resources/mapper/basedata/common/QueryTableNameDataMapper.xml` — 改:insert/update 改 `foreach` 参数化
- `mes/src/main/java/com/wangziyang/mes/basedata/common/service/impl/TableNameDataServiceImpl.java` — 改:白名单 + 参数化 Map + is_deleted + 列名正则 + commonUpdate 加事务 + buildCol 修越界
- `mes/src/test/java/com/wangziyang/mes/basedata/common/service/TableNameDataServiceImplTest.java` — 新建:守卫单测
- (`TableNameDataController.java` 不改 — form 契约不变)

**前端(全新增):**
- `mes/frontend/apps/mes-new/src/api/basedata/managerItem.ts` — API:commonPage/commonAddOrUpdate/commonDelete + `DynamicRow` 类型
- `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/managerItemUtils.ts` — 纯逻辑
- `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/__tests__/managerItem.test.ts` — 纯逻辑单测
- `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/ManagerItemForm.tsx` — 动态受控表单
- `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/ManagerItemPage.tsx` — 主从单页
- `mes/frontend/apps/mes-new/src/router.tsx` — 改:加 `basedata/manager-item` 路由

---

## Task 1: 后端加固(Mapper 参数化 + Service 白名单 + 守卫单测)

**Files:**
- Test: `mes/src/test/java/com/wangziyang/mes/basedata/common/service/TableNameDataServiceImplTest.java` (create)
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/common/mapper/QueryTableNameDataMapper.java`
- Modify: `mes/src/main/resources/mapper/basedata/common/QueryTableNameDataMapper.xml`
- Modify: `mes/src/main/java/com/wangziyang/mes/basedata/common/service/impl/TableNameDataServiceImpl.java`

被测 `TableNameDataServiceImpl` 是 `implements TableNameDataService`(**不** extends ServiceImpl),依赖三个注入字段,单测用纯 `@Mock` + `@InjectMocks`(无需 `@Spy`),参照 `SpGanttServiceImplTest`/`SpInventoryServiceImplTest`。

- [ ] **Step 1: 写守卫单测(failing)**

创建 `mes/src/test/java/com/wangziyang/mes/basedata/common/service/TableNameDataServiceImplTest.java`:

```java
package com.wangziyang.mes.basedata.common.service;

import com.wangziyang.mes.basedata.common.mapper.QueryTableNameDataMapper;
import com.wangziyang.mes.basedata.common.service.impl.TableNameDataServiceImpl;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import com.wangziyang.mes.basedata.service.ISpTableManagerItemService;
import com.wangziyang.mes.basedata.service.ISpTableManagerService;
import com.wangziyang.mes.system.entity.SysUser;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.Silent.class)
public class TableNameDataServiceImplTest {

    @Mock
    private QueryTableNameDataMapper queryTableNameDataMapper;
    @Mock
    private ISpTableManagerItemService iSpTableManagerItemService;
    @Mock
    private ISpTableManagerService iSpTableManagerService;
    @InjectMocks
    private TableNameDataServiceImpl service;

    private SysUser user() {
        SysUser u = new SysUser();
        u.setUsername("tester");
        return u;
    }

    private SpTableManager manager(String id, String tableName, String isDeleted) {
        SpTableManager m = new SpTableManager();
        m.setId(id);
        m.setTableName(tableName);
        m.setIsDeleted(isDeleted);
        return m;
    }

    private SpTableManagerItem item(String field) {
        SpTableManagerItem it = new SpTableManagerItem();
        it.setField(field);
        it.setFieldDesc(field);
        it.setMustFill("0");
        return it;
    }

    // 白名单:未登记表(getById 返回 null)→ 抛异常,绝不写库
    @Test(expected = RuntimeException.class)
    public void save_rejects_unknown_table() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getParameter("jsTableName")).thenReturn("evil_table");
        when(req.getParameter("jsTableNameId")).thenReturn("nope");
        when(iSpTableManagerService.getById("nope")).thenReturn(null);
        try {
            service.commonSave(req, user());
        } finally {
            verify(queryTableNameDataMapper, never()).commonInsert(any(), any());
        }
    }

    // 白名单:tableName 与登记不符 → 抛异常
    @Test(expected = RuntimeException.class)
    public void save_rejects_mismatched_table_name() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getParameter("jsTableName")).thenReturn("sp_evil");
        when(req.getParameter("jsTableNameId")).thenReturn("t1");
        when(iSpTableManagerService.getById("t1")).thenReturn(manager("t1", "sp_bom", "0"));
        service.commonSave(req, user());
    }

    // 列名纵深防御:配置 field 含非法字符 → 抛异常
    @Test(expected = RuntimeException.class)
    public void save_rejects_unsafe_column_name() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getParameter("jsTableName")).thenReturn("sp_bom");
        when(req.getParameter("jsTableNameId")).thenReturn("t1");
        when(iSpTableManagerService.getById("t1")).thenReturn(manager("t1", "sp_bom", "0"));
        when(iSpTableManagerItemService.queryItemBytableNameId("t1"))
                .thenReturn(new ArrayList<>(Arrays.asList(item("evil; DROP"))));
        service.commonSave(req, user());
    }

    // 合法新增:值原样进 Map(参数化,不拼接)+ 系统列 + is_deleted='0'
    @Test
    @SuppressWarnings("rawtypes")
    public void save_builds_parameterized_data_with_system_cols() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getParameter("jsTableName")).thenReturn("sp_bom");
        when(req.getParameter("jsTableNameId")).thenReturn("t1");
        when(req.getParameter("materiel_desc")).thenReturn("螺丝'; DROP TABLE x;--");
        when(iSpTableManagerService.getById("t1")).thenReturn(manager("t1", "sp_bom", "0"));
        when(iSpTableManagerItemService.queryItemBytableNameId("t1"))
                .thenReturn(new ArrayList<>(Arrays.asList(item("materiel_desc"))));
        when(iSpTableManagerService.queryTableFieldByName(any()))
                .thenReturn(new ArrayList<>(Arrays.asList(item("materiel_desc"), item("is_deleted"))));

        service.commonSave(req, user());

        ArgumentCaptor<Map> cap = ArgumentCaptor.forClass(Map.class);
        verify(queryTableNameDataMapper).commonInsert(eq("sp_bom"), cap.capture());
        Map data = cap.getValue();
        assertEquals("螺丝'; DROP TABLE x;--", data.get("materiel_desc"));
        assertNotNull(data.get("id"));
        assertEquals("tester", data.get("create_username"));
        assertEquals("tester", data.get("update_username"));
        assertNotNull(data.get("create_time"));
        assertNotNull(data.get("update_time"));
        assertEquals("0", data.get("is_deleted"));
    }

    // is_deleted 列不存在 → 不补
    @Test
    @SuppressWarnings("rawtypes")
    public void save_skips_is_deleted_when_column_absent() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getParameter("jsTableName")).thenReturn("sp_plain");
        when(req.getParameter("jsTableNameId")).thenReturn("t2");
        when(req.getParameter("name")).thenReturn("x");
        when(iSpTableManagerService.getById("t2")).thenReturn(manager("t2", "sp_plain", "0"));
        when(iSpTableManagerItemService.queryItemBytableNameId("t2"))
                .thenReturn(new ArrayList<>(Arrays.asList(item("name"))));
        when(iSpTableManagerService.queryTableFieldByName(any()))
                .thenReturn(new ArrayList<>(Arrays.asList(item("name"))));

        service.commonSave(req, user());

        ArgumentCaptor<Map> cap = ArgumentCaptor.forClass(Map.class);
        verify(queryTableNameDataMapper).commonInsert(eq("sp_plain"), cap.capture());
        assertFalse(cap.getValue().containsKey("is_deleted"));
    }

    // 更新缺 id → 抛异常
    @Test(expected = RuntimeException.class)
    public void update_requires_id() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getParameter("jsTableName")).thenReturn("sp_bom");
        when(req.getParameter("jsTableNameId")).thenReturn("t1");
        when(req.getParameter("id")).thenReturn("");
        when(iSpTableManagerService.getById("t1")).thenReturn(manager("t1", "sp_bom", "0"));
        service.commonUpdate(req, user());
    }

    // 合法更新:data 含字段 + update_*,不含 id/create_*;调 commonUpdateById
    @Test
    @SuppressWarnings("rawtypes")
    public void update_builds_data_and_calls_update_by_id() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getParameter("jsTableName")).thenReturn("sp_bom");
        when(req.getParameter("jsTableNameId")).thenReturn("t1");
        when(req.getParameter("id")).thenReturn("row-9");
        when(req.getParameter("materiel_desc")).thenReturn("desc");
        when(iSpTableManagerService.getById("t1")).thenReturn(manager("t1", "sp_bom", "0"));
        when(iSpTableManagerItemService.queryItemBytableNameId("t1"))
                .thenReturn(new ArrayList<>(Arrays.asList(item("materiel_desc"))));

        service.commonUpdate(req, user());

        ArgumentCaptor<Map> cap = ArgumentCaptor.forClass(Map.class);
        verify(queryTableNameDataMapper).commonUpdateById(eq("sp_bom"), eq("row-9"), cap.capture());
        Map data = cap.getValue();
        assertEquals("desc", data.get("materiel_desc"));
        assertEquals("tester", data.get("update_username"));
        assertNotNull(data.get("update_time"));
        assertFalse(data.containsKey("id"));
        assertFalse(data.containsKey("create_username"));
    }
}
```

- [ ] **Step 2: 跑测试,确认失败(编译失败)**

Run:
```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home \
  /opt/homebrew/bin/mvn -f /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/pom.xml \
  test -Dtest=TableNameDataServiceImplTest
```
Expected: **编译错误** — `commonInsert`/`commonUpdateById` 方法不存在(尚未在 mapper 定义)。这就是预期的 red。

- [ ] **Step 3: 改 Mapper 接口**

把 `QueryTableNameDataMapper.java` 整体替换为(用 `@Param` Map 替换旧的 `commonSave`/`commonUpdate`):

```java
package com.wangziyang.mes.basedata.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangziyang.mes.basedata.common.dto.CommonDto;
import com.wangziyang.mes.basedata.common.request.QueryTableNameDataReq;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

public interface QueryTableNameDataMapper extends BaseMapper<SpTableManagerItem> {
    List<Map<String, String>> queryTableNameDataList(QueryTableNameDataReq req);

    List<Map<String, String>> queryTableNameById(CommonDto commonDto);

    void commonInsert(@Param("tableName") String tableName, @Param("data") Map<String, Object> data);

    void commonUpdateById(@Param("tableName") String tableName, @Param("id") String id, @Param("data") Map<String, Object> data);

    void commonDelete(CommonDto commonDto);
}
```

- [ ] **Step 4: 改 Mapper XML(参数化 insert/update)**

把 `QueryTableNameDataMapper.xml` 整体替换为:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.wangziyang.mes.basedata.common.mapper.QueryTableNameDataMapper">

    <!--基础数据通用分页查询(col 来自白名单+正则校验,tableName 经白名单)-->
    <select id="queryTableNameDataList" resultType="java.util.Map">
        SELECT id,${col} FROM ${tableName}
    </select>

    <!--按 id 查单行-->
    <select id="queryTableNameById" resultType="java.util.Map">
        SELECT id,${col} FROM ${tableName}
        <where>
            id=#{id}
        </where>
    </select>

    <!--新增:列名 ${col} 已白名单,值 #{val} 参数化-->
    <insert id="commonInsert">
        INSERT INTO ${tableName}
        (<foreach collection="data" index="col" item="val" separator=",">${col}</foreach>)
        VALUES
        (<foreach collection="data" index="col" item="val" separator=",">#{val}</foreach>)
    </insert>

    <!--更新:列名 ${col} 已白名单,值 #{val} 参数化-->
    <update id="commonUpdateById">
        UPDATE ${tableName}
        SET <foreach collection="data" index="col" item="val" separator=",">${col} = #{val}</foreach>
        WHERE id = #{id}
    </update>

    <delete id="commonDelete">
        delete from ${tableName}
        <where>
            id = #{id}
        </where>
    </delete>
</mapper>
```

- [ ] **Step 5: 重写 Service(白名单 + 参数化 + is_deleted + 列名正则 + 修事务/越界)**

把 `TableNameDataServiceImpl.java` 整体替换为:

```java
package com.wangziyang.mes.basedata.common.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.basedata.common.dto.CommonDto;
import com.wangziyang.mes.basedata.common.mapper.QueryTableNameDataMapper;
import com.wangziyang.mes.basedata.common.request.QueryTableNameDataReq;
import com.wangziyang.mes.basedata.common.service.TableNameDataService;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import com.wangziyang.mes.basedata.service.ISpTableManagerItemService;
import com.wangziyang.mes.basedata.service.ISpTableManagerService;
import com.wangziyang.mes.common.util.IdUtil;
import com.wangziyang.mes.system.entity.SysUser;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.servlet.http.HttpServletRequest;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class TableNameDataServiceImpl implements TableNameDataService {

    /** 合法列名:仅字母/数字/下划线(纵深防御,即便配置表被污染也不可注入) */
    private static final Pattern SAFE_COL = Pattern.compile("^[A-Za-z0-9_]+$");

    @Autowired
    public QueryTableNameDataMapper queryTableNameDataMapper;
    @Autowired
    public ISpTableManagerItemService iSpTableManagerItemService;
    @Autowired
    public ISpTableManagerService iSpTableManagerService;

    @Override
    public IPage<Map<String, String>> queryTableNameDataList(QueryTableNameDataReq page) throws Exception {
        assertTableWhitelisted(page.getTableName(), page.getTableNameId());
        page.setCol(buildCol(page.getTableNameId()));
        page.setRecords(queryTableNameDataMapper.queryTableNameDataList(page));
        return page;
    }

    @Override
    public List<Map<String, String>> queryTableNameById(CommonDto commonDto) throws Exception {
        assertTableWhitelisted(commonDto.getTableName(), commonDto.getTableNameId());
        commonDto.setCol(buildCol(commonDto.getTableNameId()));
        return queryTableNameDataMapper.queryTableNameById(commonDto);
    }

    @Override
    public String buildCol(String tableNameId) throws Exception {
        if (StringUtils.isEmpty(tableNameId)) {
            throw new Exception("表关联ID不能为空");
        }
        List<SpTableManagerItem> items = iSpTableManagerItemService.queryItemBytableNameId(tableNameId);
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("该表未配置任何字段");
        }
        StringBuilder col = new StringBuilder();
        for (SpTableManagerItem item : items) {
            assertSafeColumn(item.getField());
            col.append(item.getField()).append(",");
        }
        return col.substring(0, col.length() - 1);
    }

    @Override
    @Transactional
    public void commonDelete(CommonDto commonDto) throws Exception {
        assertTableWhitelisted(commonDto.getTableName(), commonDto.getTableNameId());
        queryTableNameDataMapper.commonDelete(commonDto);
    }

    @Override
    @Transactional
    public void commonSave(HttpServletRequest request, SysUser user) throws Exception {
        String jsTableName = request.getParameter("jsTableName");
        String jsTableNameId = request.getParameter("jsTableNameId");
        assertTableWhitelisted(jsTableName, jsTableNameId);

        List<SpTableManagerItem> items = iSpTableManagerItemService.queryItemBytableNameId(jsTableNameId);
        LinkedHashMap<String, Object> data = new LinkedHashMap<>();
        for (SpTableManagerItem item : items) {
            String field = item.getField();
            assertSafeColumn(field);
            String v = request.getParameter(field);
            data.put(field, v == null ? "" : v);
        }
        data.put("id", IdUtil.nextId());
        data.put("create_username", user.getUsername());
        data.put("create_time", new Date());
        data.put("update_username", user.getUsername());
        data.put("update_time", new Date());
        if (tableHasColumn(jsTableName, "is_deleted")) {
            data.putIfAbsent("is_deleted", "0");
        }
        queryTableNameDataMapper.commonInsert(jsTableName, data);
    }

    @Override
    @Transactional
    public void commonUpdate(HttpServletRequest request, SysUser user) throws Exception {
        String jsTableName = request.getParameter("jsTableName");
        String id = request.getParameter("id");
        String jsTableNameId = request.getParameter("jsTableNameId");
        assertTableWhitelisted(jsTableName, jsTableNameId);
        if (StringUtils.isEmpty(id)) {
            throw new RuntimeException("缺少主键 id");
        }
        List<SpTableManagerItem> items = iSpTableManagerItemService.queryItemBytableNameId(jsTableNameId);
        LinkedHashMap<String, Object> data = new LinkedHashMap<>();
        for (SpTableManagerItem item : items) {
            String field = item.getField();
            assertSafeColumn(field);
            String v = request.getParameter(field);
            data.put(field, v == null ? "" : v);
        }
        data.put("update_username", user.getUsername());
        data.put("update_time", new Date());
        queryTableNameDataMapper.commonUpdateById(jsTableName, id, data);
    }

    /** 表名白名单:必须是 sp_table_manager 已登记(is_deleted='0')且 tableName 与登记一致 */
    private void assertTableWhitelisted(String tableName, String tableNameId) throws Exception {
        if (StringUtils.isEmpty(tableName) || StringUtils.isEmpty(tableNameId)) {
            throw new RuntimeException("未选中表信息");
        }
        SpTableManager m = iSpTableManagerService.getById(tableNameId);
        if (m == null || !tableName.equals(m.getTableName()) || !"0".equals(m.getIsDeleted())) {
            throw new RuntimeException("非法的表标识");
        }
    }

    private void assertSafeColumn(String col) {
        if (col == null || !SAFE_COL.matcher(col).matches()) {
            throw new RuntimeException("非法列名: " + col);
        }
    }

    /** 探测物理表是否含某列(复用 queryTableFieldByName 查 information_schema;空/异常视为不含) */
    private boolean tableHasColumn(String tableName, String column) {
        try {
            SpTableManager req = new SpTableManager();
            req.setTableName(tableName);
            List<SpTableManagerItem> cols = iSpTableManagerService.queryTableFieldByName(req);
            for (SpTableManagerItem c : cols) {
                if (column.equalsIgnoreCase(c.getField())) {
                    return true;
                }
            }
        } catch (Exception ignore) {
            // queryTableFieldByName 空集合会抛异常,视为不含该列
        }
        return false;
    }
}
```

- [ ] **Step 6: 跑单测,确认全绿**

Run:
```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home \
  /opt/homebrew/bin/mvn -f /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/pom.xml \
  test -Dtest=TableNameDataServiceImplTest
```
Expected: `Tests run: 7, Failures: 0, Errors: 0` + `BUILD SUCCESS`。

- [ ] **Step 7: 编译全后端(确认无牵连破坏)**

Run:
```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home \
  /opt/homebrew/bin/mvn -f /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/pom.xml \
  -DskipTests compile
```
Expected: `BUILD SUCCESS`(确认无其它调用方引用已删的 `commonSave(CommonDto)`/`commonUpdate(CommonDto)` mapper 方法)。

- [ ] **Step 8: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/src/main/java/com/wangziyang/mes/basedata/common/mapper/QueryTableNameDataMapper.java \
        mes/src/main/resources/mapper/basedata/common/QueryTableNameDataMapper.xml \
        mes/src/main/java/com/wangziyang/mes/basedata/common/service/impl/TableNameDataServiceImpl.java \
        mes/src/test/java/com/wangziyang/mes/basedata/common/service/TableNameDataServiceImplTest.java
git commit -m "🔒️ fix(mes): 2j-2 动态表CRUD白名单+值参数化消除SQL注入(顺修commonUpdate事务/buildCol越界/is_deleted缺省, 守卫单测7绿)"
```

---

## Task 2: 前端纯逻辑 managerItemUtils + 单测

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/managerItemUtils.ts`
- Test: `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/__tests__/managerItem.test.ts`

- [ ] **Step 1: 写纯逻辑单测(failing)**

创建 `__tests__/managerItem.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildColumnMetas,
  emptyRow,
  validateRow,
  buildRowPayload,
} from '../managerItemUtils'
import type { SpTableManagerItem } from '@/types/manager'

const item = (field: string, fieldDesc = field, mustFill = '0'): SpTableManagerItem => ({
  field,
  fieldDesc,
  mustFill,
  sortNum: 1,
})

describe('buildColumnMetas', () => {
  it('保留顺序并映射 fieldDesc/required', () => {
    const metas = buildColumnMetas([item('a', '甲', '1'), item('b', '乙', '0')])
    expect(metas).toEqual([
      { field: 'a', fieldDesc: '甲', required: true },
      { field: 'b', fieldDesc: '乙', required: false },
    ])
  })
  it('fieldDesc 为空回退 field', () => {
    expect(buildColumnMetas([item('code', '')])[0].fieldDesc).toBe('code')
  })
  it('遗留 Y 视为必填', () => {
    expect(buildColumnMetas([item('a', '甲', 'Y')])[0].required).toBe(true)
  })
})

describe('emptyRow', () => {
  it('每个字段初始化为空串', () => {
    expect(emptyRow([item('a'), item('b')])).toEqual({ a: '', b: '' })
  })
})

describe('validateRow', () => {
  it('必填字段为空(含纯空白)→ 报错', () => {
    const r = validateRow([item('a', '甲', '1')], { a: '  ' })
    expect(r.ok).toBe(false)
    expect(r.errors).toContain('甲不能为空')
  })
  it('必填已填 + 非必填空 → ok', () => {
    const r = validateRow([item('a', '甲', '1'), item('b', '乙', '0')], { a: 'x', b: '' })
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })
})

describe('buildRowPayload', () => {
  it('新增:平铺 js* + 字段 trim,无 id', () => {
    const p = buildRowPayload('sp_bom', 't1', [item('materiel_desc')], { materiel_desc: '  螺丝  ' })
    expect(p).toEqual({ jsTableName: 'sp_bom', jsTableNameId: 't1', materiel_desc: '螺丝' })
    expect('id' in p).toBe(false)
  })
  it('编辑:带 id', () => {
    const p = buildRowPayload('sp_bom', 't1', [item('materiel_desc')], { materiel_desc: 'x' }, 'row-9')
    expect(p.id).toBe('row-9')
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm test`
Expected: FAIL — `Cannot find module '../managerItemUtils'`。

- [ ] **Step 3: 写 managerItemUtils 实现**

创建 `managerItemUtils.ts`:

```ts
import type { SpTableManagerItem } from '@/types/manager'
import { parseMustFill } from '../manager/managerFormUtils'

export interface ColumnMeta {
  field: string
  fieldDesc: string
  required: boolean
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** 由字段元数据构造表格列定义(顺序 = 后端返回顺序 = sortNum) */
export function buildColumnMetas(items: SpTableManagerItem[]): ColumnMeta[] {
  return items.map((it) => ({
    field: it.field,
    fieldDesc: it.fieldDesc || it.field,
    required: parseMustFill(it.mustFill),
  }))
}

/** 新建空行:每个配置字段初始化为空串 */
export function emptyRow(items: SpTableManagerItem[]): Record<string, string> {
  const row: Record<string, string> = {}
  for (const it of items) row[it.field] = ''
  return row
}

/** 必填校验:required 字段非空白 */
export function validateRow(
  items: SpTableManagerItem[],
  values: Record<string, string>,
): ValidationResult {
  const errors: string[] = []
  for (const it of items) {
    if (parseMustFill(it.mustFill) && !(values[it.field] ?? '').trim()) {
      errors.push(`${it.fieldDesc || it.field}不能为空`)
    }
  }
  return { ok: errors.length === 0, errors }
}

/** 装配 add-or-update 提交体(平铺 form):jsTableName/jsTableNameId/id?(编辑) + 各字段(trim) */
export function buildRowPayload(
  tableName: string,
  tableNameId: string,
  items: SpTableManagerItem[],
  values: Record<string, string>,
  id?: string,
): Record<string, string> {
  const payload: Record<string, string> = { jsTableName: tableName, jsTableNameId: tableNameId }
  for (const it of items) payload[it.field] = (values[it.field] ?? '').trim()
  if (id) payload.id = id
  return payload
}
```

- [ ] **Step 4: 跑测试,确认全绿**

Run: `pnpm test`
Expected: 新增 9 个用例(本文件)PASS,全套 test 仍全绿。

- [ ] **Step 5: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/basedata/manager-item/managerItemUtils.ts \
        mes/frontend/apps/mes-new/src/pages/basedata/manager-item/__tests__/managerItem.test.ts
git commit -m "✅ test(mes-new): 2j-2 动态表数据维护纯逻辑(列装配/空行/必填校验/payload平铺, 9例TDD)"
```

---

## Task 3: 前端 API managerItem.ts

**Files:**
- Create: `mes/frontend/apps/mes-new/src/api/basedata/managerItem.ts`

- [ ] **Step 1: 写 API 函数(form 编码,不加 JSON_HEADERS)**

创建 `managerItem.ts`:

```ts
import { http } from '@/http/client'
import type { PageParams, PageResult } from '@/types/api'

/** 动态表数据行:列名→值(含 id 主键) */
export type DynamicRow = Record<string, string>

export interface CommonPageParams extends PageParams {
  tableName: string
  tableNameId: string
}

/** 动态表数据分页(form 编码;后端 QueryTableNameDataReq) */
export function commonPage(params: CommonPageParams) {
  return http.post<PageResult<DynamicRow>>('/basedata/common/page', params)
}

/**
 * 新增/编辑动态行(form 编码;后端读原生 HttpServletRequest)。
 * body 平铺:jsTableName / jsTableNameId / id?(编辑) + 各字段名=值。
 */
export function commonAddOrUpdate(body: Record<string, string>) {
  return http.post<void>('/basedata/common/add-or-update', body)
}

/** 删除动态行(form 编码;后端 CommonDto:tableName + tableNameId + id,tableNameId 供白名单校验) */
export function commonDelete(params: { tableName: string; tableNameId: string; id: string }) {
  return http.post<void>('/basedata/common/delete', params)
}
```

- [ ] **Step 2: 类型检查通过**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm check-types`
Expected: 无错误(`tsc --noEmit` 通过)。

- [ ] **Step 3: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/api/basedata/managerItem.ts
git commit -m "✨ feat(mes-new): 2j-2 动态表数据 API(commonPage/addOrUpdate/delete, form编码对接basedata/common)"
```

---

## Task 4: 前端动态受控表单 ManagerItemForm

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/ManagerItemForm.tsx`

- [ ] **Step 1: 写 ManagerItemForm(全 useState 受控)**

创建 `ManagerItemForm.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Database } from 'lucide-react'
import { Input, toast } from '@workspace/ui'
import FormDialog, { FormSection } from '@/components/FormDialog'
import FormField from '@/components/FormField'
import { useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import type { SpTableManagerItem } from '@/types/manager'
import { commonAddOrUpdate, type DynamicRow } from '@/api/basedata/managerItem'
import { parseMustFill } from '../manager/managerFormUtils'
import { emptyRow, validateRow, buildRowPayload } from './managerItemUtils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableName: string
  tableNameId: string
  items: SpTableManagerItem[]
  /** 编辑时传被点行(含 id 与各列值);新增传 null */
  record?: DynamicRow | null
}

export default function ManagerItemForm({
  open,
  onOpenChange,
  tableName,
  tableNameId,
  items,
  record,
}: Props) {
  const isEdit = !!record
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<string[]>([])
  const { mutate, loading } = useMutation$((body: Record<string, string>) => commonAddOrUpdate(body))

  useEffect(() => {
    if (!open) return
    setErrors([])
    if (record) {
      const seed: Record<string, string> = {}
      for (const it of items) seed[it.field] = record[it.field] ?? ''
      setValues(seed)
    } else {
      setValues(emptyRow(items))
    }
  }, [open, record, items])

  const onSubmit = async () => {
    const result = validateRow(items, values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    try {
      await mutate(buildRowPayload(tableName, tableNameId, items, values, record?.id))
      toast.success(isEdit ? '修改成功' : '新增成功')
      invalidate('["basedata","common","page"')
      onOpenChange(false)
    } catch {
      /* 拦截器已 toast */
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑数据' : '新增数据'}
      description={`维护「${tableName}」的数据行`}
      icon={Database}
      onSubmit={onSubmit}
      submitting={loading}
      contentClassName="sm:max-w-2xl"
    >
      <FormSection title="字段">
        {errors.length > 0 && (
          <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {errors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {items.map((it) => (
            <FormField
              key={it.field}
              label={it.fieldDesc || it.field}
              htmlFor={`mi-${it.field}`}
              required={parseMustFill(it.mustFill)}
            >
              <Input
                id={`mi-${it.field}`}
                value={values[it.field] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [it.field]: e.target.value }))}
              />
            </FormField>
          ))}
        </div>
      </FormSection>
    </FormDialog>
  )
}
```

- [ ] **Step 2: 类型检查通过**

Run: `pnpm check-types`
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/basedata/manager-item/ManagerItemForm.tsx
git commit -m "✨ feat(mes-new): 2j-2 动态行受控表单ManagerItemForm(全useState规避RHF字段名DOM冲突, 按元数据渲染+必填校验)"
```

---

## Task 5: 前端主从页 ManagerItemPage

**Files:**
- Create: `mes/frontend/apps/mes-new/src/pages/basedata/manager-item/ManagerItemPage.tsx`

`ColumnDef` 的 import 路径以同目录黄金参考 `pages/basedata/manager/ManagerList.tsx` 顶部为准(本仓 `DataTable` 基于 TanStack Table,通常为 `import type { ColumnDef } from '@tanstack/react-table'`)。

- [ ] **Step 1: 写 ManagerItemPage(主从单页)**

创建 `ManagerItemPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DataTable,
  Input,
  Label,
  toast,
} from '@workspace/ui'
import PageContainer from '@/components/PageContainer'
import PermissionGuard from '@/components/PermissionGuard'
import MasterDetailLayout from '@/components/MasterDetailLayout'
import SearchForm from '@/components/SearchForm'
import { useQuery$, useMutation$ } from '@/http/hooks'
import { invalidate } from '@/http/queryCache'
import { managerPage, managerItems, type ManagerPageParams } from '@/api/basedata/manager'
import { commonPage, commonDelete, type DynamicRow } from '@/api/basedata/managerItem'
import type { SpTableManager } from '@/types/manager'
import { buildColumnMetas } from './managerItemUtils'
import ManagerItemForm from './ManagerItemForm'

const TABLE_PAGE_SIZE = 10
const DATA_PAGE_SIZE = 10

export default function ManagerItemPage() {
  // 左:表列表
  const [tableParams, setTableParams] = useState<ManagerPageParams>({ current: 1, size: TABLE_PAGE_SIZE })
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  // 选中表 + 右侧数据分页
  const [selected, setSelected] = useState<SpTableManager | null>(null)
  const [dataParams, setDataParams] = useState({ current: 1, size: DATA_PAGE_SIZE })
  // 表单 / 删除
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DynamicRow | null>(null)
  const [deleting, setDeleting] = useState<DynamicRow | null>(null)

  const { data: tableList, loading: tableLoading } = useQuery$(
    ['basedata', 'manager', 'page', tableParams],
    () => managerPage(tableParams),
  )
  const { data: itemsData, loading: metaLoading } = useQuery$(
    ['basedata', 'common', 'items', selected?.id],
    () => managerItems(selected!.id),
    { enabled: !!selected },
  )
  const columnMetas = useMemo(() => buildColumnMetas(itemsData ?? []), [itemsData])
  const { data: pageData, loading: dataLoading } = useQuery$(
    ['basedata', 'common', 'page', selected?.id, dataParams],
    () => commonPage({ tableName: selected!.tableName, tableNameId: selected!.id, ...dataParams }),
    { enabled: !!selected },
  )
  const { mutate: removeRow } = useMutation$(
    (p: { tableName: string; tableNameId: string; id: string }) => commonDelete(p),
  )

  const onSearch = () =>
    setTableParams({
      current: 1,
      size: TABLE_PAGE_SIZE,
      tableName: draftName || undefined,
      tableDesc: draftDesc || undefined,
    })
  const onReset = () => {
    setDraftName('')
    setDraftDesc('')
    setTableParams({ current: 1, size: TABLE_PAGE_SIZE })
  }

  const selectTable = (row: SpTableManager) => {
    setSelected(row)
    setDataParams({ current: 1, size: DATA_PAGE_SIZE })
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting || !selected) return
    try {
      await removeRow({ tableName: selected.tableName, tableNameId: selected.id, id: deleting.id })
      toast.success('删除成功')
      invalidate('["basedata","common","page"')
    } catch {
      /* 拦截器已 toast */
    } finally {
      setDeleting(null)
    }
  }

  const tableColumns: ColumnDef<SpTableManager>[] = [
    { accessorKey: 'tableName', header: '表名' },
    { accessorKey: 'tableDesc', header: '表描述' },
  ]

  const dataColumns = useMemo<ColumnDef<DynamicRow>[]>(() => {
    const metaCols: ColumnDef<DynamicRow>[] = columnMetas.map((c) => ({
      accessorKey: c.field,
      header: c.fieldDesc,
    }))
    return [
      ...metaCols,
      {
        id: '__actions__',
        header: '操作',
        cell: ({ row }) => (
          <PermissionGuard perm="manager:add">
            <div className="flex gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setEditing(row.original)
                  setFormOpen(true)
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </PermissionGuard>
        ),
      },
    ]
  }, [columnMetas])

  return (
    <PermissionGuard perm="manager:add">
      <PageContainer title="基础数据维护" description="选择左侧动态表,维护其数据行">
        <MasterDetailLayout
          master={
            <div className="space-y-3">
              <SearchForm onSearch={onSearch} onReset={onReset}>
                <div className="space-y-1.5">
                  <Label htmlFor="mi-s-name">表名</Label>
                  <Input
                    id="mi-s-name"
                    className="h-9 w-44"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mi-s-desc">表描述</Label>
                  <Input
                    id="mi-s-desc"
                    className="h-9 w-44"
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                  />
                </div>
              </SearchForm>
              <DataTable
                columns={tableColumns}
                data={tableList?.records ?? []}
                loading={tableLoading}
                loadingRowCount={TABLE_PAGE_SIZE}
                getRowId={(r) => r.id}
                onRowClick={(r) => selectTable(r)}
                rowClassName={(r) => (r.id === selected?.id ? 'bg-accent' : '')}
                pagination={{
                  mode: 'server',
                  pageIndex: (tableList?.current ?? tableParams.current) - 1,
                  pageSize: TABLE_PAGE_SIZE,
                  totalPages: tableList?.pages ?? 1,
                  totalRows: tableList?.total,
                  onPageChange: (idx) => setTableParams((p) => ({ ...p, current: idx + 1 })),
                }}
              />
            </div>
          }
          detail={
            !selected ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">请选择左侧的动态表以维护其数据</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {selected.tableDesc || selected.tableName} 数据
                  </div>
                  <PermissionGuard perm="manager:add">
                    <Button
                      size="sm"
                      onClick={openCreate}
                      disabled={metaLoading || columnMetas.length === 0}
                    >
                      <Plus className="size-4" />
                      新增
                    </Button>
                  </PermissionGuard>
                </div>
                <DataTable
                  columns={dataColumns}
                  data={pageData?.records ?? []}
                  loading={dataLoading}
                  loadingRowCount={DATA_PAGE_SIZE}
                  getRowId={(r) => r.id}
                  pagination={{
                    mode: 'server',
                    pageIndex: (pageData?.current ?? dataParams.current) - 1,
                    pageSize: DATA_PAGE_SIZE,
                    totalPages: pageData?.pages ?? 1,
                    totalRows: pageData?.total,
                    onPageChange: (idx) => setDataParams((p) => ({ ...p, current: idx + 1 })),
                  }}
                />
              </div>
            )
          }
        />

        {selected && (
          <ManagerItemForm
            open={formOpen}
            onOpenChange={setFormOpen}
            tableName={selected.tableName}
            tableNameId={selected.id}
            items={itemsData ?? []}
            record={editing}
          />
        )}

        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定删除这条数据吗?此操作为物理删除,不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </PermissionGuard>
  )
}
```

- [ ] **Step 2: 类型检查通过**

Run: `pnpm check-types`
Expected: 无错误。若 `ColumnDef` import 报错,对照 `ManagerList.tsx` 顶部的实际 import 路径修正。

- [ ] **Step 3: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/pages/basedata/manager-item/ManagerItemPage.tsx
git commit -m "✨ feat(mes-new): 2j-2 动态表数据维护主从页(左选表/右动态列数据表+服务端分页+增删改, 复用MasterDetailLayout)"
```

---

## Task 6: 路由接入

**Files:**
- Modify: `mes/frontend/apps/mes-new/src/router.tsx`

- [ ] **Step 1: 加 import(在 ManagerList import 之后)**

在 `router.tsx` 顶部 `import ManagerList from '@/pages/basedata/manager/ManagerList'` 这一行**之后**新增:

```tsx
import ManagerItemPage from '@/pages/basedata/manager-item/ManagerItemPage'
```

- [ ] **Step 2: 加路由项(在 basedata/manager 路由之后)**

在 `{ path: 'basedata/manager', element: <ManagerList /> },` 这一行**之后**新增:

```tsx
{ path: 'basedata/manager-item', element: <ManagerItemPage /> },
```

(path `basedata/manager-item` 与 `urlMap.ts:12` 现有映射 `/basedata/manager/item/list-ui → /basedata/manager-item` 对齐,零 urlMap 改动,菜单 106 即可点进。)

- [ ] **Step 3: 类型检查 + 构建**

Run: `cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new && pnpm check-types && pnpm build`
Expected: 均通过,产出 dist。

- [ ] **Step 4: Commit**

```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack
git add mes/frontend/apps/mes-new/src/router.tsx
git commit -m "✨ feat(mes-new): 2j-2 接入basedata/manager-item路由(对齐菜单106 urlMap, 零映射改动)"
```

---

## Task 7: 集成验证(前端全检 + 后端单测 + 端到端 curl 实测)

**Files:** 无改动(纯验证)。若验证暴露问题,回到对应 Task 修复。

- [ ] **Step 1: 前端四项全检**

Run:
```bash
cd /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/frontend/apps/mes-new
pnpm check-types && pnpm lint && pnpm test && pnpm build
```
Expected: `check-types` 0 错、`lint` 0 错、`test` 全绿(含本周期 +9 例)、`build` 成功。

- [ ] **Step 2: 后端单测 + 全量编译**

Run:
```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home \
  /opt/homebrew/bin/mvn -f /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/pom.xml \
  test -Dtest=TableNameDataServiceImplTest
```
Expected: `Tests run: 7, Failures: 0` + `BUILD SUCCESS`。

- [ ] **Step 3: 启动后端(dev,验证码关闭)**

后台启动(2k 已在 `application-dev.yml` 设 `mes.captcha.enabled=false`):
```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home \
  /opt/homebrew/bin/mvn -f /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/mes/pom.xml \
  spring-boot:run
```
等待日志出现 `Started SparchetypeApplication`(端口 9090)。需 MySQL 可达(dev 配置库)。

- [ ] **Step 4: 登录拿会话**

Run:
```bash
bash /Users/chengyiyang/Desktop/Projects/class-work/MES-FullStack/scripts/verify/login.sh
```
Expected: 输出含 `JSESSIONID` 的 cookie(凭据 admin/123)。后续 curl 用该 cookie(脚本通常写入 `/tmp/mes-cookie.txt`;若路径不同,按脚本实际输出调整下方 `-b` 参数)。

- [ ] **Step 5: 取 sp_bom 的 tableNameId**

Run:
```bash
curl -s -b /tmp/mes-cookie.txt -X POST http://localhost:9090/api/basedata/manager/page \
  -d 'current=1&size=10'
```
Expected: JSON 含 `sp_bom` 那条记录的 `id`(记为 `<TID>`,种子值 `1283020801696837633`)。

- [ ] **Step 6: ★ 验证分页是否真生效(spec §10 待核实项)**

Run(请求 size=2):
```bash
curl -s -b /tmp/mes-cookie.txt -X POST http://localhost:9090/api/basedata/common/page \
  -d 'tableName=sp_bom&tableNameId=<TID>&current=1&size=2'
```
Expected(分页生效):`data.records` 长度 = 2(不是全部 13 行),`data.total` = 13、`data.pages` = 7。

**若 `records` 返回了全部 13 行 / `total` 不是 13** → 分页未被 MyBatis-Plus 拦截。补救:在 `QueryTableNameDataMapper.xml` 为 `queryTableNameDataList` 显式补 count + LIMIT。最小补救做法 —— 在 service `queryTableNameDataList` 改为手动分页:
```java
// 补救方案(仅当 Step 6 实测分页未生效时启用):
// 1) 给 mapper 加: long queryTableNameDataCount(QueryTableNameDataReq req);
//    XML: <select id="queryTableNameDataCount" resultType="long">SELECT COUNT(*) FROM ${tableName}</select>
// 2) 给 queryTableNameDataList 的 XML 末尾加: LIMIT #{offset}, #{size}  (offset=(current-1)*size)
// 3) service 里 page.setTotal(count) + 传 offset/size。
```
若 Step 6 已生效则**跳过补救**,并在收尾把"分页经 PaginationInterceptor 自动生效"写回路线图(消除待核实项)。

- [ ] **Step 7: ★ 验证注入防护 + is_deleted 缺省(新增一条含注入字符串的数据)**

Run:
```bash
curl -s -b /tmp/mes-cookie.txt -X POST http://localhost:9090/api/basedata/common/add-or-update \
  --data-urlencode 'jsTableName=sp_bom' \
  --data-urlencode 'jsTableNameId=<TID>' \
  --data-urlencode "materiel_desc=注入测试'); DROP TABLE sp_bom;--"
```
Expected: `{"code":0,...,"msg":"操作成功"}`,且 `sp_bom` 表**未被删除**(下一步仍可查到数据)。证明值被参数化(注入字符串作为普通文本入库)、且 `is_deleted` 自动补 `0` 未因 NOT NULL 报错。

- [ ] **Step 8: 验证新增可查回 + 编辑 + 删除闭环**

Run(确认新增行出现,拿其 id):
```bash
curl -s -b /tmp/mes-cookie.txt -X POST http://localhost:9090/api/basedata/common/page \
  -d 'tableName=sp_bom&tableNameId=<TID>&current=1&size=100'
```
Expected: `records` 含刚插入的行(`materiel_desc` = 注入字符串原文),记其 `id` 为 `<RID>`。

Run(编辑):
```bash
curl -s -b /tmp/mes-cookie.txt -X POST http://localhost:9090/api/basedata/common/add-or-update \
  --data-urlencode 'jsTableName=sp_bom' --data-urlencode 'jsTableNameId=<TID>' \
  --data-urlencode 'id=<RID>' --data-urlencode 'materiel_desc=已编辑'
```
Expected: `code:0`;再查该行 `materiel_desc` = `已编辑`。

Run(删除,带 tableNameId 供白名单):
```bash
curl -s -b /tmp/mes-cookie.txt -X POST http://localhost:9090/api/basedata/common/delete \
  --data-urlencode 'tableName=sp_bom' --data-urlencode 'tableNameId=<TID>' --data-urlencode 'id=<RID>'
```
Expected: `code:0`;再查该行已消失。

- [ ] **Step 9: 验证白名单拒绝伪造表名**

Run:
```bash
curl -s -b /tmp/mes-cookie.txt -X POST http://localhost:9090/api/basedata/common/page \
  -d 'tableName=sys_user&tableNameId=<TID>&current=1&size=5'
```
Expected: `code:1` + msg「非法的表标识」(tableNameId 指向 sp_bom,tableName 传 sys_user,白名单校验 tableName 与登记不符 → 拒绝)。

- [ ] **Step 10: 停后端 + 浏览器人工抽查(可选但推荐)**

停掉 Step 3 的后端进程。`pnpm dev`(:4100)登录后点菜单「基础数据维护」→ 选 sp_bom → 右侧出现 `materiel_desc` 列数据 → 新增/编辑/删除一行闭环、分页可翻页。

- [ ] **Step 11: 验证结论落盘 + 收尾**

把验证证据(Step 6 分页是否生效、Step 7/9 注入与白名单结果)整理为一段;路线图记忆补「周期 2j-2 完成」并消除/确认「分页是否生效」待核实项。无需 commit(纯验证),如整理了验证文档再单独提交。

---

## Self-Review

**1. Spec 覆盖检查(逐条对照 spec §3 决策表与 §9 验收):**
- 完整 CRUD → Task 3(API)+ Task 4(新增/编辑表单)+ Task 5(删除/分页查)✓
- 白名单 + 值参数化 + is_deleted → Task 1(service/mapper/单测)✓
- 主从单页 MasterDetailLayout → Task 5 ✓
- 全文本框 → Task 4(统一 Input)✓
- 物理删 + 二次确认 → Task 5(AlertDialog)✓
- 路由 basedata/manager-item(零 urlMap 改动)→ Task 6 ✓
- 权限 manager:add(页面级 + 操作列)→ Task 5(PermissionGuard)✓
- 验收 §9 全部 → Task 7 Step 1–10 逐条覆盖 ✓
- §10 待核实「分页是否生效」→ Task 7 Step 6 实测 + 补救代码 ✓

**2. 占位符扫描:** 无 TBD/TODO;`<TID>`/`<RID>` 是 curl 运行期回填的真实值(非计划占位符),已说明来源。Step 6 补救为"条件触发但给出完整补救代码",非占位。

**3. 类型/命名一致性:**
- 后端:`commonInsert`/`commonUpdateById`(mapper 接口 Step3 ↔ XML Step4 ↔ service Step5 ↔ 单测 Step1 verify)四处一致;`assertTableWhitelisted`/`assertSafeColumn`/`tableHasColumn` 命名一致。
- 前端:`commonPage`/`commonAddOrUpdate`/`commonDelete`/`DynamicRow`(api Task3 ↔ form Task4 ↔ page Task5)一致;`buildColumnMetas`/`emptyRow`/`validateRow`/`buildRowPayload`(utils Task2 ↔ 测试 ↔ 调用方)一致;`invalidate('["basedata","common","page"')` 前缀在 Task4 提交后失效 ↔ Task5 commonPage 的 useQuery$ key `['basedata','common','page',...]` 匹配 ✓;`commonDelete` 三参(tableName/tableNameId/id)在 api ↔ page confirmDelete ↔ 后端 CommonDto 字段一致 ✓。
- 复用 `parseMustFill` from `../manager/managerFormUtils`(Task2 utils + Task4 form)路径一致 ✓。
