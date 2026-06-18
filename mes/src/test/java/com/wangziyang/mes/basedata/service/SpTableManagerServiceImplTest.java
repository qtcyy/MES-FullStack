package com.wangziyang.mes.basedata.service;

import com.wangziyang.mes.basedata.dto.SpTableManagerDto;
import com.wangziyang.mes.basedata.entity.SpTableManager;
import com.wangziyang.mes.basedata.entity.SpTableManagerItem;
import com.wangziyang.mes.basedata.mapper.SpTableManagerMapper;
import com.wangziyang.mes.basedata.service.impl.SpTableManagerServiceImpl;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@RunWith(MockitoJUnitRunner.Silent.class)
public class SpTableManagerServiceImplTest {

    @Mock
    private SpTableManagerMapper baseMapper; // 注入 ServiceImpl.baseMapper / spTableManagerMapper

    @Mock
    private ISpTableManagerItemService iSpTableManagerItemService; // 注入 impl 的 itemService 字段

    @Spy
    @InjectMocks
    private SpTableManagerServiceImpl service;

    private SpTableManagerItem item(String id, String field) {
        SpTableManagerItem it = new SpTableManagerItem();
        it.setId(id);
        it.setField(field);
        it.setFieldDesc(field + "-desc");
        it.setMustFill("1");
        it.setSortNum(1);
        return it;
    }

    private SpTableManagerDto dto(String headerId, List<SpTableManagerItem> items) {
        SpTableManagerDto d = new SpTableManagerDto();
        d.setId(headerId);
        d.setTableName("product");
        d.setTableDesc("产品表");
        d.setSpTableManagerItems(items);
        return d;
    }

    @Test(expected = RuntimeException.class)
    public void empty_items_throws() {
        service.saveOrUpdateWithItems(dto(null, new ArrayList<SpTableManagerItem>()));
    }

    @Test
    public void create_normalizes_items_returns_generated_id_without_delete() {
        // 模拟保存表头时由持久层生成 id
        doAnswer(inv -> {
            ((SpTableManager) inv.getArgument(0)).setId("gen-1");
            return true;
        }).when(service).saveOrUpdate(any(SpTableManager.class));

        List<SpTableManagerItem> items = new ArrayList<>(Arrays.asList(item("stale-1", "a"), item(null, "b")));
        String id = service.saveOrUpdateWithItems(dto(null, items));

        assertEquals("gen-1", id);
        verify(iSpTableManagerItemService, never()).deleteItemBytableNameId(any());
        verify(iSpTableManagerItemService).saveOrUpdateBatch(anyList());
        for (SpTableManagerItem it : items) {
            assertNull(it.getId());                        // 旧 id 被清空,强制插入
            assertEquals("gen-1", it.getTableNameId());    // 明细挂到表头 id
        }
    }

    @Test
    public void update_deletes_old_items_first_and_returns_id() {
        doAnswer(inv -> {
            ((SpTableManager) inv.getArgument(0)).setId("mgr-9");
            return true;
        }).when(service).saveOrUpdate(any(SpTableManager.class));

        List<SpTableManagerItem> items = new ArrayList<>(Arrays.asList(item(null, "x")));
        String id = service.saveOrUpdateWithItems(dto("mgr-9", items));

        assertEquals("mgr-9", id);
        verify(iSpTableManagerItemService).deleteItemBytableNameId("mgr-9");
        verify(iSpTableManagerItemService).saveOrUpdateBatch(anyList());
        assertEquals("mgr-9", items.get(0).getTableNameId());
    }

    @Test
    public void removeWithItems_deletes_header_then_items_in_order() {
        doReturn(true).when(service).removeById("mgr-7");

        service.removeWithItems("mgr-7");

        InOrder order = inOrder(service, iSpTableManagerItemService);
        order.verify(service).removeById("mgr-7");
        order.verify(iSpTableManagerItemService).deleteItemBytableNameId("mgr-7");
    }
}
