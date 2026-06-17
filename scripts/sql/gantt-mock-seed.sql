-- 周期2g 生产甘特图 mock 数据(幂等: MK- 前缀清理 + 现有订单 UPDATE)
-- 前置: gantt-migration.sql 已执行(oper_id/progress 列存在)。今天=2026-06-17。

-- 0. 已知 ID
SET @t_g2  := '2063224132044075009';              -- 生产组2
SET @t_b1  := '48ad7f4a619b11f1aebc664b457a9374'; -- 生产作业班组1
SET @u_sp  := '1184009088826392578';  -- 宋鹏
SET @u_hz  := '1184010472443396098';  -- 猴子
SET @u_xm  := '1276512902757724162';  -- 小明
SET @u_cm  := '1266201180838801409';  -- cassman
SET @op_zp := '1336864489340960';  -- 装配工序
SET @op_cs := '1336864537575456';  -- 测试工序
SET @op_bz := '1336864575324192';  -- 包装工序
SET @op_jc := '1336864613072928';  -- 集成测试工序
SET @op_hj := '1336868360683552';  -- 焊接
SET @op_fj := '1336868452958240';  -- 封胶工序
SET @op_qx := '1336868562010144';  -- 清洗工序
SET @op_js := '1336868507484192';  -- 加酸工序
SET @op_rk := '1337248255574048';  -- 入库工序

-- 1. 清理旧 mock(幂等)
DELETE FROM sp_order_dispatch WHERE id LIKE 'MK-%';
DELETE FROM sp_team_user WHERE id LIKE 'MK-%';
DELETE FROM sp_order WHERE id LIKE 'MK-%';

-- 2. 班组成员: 生产作业班组1 补 小明/cassman
--    用 WHERE NOT EXISTS 守卫 UNIQUE KEY(team_id,user_id): 若该成员已由 UI 等以非 MK- 行存在则跳过,避免重跑撞唯一键。
INSERT INTO sp_team_user (id, team_id, user_id, create_time, create_username, update_time, update_username)
SELECT 'MK-TU-B1-XM', @t_b1, @u_xm, '2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_team_user WHERE team_id=@t_b1 AND user_id=@u_xm);
INSERT INTO sp_team_user (id, team_id, user_id, create_time, create_username, update_time, update_username)
SELECT 'MK-TU-B1-CM', @t_b1, @u_cm, '2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_team_user WHERE team_id=@t_b1 AND user_id=@u_cm);

-- 3. 现有 2 单: 先幂等兜底创建(clean DB / 队友环境无此 2 单时), 再 UPDATE 归一化字段。
--    order_code 非唯一键, 故用 WHERE NOT EXISTS 防重; 现有 DB 已有真实 ID 行时则跳过 INSERT 仅 UPDATE。
INSERT INTO sp_order
 (id, order_code, order_description, qty, order_type, flow_id, materiel, materiel_desc,
  plan_start_time, plan_end_time, statue, create_time, create_username, update_time, update_username)
SELECT 'MK-ORD-01','GD2024061001','CPU主板量产工单',100,'P','','MAT001','CPU主板','2026-06-10','2026-06-19',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_order WHERE order_code='GD2024061001');
INSERT INTO sp_order
 (id, order_code, order_description, qty, order_type, flow_id, materiel, materiel_desc,
  plan_start_time, plan_end_time, statue, create_time, create_username, update_time, update_username)
SELECT 'MK-ORD-02','GD2024061002','电源模块量产工单',100,'P','','MAT002','电源模块','2026-06-10','2026-06-16',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'
WHERE NOT EXISTS (SELECT 1 FROM sp_order WHERE order_code='GD2024061002');

-- 现有 2 单 UPDATE(计划窗口/状态/物料描述)
UPDATE sp_order SET plan_start_time='2026-06-10', plan_end_time='2026-06-19', statue=2,
  materiel_desc='CPU主板', order_description='CPU主板量产工单' WHERE order_code='GD2024061001';
UPDATE sp_order SET plan_start_time='2026-06-10', plan_end_time='2026-06-16', statue=2,
  materiel_desc='电源模块', order_description='电源模块量产工单' WHERE order_code='GD2024061002';
SET @o1 := (SELECT id FROM sp_order WHERE order_code='GD2024061001' LIMIT 1);
SET @o2 := (SELECT id FROM sp_order WHERE order_code='GD2024061002' LIMIT 1);

-- 4. 新增 5 单
INSERT INTO sp_order
 (id, order_code, order_description, qty, order_type, flow_id, materiel, materiel_desc,
  plan_start_time, plan_end_time, statue, create_time, create_username, update_time, update_username) VALUES
 ('MK-ORD-03','GD2024061003','控制板量产工单',80,'P','','MAT003','控制板','2026-06-11','2026-06-19',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-ORD-04','GD2024061004','外壳验证工单',120,'A','','MAT004','外壳','2026-06-18','2026-06-24',1,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-ORD-05','GD2024061005','显示屏量产工单',200,'P','','MAT005','显示屏','2026-06-09','2026-06-13',3,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-ORD-06','GD2024061006','线束量产工单',60,'P','','MAT006','线束','2026-06-14','2026-06-22',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-ORD-07','GD2024061007','主板组件返工工单',150,'F','','MAT007','主板组件','2026-06-10','2026-06-20',2,'2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin');

-- 5. 工序级派工任务 19 条(列: id,order_id,oper_id,team_id,user_id,labor_hours,dispatch_status,progress,
--    plan_start_time,plan_end_time,actual_start_time,actual_end_time,remark,审计4列)
INSERT INTO sp_order_dispatch
 (id, order_id, oper_id, team_id, user_id, labor_hours, dispatch_status, progress,
  plan_start_time, plan_end_time, actual_start_time, actual_end_time, remark,
  create_time, create_username, update_time, update_username) VALUES
 -- GD01 生产组2/宋鹏
 ('MK-DSP-0101', @o1, @op_zp, @t_g2, @u_sp, 16, 3, 100, '2026-06-10','2026-06-12','2026-06-10','2026-06-13','延期1天完成','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin'),
 ('MK-DSP-0102', @o1, @op_cs, @t_g2, @u_sp, 16, 2, 60,  '2026-06-15','2026-06-18','2026-06-15',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 ('MK-DSP-0103', @o1, @op_bz, @t_g2, @u_sp, 8,  1, 0,   '2026-06-18','2026-06-19',NULL,NULL,'待开工','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 -- GD02 生产组2/猴子
 ('MK-DSP-0201', @o2, @op_hj, @t_g2, @u_hz, 24, 3, 100, '2026-06-10','2026-06-14','2026-06-11','2026-06-15','','2026-06-09 09:00:00','admin','2026-06-15 17:00:00','admin'),
 ('MK-DSP-0202', @o2, @op_rk, @t_g2, @u_hz, 8,  2, 40,  '2026-06-15','2026-06-16','2026-06-16',NULL,'逾期未完成','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 -- GD03 班组1/小明+cassman
 ('MK-DSP-0301','MK-ORD-03', @op_zp, @t_b1, @u_xm, 16, 3, 100, '2026-06-11','2026-06-13','2026-06-11','2026-06-13','','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin'),
 ('MK-DSP-0302','MK-ORD-03', @op_jc, @t_b1, @u_xm, 24, 2, 70,  '2026-06-14','2026-06-18','2026-06-15',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 ('MK-DSP-0303','MK-ORD-03', @op_bz, @t_b1, @u_cm, 8,  2, 50,  '2026-06-13','2026-06-15','2026-06-13',NULL,'逾期','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 -- GD04 班组1/cassman(未来未开工)
 ('MK-DSP-0401','MK-ORD-04', @op_hj, @t_b1, @u_cm, 24, 1, 0, '2026-06-18','2026-06-21',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 ('MK-DSP-0402','MK-ORD-04', @op_fj, @t_b1, @u_cm, 16, 1, 0, '2026-06-21','2026-06-24',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 -- GD05 生产组2(全部完工)
 ('MK-DSP-0501','MK-ORD-05', @op_zp, @t_g2, @u_sp, 16, 3, 100, '2026-06-09','2026-06-11','2026-06-09','2026-06-11','','2026-06-09 09:00:00','admin','2026-06-11 17:00:00','admin'),
 ('MK-DSP-0502','MK-ORD-05', @op_cs, @t_g2, @u_hz, 16, 3, 100, '2026-06-11','2026-06-13','2026-06-11','2026-06-13','','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin'),
 ('MK-DSP-0503','MK-ORD-05', @op_jc, @t_g2, @u_sp, 8,  3, 100, '2026-06-12','2026-06-13','2026-06-12','2026-06-13','','2026-06-09 09:00:00','admin','2026-06-13 17:00:00','admin'),
 -- GD06 班组1/小明 + 生产组2/猴子
 ('MK-DSP-0601','MK-ORD-06', @op_qx, @t_b1, @u_xm, 16, 3, 100, '2026-06-14','2026-06-16','2026-06-14','2026-06-16','','2026-06-09 09:00:00','admin','2026-06-16 17:00:00','admin'),
 ('MK-DSP-0602','MK-ORD-06', @op_js, @t_b1, @u_xm, 24, 2, 20,  '2026-06-16','2026-06-19','2026-06-17',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 ('MK-DSP-0603','MK-ORD-06', @op_rk, @t_g2, @u_hz, 8,  1, 0,   '2026-06-19','2026-06-22',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin'),
 -- GD07 生产组2/宋鹏 + 班组1/cassman
 ('MK-DSP-0701','MK-ORD-07', @op_zp, @t_g2, @u_sp, 24, 3, 100, '2026-06-10','2026-06-13','2026-06-12','2026-06-15','延期','2026-06-09 09:00:00','admin','2026-06-15 17:00:00','admin'),
 ('MK-DSP-0702','MK-ORD-07', @op_hj, @t_b1, @u_cm, 24, 2, 55,  '2026-06-15','2026-06-18','2026-06-16',NULL,'进行中','2026-06-09 09:00:00','admin','2026-06-17 09:00:00','admin'),
 ('MK-DSP-0703','MK-ORD-07', @op_cs, @t_g2, @u_hz, 8,  1, 0,   '2026-06-18','2026-06-20',NULL,NULL,'','2026-06-09 09:00:00','admin','2026-06-09 09:00:00','admin');
