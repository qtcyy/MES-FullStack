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
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class TableNameDataServiceImpl implements TableNameDataService {

    /** 合法列名:仅字母/数字/下划线(纵深防御,即便配置表被污染也不可注入) */
    private static final Pattern SAFE_COL = Pattern.compile("^[A-Za-z0-9_]+$");

    @Autowired
    private QueryTableNameDataMapper queryTableNameDataMapper;
    @Autowired
    private ISpTableManagerItemService iSpTableManagerItemService;
    @Autowired
    private ISpTableManagerService iSpTableManagerService;

    @Override
    public IPage<Map<String, String>> queryTableNameDataList(QueryTableNameDataReq page) throws Exception {
        String safe = assertTableWhitelisted(page.getTableName(), page.getTableNameId());
        page.setTableName(safe);
        page.setCol(buildCol(page.getTableNameId()));
        page.setRecords(queryTableNameDataMapper.queryTableNameDataList(page));
        return page;
    }

    @Override
    public List<Map<String, String>> queryTableNameById(CommonDto commonDto) throws Exception {
        String safe = assertTableWhitelisted(commonDto.getTableName(), commonDto.getTableNameId());
        commonDto.setTableName(safe);
        commonDto.setCol(buildCol(commonDto.getTableNameId()));
        return queryTableNameDataMapper.queryTableNameById(commonDto);
    }

    @Override
    public String buildCol(String tableNameId) throws Exception {
        if (StringUtils.isEmpty(tableNameId)) {
            throw new RuntimeException("表关联ID不能为空");
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
        String safe = assertTableWhitelisted(commonDto.getTableName(), commonDto.getTableNameId());
        commonDto.setTableName(safe);
        queryTableNameDataMapper.commonDelete(commonDto);
    }

    @Override
    @Transactional
    public void commonSave(HttpServletRequest request, SysUser user) throws Exception {
        String jsTableName = request.getParameter("jsTableName");
        String jsTableNameId = request.getParameter("jsTableNameId");
        String safe = assertTableWhitelisted(jsTableName, jsTableNameId);

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
        data.put("create_time", LocalDateTime.now());
        data.put("update_username", user.getUsername());
        data.put("update_time", LocalDateTime.now());
        if (tableHasColumn(safe, "is_deleted")) {
            data.putIfAbsent("is_deleted", "0");
        }
        queryTableNameDataMapper.commonInsert(safe, data);
    }

    @Override
    @Transactional
    public void commonUpdate(HttpServletRequest request, SysUser user) throws Exception {
        String jsTableName = request.getParameter("jsTableName");
        String id = request.getParameter("id");
        String jsTableNameId = request.getParameter("jsTableNameId");
        String safe = assertTableWhitelisted(jsTableName, jsTableNameId);
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
        data.put("update_time", LocalDateTime.now());
        queryTableNameDataMapper.commonUpdateById(safe, id, data);
    }

    /** 表名白名单:必须是 sp_table_manager 已登记(is_deleted='0')且 tableName 与登记一致;返回数据库登记的表名 */
    private String assertTableWhitelisted(String tableName, String tableNameId) throws Exception {
        if (StringUtils.isEmpty(tableName) || StringUtils.isEmpty(tableNameId)) {
            throw new RuntimeException("未选中表信息");
        }
        SpTableManager m = iSpTableManagerService.getById(tableNameId);
        if (m == null || !tableName.equals(m.getTableName()) || !"0".equals(m.getIsDeleted())) {
            throw new RuntimeException("非法的表标识");
        }
        return m.getTableName();
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
            if (cols == null || cols.isEmpty()) {
                return false;
            }
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
