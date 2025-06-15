# 排序功能修复说明

## 问题描述

之前的"最新上架"排序功能存在问题：
- 使用了 `INSERT OR REPLACE` 语句，导致每次更新商品时 `created_at` 字段都会被重置
- 这使得"最新上架"实际显示的是"最近更新的商品"，而不是真正的新商品

## 修复内容

### 1. 数据库插入逻辑修复

**修改文件**: `src/database.js`

**原来的问题**:
```sql
INSERT OR REPLACE INTO products 
(product_code, name, name_zh, category_code, gender, season, material, main_pic, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
```

**修复后的逻辑**:
```sql
INSERT INTO products 
(product_code, name, name_zh, category_code, gender, season, material, main_pic, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(product_code) DO UPDATE SET
    name = excluded.name,
    name_zh = excluded.name_zh,
    category_code = excluded.category_code,
    gender = excluded.gender,
    season = excluded.season,
    material = excluded.material,
    main_pic = excluded.main_pic,
    updated_at = CURRENT_TIMESTAMP
```

### 2. 前端排序选项优化

**修改文件**: 
- `frontend/js/pages/products.js`
- `frontend/test-dropdown-filters.html`

**更新内容**:
- 将"更新时间"改为"最近更新"，更清楚地表达含义
- 保持"最新上架"不变，但现在它真正显示新商品

## 修复效果

### "最新上架" (created_at:desc)
- **修复前**: 显示最近有信息更新的商品
- **修复后**: 显示真正第一次被抓取到的新商品
- **用途**: 发现新加入超值特惠的商品

### "最近更新" (updated_at:desc)  
- **逻辑**: 显示最近有信息更新的商品
- **用途**: 查看最近有价格、库存等信息变化的商品

## 技术细节

1. **数据库约束**: 利用 `product_code` 的 `UNIQUE` 约束使用 `ON CONFLICT` 语法
2. **字段保护**: `created_at` 只在首次插入时设置，后续更新不会改变
3. **更新追踪**: `updated_at` 在每次更新时都会刷新为当前时间
4. **向后兼容**: 修复不影响现有数据，只影响新的数据插入逻辑

## 测试验证

已通过自动化测试验证：
- ✅ 首次插入商品时，`created_at` 和 `updated_at` 都设置为当前时间
- ✅ 更新商品时，`created_at` 保持不变，`updated_at` 更新为当前时间
- ✅ 排序功能正常工作

## 日志优化

### 问题
之前的日志中，很多显示为"价格变化"的记录实际上价格没有变化（如 `¥59 → ¥59`），这是因为：
- 系统会检测价格、库存、尺码、颜色等多种变化
- 即使价格没变，但库存或尺码有变化时，也会记录为"变化"
- 日志统一显示为"价格变化"，容易误导

### 优化内容
- 修改日志输出逻辑，准确显示变化类型
- 区分价格变化、库存变化、尺码变化、颜色变化
- 日志格式：`商品变化: 商品名 (代码) - 具体变化内容`

### 新日志示例
```
商品变化: 测试商品 (TEST001) - 价格: ¥99 → ¥79
商品变化: 测试商品 (TEST002) - 库存: 有货 → 缺货
商品变化: 测试商品 (TEST003) - 价格: ¥199 → ¥149, 尺码变化
商品变化: 测试商品 (TEST004) - 颜色变化
```

## 使用建议

- **查看新商品**: 使用"最新上架"排序
- **查看最新变化**: 使用"最近更新"排序
- **价格监控**: 结合"降价时间"和"折扣力度"排序使用
- **理解日志**: 注意区分价格变化和其他类型的变化
