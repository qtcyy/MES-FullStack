package com.wangziyang.mes.basedata.common.service;

import com.wangziyang.mes.basedata.common.dto.CommonDto;
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

    // 白名单守卫:delete 收到未登记表 → 抛异常,绝不调 commonDelete
    @Test(expected = RuntimeException.class)
    public void delete_rejects_unknown_table() throws Exception {
        CommonDto dto = new CommonDto();
        dto.setTableName("evil_table");
        dto.setTableNameId("nope");
        dto.setId("x");
        when(iSpTableManagerService.getById("nope")).thenReturn(null);
        try {
            service.commonDelete(dto);
        } finally {
            verify(queryTableNameDataMapper, never()).commonDelete(any());
        }
    }
}
